import { getBackendBaseURL } from '@/config/network';
import { getSportColors } from '@/constants/SportsColor';
import { authClient, useSession } from '@/lib/auth-client';
import { NavBar } from '@/shared/components/layout';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { MessageInput } from './components/chat-input';
import { ThreadList } from './components/chat-list';
import { MessageWindow } from './components/chat-window';
import { MatchFormData } from './components/CreateMatchScreen';
import { GroupAvatarStack } from './components/GroupAvatarStack';
import { MessageActionBar } from './components/MessageActionBar';
import { NewMessageBottomSheet } from './components/NewMessageBottomSheet';
import { useChatSocketEvents } from './hooks/useChatSocketEvents';
import { ChatService } from './services/ChatService';
import { useChatStore } from './stores/ChatStore';
import { useCreateMatchStore } from './stores/CreateMatchStore';

import { Thread } from './types';

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
  const { data: session} = useSession();
  const [filteredThreads, setFilteredThreads] = useState<Thread[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showActionBar, setShowActionBar] = useState(false);
  const [showNewMessageSheet, setShowNewMessageSheet] = useState(false);
  const [appStateKey, setAppStateKey] = useState(0); // Force re-render on app resume
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const searchInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { setThreadMetadata, pendingMatchData, clearPendingMatch } = useCreateMatchStore();
  
  const user = session?.user;
  const STATUS_BAR_HEIGHT = insets.top;
  
  const {
    currentThread,
    messages,
    threads,
    isLoading,
    error,
    replyingTo,
    setCurrentThread,
    loadMessages,
    loadThreads,
    sendMessage,
    addMessage,
    setConnectionStatus,
    updateThread,
    setReplyingTo,
    handleDeleteMessage: deleteMessageFromStore,
  } = useChatStore();

  // Setup Socket.IO event listeners for real-time chat
  const { isConnected: socketConnected } = useChatSocketEvents(
    currentThread?.id || null,
    user?.id || ''
  );

  // Force re-render when messages change
  useEffect(() => {
    if (currentThread?.id && messages[currentThread.id]) {
      console.log('💬 Messages updated for current thread:', messages[currentThread.id].length);
      setRefreshKey(prev => prev + 1);
    }
  }, [messages, currentThread?.id]);

  // Handle app state changes to fix touch issues after backgrounding
  // This forces a re-render which helps reset any stuck gesture handler state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 ChatScreen: App came to foreground, forcing re-render');
        // Small delay to let gesture handler state settle
        setTimeout(() => {
          setAppStateKey(prev => prev + 1);
        }, 100);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle pending match data when returning from create-match page
  useEffect(() => {
    if (pendingMatchData && currentThread) {
      console.log('📋 Processing pending match data:', pendingMatchData);
      handleCreateMatch(pendingMatchData);
      clearPendingMatch();
    }
  }, [pendingMatchData, currentThread]);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileData();
    }
  }, [session?.user?.id]);

  const fetchProfileData = async () => {
    try {
      if (!session?.user?.id) {
        console.log(
          "ChatScreen: No session user ID available for profile data"
        );
        return;
      }

      const backendUrl = getBackendBaseURL();
      console.log(
        "ChatScreen: Fetching profile data from:",
        `${backendUrl}/api/player/profile/me`
      );

      const authResponse = await authClient.$fetch(
        `${backendUrl}/api/player/profile/me`,
        {
          method: "GET",
        }
      );

      if (
        authResponse &&
        (authResponse as any).data &&
        (authResponse as any).data.data
      ) {
        console.log(
          "ChatScreen: Setting profile data:",
          (authResponse as any).data.data
        );
        setProfileData((authResponse as any).data.data);
      } else if (authResponse && (authResponse as any).data) {
        console.log(
          "ChatScreen: Setting profile data (direct):",
          (authResponse as any).data
        );
        setProfileData((authResponse as any).data);
      } else {
        console.error(
          "ChatScreen: No profile data received from authClient"
        );
      }
    } catch (error) {
      console.error("ChatScreen: Error fetching profile data:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadThreads(user.id);
    setConnectionStatus(true);
  }, [user]);

  useEffect(() => {
    setFilteredThreads(threads || []);
  }, [threads]);

  useEffect(() => {
    if (currentThread) {
      loadMessages(currentThread.id);
    }
  }, [currentThread]);

  useEffect(() => {
    if (!threads) return;

    if (searchQuery.trim() === '') {
      setFilteredThreads(threads);
    } else {
      const filtered = threads.filter(thread =>
        thread.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.participants.some(participant =>
          participant.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        thread.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredThreads(filtered);
    }
  }, [searchQuery, threads]);

  // Handle Android back button to go back from chat to thread list
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentThread) {
        handleBackToThreads();
        return true; // Prevent default back behavior
      }
      return false; // Let default back behavior happen (exit app or go back in navigation)
    });

    return () => backHandler.remove();
  }, [currentThread]);

  // Handle keyboard hide to blur search input on Android
  // This ensures the focus state matches the keyboard state
  useEffect(() => {
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      // Blur search input when keyboard hides (e.g., Android back button)
      if (Platform.OS === 'android') {
        searchInputRef.current?.blur();
      }
    });

    return () => {
      keyboardHideListener.remove();
    };
  }, []);

  const handleThreadSelect = async (thread: Thread) => {
    console.log('ChatScreen: Thread selected:', thread.name);
    setCurrentThread(thread);
    
    // Mark thread as read when opening it
    if (user?.id && thread.unreadCount > 0) {
      console.log('ChatScreen: Marking thread as read, unread count:', thread.unreadCount);
      try {
        await ChatService.markAllAsRead(thread.id, user.id);
        console.log('ChatScreen: Thread marked as read successfully');
        updateThread({
          ...thread,
          unreadCount: 0,
        });
      } catch (error) {
        console.error('ChatScreen: Error marking thread as read:', error);
      }
    }
  };

  const handleSendMessage = (content: string, replyToId?: string) => {
    if (!currentThread || !user?.id) return;

    console.log('Sending message:', {
      threadId: currentThread.id,
      senderId: user.id,
      content,
      replyToId,
    });

    sendMessage(currentThread.id, user.id, content, replyToId);
    
    if (replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleBackToThreads = () => {
    setCurrentThread(null);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

 const handleMatch = () => {
    console.log('Create match button pressed');
    if (!currentThread || !user) return;
    
    // Check if this is a direct chat (1-on-1)
    if (currentThread.type === 'direct') {
      // Find the recipient (other participant)
      const recipient = currentThread.participants.find(p => p.id !== user.id);
      
      if (!recipient) {
        console.error('Cannot find recipient for friendly match request');
        return;
      }
      
      // Navigate to friendly match creation screen with request params
      router.push({
        pathname: '/friendly/create',
        params: {
          isRequest: 'true',
          recipientId: recipient.id,
          threadId: currentThread.id,
          sportType: currentThread.sportType || 'PICKLEBALL',
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
  };

  const handleCreateMatch = async (matchData: MatchFormData) => {
    console.log('Match created:', matchData);
    
    if (!currentThread || !user) {
      console.error('Cannot create match: missing thread or user');
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
        console.log('🔍 Fetching division data for match creation...');
        
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
          
          console.log('✅ Division info:', {
            divisionId: divisionData.id,
            gameType: divisionGameType,
            seasonId: seasonId,
          });
        } catch (error) {
          console.error('❌ Failed to fetch division:', error);
          toast.error('Failed to fetch division details');
          return;
        }
      }
      
      if (divisionGameType === 'DOUBLES' && seasonId) {
        console.log('🎾 Division is DOUBLES type, fetching partnership...');
        
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
          
          console.log('✅ Partner found:', {
            userId: user.id,
            partnerId,
            isCaptain: partnership.captainId === user.id,
          });
          
        } catch (error) {
          console.error('❌ Failed to fetch partnership:', error);
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
      
      // TIMEZONE HANDLING:
      // User selects time in their local timezone using device picker
      // We send the time + device timezone to backend
      // Backend converts from device timezone → Malaysia timezone → UTC for storage
      const dateTimeString = `${matchData.date}T${time24}:00`;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
  
      const matchPayload: any = {
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
        console.log('✅ Added partnerId to payload:', partnerId);
      }
      
      // console.log('📤 Creating match with payload:', {
      //   payload: matchPayload,
      //   payloadString: JSON.stringify(matchPayload, null, 2),
      //   endpoint: `${backendUrl}/api/match/create`,
      //   userId: user.id,
      //   isDoubles,
      //   hasPartnerId: !!partnerId
      // });
      
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
        console.error('❌ Match creation failed:', {
          status: matchResponse.status,
          errorData,
          originalPayload: matchPayload
        });
        throw new Error(errorData.error || 'Failed to create match');
      }

      const matchResult = await matchResponse.json();
      console.log('✅ Match created successfully:', {
        matchId: matchResult.id,
        fullResult: matchResult
      });

      // Filter participants to only include ACCEPTED (not PENDING invitations)
      const acceptedParticipants = matchResult.participants?.filter(
        (p: any) => p.invitationStatus === 'ACCEPTED'
      ) || [];

      console.log('✅ Filtered participants:', {
        total: matchResult.participants?.length,
        accepted: acceptedParticipants.length,
        participants: acceptedParticipants
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

      console.log('✅ Match message sent to thread');
      toast.success('Match created successfully!');
    } catch (error) {
      console.error('❌ Error creating match:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create match');
    }
  };

  const handleReply = (message: any) => {
    // console.log('📝 Reply to message:', message.id);
    // console.log('📝 Message content:', message.content);
    // console.log('📝 Message sender:', message.metadata?.sender);
    // console.log('📝 Full message object:', JSON.stringify(message, null, 2));
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleLongPress = (message: any) => {
    console.log('Long press on message:', message.id);
    setSelectedMessage(message);
    setShowActionBar(true);
  };

  const handleCloseActionBar = () => {
    setShowActionBar(false);
    setSelectedMessage(null);
  };

  const handleActionBarReply = () => {
    if (selectedMessage) {
      handleReply(selectedMessage);
    }
  };

  const handleActionBarCopy = async () => {
    if (selectedMessage?.content && !selectedMessage.metadata?.isDeleted) {
      try {
        await Clipboard.setStringAsync(selectedMessage.content);
        toast.success('Message copied to clipboard');
      } catch (error) {
        console.error('Failed to copy:', error);
        toast.error('Failed to copy message');
      }
    }
  };

  const handleActionBarDelete = async () => {
    if (selectedMessage) {
      // Show confirmation toast
      toast('Delete this message?', {
        action: {
          label: 'Delete',
          onClick: async () => {
            try {
              await deleteMessageFromStore(selectedMessage.id, currentThread?.id || '');
              toast.success('Message deleted');
            } catch (error) {
              console.error('Failed to delete:', error);
              toast.error('Failed to delete message');
            }
          },
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {},
        },
      });
    }
  };

  const handleDeleteMessageAction = async (messageId: string) => {
    if (!currentThread) {
      return;
    }
    try {
      await deleteMessageFromStore(messageId, currentThread.id);
      console.log('✅ Message deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      toast.error('Failed to delete message. Please try again.');
    }
  };

  // Get header content based on chat type
  const getHeaderContent = () => {
    if (!currentThread || !user?.id) return { title: 'Chat', subtitle: null, sportType: null, season: null, avatar: null, participantName: 'Unknown User' };

    if (currentThread.type === 'group') {
      // Group chat: show group name and participant count
      // Get season name from thread metadata
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
      // Direct chat: show other participant's name and username
      const otherParticipant = currentThread.participants.find(
        participant => participant.id !== user.id
      );
      
      if (otherParticipant) {
        return {
          title: otherParticipant.name || otherParticipant.username || 'Unknown User',
          subtitle: otherParticipant.username ? `@${otherParticipant.username}` : null,
          sportType: null,
          avatar: otherParticipant.avatar || (otherParticipant as any)?.image || null,
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
  };

  const headerContent = getHeaderContent();
  const sportColors = getSportColors(headerContent.sportType);

  // Generate participant preview text for group chats
  const getParticipantPreview = () => {
    if (!currentThread || currentThread.type !== 'group') return '';
    
    const participantNames = currentThread.participants
      .slice(0, 5) // Show first 5 participants
      .map(p => {
        // Get first name only
        const firstName = p.name?.split(' ')[0] || p.username || 'Unknown';
        // Shorten long names
        return firstName.length > 10 ? firstName.substring(0, 8) + '.' : firstName;
      });
    
    // Add ellipsis if there are more participants
    if (currentThread.participants.length > 5) {
      return participantNames.join(', ') + '...';
    }
    
    return participantNames.join(', ');
  };

  if (isLoading && (!threads || threads.length === 0)) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#863A73" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </View>
    );
  }

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
      
      {/* Uncomment to see socket debug info */}
      {/* <SocketDebugPanel /> */}
      
      {currentThread ? (
        <SafeAreaView style={styles.chatContainer} edges={['bottom']}>
          <KeyboardAvoidingView
            style={styles.chatContainerInner}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
          {/* Message Action Bar */}
          <MessageActionBar
            visible={showActionBar}
            isCurrentUser={selectedMessage?.senderId === user?.id}
            onReply={handleActionBarReply}
            onCopy={handleActionBarCopy}
            onDelete={handleActionBarDelete}
            onClose={handleCloseActionBar}
          />

          <View style={[styles.chatHeader, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
              onPress={handleBackToThreads}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
            
            {currentThread?.type === 'group' ? (
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
                    participants={currentThread.participants}
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
                    {getParticipantPreview()}
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
                      onPress={() => {
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
                      }}
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
                            divisionId: currentThread.metadata?.divisionId || currentThread.division?.id,
                            sportType: currentThread.sportType || 'PICKLEBALL',
                            leagueName: currentThread.metadata?.leagueName || currentThread.division?.league?.name || 'League',
                            seasonName: currentThread.metadata?.seasonName || currentThread.division?.season?.name || 'Season 1',
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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // TODO: Show menu options
                  }}
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
                      onError={() => {
                        console.log('Profile image failed to load:', headerContent.avatar);
                      }}
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

            {/* Only show headerAction for direct chats (group chats have their own menu button) */}
            {currentThread.type !== 'group' && (
              <Pressable style={({ pressed }) => [styles.headerAction, pressed && { opacity: 0.7 }]}>
                <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
              </Pressable>
            )}
          </View>
          
          <MessageWindow
            key={refreshKey}
            messages={messages[currentThread.id] || []}
            threadId={currentThread.id}
            isGroupChat={currentThread.type === 'group'}
            sportType={currentThread.sportType}
            onReply={handleReply}
            onDeleteMessage={handleDeleteMessageAction}
            onLongPress={handleLongPress}
          />
          
          <MessageInput 
            onSendMessage={handleSendMessage}
            onhandleMatch={handleMatch}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
            sportType={currentThread.sportType}
            isGroupChat={currentThread.type === 'group'}
          />
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : (
        <View style={styles.threadsContainer}>
          {/* Header with Chats title and New Message button */}
          <View style={[styles.chatsHeaderContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
            <Text style={styles.chatsTitle}>Chats</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Blur search input and dismiss keyboard before opening bottom sheet
                searchInputRef.current?.blur();
                Keyboard.dismiss();
                // Small delay to let keyboard fully dismiss before opening bottom sheet
                // This prevents gesture handler conflicts
                setTimeout(() => {
                  setShowNewMessageSheet(true);
                }, 100);
              }}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={styles.newMessageButton}>New Message</Text>
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                blurOnSubmit={true}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </Pressable>
              )}
            </View>
          </View>
           <ThreadList
            key={`thread-list-${appStateKey}`}
            onThreadSelect={handleThreadSelect}
          />
          {onTabPress && (
            <NavBar
              activeTab={activeTab}
              onTabPress={onTabPress}
              sport={sport}
              badgeCounts={{ chat: chatUnreadCount }}
            />
          )}
        </View>
      )}


      {/* New Message Bottom Sheet - Only render when needed to prevent touch blocking */}
      {showNewMessageSheet && (
        <NewMessageBottomSheet
          visible={showNewMessageSheet}
          onClose={() => setShowNewMessageSheet(false)}
          onSelectUser={async (userId, userName) => {
            if (!user?.id) {
              toast.error('Please log in to start a conversation');
              return;
            }

            try {
              console.log('Creating/finding thread with user:', userId, userName);

              // Create or find existing direct message thread
              const thread = await ChatService.createThread(
                user.id,
                [userId],
                false // isGroup = false for direct messages
              );

              console.log('Thread created/found:', thread.id, thread.name);

              // Close the bottom sheet
              setShowNewMessageSheet(false);

              // Set the thread as current to navigate to the chat
              setCurrentThread(thread);

              // Load messages for the thread
              loadMessages(thread.id);

              // Refresh the threads list to include the new thread
              loadThreads(user.id);

            } catch (error) {
              console.error('Error creating thread:', error);
              toast.error('Failed to start conversation. Please try again.');
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  chatContainerInner: {
    flex: 1,
  },
  threadsContainer: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    paddingVertical: isSmallScreen ? 6 : isTablet ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#111827',
    paddingVertical: Platform.OS === 'android' ? 8 : 4,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 4,
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
        shadowOffset: {
          width: 0,
          height: 2,
        },
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
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  sportBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  groupBadgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  groupBadgeNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
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
  sportBadgeHeader: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sportBadgeHeaderText: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  groupHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  groupHeaderSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
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
    backgroundColor: '#863A73',
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    minHeight: isSmallScreen ? 36 : isTablet ? 44 : 40,
  },
  chatsHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: 12,
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
  headerProfilePicture: {
    width: isSmallScreen ? 40 : isTablet ? 56 : 48,
    height: isSmallScreen ? 40 : isTablet ? 56 : 48,
    borderRadius: isSmallScreen ? 20 : isTablet ? 28 : 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerProfileImage: {
    width: '100%',
    height: '100%',
  },
  defaultHeaderAvatarContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultHeaderAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  headerRight: {
    width: isSmallScreen ? 40 : isTablet ? 56 : 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});