import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { AnimatedFilterChip } from "@/shared/components/ui/AnimatedFilterChip";
import { SegmentedControl } from "@/shared/components/ui/SegmentedControl";
import { chatLogger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
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
  Animated,
  AppState,
  AppStateStatus,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThreadList } from "./components/chat-list";
import { useChatSocketEvents } from "./hooks/useChatSocketEvents";
import { ChatService } from "./services/ChatService";
import { useChatStore } from "./stores/ChatStore";

import { Thread } from "./types";

type SportFilter = "all" | "pickleball" | "tennis" | "padel";
type TypeFilter = "all" | "personal" | "league";

const SPORT_COLORS = {
  all: "#111827",
  pickleball: "#A04DFE",
  tennis: "#65B741",
  padel: "#3B82F6",
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

// Profile data interface for API response
interface ProfileData {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  [key: string]: unknown;
}

// Auth response interface
interface AuthResponse {
  data?: {
    data?: ProfileData;
  } & ProfileData;
}

interface ChatScreenProps {
  sport?: "pickleball" | "tennis" | "padel";
  chatUnreadCount?: number;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  sport = "pickleball",
  chatUnreadCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useSession();
  const user = session?.user;

  // Register socket event listeners for real-time chat list updates
  useChatSocketEvents(null, user?.id || "");

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [appStateKey, setAppStateKey] = useState(0);
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Entry animation values - only for thread list
  const contentEntryOpacity = useRef(new Animated.Value(1)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(0)).current;
  const hasPlayedEntryAnimation = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const profileFetchAbortRef = useRef<AbortController | null>(null);

  const STATUS_BAR_HEIGHT = insets.top;

  const {
    threads,
    isLoading,
    error,
    setCurrentThread,
    loadThreads,
    setConnectionStatus,
    updateThread,
  } = useChatStore();

  // Trigger entry animation when loading is done - for thread list and empty state
  useEffect(() => {
    // Trigger animation when not loading (either has threads or empty state)
    if (!isLoading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      // Use requestAnimationFrame to ensure the view is rendered before animating
      requestAnimationFrame(() => {
        // Store animation reference for cleanup
        animationRef.current = Animated.parallel([
          Animated.spring(contentEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(contentEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]);
        animationRef.current.start();
      });
    }

    // Cleanup: stop animation on unmount to prevent memory leaks
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isLoading, contentEntryOpacity, contentEntryTranslateY]);

  // Handle app state changes to fix touch issues after backgrounding
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Clear any existing timeout to prevent accumulation
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          // Check if still mounted before updating state
          if (isMountedRef.current) {
            setAppStateKey((prev) => prev + 1);
          }
        }, 100);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      subscription.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileData();
    }
    // Cleanup: abort profile fetch on unmount
    return () => {
      if (profileFetchAbortRef.current) {
        profileFetchAbortRef.current.abort();
        profileFetchAbortRef.current = null;
      }
    };
  }, [session?.user?.id]);

  const fetchProfileData = async () => {
    try {
      if (!session?.user?.id) {
        chatLogger.debug("No session user ID available for profile data");
        return;
      }

      // Cancel any previous fetch
      if (profileFetchAbortRef.current) {
        profileFetchAbortRef.current.abort();
      }
      profileFetchAbortRef.current = new AbortController();

      chatLogger.debug("Fetching profile data from:", "/api/player/profile/me");

      const response = await axiosInstance.get("/api/player/profile/me", {
        signal: profileFetchAbortRef.current.signal,
      });

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      if (response?.data?.data) {
        // chatLogger.debug("Setting profile data:", response.data.data);
        setProfileData(response.data.data);
      } else if (response?.data) {
        // chatLogger.debug("Setting profile data (direct):", response.data);
        setProfileData(response.data as ProfileData);
      } else {
        chatLogger.error("No profile data received");
      }
    } catch (error: unknown) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") return;
      chatLogger.error("Error fetching profile data:", error);
    }
  };

  // Initialize isMountedRef and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load threads when user ID changes (not user object - avoids unnecessary reloads)
  useEffect(() => {
    if (!user?.id) return;
    loadThreads(user.id);
    setConnectionStatus(true);
  }, [user?.id, loadThreads, setConnectionStatus]);

  // TODO(message-search): Search is thread-level only (thread name, participants, last message).
  // Message-level search within a thread would require full-text search on messages table.

  // Filter threads based on search, sport, and type filters
  const displayedThreads = useMemo(() => {
    if (!threads) return [];

    return threads.filter((thread) => {
      // Search filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          thread.name?.toLowerCase().includes(query) ||
          thread.participants?.some((participant) =>
            participant.name?.toLowerCase().includes(query),
          ) ||
          thread.lastMessage?.content.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Sport filter
      if (sportFilter !== "all") {
        const threadSport = thread.sportType?.toLowerCase();
        if (threadSport !== sportFilter) {
          // For direct chats without sport type, include them in 'all' only
          if (!threadSport && thread.type === "direct") {
            return false;
          }
          if (threadSport && threadSport !== sportFilter) {
            return false;
          }
        }
      }

      // Type filter
      if (typeFilter !== "all") {
        if (typeFilter === "personal" && thread.type !== "direct") return false;
        if (typeFilter === "league" && thread.type !== "group") return false;
      }

      return true;
    });
  }, [threads, searchQuery, sportFilter, typeFilter]);

  // Handle keyboard hide to blur search input on Android
  useEffect(() => {
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === "android") {
        searchInputRef.current?.blur();
      }
    });

    return () => {
      keyboardHideListener.remove();
    };
  }, []);

  const handleThreadSelect = useCallback(
    async (thread: Thread) => {
      chatLogger.debug("Thread selected:", thread.name);

      // Store thread in store for the chat screen to access
      setCurrentThread(thread);

      // Navigate to chat thread using native navigation first (faster UX)
      // Pass the dashboard's selected sport so it can be used for friendly match requests
      router.push({
        pathname: "/chat/[threadId]",
        params: { threadId: thread.id, sport },
      });

      // Mark thread as read in background after navigation
      if (user?.id && thread.unreadCount > 0) {
        chatLogger.debug(
          "Marking thread as read, unread count:",
          thread.unreadCount,
        );
        try {
          await ChatService.markAllAsRead(thread.id, user.id);
          // Check if still mounted before updating state
          if (!isMountedRef.current) return;
          chatLogger.debug("Thread marked as read successfully");
          updateThread({
            ...thread,
            unreadCount: 0,
          });
        } catch (error) {
          chatLogger.error("Error marking thread as read:", error);
        }
      }
    },
    [user?.id, setCurrentThread, updateThread, sport],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Memoized filter handlers to prevent re-renders
  const handleSportFilterAll = useCallback(() => setSportFilter("all"), []);
  const handleSportFilterPickle = useCallback(
    () => setSportFilter("pickleball"),
    [],
  );
  const handleSportFilterTennis = useCallback(
    () => setSportFilter("tennis"),
    [],
  );
  const handleSportFilterPadel = useCallback(() => setSportFilter("padel"), []);

  // Memoized SegmentedControl options to prevent re-renders
  const typeFilterOptions = useMemo(
    () => [
      { value: "all" as TypeFilter, label: "All" },
      { value: "personal" as TypeFilter, label: "Personal" },
      { value: "league" as TypeFilter, label: "League" },
    ],
    [],
  );

  // Memoized animated container style
  const animatedContainerStyle = useMemo(
    () => ({
      flex: 1,
      opacity: contentEntryOpacity,
      transform: [{ translateY: contentEntryTranslateY }],
    }),
    [contentEntryOpacity, contentEntryTranslateY],
  );

  const handleOpenNewMessage = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    // Blur search input and dismiss keyboard before navigating
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    // Navigate to the new message modal screen
    router.push("/chat/new-message");
  }, []);

  // Only show error UI if there's an error and no threads to display
  if (error && (!threads || threads.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Text style={styles.errorSubtext}>Pull down to retry</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.threadsContainer}>
        {/* Header with Chats title and New Message button - No animation, instant */}
        <View
          style={[
            styles.chatsHeaderContainer,
            { paddingTop: STATUS_BAR_HEIGHT },
          ]}
        >
          <Text style={styles.chatsTitle}>Chats</Text>
          <Pressable
            onPress={handleOpenNewMessage}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
            accessibilityLabel="New message"
            accessibilityRole="button"
            accessibilityHint="Start a new conversation"
          >
            <Text style={styles.newMessageButton}>New Message</Text>
          </Pressable>
        </View>

        {/* Search and filters - No animation, instant */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={moderateScale(18)}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search chats..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              accessibilityLabel="Search chats"
              accessibilityHint="Type to search conversations"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={clearSearch}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons
                  name="close-circle"
                  size={moderateScale(18)}
                  color="#9CA3AF"
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter section - No animation, instant */}
        <View style={styles.filterSection}>
          {/* Type filter - Segmented control */}
          <View style={styles.typeFilterContainer}>
            <SegmentedControl
              options={typeFilterOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              activeColor={SPORT_COLORS[sportFilter]}
            />
          </View>

          {/* Sport filter chips */}
          <View style={styles.sportFilterContainer}>
            <AnimatedFilterChip
              label="All"
              isActive={sportFilter === "all"}
              activeColor={SPORT_COLORS.all}
              onPress={handleSportFilterAll}
            />
            <AnimatedFilterChip
              label="Pickleball"
              isActive={sportFilter === "pickleball"}
              activeColor={SPORT_COLORS.pickleball}
              onPress={handleSportFilterPickle}
            />
            <AnimatedFilterChip
              label="Tennis"
              isActive={sportFilter === "tennis"}
              activeColor={SPORT_COLORS.tennis}
              onPress={handleSportFilterTennis}
            />
            <AnimatedFilterChip
              label="Padel"
              isActive={sportFilter === "padel"}
              activeColor={SPORT_COLORS.padel}
              onPress={handleSportFilterPadel}
            />
          </View>
        </View>

        {/* Thread list or Empty state - Both Animated */}
        <Animated.View style={animatedContainerStyle}>
          {displayedThreads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="chatbubble-outline"
                size={moderateScale(64)}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyDescription}>
                Start a conversation by tapping "New Message" above
              </Text>
            </View>
          ) : (
            <ThreadList
              key={`thread-list-${appStateKey}`}
              onThreadSelect={handleThreadSelect}
              threads={displayedThreads}
            />
          )}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  threadsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(10),
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(10),
    height: verticalScale(36),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: scale(6),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13),
    color: "#1F2937",
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: moderateScale(20),
  },
  errorText: {
    fontSize: moderateScale(16),
    color: "#DC2626",
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  errorSubtext: {
    fontSize: moderateScale(14),
    color: "#9CA3AF",
    textAlign: "center",
  },
  chatsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(16),
    marginBottom: verticalScale(4),
  },
  chatsTitle: {
    fontSize: moderateScale(32),
    fontWeight: "700",
    color: "#111827",
  },
  newMessageButton: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#FEA04D",
  },
  filterSection: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    gap: verticalScale(10),
  },
  typeFilterContainer: {
    width: "100%",
  },
  sportFilterContainer: {
    flexDirection: "row",
    gap: scale(8),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(32),
    paddingBottom: verticalScale(120),
    gap: verticalScale(12),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#111827",
  },
  emptyDescription: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    textAlign: "center",
  },
});
