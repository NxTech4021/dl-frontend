import { useSession } from "@/lib/auth-client";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { toast } from "sonner-native";
import {
  FriendRequestModal,
  FriendRequestsPanel,
  PlayerInfoModal,
  SearchBar,
  TabSwitcher,
} from "../components";
import type { ViewMode } from "../components/TabSwitcher";
import {
  useFriends,
  usePlayers,
  useProfile,
  useSeasonInvitations,
} from "../hooks";
import { Player } from "../types";
import { AllPlayersView, FriendsView } from "../views";

// Safe haptics wrapper for production
const triggerHaptic = async (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not supported on this device
  }
};

interface CommunityScreenProps {
  onTabPress?: (tabIndex: number) => void;
  sport?: "pickleball" | "tennis" | "padel";
}

export default function CommunityScreen({
  sport = "pickleball",
}: CommunityScreenProps) {
  const { data: session } = useSession();

  // Hooks
  const { fetchProfile } = useProfile();
  const {
    players,
    isLoading,
    isLoadingMore,
    hasMore,
    searchPlayers,
    loadMorePlayers,
  } = usePlayers();
  const {
    friends,
    friendRequests,
    actionLoading: friendActionLoading,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
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
  const [viewMode, setViewMode] = useState<ViewMode>("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [friendRequestModalVisible, setFriendRequestModalVisible] =
    useState(false);
  const [friendRequestRecipient, setFriendRequestRecipient] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  // Derived values
  const pendingReceivedCount = friendRequests.received.length;
  const openPanel = useCallback(() => setIsPanelVisible(true), []);
  const closePanel = useCallback(() => setIsPanelVisible(false), []);
  const isPendingRequestSent = useCallback(
    (playerId: string) =>
      friendRequests.sent.some(
        (r: any) => r.recipient?.id === playerId || r.recipientId === playerId,
      ),
    [friendRequests.sent],
  );

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Cleanup refs
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isMountedRef = useRef(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (modalTimeoutRef.current) {
        clearTimeout(modalTimeoutRef.current);
      }
    };
  }, []);

  // Trigger entry animation when loading is done, regardless of data
  useEffect(() => {
    if (!isLoading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      animationRef.current = Animated.stagger(80, [
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
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
        ]),
      ]);
      animationRef.current.start();
    }
  }, [isLoading, players]);

  // Filtered players based on search
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Check if player is friend
  const isFriend = useCallback(
    (playerId: string) => {
      return friends.some((f) => f.friend.id === playerId);
    },
    [friends],
  );

  // Fetch data on mount
  useEffect(() => {
    if (session?.user?.id) {
      if (__DEV__)
        console.log(
          "CommunityScreen: Fetching all data for user:",
          session.user.id,
        );
      fetchProfile();
      searchPlayers();
      fetchFriends();
      fetchFriendRequests();
      fetchSeasonInvitations();
    } else {
      if (__DEV__) console.log("CommunityScreen: No session user ID found");
    }
  }, [
    session?.user?.id,
    fetchProfile,
    searchPlayers,
    fetchFriends,
    fetchFriendRequests,
    fetchSeasonInvitations,
  ]);

  // Handle search with debounce (using ref to avoid stale closure)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          searchPlayers(searchQuery);
        }
      }, 500);
    } else if (searchQuery.trim().length === 0) {
      searchPlayers();
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchPlayers]);

  const handleScrollEndReached = useCallback(
    ({ nativeEvent }: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const isNearEnd =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
      if (isNearEnd && hasMore && !isLoadingMore) {
        loadMorePlayers();
      }
    },
    [hasMore, isLoadingMore, loadMorePlayers],
  );

  const handlePlayerPress = useCallback((player: Player) => {
    triggerHaptic();
    setSelectedPlayer(player);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    // Clear any existing modal timeout
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }
    modalTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setSelectedPlayer(null);
      }
    }, 300);
  }, []);

  const handleChat = useCallback(() => {
    triggerHaptic();
    if (__DEV__) console.log("Chat with:", selectedPlayer?.name);
    closeModal();
  }, [selectedPlayer, closeModal]);

  const handleSendFriendRequest = useCallback(() => {
    triggerHaptic();

    if (selectedPlayer?.id && selectedPlayer?.name) {
      if (isFriend(selectedPlayer.id)) {
        toast.success("Already friends!");
        return;
      }

      setFriendRequestRecipient({
        id: selectedPlayer.id,
        name: selectedPlayer.name,
      });
    }

    closeModal();
    // Use modalTimeoutRef for the friend request modal transition
    if (modalTimeoutRef.current) {
      clearTimeout(modalTimeoutRef.current);
    }
    modalTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setFriendRequestModalVisible(true);
      }
    }, 300);
  }, [selectedPlayer, closeModal, isFriend, isPendingRequestSent]);

  const handleSendFriendRequestConfirm = useCallback(async () => {
    try {
      if (!friendRequestRecipient?.id) {
        return;
      }

      const recipientId = friendRequestRecipient.id;

      await sendFriendRequest(recipientId);
      setFriendRequestRecipient(null);
    } catch (error) {
      if (__DEV__) console.error("Error sending friend request:", error);
    }
  }, [friendRequestRecipient, sendFriendRequest]);

  const handleAcceptSeasonInvitation = useCallback(
    async (invitationId: string) => {
      await acceptSeasonInvitation(invitationId, (partnershipData) => {
        // Refresh friends and invitations after accepting
        fetchFriends();

        // ✅ No navigation needed - success toast already shown in useSeasonInvitations.ts
        // The team captain will see the "Register Team" button appear automatically
        // via Socket.IO real-time updates on the DoublesTeamPairingScreen
      });
    },
    [acceptSeasonInvitation, fetchFriends],
  );

  return (
    <View style={styles.container}>
      {/* Tab Switcher + Search Bar (tabs first, then search) */}
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <View style={styles.searchSection}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSection}>
          <TabSwitcher
            activeTab={viewMode}
            onTabChange={setViewMode}
            friendsCount={friends.length}
            pendingRequestsCount={pendingReceivedCount}
            onRequestsPress={openPanel}
          />
        </View>
      </Animated.View>

      {/* Content */}
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
          onScroll={handleScrollEndReached}
          scrollEventThrottle={400}
        >
          {viewMode === "players" && (
            <AllPlayersView
              players={filteredPlayers}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              searchQuery={searchQuery}
              actionLoading={friendActionLoading}
              isFriendCheck={isFriend}
              isPendingCheck={isPendingRequestSent}
              onPlayerPress={handlePlayerPress}
              onAddFriend={(player) => sendFriendRequest(player.id)}
            />
          )}

          {viewMode === "friends" && (
            <FriendsView friends={friends} partnerships={[]} />
          )}
        </ScrollView>
      </Animated.View>

      {/* Player Info Modal (tap on player row) */}
      <PlayerInfoModal
        visible={modalVisible}
        player={selectedPlayer}
        isFriend={selectedPlayer ? isFriend(selectedPlayer.id) : false}
        onClose={closeModal}
        onSendFriendRequest={handleSendFriendRequest}
      />

      {/* Friend Request Confirmation Modal */}
      <FriendRequestModal
        visible={friendRequestModalVisible}
        recipientName={friendRequestRecipient?.name || ""}
        onClose={() => {
          setFriendRequestModalVisible(false);
          setFriendRequestRecipient(null);
        }}
        onSend={handleSendFriendRequestConfirm}
      />

      {/* Friend Requests Panel (received + sent) */}
      <FriendRequestsPanel
        visible={isPanelVisible}
        friendRequests={friendRequests}
        actionLoading={friendActionLoading}
        onClose={closePanel}
        onAccept={acceptFriendRequest}
        onReject={rejectFriendRequest}
        onCancel={(id) => removeFriend(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
    backgroundColor: "#F6FAFC",
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
