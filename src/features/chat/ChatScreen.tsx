import { getBackendBaseURL } from '@/config/network';
import { authClient, useSession } from '@/lib/auth-client';
import { NavBar } from '@/shared/components/layout';
import { AnimatedFilterChip } from '@/shared/components/ui/AnimatedFilterChip';
import { SegmentedControl } from '@/shared/components/ui/SegmentedControl';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { ThreadList } from './components/chat-list';
import { NewMessageBottomSheet } from './components/NewMessageBottomSheet';
import { useChatSocketEvents } from './hooks/useChatSocketEvents';
import { ChatService } from './services/ChatService';
import { useChatStore } from './stores/ChatStore';

import { Thread } from './types';

type SportFilter = 'all' | 'pickleball' | 'tennis' | 'padel';
type TypeFilter = 'all' | 'personal' | 'league';

const SPORT_COLORS = {
  all: '#111827',
  pickleball: '#A04DFE',
  tennis: '#65B741',
  padel: '#3B82F6',
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

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface ChatScreenProps {
  activeTab?: number;
  onTabPress?: (tabIndex: number) => void;
  sport?: 'pickleball' | 'tennis' | 'padel';
  chatUnreadCount?: number;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  activeTab = 4,
  onTabPress,
  sport = 'pickleball',
  chatUnreadCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: session } = useSession();
  const user = session?.user;

  // Register socket event listeners for real-time chat list updates
  useChatSocketEvents(null, user?.id || '');

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [showNewMessageSheet, setShowNewMessageSheet] = useState(false);
  const [appStateKey, setAppStateKey] = useState(0);
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  // Entry animation values - only for thread list
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

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
        Animated.parallel([
          Animated.spring(contentEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(contentEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]).start();
      });
    }
  }, [isLoading, contentEntryOpacity, contentEntryTranslateY]);

  // Handle app state changes to fix touch issues after backgrounding
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        timeoutId = setTimeout(() => {
          setAppStateKey(prev => prev + 1);
        }, 100);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

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
  }, [session?.user?.id]);

  const fetchProfileData = async () => {
    try {
      if (!session?.user?.id) {
        chatLogger.debug("No session user ID available for profile data");
        return;
      }

      const backendUrl = getBackendBaseURL();
      chatLogger.debug("Fetching profile data from:", `${backendUrl}/api/player/profile/me`);

      const authResponse = await authClient.$fetch(
        `${backendUrl}/api/player/profile/me`,
        {
          method: "GET",
        }
      ) as AuthResponse | null;

      if (authResponse?.data?.data) {
        chatLogger.debug("Setting profile data:", authResponse.data.data);
        setProfileData(authResponse.data.data);
      } else if (authResponse?.data) {
        chatLogger.debug("Setting profile data (direct):", authResponse.data);
        setProfileData(authResponse.data as ProfileData);
      } else {
        chatLogger.error("No profile data received from authClient");
      }
    } catch (error) {
      chatLogger.error("Error fetching profile data:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadThreads(user.id);
    setConnectionStatus(true);
  }, [user]);

  // Filter threads based on search, sport, and type filters
  const displayedThreads = useMemo(() => {
    if (!threads) return [];

    return threads.filter(thread => {
      // Search filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          thread.name?.toLowerCase().includes(query) ||
          thread.participants?.some(participant =>
            participant.name?.toLowerCase().includes(query)
          ) ||
          thread.lastMessage?.content.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Sport filter
      if (sportFilter !== 'all') {
        const threadSport = thread.sportType?.toLowerCase();
        if (threadSport !== sportFilter) {
          // For direct chats without sport type, include them in 'all' only
          if (!threadSport && thread.type === 'direct') {
            return false;
          }
          if (threadSport && threadSport !== sportFilter) {
            return false;
          }
        }
      }

      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'personal' && thread.type !== 'direct') return false;
        if (typeFilter === 'league' && thread.type !== 'group') return false;
      }

      return true;
    });
  }, [threads, searchQuery, sportFilter, typeFilter]);

  // Handle keyboard hide to blur search input on Android
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      if (Platform.OS === 'android') {
        searchInputRef.current?.blur();
      }
    });

    return () => {
      keyboardHideListener.remove();
    };
  }, []);

  const handleThreadSelect = useCallback(async (thread: Thread) => {
    chatLogger.debug('Thread selected:', thread.name);

    // Store thread in store for the chat screen to access
    setCurrentThread(thread);

    // Mark thread as read when opening it
    if (user?.id && thread.unreadCount > 0) {
      chatLogger.debug('Marking thread as read, unread count:', thread.unreadCount);
      try {
        await ChatService.markAllAsRead(thread.id, user.id);
        chatLogger.debug('Thread marked as read successfully');
        updateThread({
          ...thread,
          unreadCount: 0,
        });
      } catch (error) {
        chatLogger.error('Error marking thread as read:', error);
      }
    }

    // Navigate to chat thread using native navigation
    // Pass the dashboard's selected sport so it can be used for friendly match requests
    router.push({
      pathname: '/chat/[threadId]',
      params: { threadId: thread.id, sport }
    });
  }, [user?.id, setCurrentThread, updateThread, sport]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Memoize handlers for NewMessageBottomSheet
  const handleCloseNewMessageSheet = useCallback(() => {
    setShowNewMessageSheet(false);
  }, []);

  const handleSelectUser = useCallback(async (userId: string, userName: string) => {
    if (!user?.id) {
      toast.error('Please log in to start a conversation');
      return;
    }

    try {
      chatLogger.debug('Creating/finding thread with user:', userId, userName);

      // Create or find existing direct message thread
      const thread = await ChatService.createThread(
        user.id,
        [userId],
        false // isGroup = false for direct messages
      );

      chatLogger.debug('Thread created/found:', thread.id, thread.name);

      // Close the bottom sheet
      setShowNewMessageSheet(false);

      // Set the thread as current
      setCurrentThread(thread);

      // Refresh the threads list to include the new thread
      loadThreads(user.id);

      // Navigate to the chat thread using native navigation
      router.push({
        pathname: '/chat/[threadId]',
        params: { threadId: thread.id }
      });

    } catch (error) {
      chatLogger.error('Error creating thread:', error);
      toast.error('Failed to start conversation. Please try again.');
    }
  }, [user?.id, setCurrentThread, loadThreads]);

  const handleOpenNewMessage = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Blur search input and dismiss keyboard before opening bottom sheet
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    // Small delay to let keyboard fully dismiss before opening bottom sheet
    setTimeout(() => {
      setShowNewMessageSheet(true);
    }, 100);
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
        <View style={[styles.chatsHeaderContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <Text style={styles.chatsTitle}>Chats</Text>
          <Pressable
            onPress={handleOpenNewMessage}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={styles.newMessageButton}>New Message</Text>
          </Pressable>
        </View>

        {/* Search and filters - No animation, instant */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search chats..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={clearSearch}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter section - No animation, instant */}
        <View style={styles.filterSection}>
          {/* Type filter - Segmented control */}
          <View style={styles.typeFilterContainer}>
            <SegmentedControl
              options={[
                { value: 'all' as TypeFilter, label: 'All' },
                { value: 'personal' as TypeFilter, label: 'Personal' },
                { value: 'league' as TypeFilter, label: 'League' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
              activeColor={SPORT_COLORS[sportFilter]}
            />
          </View>

          {/* Sport filter chips */}
          <View style={styles.sportFilterContainer}>
            <AnimatedFilterChip
              label="All"
              isActive={sportFilter === 'all'}
              activeColor={SPORT_COLORS.all}
              onPress={() => setSportFilter('all')}
            />
            <AnimatedFilterChip
              label="Pickleball"
              isActive={sportFilter === 'pickleball'}
              activeColor={SPORT_COLORS.pickleball}
              onPress={() => setSportFilter('pickleball')}
            />
            <AnimatedFilterChip
              label="Tennis"
              isActive={sportFilter === 'tennis'}
              activeColor={SPORT_COLORS.tennis}
              onPress={() => setSportFilter('tennis')}
            />
            <AnimatedFilterChip
              label="Padel"
              isActive={sportFilter === 'padel'}
              activeColor={SPORT_COLORS.padel}
              onPress={() => setSportFilter('padel')}
            />
          </View>
        </View>

        {/* Thread list or Empty state - Both Animated */}
        <Animated.View
          style={{
            flex: 1,
            opacity: contentEntryOpacity,
            transform: [{ translateY: contentEntryTranslateY }],
          }}
        >
          {displayedThreads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-outline" size={64} color="#9CA3AF" />
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
        {onTabPress && (
          <NavBar
            activeTab={activeTab}
            onTabPress={onTabPress}
            sport={sport}
            badgeCounts={{ chat: chatUnreadCount }}
          />
        )}
      </View>

      {/* New Message Bottom Sheet - Always rendered, visibility controlled via present/dismiss */}
      <NewMessageBottomSheet
        visible={showNewMessageSheet}
        onClose={handleCloseNewMessageSheet}
        onSelectUser={handleSelectUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  threadsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  chatsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 4,
  },
  chatsTitle: {
    fontSize: isSmallScreen ? 28 : isTablet ? 36 : 32,
    fontWeight: '700',
    color: '#111827',
  },
  newMessageButton: {
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#FEA04D',
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  typeFilterContainer: {
    width: '100%',
  },
  sportFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 120,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
