import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, Animated } from 'react-native';
import { useSession } from '@/lib/auth-client';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { router } from 'expo-router';
import { SearchBar, TabSwitcher, PlayerInfoModal, FriendRequestModal } from '../components';
import { AllPlayersView, FriendsView, InvitationsView } from '../views';
import { useProfile, usePlayers, useFriends, useSeasonInvitations } from '../hooks';
import { Player } from '../types';
import type { ViewMode } from '../components/TabSwitcher';

interface CommunityScreenProps {
  onTabPress?: (tabIndex: number) => void;
  sport?: 'pickleball' | 'tennis' | 'padel';
}

export default function CommunityScreen({ sport = 'pickleball' }: CommunityScreenProps) {
  const { data: session } = useSession();

  // Hooks
  const { fetchProfile } = useProfile();
  const { players, isLoading, searchPlayers } = usePlayers();
  const {
    friends,
    friendRequests,
    actionLoading: friendActionLoading,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
  } = useFriends();
  const {
    seasonInvitations,
    actionLoading: invitationActionLoading,
    fetchSeasonInvitations,
    acceptSeasonInvitation,
    denySeasonInvitation,
    cancelSeasonInvitation,
  } = useSeasonInvitations();

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [friendRequestModalVisible, setFriendRequestModalVisible] = useState(false);
  const [friendRequestRecipient, setFriendRequestRecipient] = useState<{ id: string; name: string } | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Trigger entry animation when loading is done, regardless of data
  useEffect(() => {
    if (!isLoading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
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
        ]),
      ]).start();
    }
  }, [isLoading, players]);

  // Filtered players based on search
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if player is friend
  const isFriend = useCallback((playerId: string) => {
    return friends.some(f => f.friend.id === playerId);
  }, [friends]);

  // Fetch data on mount
  useEffect(() => {
    if (session?.user?.id) {
      console.log('🔵 CommunityScreen: Fetching all data for user:', session.user.id);
      fetchProfile();
      searchPlayers();
      fetchFriends();
      fetchFriendRequests();
      fetchSeasonInvitations();
    } else {
      console.log('❌ CommunityScreen: No session user ID found');
    }
  }, [session?.user?.id, fetchProfile, searchPlayers, fetchFriends, fetchFriendRequests, fetchSeasonInvitations]);

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchPlayers(searchQuery);
      }, 500);
      setSearchTimeout(timeout);
    } else if (searchQuery.trim().length === 0) {
      searchPlayers();
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const handlePlayerPress = useCallback((player: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlayer(player);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedPlayer(null), 300);
  }, []);

  const handleChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Chat with:', selectedPlayer?.name);
    closeModal();
  }, [selectedPlayer, closeModal]);


  const handleSendFriendRequest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selectedPlayer?.id && selectedPlayer?.name) {
      if (isFriend(selectedPlayer.id)) {
        toast.success('Already friends!');
        return;
      }

      setFriendRequestRecipient({
        id: selectedPlayer.id,
        name: selectedPlayer.name
      });
    }

    closeModal();
    setTimeout(() => {
      setFriendRequestModalVisible(true);
    }, 300);
  }, [selectedPlayer, closeModal, isFriend]);

  const handleSendFriendRequestConfirm = useCallback(async () => {
    try {
      if (!friendRequestRecipient?.id) {
        return;
      }

      await sendFriendRequest(friendRequestRecipient.id);
      setFriendRequestRecipient(null);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  }, [friendRequestRecipient, sendFriendRequest]);

  const handleAcceptSeasonInvitation = useCallback(async (invitationId: string) => {
    await acceptSeasonInvitation(invitationId, (partnershipData) => {
      // Refresh friends and invitations after accepting
      fetchFriends();

      // ✅ No navigation needed - success toast already shown in useSeasonInvitations.ts
      // The team captain will see the "Register Team" button appear automatically
      // via Socket.IO real-time updates on the DoublesTeamPairingScreen
    });
  }, [acceptSeasonInvitation, fetchFriends]);

  return (
    <View style={styles.container}>
      {/* Search Bar - Compact */}
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <View style={styles.searchSection}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSection}>
          <TabSwitcher
            activeTab={viewMode}
            onTabChange={setViewMode}
            friendsCount={friends.length}
          />
        </View>
      </Animated.View>

      {/* Content Views */}
      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
        <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'all' && (
          <AllPlayersView
            players={filteredPlayers}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onPlayerPress={handlePlayerPress}
          />
        )}

        {viewMode === 'friends' && (
          <FriendsView
            friends={friends}
            partnerships={[]}
          />
        )}

        {viewMode === 'invitations' && (
          <InvitationsView
            friendRequests={friendRequests}
            seasonInvitations={seasonInvitations}
            friendActionLoading={friendActionLoading}
            invitationActionLoading={invitationActionLoading}
            onAcceptFriendRequest={acceptFriendRequest}
            onRejectFriendRequest={rejectFriendRequest}
            onAcceptInvitation={handleAcceptSeasonInvitation}
            onDenyInvitation={denySeasonInvitation}
            onCancelInvitation={cancelSeasonInvitation}
          />
        )}
        </ScrollView>
      </Animated.View>

      {/* Player Info Modal */}
      <PlayerInfoModal
        visible={modalVisible}
        player={selectedPlayer}
        isFriend={selectedPlayer ? isFriend(selectedPlayer.id) : false}
        onClose={closeModal}
        onSendFriendRequest={handleSendFriendRequest}
      />

      {/* Friend Request Modal */}
      <FriendRequestModal
        visible={friendRequestModalVisible}
        recipientName={friendRequestRecipient?.name || ''}
        onClose={() => {
          setFriendRequestModalVisible(false);
          setFriendRequestRecipient(null);
        }}
        onSend={handleSendFriendRequestConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
