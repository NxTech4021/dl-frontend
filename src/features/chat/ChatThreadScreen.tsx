import { getSportColors } from "@/constants/SportsColor";
import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { chatLogger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  AppStateStatus,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { MessageInput, MessageInputRef } from "./components/chat-input";
import { MessageWindow } from "./components/chat-window";
import { MatchFormData } from "./components/CreateMatchScreen";
import { DeleteMessageSheet } from "./components/DeleteMessageSheet";
import { GroupAvatarStack } from "./components/GroupAvatarStack";
import { GroupMenuSheet } from "./components/GroupMenuSheet";
import { MessageContextMenu } from "./components/MessageContextMenu";
import { TypingIndicator } from "./components/TypingIndicator";
import { useChatSocketEvents } from "./hooks/useChatSocketEvents";
import { ChatService } from "./services/ChatService";
import { socketService } from "@/lib/socket-service";
import { useChatStore } from "./stores/ChatStore";
import { useCreateMatchStore } from "./stores/CreateMatchStore";

import { filterOutAdmins, isAdminUser, Message, User } from "./types";

// Breakpoint constants for responsive design
const BREAKPOINTS = {
  SMALL: 375,
  TABLET: 768,
};

// Safe haptics wrapper
const triggerHaptic = async (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not supported on this device
  }
};

interface ChatThreadScreenProps {
  threadId: string;
  dashboardSport?: string;
}

export const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({
  threadId,
  dashboardSport,
}) => {
  const { data: session } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [messagePosition, setMessagePosition] = useState<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showPersonalMenu, setShowPersonalMenu] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const messageInputRef = useRef<MessageInputRef>(null);
  // Refs to prevent memory leaks and race conditions
  const isMountedRef = useRef(true);
  const isCreatingMatchRef = useRef(false); // Guard against duplicate match creation
  const replyFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const actionBarFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const insets = useSafeAreaInsets();

  // Responsive dimensions - updates on rotation/resize
  const { width: windowWidth } = useWindowDimensions();
  const isSmallScreen = windowWidth < BREAKPOINTS.SMALL;
  const isTablet = windowWidth > BREAKPOINTS.TABLET;

  // Responsive styles that update with dimension changes
  const responsiveStyles = useMemo(
    () => ({
      loadingText: {
        fontSize: moderateScale(isSmallScreen ? 14 : isTablet ? 18 : 16),
      },
      chatHeader: {
        paddingHorizontal: scale(isSmallScreen ? 12 : isTablet ? 24 : 16),
      },
      chatHeaderAvatar: {
        width: scale(isSmallScreen ? 40 : isTablet ? 48 : 44),
        height: scale(isSmallScreen ? 40 : isTablet ? 48 : 44),
        borderRadius: moderateScale(isSmallScreen ? 20 : isTablet ? 24 : 22),
      },
      chatHeaderTitle: {
        fontSize: moderateScale(isSmallScreen ? 16 : isTablet ? 20 : 18),
        lineHeight: verticalScale(isSmallScreen ? 20 : isTablet ? 24 : 22),
      },
      chatHeaderSubtitle: {
        fontSize: moderateScale(isSmallScreen ? 12 : isTablet ? 16 : 14),
        lineHeight: verticalScale(isSmallScreen ? 14 : isTablet ? 18 : 16),
      },
      defaultChatHeaderAvatarText: {
        fontSize: moderateScale(isSmallScreen ? 16 : isTablet ? 20 : 18),
      },
    }),
    [isSmallScreen, isTablet],
  );

  const { setThreadMetadata, pendingMatchData, clearPendingMatch } =
    useCreateMatchStore();

  const user = session?.user;
  const STATUS_BAR_HEIGHT = insets.top;

  const {
    currentThread,
    messages,
    threads,
    replyingTo,
    messagePagination,
    typingUsers,
    setCurrentThread,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    addMessage,
    updateMessage,
    updateThread,
    setReplyingTo,
    handleDeleteMessage: deleteMessageFromStore,
  } = useChatStore();

  // Setup Socket.IO event listeners for real-time chat
  const { isConnected: socketConnected } = useChatSocketEvents(
    threadId,
    user?.id || "",
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear all timeout refs
      if (replyFocusTimeoutRef.current) {
        clearTimeout(replyFocusTimeoutRef.current);
        replyFocusTimeoutRef.current = null;
      }
      if (actionBarFocusTimeoutRef.current) {
        clearTimeout(actionBarFocusTimeoutRef.current);
        actionBarFocusTimeoutRef.current = null;
      }
      // Dismiss all overlays before unmounting so the Android view layer
      // doesn't encounter null children during its draw traversal.
      setShowContextMenu(false);
      setShowDeleteSheet(false);
      setShowGroupMenu(false);
      setShowPersonalMenu(false);
    };
  }, []);

  // Load thread data when component mounts
  useEffect(() => {
    const loadThread = async () => {
      if (!threadId || !user?.id) return;

      // First check if thread exists in store with valid participants
      const existingThread = threads.find((t) => t.id === threadId);
      const hasValidParticipants =
        existingThread?.participants && existingThread.participants.length > 0;

      if (existingThread && hasValidParticipants) {
        // Set thread immediately - no loading state needed for cached threads
        setCurrentThread(existingThread);
        if (isMountedRef.current) {
          setIsLoadingThread(false);
        }

        // Mark as read in background
        if (existingThread.unreadCount > 0) {
          ChatService.markAllAsRead(threadId, user.id)
            .then(() => {
              if (isMountedRef.current) {
                updateThread({ ...existingThread, unreadCount: 0 });
              }
            })
            .catch((error) =>
              chatLogger.error("Error marking thread as read:", error),
            );
        }
      } else {
        // Only show loading for threads not in cache
        if (isMountedRef.current) {
          setIsLoadingThread(true);
        }

        // Fetch thread from API (either not in store or missing participants)
        try {
          const thread = await ChatService.getThread(threadId);
          if (!isMountedRef.current) return;
          if (thread) {
            setCurrentThread(thread);
            // Also update the thread in the store if it exists but was incomplete
            if (existingThread) {
              updateThread(thread);
            }
          }
        } catch (error) {
          if (!isMountedRef.current) return;
          chatLogger.error("Error fetching thread:", error);
          toast.error("Failed to load conversation");
          // Use canGoBack() to prevent navigation stack corruption.
          // If there's no valid back destination (e.g., opened from notification),
          // navigate to dashboard instead of calling back() into the void.
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace("/user-dashboard");
          }
          return;
        }
        if (isMountedRef.current) {
          setIsLoadingThread(false);
        }
      }

      // Load messages in background (MessageWindow has its own skeleton loading)
      loadMessages(threadId);
    };

    loadThread();

    // Cleanup on unmount
    return () => {
      setCurrentThread(null);
    };
  }, [threadId, user?.id]);

  // Force re-render when messages change
  useEffect(() => {
    if (threadId && messages[threadId]) {
      setRefreshKey((prev) => prev + 1);
    }
  }, [messages, threadId]);

  // Handle pending match data when returning from create-match page
  // Guard: isCreatingMatchRef prevents re-entry when async operations
  // cause re-renders that re-trigger this effect before completion
  useEffect(() => {
    if (pendingMatchData && currentThread && !isCreatingMatchRef.current) {
      isCreatingMatchRef.current = true;
      clearPendingMatch();
      handleCreateMatch(pendingMatchData).finally(() => {
        isCreatingMatchRef.current = false;
      });
    }
  }, [pendingMatchData, currentThread]);

  // Load older messages when user scrolls up
  const handleLoadMoreMessages = useCallback(() => {
    if (!threadId) return;
    loadMoreMessages(threadId);
  }, [threadId, loadMoreMessages]);

  const handleTyping = useCallback((isTyping: boolean) => {
    if (threadId) {
      socketService.sendTyping(threadId, isTyping);
    }
  }, [threadId]);

  const handleSendMessage = useCallback(
    (content: string, replyToId?: string) => {
      if (!currentThread || !user?.id) return;

      chatLogger.debug("Sending message:", {
        threadId: currentThread.id,
        senderId: user.id,
      });

      sendMessage(currentThread.id, user.id, content, replyToId);

      if (replyingTo) {
        setReplyingTo(null);
      }
    },
    [currentThread, user?.id, sendMessage, replyingTo, setReplyingTo],
  );

  const handleBackToThreads = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/user-dashboard" as any);
    }
  }, []);

  const handleMatch = useCallback(() => {
    chatLogger.debug("Create match button pressed");
    if (!currentThread || !user) return;

    // Check if this is a direct chat (1-on-1)
    if (currentThread.type === "direct") {
      // Find the recipient (other participant)
      const recipient = currentThread.participants?.find(
        (p) => p.id !== user.id,
      );

      if (!recipient) {
        chatLogger.error("Cannot find recipient for friendly match request");
        return;
      }

      // For direct chats, use the dashboard's selected sport (passed from the main dashboard)
      // This ensures the friendly match request uses the sport selected in the header tabs
      const sportToUse = dashboardSport?.toUpperCase() || "PICKLEBALL";

      // Navigate to friendly match creation screen with request params
      router.push({
        pathname: "/friendly/create",
        params: {
          isRequest: "true",
          recipientId: recipient.id,
          threadId: currentThread.id,
          sportType: sportToUse,
        },
      });
    } else {
      // Group chat - use existing league match flow
      // Store thread metadata for the create match screen
      setThreadMetadata({
        threadId: currentThread.id,
        threadName: currentThread.name || "League Chat",
        divisionId: currentThread.metadata?.divisionId,
        sportType: currentThread.sportType || "PICKLEBALL",
      });

      // Navigate to the create match page
      router.push({
        pathname: "/match/create-match",
        params: {
          leagueName:
            currentThread.metadata?.leagueName ||
            currentThread.division?.league?.name ||
            "League",
          season: currentThread.metadata?.seasonName || "Season 1",
          division: currentThread.metadata?.divisionName || "Division I",
          sportType: currentThread.sportType || "PICKLEBALL",
          divisionId: currentThread.metadata?.divisionId || "",
          gameType:
            currentThread.division?.gameType ||
            currentThread.metadata?.gameType ||
            "",
          seasonId:
            currentThread.metadata?.seasonId ||
            currentThread.division?.season?.id ||
            "",
          threadId: currentThread.id,
        },
      });
    }
  }, [currentThread, user, setThreadMetadata, dashboardSport]);

  const handleCreateMatch = async (matchData: MatchFormData) => {
    chatLogger.debug("Match created:", matchData);

    if (!currentThread || !user) {
      chatLogger.error("Cannot create match: missing thread or user");
      toast.error("Cannot create match: missing information");
      return;
    }

    // TODO(chat-match-creation-duplicate-2026-04-18): failed loader has
    // no retry UI. When the loader ends up with status='failed' (via the
    // finally below on validation-return, or via the catch on throw),
    // it stays visible with the red exclamation indicator until the
    // next loadMessages / refresh clears it. A tap-to-retry pattern
    // would be a nicer UX.
    //
    // TODO(chat-match-creation-duplicate-2026-04-18): the 1500ms
    // setTimeout→loadMessages below can disrupt paginated creators.
    // Rare but possible if user scrolled up, then opened Create Match
    // modal, then confirmed. Pre-existing behavior, not introduced by
    // this session's fixes. If touched, apply the same pagination guard
    // used in useChatSocketEvents.handleNewMessage (skip refresh when
    // messagePagination[threadId].page > 1).
    //
    // Note on double-tap: the useEffect at ~line 276 that triggers this
    // handler is already guarded by isCreatingMatchRef + pendingMatchData
    // being cleared synchronously, so rapid re-invocation via the normal
    // pendingMatchData flow cannot reach here twice.

    // Optimistic "Creating match..." bubble so the creator has immediate
    // feedback instead of staring at nothing while the POST + 1.5s
    // loadMessages settle. The bubble is a plain text message with
    // status='sending', which renders with the existing sending clock
    // indicator. When loadMessages replaces the thread's messages array
    // after the backend finishes persisting, the tempId entry is
    // dropped automatically — no manual reconciliation needed.
    //
    // Cleanup responsibility: the try/catch/finally wrapper below
    // ensures the loader is marked 'failed' if we exit the try block
    // WITHOUT a successful POST+setTimeout sequence. Covers:
    //   - Inner try/catch returns from division / partnership fetch
    //     (previously left the loader perpetually 'sending' — fixed
    //     via completedSuccessfully flag + finally).
    //   - Outer catch path (throw from POST or inner logic).
    // The existing catch's `updateMessage(..., { status: "failed" })`
    // is redundant with finally but kept for code-reading clarity.
    //
    // See docs/issues/backlog/chat-match-creation-duplicate-2026-04-18.md
    const loaderTempId = `temp-creating-match-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    const loaderMessage: Message = {
      id: loaderTempId,
      tempId: loaderTempId,
      threadId: currentThread.id,
      senderId: user.id,
      content: "📅 Creating match...",
      timestamp: new Date(),
      isRead: false,
      isDelivered: false,
      type: "text",
      status: "sending",
    };
    addMessage(loaderMessage);

    let completedSuccessfully = false;

    try {
      const isDoubles = matchData.numberOfPlayers === 4;

      // Fetch division to check gameType and seasonId
      let partnerId: string | undefined;
      let divisionGameType: string | undefined;
      let seasonId: string | undefined;

      if (currentThread.metadata?.divisionId) {
        chatLogger.debug("Fetching division data for match creation...");

        try {
          const divisionResponse = await axiosInstance.get(
            `/api/division/${currentThread.metadata.divisionId}`,
          );

          const divisionResult = divisionResponse.data;
          const divisionData = divisionResult.data || divisionResult;

          divisionGameType = divisionData.gameType?.toUpperCase();
          seasonId = divisionData.seasonId || divisionData.season?.id;

          chatLogger.debug("Division info:", {
            divisionId: divisionData.id,
            gameType: divisionGameType,
            seasonId: seasonId,
          });
        } catch (error) {
          chatLogger.error("Failed to fetch division:", error);
          toast.error("Failed to fetch division details");
          return;
        }
      }

      if (divisionGameType === "DOUBLES" && seasonId) {
        chatLogger.debug("Division is DOUBLES type, fetching partnership...");

        try {
          const partnershipResponse = await axiosInstance.get(
            `/api/pairing/partnership/active/${seasonId}`,
          );

          const partnershipResult = partnershipResponse.data;
          const partnership = partnershipResult?.data;

          if (!partnership || !partnership.id) {
            toast.warning("No partner found", {
              description:
                "You need to pair up with a partner for doubles divisions",
            });
            return;
          }

          // Determine partner ID based on whether user is captain or partner
          partnerId =
            partnership.captainId === user.id
              ? partnership.partnerId
              : partnership.captainId;

          chatLogger.debug("Partner found:", {
            userId: user.id,
            partnerId,
            isCaptain: partnership.captainId === user.id,
          });
        } catch (error) {
          chatLogger.error("Failed to fetch partnership:", error);
          toast.error("Partner required", {
            description:
              error instanceof Error
                ? error.message
                : "You must have an active partnership for doubles divisions",
          });
          return;
        }
      }

      // Extract start time from range (e.g., "2:00 PM - 4:00 PM" -> "2:00 PM")
      const extractStartTime = (timeRange: string): string => {
        if (timeRange.includes(" - ")) {
          return timeRange.split(" - ")[0].trim();
        }
        return timeRange.trim();
      };

      const convertTo24Hour = (time12h: string): string => {
        const [time, modifier] = time12h.split(" ");
        let [hours, minutes] = time.split(":");

        if (hours === "12") {
          hours = modifier === "AM" ? "00" : "12";
        } else {
          hours =
            modifier === "PM"
              ? String(parseInt(hours, 10) + 12)
              : hours.padStart(2, "0");
        }

        return `${hours}:${minutes}`;
      };

      const startTime = extractStartTime(matchData.time);
      const time24 = convertTo24Hour(startTime);

      const dateTimeString = `${matchData.date}T${time24}:00`;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      interface MatchPayload {
        divisionId?: string;
        matchType: string;
        format: string;
        matchDate: string;
        deviceTimezone: string;
        location: string;
        notes?: string;
        duration: number;
        courtBooked: boolean;
        fee: string;
        feeAmount?: number;
        partnerId?: string;
      }

      const matchPayload: MatchPayload = {
        divisionId: currentThread.metadata?.divisionId,
        // #036: Use division gameType — never fall back to user's numberOfPlayers for league matches
        matchType:
          divisionGameType ||
          currentThread.division?.gameType ||
          (isDoubles ? "DOUBLES" : "SINGLES"),
        format: "STANDARD",
        matchDate: dateTimeString,
        deviceTimezone,
        location: matchData.location || "TBD",
        notes: matchData.description,
        duration: matchData.duration || 2,
        courtBooked: matchData.courtBooked || false,
        fee: matchData.fee || "FREE",
        feeAmount:
          matchData.fee !== "FREE"
            ? parseFloat(matchData.feeAmount || "0")
            : undefined,
      };

      // Add partnerId only for DOUBLES divisions
      if (divisionGameType === "DOUBLES" && partnerId) {
        matchPayload.partnerId = partnerId;
        chatLogger.debug("Added partnerId to payload:", partnerId);
      }

      const matchResponse = await axiosInstance.post(
        "/api/match/create",
        matchPayload,
      );

      if (!matchResponse.data?.success && !matchResponse.data?.data) {
        chatLogger.error("Match creation failed:", {
          status: matchResponse.status,
          errorData: matchResponse.data,
        });
        throw new Error(matchResponse.data?.error || "Failed to create match");
      }

      // Match message is now auto-posted to chat by the backend (matchInvitationController)
      // This ensures ALL match creation paths (chat, matches page, etc.) post to chat
      toast.success("Match created successfully!");

      // Force reload messages — the socket event may arrive before listeners are
      // registered (e.g., after navigating back), so we pull fresh messages from
      // the server to guarantee the match bubble appears immediately.
      if (currentThread?.id) {
        setTimeout(() => {
          loadMessages(currentThread.id);
        }, 1500); // brief delay lets the backend finish posting the chat message
      }

      // Reached only if POST succeeded AND setTimeout scheduled — the
      // finally below keys off this to decide whether to mark the loader
      // failed.
      completedSuccessfully = true;
    } catch (error) {
      chatLogger.error("Error creating match:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create match",
      );
      // Mark the optimistic loader as failed so the user sees the red
      // indicator rather than a perpetual sending spinner. It stays
      // visible until the next loadMessages / refresh clears it.
      // (Redundant with the finally below for the throw path, but kept
      // close to the catch for code-reading clarity.)
      updateMessage(loaderTempId, { status: "failed" });
    } finally {
      // If the try block exited without reaching
      // `completedSuccessfully = true` — e.g., via an inner `return`
      // from the division/partnership fetch validation paths that throw
      // a toast and bail — the loader would otherwise be stuck with
      // status='sending' forever. Mark it failed so the user sees the
      // red "!" indicator, matching the throw-path UX.
      if (!completedSuccessfully) {
        updateMessage(loaderTempId, { status: "failed" });
      }
    }
  };

  const handleReply = useCallback(
    (message: Message) => {
      setReplyingTo(message);
      // Focus input to bring up keyboard
      if (replyFocusTimeoutRef.current) {
        clearTimeout(replyFocusTimeoutRef.current);
      }
      replyFocusTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          messageInputRef.current?.focus();
        }
        replyFocusTimeoutRef.current = null;
      }, 50);
    },
    [setReplyingTo],
  );

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  const handleLongPress = useCallback(
    (
      message: Message,
      position?: { x: number; y: number; width: number; height: number },
    ) => {
      chatLogger.debug("Long press on message:", message.id);
      setSelectedMessage(message);
      setMessagePosition(position);
      setShowContextMenu(true);
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setSelectedMessage(null);
    setMessagePosition(undefined);
  }, []);

  const handleActionBarReply = useCallback(() => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      // Focus input to bring up keyboard
      if (actionBarFocusTimeoutRef.current) {
        clearTimeout(actionBarFocusTimeoutRef.current);
      }
      actionBarFocusTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          messageInputRef.current?.focus();
        }
        actionBarFocusTimeoutRef.current = null;
      }, 50);
    }
  }, [selectedMessage, setReplyingTo]);

  const handleActionBarCopy = useCallback(async () => {
    if (selectedMessage?.content && !selectedMessage.metadata?.isDeleted) {
      try {
        await Clipboard.setStringAsync(selectedMessage.content);
        toast.success("Message copied to clipboard");
      } catch (error) {
        chatLogger.error("Failed to copy:", error);
        toast.error("Failed to copy message");
      }
    }
  }, [selectedMessage]);

  // Handle delete button press from context menu - opens the bottom sheet
  // Note: We close the context menu but keep selectedMessage so the delete sheet knows which message to delete
  const handleDeletePress = useCallback(() => {
    setShowContextMenu(false);
    setShowDeleteSheet(true);
  }, []);

  // Handle confirmed delete from the delete sheet
  const handleConfirmDelete = useCallback(async () => {
    if (selectedMessage) {
      try {
        await deleteMessageFromStore(selectedMessage.id, threadId);
        toast.success("Message deleted");
        setShowDeleteSheet(false);
        setSelectedMessage(null);
      } catch (error) {
        chatLogger.error("Failed to delete:", error);
        toast.error("Failed to delete message");
      }
    }
  }, [selectedMessage, threadId, deleteMessageFromStore]);

  // Handle closing the delete sheet
  const handleCloseDeleteSheet = useCallback(() => {
    setShowDeleteSheet(false);
    setSelectedMessage(null);
    setMessagePosition(undefined);
  }, []);

  const handleDeleteMessageAction = useCallback(
    async (messageId: string) => {
      if (!currentThread) {
        return;
      }
      try {
        await deleteMessageFromStore(messageId, currentThread.id);
        chatLogger.debug("Message deleted successfully");
      } catch (error) {
        chatLogger.error("Failed to delete message:", error);
        toast.error("Failed to delete message. Please try again.");
      }
    },
    [currentThread, deleteMessageFromStore],
  );

  // Memoize header content
  const headerContent = useMemo(() => {
    if (!currentThread || !user?.id)
      return {
        title: "Chat",
        subtitle: null,
        sportType: null,
        season: null,
        avatar: null,
        participantName: "Unknown User",
      };

    if (currentThread.type === "group") {
      const seasonName =
        currentThread.metadata?.seasonName ||
        currentThread.division?.season?.name ||
        null;

      return {
        title: currentThread.name || "Group Chat",
        subtitle: seasonName,
        sportType: currentThread.sportType,
        avatar: null,
        participantName: "Group Chat",
      };
    } else {
      const otherParticipant = currentThread.participants?.find(
        (participant) => participant.id !== user.id,
      );

      if (otherParticipant) {
        return {
          title:
            otherParticipant.name ||
            otherParticipant.username ||
            "Unknown User",
          subtitle: otherParticipant.username
            ? `@${otherParticipant.username}`
            : null,
          sportType: null,
          avatar: otherParticipant.avatar || null,
          participantName: otherParticipant.name || "Unknown User",
        };
      } else {
        return {
          title: "Chat",
          subtitle: null,
          sportType: null,
          avatar: null,
          participantName: "Unknown User",
        };
      }
    }
  }, [currentThread, user?.id]);

  const sportColors = useMemo(
    () => getSportColors(headerContent.sportType),
    [headerContent.sportType],
  );

  // Get other participant for direct chats
  const otherParticipant = useMemo(() => {
    if (!currentThread || currentThread.type === "group" || !user?.id)
      return null;
    return currentThread.participants?.find((p) => p.id !== user.id) || null;
  }, [currentThread, user?.id]);

  // Check if other participant is admin (hide menu for admins)
  const isOtherParticipantAdmin = useMemo(() => {
    if (!otherParticipant) return false;
    return isAdminUser(otherParticipant as User);
  }, [otherParticipant]);

  // Check if other participant's account is no longer available (disable messaging)
  const isOtherParticipantDeleted = useMemo(() => {
    if (!otherParticipant) return false;
    const status = (otherParticipant as any).status;
    if (status) {
      return status === 'DELETED' || status === 'BANNED';
    }
    // Fallback heuristic for legacy responses without status field
    return (
      otherParticipant.name?.toLowerCase().includes("deleted") ||
      otherParticipant.username?.toLowerCase().startsWith("deleted_")
    );
  }, [otherParticipant]);

  // Memoize participant preview text for group chats (excluding admins)
  const participantPreview = useMemo(() => {
    if (!currentThread || currentThread.type !== "group") return "";

    // Filter out admin users from the preview
    const visibleParticipants = filterOutAdmins(currentThread.participants);

    const participantNames = visibleParticipants.slice(0, 5).map((p) => {
      const firstName = p.name?.split(" ")[0] || p.username || "Unknown";
      return firstName.length > 10
        ? firstName.substring(0, 8) + "."
        : firstName;
    });

    if (visibleParticipants.length > 5) {
      return participantNames.join(", ") + "...";
    }

    return participantNames.join(", ");
  }, [currentThread]);

  // Memoize navigation handlers for group chat header
  const handleViewStandings = useCallback(() => {
    if (!currentThread) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/match/divisionstandings",
      params: {
        divisionId:
          currentThread.metadata?.divisionId || currentThread.division?.id,
        divisionName:
          currentThread.metadata?.divisionName ||
          currentThread.division?.name ||
          "Division 1",
        sportType: currentThread.sportType || "PICKLEBALL",
        leagueName:
          currentThread.metadata?.leagueName ||
          currentThread.division?.league?.name ||
          "League",
        seasonName:
          currentThread.metadata?.seasonName ||
          currentThread.division?.season?.name ||
          "Season 1",
        gameType:
          currentThread.metadata?.gameType ||
          currentThread.division?.gameType ||
          "Singles",
        genderCategory:
          currentThread.metadata?.genderCategory ||
          currentThread.division?.genderCategory ||
          "",
        seasonStartDate: currentThread.division?.season?.startDate,
        seasonEndDate: currentThread.division?.season?.endDate,
      },
    });
  }, [currentThread]);

  const handleViewAllMatches = useCallback(() => {
    if (!currentThread) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/match/all-matches",
      params: {
        divisionId:
          currentThread.metadata?.divisionId || currentThread.division?.id,
        sportType: currentThread.sportType || "PICKLEBALL",
        leagueName:
          currentThread.metadata?.leagueName ||
          currentThread.division?.league?.name ||
          "League",
        seasonName:
          currentThread.metadata?.seasonName ||
          currentThread.division?.season?.name ||
          "Season 1",
      },
    });
  }, [currentThread]);

  // Memoize menu button handler
  const handleGroupMenuPress = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowGroupMenu(true);
  }, []);

  // Get group menu options
  const getGroupMenuOptions = useCallback(() => {
    const thread = currentThread || threads.find((t) => t.id === threadId);

    return [
      {
        id: "group-info",
        label: "View Group Info",
        icon: "information-circle-outline" as const,
        onPress: () => {
          if (thread?.metadata?.divisionId) {
            router.push({
              pathname: "/chat/group-info",
              params: {
                threadId: thread.id,
                divisionId: thread.metadata.divisionId,
                divisionName: thread.name || "Division",
                sportType: thread.sportType || "PICKLEBALL",
                leagueName: thread.metadata?.leagueName || "",
                seasonName: thread.metadata?.seasonName || "",
                gameType: thread.metadata?.gameType || "",
                genderCategory: thread.metadata?.genderCategory || "",
              },
            });
          } else {
            toast.info("Group info not available");
          }
        },
      },
      {
        id: "members",
        label: "View Members",
        icon: "people-outline" as const,
        onPress: () => {
          if (thread?.metadata?.seasonId) {
            router.push({
              pathname: "/user-dashboard/players-list",
              params: {
                contextType: "season",
                contextId: thread.metadata.seasonId,
                contextName: thread.name || "Division",
                sport: thread.sportType?.toLowerCase() || "pickleball",
                totalPlayers: thread.participants?.length || 0,
              },
            });
          } else {
            toast.info("Unable to view members");
          }
        },
      },
    ];
  }, [currentThread, threads, threadId]);

  // Handle personal chat menu press
  const handlePersonalMenuPress = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setShowPersonalMenu(true);
  }, []);

  // Get personal chat menu options
  const getPersonalMenuOptions = useCallback(() => {
    return [
      {
        id: "view-profile",
        label: "View Profile",
        icon: "person-outline" as const,
        onPress: () => {
          if (otherParticipant?.id) {
            router.push({
              pathname: "/player-profile/[id]",
              params: {
                id: otherParticipant.id,
                playerName: otherParticipant.name || "Player",
              },
            });
          } else {
            toast.info("Profile not available");
          }
        },
      },
      {
        id: "unfriend",
        label: "Unfriend",
        icon: "person-remove-outline" as const,
        destructive: true,
        onPress: () => {
          if (otherParticipant?.id) {
            Alert.alert(
              "Unfriend",
              `Are you sure you want to unfriend ${otherParticipant.name || "this user"}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Unfriend",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await axiosInstance.delete(
                        `/api/friend/remove/${otherParticipant.id}`,
                      );
                      toast.success("Friend removed");
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace("/user-dashboard");
                      }
                    } catch (error) {
                      console.error("Error unfriending:", error);
                      toast.error("Failed to unfriend");
                    }
                  },
                },
              ],
            );
          }
        },
      },
    ];
  }, [otherParticipant]);

  // Memoize image error handler
  const handleAvatarError = useCallback(() => {
    chatLogger.debug("Profile image failed to load:", headerContent.avatar);
  }, [headerContent.avatar]);

  // Use currentThread or fall back to the thread from the store for immediate render
  const displayThread = currentThread || threads.find((t) => t.id === threadId);

  // Only block rendering if we truly have no thread data anywhere
  if (!displayThread) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, responsiveStyles.loadingText]}>
            {isLoadingThread ? "Loading..." : "Conversation not found"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.chatHeader,
              responsiveStyles.chatHeader,
              { paddingTop: STATUS_BAR_HEIGHT + verticalScale(12) },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleBackToThreads}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Return to chat list"
            >
              <Ionicons
                name="arrow-back"
                size={moderateScale(24)}
                color="#111827"
              />
            </Pressable>

            {displayThread?.type === "group" ? (
              // Group chat header with stacked avatars
              <View style={styles.groupHeaderWrapper}>
                {/* Left section: Avatar with sport badge */}
                <View style={styles.groupHeaderAvatar}>
                  {/* Sport badge above avatar */}
                  {sportColors.label && (
                    <View
                      style={[
                        styles.sportBadgeAboveAvatar,
                        { borderColor: sportColors.badgeColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sportBadgeAboveAvatarText,
                          { color: sportColors.badgeColor },
                        ]}
                      >
                        {sportColors.label}
                      </Text>
                    </View>
                  )}
                  <GroupAvatarStack
                    participants={displayThread.participants}
                    sportColor={sportColors.background}
                    size={moderateScale(38)}
                  />
                </View>

                {/* Center section: Title, participants, action buttons */}
                <View style={styles.groupHeaderContent}>
                  <View style={styles.groupHeaderTopRow}>
                    <Text style={styles.groupHeaderTitle} numberOfLines={1}>
                      {headerContent.title}
                    </Text>
                  </View>
                  <Text
                    style={styles.groupHeaderParticipants}
                    numberOfLines={1}
                  >
                    {participantPreview}
                  </Text>

                  {/* Action buttons */}
                  <View style={styles.groupActionButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.primaryActionButton,
                        { backgroundColor: sportColors.background },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={handleViewStandings}
                    >
                      <Text style={styles.primaryActionText}>
                        View Standings
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.secondaryActionButton,
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: "/match/all-matches",
                          params: {
                            divisionId:
                              displayThread.metadata?.divisionId ||
                              displayThread.division?.id,
                            sportType: displayThread.sportType || "PICKLEBALL",
                            leagueName:
                              displayThread.metadata?.leagueName ||
                              displayThread.division?.league?.name ||
                              "League",
                            seasonName:
                              displayThread.metadata?.seasonName ||
                              displayThread.division?.season?.name ||
                              "Season 1",
                            gameType:
                              displayThread.metadata?.gameType ||
                              displayThread.division?.gameType ||
                              "",
                            genderCategory:
                              displayThread.metadata?.genderCategory ||
                              displayThread.division?.genderCategory ||
                              "",
                            seasonStartDate:
                              displayThread.division?.season?.startDate,
                            seasonEndDate:
                              displayThread.division?.season?.endDate,
                          },
                        });
                      }}
                    >
                      <Text style={styles.secondaryActionText}>Matches</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Right section: 3-dot menu */}
                <Pressable
                  style={({ pressed }) => [
                    styles.groupHeaderMenuButton,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleGroupMenuPress}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={moderateScale(20)}
                    color="#6B7280"
                  />
                </Pressable>
              </View>
            ) : (
              // Direct chat header (original design)
              <>
                {/* Profile Picture */}
                <View
                  style={[
                    styles.chatHeaderAvatar,
                    responsiveStyles.chatHeaderAvatar,
                  ]}
                >
                  {headerContent.avatar ? (
                    <Image
                      source={{ uri: headerContent.avatar }}
                      style={styles.chatHeaderAvatarImage}
                      onError={handleAvatarError}
                    />
                  ) : (
                    <View style={styles.defaultChatHeaderAvatarContainer}>
                      <Text
                        style={[
                          styles.defaultChatHeaderAvatarText,
                          responsiveStyles.defaultChatHeaderAvatarText,
                        ]}
                      >
                        {headerContent.participantName
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatHeaderContent}>
                  <View style={styles.chatHeaderTitleRow}>
                    <Text
                      style={[
                        styles.chatHeaderTitle,
                        responsiveStyles.chatHeaderTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {headerContent.title}
                    </Text>
                  </View>
                  {headerContent.subtitle && (
                    <Text
                      style={[
                        styles.chatHeaderSubtitle,
                        responsiveStyles.chatHeaderSubtitle,
                      ]}
                      numberOfLines={1}
                    >
                      {headerContent.subtitle}
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Only show headerAction for direct chats (hide for admin users) */}
            {displayThread.type !== "group" && !isOtherParticipantAdmin && (
              <Pressable
                style={({ pressed }) => [
                  styles.headerAction,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={handlePersonalMenuPress}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={moderateScale(20)}
                  color="#6B7280"
                />
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <MessageWindow
              key={refreshKey}
              messages={messages[threadId] || []}
              threadId={threadId}
              isGroupChat={displayThread.type === "group"}
              sportType={displayThread.sportType}
              onReply={handleReply}
              onDeleteMessage={handleDeleteMessageAction}
              onLongPress={handleLongPress}
              onLoadMore={handleLoadMoreMessages}
              loading={messagePagination[threadId]?.isLoadingMore}
            />

            <TypingIndicator typingUsers={typingUsers[threadId] || []} />
            <MessageInput
              ref={messageInputRef}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onhandleMatch={handleMatch}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              sportType={displayThread.sportType}
              isGroupChat={displayThread.type === "group"}
              disabled={isOtherParticipantDeleted}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Message Context Menu - rendered outside SafeAreaView to overlay entire screen */}
      <MessageContextMenu
        visible={showContextMenu}
        message={selectedMessage}
        isCurrentUser={selectedMessage?.senderId === user?.id}
        messagePosition={messagePosition}
        sportType={currentThread?.sportType}
        onReply={handleActionBarReply}
        onCopy={handleActionBarCopy}
        onDeletePress={handleDeletePress}
        onClose={handleCloseContextMenu}
      />

      {/* Delete Message Bottom Sheet */}
      <DeleteMessageSheet
        visible={showDeleteSheet}
        onClose={handleCloseDeleteSheet}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Group Menu Sheet */}
      <GroupMenuSheet
        visible={showGroupMenu}
        onClose={() => setShowGroupMenu(false)}
        sportType={displayThread.sportType ?? undefined}
        options={getGroupMenuOptions()}
        title={displayThread.name || "Options"}
      />

      {/* Personal Chat Menu Sheet */}
      <GroupMenuSheet
        visible={showPersonalMenu}
        onClose={() => setShowPersonalMenu(false)}
        sportType={displayThread.sportType ?? undefined}
        options={getPersonalMenuOptions()}
        title={otherParticipant?.name || "Options"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: scale(20),
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(16),
    color: "#6B7280",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    minHeight: verticalScale(60),
    width: "100%",
  },
  backButton: {
    marginRight: scale(12),
    padding: scale(10), // Increased for 44x44 touch target
    minWidth: scale(44),
    minHeight: verticalScale(44),
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeaderAvatar: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: moderateScale(22),
    overflow: "hidden",
    marginRight: scale(12),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: verticalScale(2) },
        shadowOpacity: 0.1,
        shadowRadius: moderateScale(4),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chatHeaderAvatarImage: {
    width: "100%",
    height: "100%",
  },
  defaultChatHeaderAvatarContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultChatHeaderAvatarText: {
    color: "#FFFFFF",
    fontSize: moderateScale(18),
    fontWeight: "bold",
    fontFamily: "System",
  },
  chatHeaderContent: {
    flex: 1,
    justifyContent: "center",
  },
  chatHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  chatHeaderTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#111827",
    lineHeight: verticalScale(22),
    flexShrink: 1,
  },
  chatHeaderSubtitle: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    marginTop: verticalScale(2),
    lineHeight: verticalScale(16),
  },
  headerAction: {
    padding: scale(10),
    minWidth: scale(44),
    minHeight: verticalScale(44),
    justifyContent: "center",
    alignItems: "center",
  },
  // Group chat header styles
  groupHeaderWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  groupHeaderAvatar: {
    marginRight: scale(12),
    alignItems: "center",
  },
  groupHeaderMenuButton: {
    padding: scale(8),
    marginLeft: scale(2),
    alignSelf: "center",
    width: scale(36),
    height: scale(36),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  sportBadgeAboveAvatar: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(8),
    borderWidth: 1.5,
    backgroundColor: "transparent",
    marginBottom: verticalScale(4),
  },
  sportBadgeAboveAvatarText: {
    fontSize: moderateScale(9),
    fontWeight: "600",
  },
  groupHeaderContent: {
    flex: 1,
    justifyContent: "center",
    marginRight: scale(4),
  },
  groupHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(2),
  },
  groupHeaderTitle: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  groupHeaderParticipants: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    marginBottom: verticalScale(8),
    fontWeight: "500",
  },
  groupActionButtons: {
    flexDirection: "row",
    gap: scale(6),
  },
  actionButton: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionButton: {
    backgroundColor: "#A04DFE",
  },
  secondaryActionButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  primaryActionText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryActionText: {
    fontSize: moderateScale(10),
    fontWeight: "600",
    color: "#6B7280",
  },
});
