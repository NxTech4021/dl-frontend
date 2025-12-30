import { getBackendBaseURL } from '@/config/network';
import { getSportColors } from '@/constants/SportsColor';
import { authClient, useSession } from '@/lib/auth-client';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { MessageInput, MessageInputRef } from './components/chat-input';
import { MessageWindow } from './components/chat-window';
import { MatchFormData } from './components/CreateMatchScreen';
import { GroupAvatarStack } from './components/GroupAvatarStack';
import { DeleteMessageSheet } from './components/DeleteMessageSheet';
import { MessageContextMenu } from './components/MessageContextMenu';
import { useChatSocketEvents } from './hooks/useChatSocketEvents';
import { ChatService } from './services/ChatService';
import { useChatStore } from './stores/ChatStore';
import { useCreateMatchStore } from './stores/CreateMatchStore';

import { filterOutAdmins, Message, Thread } from './types';

// Match participant interface
interface MatchParticipant {
  id: string;
  playerId: string;
  matchId: string;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  player?: {
    id: string;
    name?: string;
    username?: string;
  };
}

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface ChatThreadScreenProps {
  threadId: string;
  dashboardSport?: string;
}

export const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({ threadId, dashboardSport }) => {
  const { data: session } = useSession();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [messagePosition, setMessagePosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
  const [isLoadingThread, setIsLoadingThread] = useState(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const messageInputRef = useRef<MessageInputRef>(null);
  const insets = useSafeAreaInsets();

  const { setThreadMetadata, pendingMatchData, clearPendingMatch } = useCreateMatchStore();

  const user = session?.user;
  const STATUS_BAR_HEIGHT = insets.top;

  const {
    currentThread,
    messages,
    threads,
    replyingTo,
    setCurrentThread,
    loadMessages,
    sendMessage,
    updateThread,
    setReplyingTo,
    handleDeleteMessage: deleteMessageFromStore,
  } = useChatStore();

  // Setup Socket.IO event listeners for real-time chat
  const { isConnected: socketConnected } = useChatSocketEvents(
    threadId,
    user?.id || ''
  );

  // Load thread data when component mounts
  useEffect(() => {
    const loadThread = async () => {
      if (!threadId || !user?.id) return;

      // First check if thread exists in store with valid participants
      const existingThread = threads.find(t => t.id === threadId);
      const hasValidParticipants = existingThread?.participants && existingThread.participants.length > 0;

      if (existingThread && hasValidParticipants) {
        // Set thread immediately - no loading state needed for cached threads
        setCurrentThread(existingThread);
        setIsLoadingThread(false);

        // Mark as read in background
        if (existingThread.unreadCount > 0) {
          ChatService.markAllAsRead(threadId, user.id)
            .then(() => updateThread({ ...existingThread, unreadCount: 0 }))
            .catch((error) => chatLogger.error('Error marking thread as read:', error));
        }
      } else {
        // Only show loading for threads not in cache
        setIsLoadingThread(true);

        // Fetch thread from API (either not in store or missing participants)
        try {
          const thread = await ChatService.getThread(threadId);
          if (thread) {
            setCurrentThread(thread);
            // Also update the thread in the store if it exists but was incomplete
            if (existingThread) {
              updateThread(thread);
            }
          }
        } catch (error) {
          chatLogger.error('Error fetching thread:', error);
          toast.error('Failed to load conversation');
          router.back();
          return;
        }
        setIsLoadingThread(false);
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
      setRefreshKey(prev => prev + 1);
    }
  }, [messages, threadId]);

  // Handle pending match data when returning from create-match page
  useEffect(() => {
    if (pendingMatchData && currentThread) {
      handleCreateMatch(pendingMatchData);
      clearPendingMatch();
    }
  }, [pendingMatchData, currentThread]);

  const handleSendMessage = useCallback((content: string, replyToId?: string) => {
    if (!currentThread || !user?.id) return;

    chatLogger.debug('Sending message:', { threadId: currentThread.id, senderId: user.id });

    sendMessage(currentThread.id, user.id, content, replyToId);

    if (replyingTo) {
      setReplyingTo(null);
    }
  }, [currentThread, user?.id, sendMessage, replyingTo, setReplyingTo]);

  const handleBackToThreads = useCallback(() => {
    router.back();
  }, []);

  const handleMatch = useCallback(() => {
    chatLogger.debug('Create match button pressed');
    if (!currentThread || !user) return;

    // Check if this is a direct chat (1-on-1)
    if (currentThread.type === 'direct') {
      // Find the recipient (other participant)
      const recipient = currentThread.participants?.find(p => p.id !== user.id);

      if (!recipient) {
        chatLogger.error('Cannot find recipient for friendly match request');
        return;
      }

      // For direct chats, use the dashboard's selected sport (passed from the main dashboard)
      // This ensures the friendly match request uses the sport selected in the header tabs
      const sportToUse = dashboardSport?.toUpperCase() || 'PICKLEBALL';

      // Navigate to friendly match creation screen with request params
      router.push({
        pathname: '/friendly/create',
        params: {
          isRequest: 'true',
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
        threadName: currentThread.name || 'League Chat',
        divisionId: currentThread.metadata?.divisionId,
        sportType: currentThread.sportType || 'PICKLEBALL',
      });

      // Navigate to the create match page
      router.push({
        pathname: '/match/create-match',
        params: {
          leagueName: currentThread.metadata?.leagueName || currentThread.division?.league?.name || 'League',
          season: currentThread.metadata?.seasonName || 'Season 1',
          division: currentThread.metadata?.divisionName || 'Division I',
          sportType: currentThread.sportType || 'PICKLEBALL',
          divisionId: currentThread.metadata?.divisionId || '',
          threadId: currentThread.id,
        },
      });
    }
  }, [currentThread, user, setThreadMetadata, dashboardSport]);

  const handleCreateMatch = async (matchData: MatchFormData) => {
    chatLogger.debug('Match created:', matchData);

    if (!currentThread || !user) {
      chatLogger.error('Cannot create match: missing thread or user');
      toast.error('Cannot create match: missing information');
      return;
    }

    try {
      const backendUrl = getBackendBaseURL();
      const isDoubles = matchData.numberOfPlayers === 4;

      // Fetch division to check gameType and seasonId
      let partnerId: string | undefined;
      let divisionGameType: string | undefined;
      let seasonId: string | undefined;

      if (currentThread.metadata?.divisionId) {
        chatLogger.debug('Fetching division data for match creation...');

        try {
          const divisionResponse = await fetch(
            `${backendUrl}/api/division/${currentThread.metadata.divisionId}`,
            {
              method: 'GET',
              headers: { 'x-user-id': user.id }
            }
          );

          if (!divisionResponse.ok) {
            throw new Error(`Failed to fetch division: ${divisionResponse.status}`);
          }

          const divisionResult = await divisionResponse.json();
          const divisionData = divisionResult.data || divisionResult;

          divisionGameType = divisionData.gameType?.toUpperCase();
          seasonId = divisionData.seasonId || divisionData.season?.id;

          chatLogger.debug('Division info:', {
            divisionId: divisionData.id,
            gameType: divisionGameType,
            seasonId: seasonId,
          });
        } catch (error) {
          chatLogger.error('Failed to fetch division:', error);
          toast.error('Failed to fetch division details');
          return;
        }
      }

      if (divisionGameType === 'DOUBLES' && seasonId) {
        chatLogger.debug('Division is DOUBLES type, fetching partnership...');

        try {
          const partnershipResponse = await fetch(
            `${backendUrl}/api/pairing/partnership/active/${seasonId}`,
            {
              method: 'GET',
              headers: { 'x-user-id': user.id }
            }
          );

          if (!partnershipResponse.ok) {
            throw new Error(`No active partnership found for this season`);
          }

          const partnershipResult = await partnershipResponse.json();
          const partnership = partnershipResult?.data;

          if (!partnership || !partnership.id) {
            toast.warning('No partner found', {
              description: 'You need to pair up with a partner for doubles divisions',
            });
            return;
          }

          // Determine partner ID based on whether user is captain or partner
          partnerId = partnership.captainId === user.id
            ? partnership.partnerId
            : partnership.captainId;

          chatLogger.debug('Partner found:', {
            userId: user.id,
            partnerId,
            isCaptain: partnership.captainId === user.id,
          });

        } catch (error) {
          chatLogger.error('Failed to fetch partnership:', error);
          toast.error('Partner required', {
            description: error instanceof Error ? error.message : 'You must have an active partnership for doubles divisions',
          });
          return;
        }
      }

      // Extract start time from range (e.g., "2:00 PM - 4:00 PM" -> "2:00 PM")
      const extractStartTime = (timeRange: string): string => {
        if (timeRange.includes(' - ')) {
          return timeRange.split(' - ')[0].trim();
        }
        return timeRange.trim();
      };

      const convertTo24Hour = (time12h: string): string => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');

        if (hours === '12') {
          hours = modifier === 'AM' ? '00' : '12';
        } else {
          hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
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
        matchType: divisionGameType || (isDoubles ? 'DOUBLES' : 'SINGLES'),
        format: 'STANDARD',
        matchDate: dateTimeString,
        deviceTimezone,
        location: matchData.location || 'TBD',
        notes: matchData.description,
        duration: matchData.duration || 2,
        courtBooked: matchData.courtBooked || false,
        fee: matchData.fee || 'FREE',
        feeAmount: matchData.fee !== 'FREE' ? parseFloat(matchData.feeAmount || '0') : undefined,
      };

      // Add partnerId only for DOUBLES divisions
      if (divisionGameType === 'DOUBLES' && partnerId) {
        matchPayload.partnerId = partnerId;
        chatLogger.debug('Added partnerId to payload:', partnerId);
      }

      const matchResponse = await fetch(`${backendUrl}/api/match/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(matchPayload),
      });

      if (!matchResponse.ok) {
        const errorData = await matchResponse.json();
        chatLogger.error('Match creation failed:', {
          status: matchResponse.status,
          errorData,
        });
        throw new Error(errorData.error || 'Failed to create match');
      }

      const matchResult = await matchResponse.json();
      chatLogger.debug('Match created successfully:', { matchId: matchResult.id });

      // Filter participants to only include ACCEPTED (not PENDING invitations)
      const acceptedParticipants = (matchResult.participants as MatchParticipant[] || []).filter(
        (p: MatchParticipant) => p.invitationStatus === 'ACCEPTED'
      );

      chatLogger.debug('Filtered participants:', {
        total: matchResult.participants?.length,
        accepted: acceptedParticipants.length,
      });

      // Send a message to the thread with match data for UI display
      const messageContent = `📅 Match scheduled for ${matchData.date} at ${matchData.time}`;
      const messagePayload = {
        senderId: user.id,
        content: messageContent,
        messageType: 'MATCH',
        matchId: matchResult.id,
        matchData: {
          matchId: matchResult.id,
          matchType: matchResult.matchType || divisionGameType || (String(matchData.numberOfPlayers) === '4' ? 'DOUBLES' : 'SINGLES'),
          date: matchData.date,
          time: matchData.time,
          duration: matchData.duration || 2,
          numberOfPlayers: matchData.numberOfPlayers,
          location: matchData.location || 'TBD',
          fee: matchData.fee || 'FREE',
          feeAmount: matchData.feeAmount || '0.00',
          description: matchData.description,
          sportType: currentThread.sportType || 'PICKLEBALL',
          leagueName: currentThread.name || 'Match',
          courtBooked: matchData.courtBooked || false,
          status: 'SCHEDULED',
          participants: acceptedParticipants,
        },
      };

      const messageResponse = await fetch(`${backendUrl}/api/chat/threads/${currentThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(messagePayload),
      });

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error || 'Failed to send match message');
      }

      chatLogger.debug('Match message sent to thread');
      toast.success('Match created successfully!');
    } catch (error) {
      chatLogger.error('Error creating match:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create match');
    }
  };

  const handleReply = useCallback((message: Message) => {
    setReplyingTo(message);
    // Focus input to bring up keyboard
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
  }, [setReplyingTo]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, [setReplyingTo]);

  const handleLongPress = useCallback((message: Message, position?: { x: number; y: number; width: number; height: number }) => {
    chatLogger.debug('Long press on message:', message.id);
    setSelectedMessage(message);
    setMessagePosition(position);
    setShowContextMenu(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setSelectedMessage(null);
    setMessagePosition(undefined);
  }, []);

  const handleActionBarReply = useCallback(() => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage);
      // Focus input to bring up keyboard
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  }, [selectedMessage, setReplyingTo]);

  const handleActionBarCopy = useCallback(async () => {
    if (selectedMessage?.content && !selectedMessage.metadata?.isDeleted) {
      try {
        await Clipboard.setStringAsync(selectedMessage.content);
        toast.success('Message copied to clipboard');
      } catch (error) {
        chatLogger.error('Failed to copy:', error);
        toast.error('Failed to copy message');
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
        toast.success('Message deleted');
        setShowDeleteSheet(false);
        setSelectedMessage(null);
      } catch (error) {
        chatLogger.error('Failed to delete:', error);
        toast.error('Failed to delete message');
      }
    }
  }, [selectedMessage, threadId, deleteMessageFromStore]);

  // Handle closing the delete sheet
  const handleCloseDeleteSheet = useCallback(() => {
    setShowDeleteSheet(false);
    setSelectedMessage(null);
    setMessagePosition(undefined);
  }, []);

  const handleDeleteMessageAction = useCallback(async (messageId: string) => {
    if (!currentThread) {
      return;
    }
    try {
      await deleteMessageFromStore(messageId, currentThread.id);
      chatLogger.debug('Message deleted successfully');
    } catch (error) {
      chatLogger.error('Failed to delete message:', error);
      toast.error('Failed to delete message. Please try again.');
    }
  }, [currentThread, deleteMessageFromStore]);

  // Memoize header content
  const headerContent = useMemo(() => {
    if (!currentThread || !user?.id) return { title: 'Chat', subtitle: null, sportType: null, season: null, avatar: null, participantName: 'Unknown User' };

    if (currentThread.type === 'group') {
      const seasonName = currentThread.metadata?.seasonName ||
        currentThread.division?.season?.name ||
        null;

      return {
        title: currentThread.name || 'Group Chat',
        subtitle: seasonName,
        sportType: currentThread.sportType,
        avatar: null,
        participantName: 'Group Chat'
      };
    } else {
      const otherParticipant = currentThread.participants?.find(
        participant => participant.id !== user.id
      );

      if (otherParticipant) {
        return {
          title: otherParticipant.name || otherParticipant.username || 'Unknown User',
          subtitle: otherParticipant.username ? `@${otherParticipant.username}` : null,
          sportType: null,
          avatar: otherParticipant.avatar || null,
          participantName: otherParticipant.name || 'Unknown User'
        };
      } else {
        return {
          title: 'Chat',
          subtitle: null,
          sportType: null,
          avatar: null,
          participantName: 'Unknown User'
        };
      }
    }
  }, [currentThread, user?.id]);

  const sportColors = useMemo(() => getSportColors(headerContent.sportType), [headerContent.sportType]);

  // Memoize participant preview text for group chats (excluding admins)
  const participantPreview = useMemo(() => {
    if (!currentThread || currentThread.type !== 'group') return '';

    // Filter out admin users from the preview
    const visibleParticipants = filterOutAdmins(currentThread.participants);

    const participantNames = visibleParticipants
      .slice(0, 5)
      .map(p => {
        const firstName = p.name?.split(' ')[0] || p.username || 'Unknown';
        return firstName.length > 10 ? firstName.substring(0, 8) + '.' : firstName;
      });

    if (visibleParticipants.length > 5) {
      return participantNames.join(', ') + '...';
    }

    return participantNames.join(', ');
  }, [currentThread]);

  // Memoize navigation handlers for group chat header
  const handleViewStandings = useCallback(() => {
    if (!currentThread) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/match/divisionstandings',
      params: {
        divisionId: currentThread.metadata?.divisionId || currentThread.division?.id,
        divisionName: currentThread.metadata?.divisionName || currentThread.division?.name || 'Division 1',
        sportType: currentThread.sportType || 'PICKLEBALL',
        leagueName: currentThread.metadata?.leagueName || currentThread.division?.league?.name || 'League',
        seasonName: currentThread.metadata?.seasonName || currentThread.division?.season?.name || 'Season 1',
        gameType: currentThread.metadata?.gameType || currentThread.division?.gameType || 'Singles',
        genderCategory: currentThread.metadata?.genderCategory || currentThread.division?.genderCategory || '',
        seasonStartDate: currentThread.division?.season?.startDate,
        seasonEndDate: currentThread.division?.season?.endDate,
      },
    });
  }, [currentThread]);

  const handleViewAllMatches = useCallback(() => {
    if (!currentThread) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/match/all-matches',
      params: {
        divisionId: currentThread.metadata?.divisionId || currentThread.division?.id,
        sportType: currentThread.sportType || 'PICKLEBALL',
        leagueName: currentThread.metadata?.leagueName || currentThread.division?.league?.name || 'League',
        seasonName: currentThread.metadata?.seasonName || currentThread.division?.season?.name || 'Season 1',
      },
    });
  }, [currentThread]);

  // Memoize menu button handler
  const handleGroupMenuPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Show menu options
  }, []);

  // Memoize image error handler
  const handleAvatarError = useCallback(() => {
    chatLogger.debug('Profile image failed to load:', headerContent.avatar);
  }, [headerContent.avatar]);

  // Use currentThread or fall back to the thread from the store for immediate render
  const displayThread = currentThread || threads.find(t => t.id === threadId);

  // Only block rendering if we truly have no thread data anywhere
  if (!displayThread) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>{isLoadingThread ? 'Loading...' : 'Conversation not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.chatHeader, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
              onPress={handleBackToThreads}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>

            {displayThread?.type === 'group' ? (
              // Group chat header with stacked avatars
              <View style={styles.groupHeaderWrapper}>
                {/* Left section: Avatar with sport badge */}
                <View style={styles.groupHeaderAvatar}>
                  {/* Sport badge above avatar */}
                  {sportColors.label && (
                    <View style={[
                      styles.sportBadgeAboveAvatar,
                      { borderColor: sportColors.badgeColor }
                    ]}>
                      <Text style={[
                        styles.sportBadgeAboveAvatarText,
                        { color: sportColors.badgeColor }
                      ]}>{sportColors.label}</Text>
                    </View>
                  )}
                  <GroupAvatarStack
                    participants={displayThread.participants}
                    sportColor={sportColors.background}
                    size={38}
                  />
                </View>

                {/* Center section: Title, participants, action buttons */}
                <View style={styles.groupHeaderContent}>
                  <View style={styles.groupHeaderTopRow}>
                    <Text style={styles.groupHeaderTitle} numberOfLines={1}>
                      {headerContent.title}
                    </Text>
                  </View>
                  <Text style={styles.groupHeaderParticipants} numberOfLines={1}>
                    {participantPreview}
                  </Text>

                  {/* Action buttons */}
                  <View style={styles.groupActionButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.primaryActionButton,
                        { backgroundColor: sportColors.background },
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={handleViewStandings}
                    >
                      <Text style={styles.primaryActionText}>View Standings</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionButton,
                        styles.secondaryActionButton,
                        pressed && { opacity: 0.8 }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/match/all-matches',
                          params: {
                            divisionId: displayThread.metadata?.divisionId || displayThread.division?.id,
                            sportType: displayThread.sportType || 'PICKLEBALL',
                            leagueName: displayThread.metadata?.leagueName || displayThread.division?.league?.name || 'League',
                            seasonName: displayThread.metadata?.seasonName || displayThread.division?.season?.name || 'Season 1',
                            gameType: displayThread.metadata?.gameType || displayThread.division?.gameType || '',
                            genderCategory: displayThread.metadata?.genderCategory || displayThread.division?.genderCategory || '',
                            seasonStartDate: displayThread.division?.season?.startDate,
                            seasonEndDate: displayThread.division?.season?.endDate,
                          },
                        });
                      }}
                    >
                      <Text style={styles.secondaryActionText}>View All Matches</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Right section: 3-dot menu */}
                <Pressable
                  style={({ pressed }) => [styles.groupHeaderMenuButton, pressed && { opacity: 0.7 }]}
                  onPress={handleGroupMenuPress}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
                </Pressable>
              </View>
            ) : (
              // Direct chat header (original design)
              <>
                {/* Profile Picture */}
                <View style={styles.chatHeaderAvatar}>
                  {headerContent.avatar ? (
                    <Image
                      source={{ uri: headerContent.avatar }}
                      style={styles.chatHeaderAvatarImage}
                      onError={handleAvatarError}
                    />
                  ) : (
                    <View style={styles.defaultChatHeaderAvatarContainer}>
                      <Text style={styles.defaultChatHeaderAvatarText}>
                        {headerContent.participantName?.charAt(0)?.toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatHeaderContent}>
                  <View style={styles.chatHeaderTitleRow}>
                    <Text style={styles.chatHeaderTitle} numberOfLines={1}>
                      {headerContent.title}
                    </Text>
                  </View>
                  {headerContent.subtitle && (
                    <Text style={styles.chatHeaderSubtitle} numberOfLines={1}>
                      {headerContent.subtitle}
                    </Text>
                  )}
                </View>
              </>
            )}

            {/* Only show headerAction for direct chats */}
            {displayThread.type !== 'group' && (
              <Pressable style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.7 }]}>
                <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <MessageWindow
            key={refreshKey}
            messages={messages[threadId] || []}
            threadId={threadId}
            isGroupChat={displayThread.type === 'group'}
            sportType={displayThread.sportType}
            onReply={handleReply}
            onDeleteMessage={handleDeleteMessageAction}
            onLongPress={handleLongPress}
          />

          <MessageInput
              ref={messageInputRef}
              onSendMessage={handleSendMessage}
              onhandleMatch={handleMatch}
              replyingTo={replyingTo}
              onCancelReply={handleCancelReply}
              sportType={displayThread.sportType}
              isGroupChat={displayThread.type === 'group'}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#6B7280',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    width: '100%',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  chatHeaderAvatar: {
    width: isSmallScreen ? 40 : isTablet ? 48 : 44,
    height: isSmallScreen ? 40 : isTablet ? 48 : 44,
    borderRadius: isSmallScreen ? 20 : isTablet ? 24 : 22,
    overflow: 'hidden',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chatHeaderAvatarImage: {
    width: '100%',
    height: '100%',
  },
  defaultChatHeaderAvatarContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultChatHeaderAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  chatHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatHeaderTitle: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    flexShrink: 1,
  },
  chatHeaderSubtitle: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: isSmallScreen ? 14 : isTablet ? 18 : 16,
  },
  headerAction: {
    padding: 4,
  },
  // Group chat header styles
  groupHeaderWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  groupHeaderAvatar: {
    marginRight: 12,
    alignItems: 'center',
  },
  groupHeaderMenuButton: {
    padding: 8,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
  sportBadgeAboveAvatar: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  sportBadgeAboveAvatarText: {
    fontSize: 9,
    fontWeight: '600',
  },
  groupHeaderContent: {
    flex: 1,
    justifyContent: 'center',
  },
  groupHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  groupHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  groupHeaderParticipants: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  groupActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButton: {
    backgroundColor: '#A04DFE',
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
});
