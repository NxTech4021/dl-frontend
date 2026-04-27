
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { ChatService } from "@/src/features/chat/services/ChatService";
import { useChatStore } from "@/src/features/chat/stores/ChatStore";
import {
  MatchHistoryButton,
  PlayerDivisionStandings,
  ProfileAchievementsCard,
  ProfileDMRCard,
  ProfileHeaderWithCurve,
  ProfileInfoCard,
  ProfileLeagueStatsCard,
  ProfileSkillLevelCard,
  ProfileSportsSection,
} from "@/src/features/profile/components";
import { useProfileHandlers } from "@/src/features/profile/hooks/useProfileHandlers";
import { useProfileState } from "@/src/features/profile/hooks/useProfileState";
import { ProfileDataTransformer } from "@/src/features/profile/services/ProfileDataTransformer";
import type { GameData, UserData } from "@/src/features/profile/types";
import TorchIcon from "@/assets/icons/profile/torch.svg";
import { theme } from "@core/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { toast } from "sonner-native";

const { width } = Dimensions.get("window");

export default function PlayerProfileScreen() {
  const { id, seasonId, seasonName } = useLocalSearchParams();
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isPendingRequest, setIsPendingRequest] = useState(false);
  const [showAddFriendConfirm, setShowAddFriendConfirm] = useState(false);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);
  const [isFriendActionLoading, setIsFriendActionLoading] = useState(false);
  const [ratingHistory, setRatingHistory] = useState<GameData[]>([]);
  const [leagueStatsData, setLeagueStatsData] = useState<{
    wins: number;
    losses: number;
    matchesPlayed: number;
  }>({ wins: 0, losses: 0, matchesPlayed: 0 });

  // Chat store
  const { threads, setCurrentThread, loadThreads } = useChatStore();

  // Check if viewing in pairing context
  const isPairingContext = !!seasonId;

  // Profile state management
  const {
    activeTab,
    selectedMatch,
    selectedGameType,
    gameTypeOptions,
    setActiveTab,
    setSelectedGame,
    setSelectedGameType,
  } = useProfileState();

  const hasInitializedSport = useRef(false);

  // Entry animation values (matching ProfileScreen.tsx pattern)
  const profilePictureEntryOpacity = useRef(new Animated.Value(0)).current;
  const profilePictureEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const infoCardEntryOpacity = useRef(new Animated.Value(0)).current;
  const infoCardEntryTranslateY = useRef(new Animated.Value(30)).current;
  const achievementsEntryOpacity = useRef(new Animated.Value(0)).current;
  const achievementsEntryTranslateY = useRef(new Animated.Value(30)).current;
  const statsEntryOpacity = useRef(new Animated.Value(0)).current;
  const statsEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Profile handlers
  const { handleGameTypeSelect, handleTabPress, handleGamePointPress } =
    useProfileHandlers({
      setSelectedGameType,
      setActiveTab,
      setSelectedGame,
      setModalVisible: () => {}, // No-op since we don't use modal in friend profiles
    });

  const fetchPlayerProfile = useCallback(
    async (signal?: AbortSignal) => {
      try {
        if (!session?.user?.id || !id) {
          console.log("PlayerProfile: No session or player ID");
          return;
        }

        setIsLoading(true);
        setHasError(false);

        const response = await axiosInstance.get(
          `/api/player/profile/public/${id}`,
          { signal },
        );

        // Check if aborted before updating state
        if (signal?.aborted) return;

        if (response && response.data) {
          const playerData = response.data.data || response.data;
          setProfileData(playerData);

          // Fetch achievements if available
          // TODO: Add achievements endpoint when available
          setAchievements([]);
        }
      } catch (error) {
        // Don't show error toast if request was aborted
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("PlayerProfile: Error fetching profile:", error);
        if (!signal?.aborted) {
          setHasError(true);
          toast.error("Error", {
            description: "Failed to load player profile. Please try again.",
          });
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [session?.user?.id, id],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlayerProfile();
    setRefreshing(false);
  }, [fetchPlayerProfile]);

  // Fetch rating history for this player to power the DMR graph
  const fetchPlayerRatingHistory = useCallback(async (gameType: 'singles' | 'doubles', sport: string) => {
    try {
      if (!id) return;
      const sportParam = sport.toUpperCase();
      const response = await axiosInstance.get(
        `/api/ratings/${id}/history?gameType=${gameType.toUpperCase()}&sport=${sportParam}&limit=20`
      );
      let historyData: any[] = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        historyData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        historyData = response.data;
      }
      if (historyData.length > 0) {
        const playerName = profileData?.name || 'Player';
        const transformedData = ProfileDataTransformer.transformRatingHistoryToGameData(historyData, playerName);
        setRatingHistory(transformedData);
      } else {
        setRatingHistory([]);
      }
    } catch {
      setRatingHistory([]);
    }
  }, [id, profileData?.name]);

  // Fetch rating history when game type, sport, or profile data changes
  useEffect(() => {
    if (profileData && selectedGameType && activeTab) {
      fetchPlayerRatingHistory(selectedGameType.toLowerCase() as 'singles' | 'doubles', activeTab);
    }
  }, [selectedGameType, activeTab, profileData, fetchPlayerRatingHistory]);

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!session?.user?.id || !id) return;
    if (isFriend) {
      setShowUnfriendConfirm(true);
    } else if (!isPendingRequest) {
      setShowAddFriendConfirm(true);
    }
  };

  const confirmSendFriendRequest = async () => {
    setIsFriendActionLoading(true);
    try {
      await axiosInstance.post('/api/pairing/friendship/request', { recipientId: id });
      setIsPendingRequest(true);
      setShowAddFriendConfirm(false);
      toast.success('Success', { description: 'Friend request sent!' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to send friend request';
      toast.error('Error', { description: msg });
    } finally {
      setIsFriendActionLoading(false);
    }
  };

  const confirmUnfriend = async () => {
    if (!friendshipId) return;
    setIsFriendActionLoading(true);
    try {
      await axiosInstance.delete(`/api/pairing/friendship/${friendshipId}`);
      setIsFriend(false);
      setFriendshipId(null);
      setShowUnfriendConfirm(false);
      toast.success('Friend removed');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to remove friend';
      toast.error('Error', { description: msg });
    } finally {
      setIsFriendActionLoading(false);
    }
  };

  // TODO: Implement in v2
  const handleReportUser = () => {
    setShowPlayerMenu(false);
    toast("Report User — coming in v2");
  };

  // TODO: Implement in v2
  const handleBlockUser = () => {
    setShowPlayerMenu(false);
    toast("Block User — coming in v2");
  };

  const handleChat = async () => {
    // Double-tap guard - prevent multiple chat creation requests
    if (isLoadingChat) return;

    if (!session?.user?.id || !id) {
      toast.error("Error", {
        description: "Unable to start chat. Please try again.",
      });
      return;
    }

    // Block messaging deleted users
    if (profileData?.name?.toLowerCase().includes("deleted")) {
      toast.error("User not found");
      return;
    }

    try {
      setIsLoadingChat(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Check if thread already exists
      const existingThread = threads.find(
        (thread) =>
          thread.type === "direct" &&
          thread.participants.some((p) => p.id === id) &&
          thread.participants.some((p) => p.id === session.user.id),
      );

      let targetThreadId: string;

      if (existingThread) {
        setCurrentThread(existingThread);
        targetThreadId = existingThread.id;
      } else {
        console.log("PlayerProfile: No existing thread, creating new one");
        const newThread = await ChatService.createThread(
          session.user.id,
          [id as string],
          false,
        );

        console.log("PlayerProfile: Created new thread:", newThread.id);
        await loadThreads(session.user.id);
        setCurrentThread(newThread);
        targetThreadId = newThread.id;
      }

      // Navigate directly to the chat thread
      router.push({
        pathname: "/chat/[threadId]",
        params: { threadId: targetThreadId },
      });
    } catch (error) {
      console.error("PlayerProfile: Error handling chat:", error);
      toast.error("Error", {
        description: "Failed to open chat. Please try again.",
      });
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();

    if (session?.user?.id && id) {
      // Reset hasInitializedSport when player ID changes
      hasInitializedSport.current = false;
      fetchPlayerProfile(abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [session?.user?.id, id, fetchPlayerProfile]);

  // Check if the viewed player is already a friend
  useEffect(() => {
    if (!session?.user?.id || !id) return;
    axiosInstance.get('/api/pairing/friends')
      .then((res) => {
        const friends: any[] = res?.data?.data ?? res?.data ?? [];
        const match = Array.isArray(friends)
          ? friends.find((f) => f.friend?.id === id)
          : null;
        if (match) {
          setIsFriend(true);
          setFriendshipId(match.friendshipId ?? null);
        } else {
          setIsFriend(false);
          setFriendshipId(null);
        }
      })
      .catch(() => { setIsFriend(false); setFriendshipId(null); });

    axiosInstance.get('/api/pairing/friendship/requests')
      .then((res) => {
        const data = res?.data?.data ?? res?.data ?? {};
        const sent: any[] = data.sent ?? [];
        setIsPendingRequest(sent.some((r) => r.recipientId === id));
      })
      .catch(() => setIsPendingRequest(false));
  }, [session?.user?.id, id]);

  // Entry animation effect (matching ProfileScreen.tsx pattern)
  useEffect(() => {
    if (!isLoading && profileData && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Profile picture slides down (from -20 to 0)
        Animated.parallel([
          Animated.spring(profilePictureEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(profilePictureEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Info card slides up (from +30 to 0)
        Animated.parallel([
          Animated.spring(infoCardEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(infoCardEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Achievements section slides up
        Animated.parallel([
          Animated.spring(achievementsEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(achievementsEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Stats section slides up
        Animated.parallel([
          Animated.spring(statsEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(statsEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    }
  }, [
    isLoading,
    profileData,
    profilePictureEntryOpacity,
    profilePictureEntryTranslateY,
    infoCardEntryOpacity,
    infoCardEntryTranslateY,
    achievementsEntryOpacity,
    achievementsEntryTranslateY,
    statsEntryOpacity,
    statsEntryTranslateY,
  ]);

  // Transform profile data to userData format
  const userData: UserData = profileData
    ? ProfileDataTransformer.transformProfileToUserData(
        profileData,
        achievements,
      )
    : {
        name: "Loading...",
        username: "loading",
        bio: "Loading...",
        location: "Loading...",
        gender: "Loading...",
        skillLevel: "Loading...",
        selfAssessedSkillLevels: {},
        skillRatings: {},
        sports: [],
        activeSports: [],
        achievements: [],
        leagueStats: {},
      };

  // Helper function to get rating values from skillRatings
  const getRatingForType = (sport: string, type: "singles" | "doubles") => {
    const normalizedSport = sport.toLowerCase();
    const rating = profileData?.skillRatings?.[normalizedSport]?.[type];
    // Ratings are stored divided by 1000 in the database, multiply by 1000 to display
    if (rating !== undefined && rating !== null) {
      return Math.round(rating * 1000);
    }
    return 0;
  };

  // Calculate win rate from league stats
  const calculateWinRate = () => {
    if (leagueStatsData.matchesPlayed === 0) return 0;
    return Math.round(
      (leagueStatsData.wins / leagueStatsData.matchesPlayed) * 100,
    );
  };

  // Build ELO data from real rating history when available, else show single current-rating point
  const getEloData = (): GameData[] => {
    if (ratingHistory.length > 0) {
      return ratingHistory;
    }
    const currentSport = activeTab || userData.sports?.[0] || "pickleball";
    const currentGameType = selectedGameType.toLowerCase();
    const currentRating = getRatingForType(
      currentSport,
      currentGameType as "singles" | "doubles",
    );
    return [
      {
        date: "Current Rating",
        time: "",
        rating: currentRating || 0,
        ratingBefore: currentRating || 0,
        opponent: "No matches played",
        result: "W" as const,
        score: "-",
        ratingChange: 0,
        league: `${currentSport} ${currentGameType}`,
        player1: userData.name || "Player",
        player2: "No opponent",
        scores: {
          set1: { player1: null, player2: null },
          set2: { player1: null, player2: null },
          set3: { player1: null, player2: null },
        },
        status: "upcoming" as const,
      },
    ];
  };

  const eloData = getEloData();

  // Auto-select first available sport when profile data loads
  useEffect(() => {
    if (
      !hasInitializedSport.current &&
      userData?.sports &&
      userData.sports.length > 0 &&
      userData.sports[0] !== "No sports yet"
    ) {
      const firstSport = userData.sports[0];
      // Only update if the current activeTab is the default 'Tennis' or not in the sports list
      if (activeTab === "Tennis" || !userData.sports.includes(activeTab)) {
        setActiveTab(firstSport);
        hasInitializedSport.current = true;
      }
    }
  }, [userData?.sports, activeTab, setActiveTab]);

  const handleRetry = useCallback(() => {
    const abortController = new AbortController();
    fetchPlayerProfile(abortController.signal);
  }, [fetchPlayerProfile]);

  if (isLoading && !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (hasError && !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.neutral.gray[400]}
        />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tap to Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Refresh Indicator Overlay - visible above header */}
      {refreshing && (
        <View style={styles.refreshOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
          />
        }
      >
        {/* Header with Curve */}
        <ProfileHeaderWithCurve
          onBack={() => {
            // Safe back: deep-link cold start has no back stack.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/user-dashboard');
            }
          }}
          showSettings={false}
          onMenuPress={() => setShowPlayerMenu(true)}
        />

        {/* Top Profile Section — white card with avatar inside */}
        <View style={styles.profileTopSection}>
          <Animated.View
            style={{
              opacity: infoCardEntryOpacity,
              transform: [{ translateY: infoCardEntryTranslateY }],
            }}
          >
            <ProfileInfoCard
              name={userData.name}
              username={userData.username}
              bio={userData.bio}
              location={userData.location}
              gender={userData.gender}
              imageUri={profileData?.image}
              isEditableImage={false}
              friendsCount={profileData?.friendsCount ?? 0}
              sports={userData.sports || []}
              activeSports={userData.activeSports || []}
              showActionButtons={true}
              isFriend={isFriend}
              isPendingRequest={isPendingRequest}
              onAddFriend={handleAddFriend}
              onChat={handleChat}
              isLoadingChat={isLoadingChat}
            />
          </Animated.View>
        </View>

        {/* Content Section */}
        <View style={styles.whiteBackground}>
          {/* Weekly Match Streak */}
          <Animated.View
            style={{
              opacity: achievementsEntryOpacity,
              transform: [{ translateY: achievementsEntryTranslateY }],
            }}
          >
            <View style={styles.streakCard}>
              <View>
                <Text style={styles.streakNumber}>{profileData?.weeklyStreak ?? 0}</Text>
                <Text style={styles.streakLabel}>Weekly Match Streak</Text>
              </View>
              <View style={styles.streakEditBtn}>
                <TorchIcon width={24} height={24} fill="#1D1D1F" />
              </View>
            </View>
          </Animated.View>

          {/* Achievements */}
          <Animated.View
            style={{
              opacity: achievementsEntryOpacity,
              transform: [{ translateY: achievementsEntryTranslateY }],
            }}
          >
            <ProfileAchievementsCard
              achievements={userData.achievements || []}
            />
          </Animated.View>

          {/* Stats Section */}
          <Animated.View
            style={{
              opacity: statsEntryOpacity,
              transform: [{ translateY: statsEntryTranslateY }],
            }}
          >
            {/* Sports */}
            <ProfileSportsSection
              sports={userData.sports || []}
              activeTab={activeTab}
              onTabPress={handleTabPress}
            />

            {/* Skill Level */}
            <ProfileSkillLevelCard
              skillLevel={userData.skillLevel}
              selfAssessedSkillLevels={userData.selfAssessedSkillLevels}
              activeSport={activeTab}
            />

            {/* DMR */}
            <ProfileDMRCard
              activeTab={activeTab}
              selectedGameType={selectedGameType}
              gameTypeOptions={gameTypeOptions}
              onGameTypeSelect={handleGameTypeSelect}
              getRatingForType={getRatingForType}
              eloData={eloData}
              onPointPress={handleGamePointPress}
              selectedMatch={selectedMatch}
              profileData={profileData}
              isOwnProfile={false}
            />

            {/* Match History Button */}
            <MatchHistoryButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toast("Match history coming soon!");
              }}
            />

            {/* Division Standings - Shows player's current divisions */}
            {id && (
              <PlayerDivisionStandings
                userId={id as string}
                showOnlyCurrentDivisions={false}
                sportFilter={activeTab}
                gameTypeFilter={selectedGameType}
                onStatsCalculated={setLeagueStatsData}
              />
            )}

            {/* League Stats Section */}
            <ProfileLeagueStatsCard
              activeTab={activeTab}
              selectedGameType={selectedGameType}
              gameTypeOptions={gameTypeOptions}
              onGameTypeSelect={handleGameTypeSelect}
              winRate={calculateWinRate()}
              wins={leagueStatsData.wins}
              losses={leagueStatsData.losses}
            />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Add Friend Confirmation */}
      <Modal
        visible={showAddFriendConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddFriendConfirm(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setShowAddFriendConfirm(false)}>
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>Add Friend</Text>
            <Text style={styles.confirmMessage}>
              Send a friend request to {profileData?.name || 'this player'}?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setShowAddFriendConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmActionButton, isFriendActionLoading && { opacity: 0.6 }]}
                onPress={confirmSendFriendRequest}
                disabled={isFriendActionLoading}
              >
                <Text style={styles.confirmActionText}>
                  {isFriendActionLoading ? 'Sending…' : 'Send Request'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Unfriend Confirmation */}
      <Modal
        visible={showUnfriendConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnfriendConfirm(false)}
      >
        <Pressable style={styles.confirmOverlay} onPress={() => setShowUnfriendConfirm(false)}>
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>Remove Friend</Text>
            <Text style={styles.confirmMessage}>
              Remove {profileData?.name || 'this player'} from your friends?
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => setShowUnfriendConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmDestructiveButton, isFriendActionLoading && { opacity: 0.6 }]}
                onPress={confirmUnfriend}
                disabled={isFriendActionLoading}
              >
                <Text style={styles.confirmActionText}>
                  {isFriendActionLoading ? 'Removing…' : 'Remove'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Player Options Menu */}
      <Modal
        visible={showPlayerMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlayerMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowPlayerMenu(false)}>
          <Pressable style={styles.menuSheet} onPress={(e) => e.stopPropagation()}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowPlayerMenu(false);
                handleAddFriend();
              }}
            >
              <Ionicons
                name={isFriend ? 'person-remove-outline' : 'person-add-outline'}
                size={20}
                color={isFriend ? '#ef4444' : '#1f2937'}
              />
              <Text style={[styles.menuItemText, isFriend && { color: '#ef4444' }]}>
                {isFriend ? 'Unfriend' : isPendingRequest ? 'Request Sent' : 'Add friend'}
              </Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={handleReportUser}>
              <Ionicons name="flag-outline" size={20} color="#f97316" />
              <Text style={[styles.menuItemText, { color: '#f97316' }]}>Report User</Text>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable style={styles.menuItem} onPress={handleBlockUser}>
              <Ionicons name="ban-outline" size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Block</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5D5D5',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#D5D5D5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#D5D5D5',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.md,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: "600",
  },
  refreshOverlay: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 100,
  },
  profileTopSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  whiteBackground: {
    backgroundColor: '#F6FAFC',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    minHeight: '100%',
  },
  streakCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.12)',
  },
  streakEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#111827',
    fontFamily: theme.typography.fontFamily.primary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 8,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500' as const,
    color: '#1f2937',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  confirmSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    width: '100%',
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#374151',
    fontFamily: theme.typography.fontFamily.primary,
  },
  confirmActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 90,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDestructiveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 90,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ffffff',
    fontFamily: theme.typography.fontFamily.primary,
  },
});
