import { useNavigationManager } from '@core/navigation';
import { theme } from '@core/theme/theme';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import TorchIcon from '@/assets/icons/profile/torch.svg';
import {
  MatchHistoryButton,
  PlayerDivisionStandings,
  ProfileAchievementsCard,
  ProfileHeaderWithCurve,
  ProfileInfoCard,
  ProfileLeagueStatsCard,
  ProfileSkillLevelCard,
  ProfileSportsSection,
  ProfileDMRCard,
} from '../components';
import { useSession } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
import { toast } from 'sonner-native';
import { useProfileHandlers } from '../hooks/useProfileHandlers';
import { useProfileState } from '../hooks/useProfileState';
import { ProfileDataTransformer } from '../services/ProfileDataTransformer';
import { useProfileImageUpload } from '@/src/shared/hooks/useProfileImageUpload';
import type { GameData } from '../types';

export default function ProfileScreen() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementCounts, setAchievementCounts] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [ratingHistory, setRatingHistory] = useState<GameData[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [selectedGraphIndex, setSelectedGraphIndex] = useState<number | null>(null);
  const [leagueStatsData, setLeagueStatsData] = useState<{
    wins: number;
    losses: number;
    matchesPlayed: number;
  }>({ wins: 0, losses: 0, matchesPlayed: 0 });
  const hasInitializedSport = useRef(false);

  // Entry animation values
  const infoCardEntryOpacity = useRef(new Animated.Value(0)).current;
  const infoCardEntryTranslateY = useRef(new Animated.Value(30)).current;
  const achievementsEntryOpacity = useRef(new Animated.Value(0)).current;
  const achievementsEntryTranslateY = useRef(new Animated.Value(30)).current;
  const statsEntryOpacity = useRef(new Animated.Value(0)).current;
  const statsEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Use shared profile image upload hook
  const {
    isUploadingImage,
    pickImageFromLibrary,
    openCamera,
  } = useProfileImageUpload({
    userId: session?.user?.id,
    onUploadSuccess: (imageUrl) => {
      // Update local profile data with new image URL
      setProfileData((prev: any) => ({
        ...prev,
        image: imageUrl,
      }));
    },
  });

  // Profile state and handlers
  const {
    activeTab,
    selectedGameType,
    selectedMatch,
    gameTypeOptions,
    modalVisible,
    setActiveTab,
    setSelectedGameType,
    setSelectedGame,
    setModalVisible,
  } = useProfileState();

  const {
    handleSettingsPress,
    handleTabPress,
    handleGameTypeSelect,
    handleGamePointPress,
  } = useProfileHandlers({
    setActiveTab,
    setSelectedGameType,
    setSelectedGame,
    setModalVisible,
  });

  const { navigateTo } = useNavigationManager();

  // Fetch rating history for the selected game type and sport
  const fetchRatingHistory = useCallback(async (gameType: 'singles' | 'doubles', sport: string) => {
    try {
      if (!session?.user?.id) return;

      const sportParam = sport.toUpperCase();
      const response = await axiosInstance.get(
        `/api/ratings/me/history?gameType=${gameType.toUpperCase()}&sport=${sportParam}&limit=20`
      );

      // axiosInstance normalizes response to { success: true, data: [...] }
      let historyData: any[] = [];

      if (response?.data?.data && Array.isArray(response.data.data)) {
        historyData = response.data.data;
      } else if (Array.isArray(response?.data)) {
        historyData = response.data;
      }

      if (historyData.length > 0) {
        // Transform the API response to GameData format
        const userName = profileData?.name || session?.user?.name || 'You';
        const transformedData = ProfileDataTransformer.transformRatingHistoryToGameData(
          historyData,
          userName
        );
        setRatingHistory(transformedData);
      } else {
        setRatingHistory([]);
      }
    } catch (error) {
      console.error('Error fetching rating history:', error);
      // Don't show error toast for rating history - it's not critical
      setRatingHistory([]);
    }
  }, [session, profileData?.name]);

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    if (!session?.user?.id) {
      console.log('No user session');
      setIsLoading(false);
      return;
    }

    // Fetch profile data
    try {
      const profileResponse = await axiosInstance.get('/api/player/profile/me');

      if (profileResponse?.data?.data) {
        setProfileData(profileResponse.data.data);
      } else if (profileResponse?.data) {
        setProfileData(profileResponse.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error', {
        description: 'Failed to load profile data',
      });
    }

    // Fetch achievements independently
    try {
      const achievementsResponse = await axiosInstance.get('/api/player/profile/achievements');

      const achData = achievementsResponse?.data?.data ?? achievementsResponse?.data;
      if (achData?.achievements) {
        setAchievements(achData.achievements);
        setAchievementCounts({
          completed: achData.completedCount ?? 0,
          total: achData.totalCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }

    // Fetch friends count (same endpoint pattern as Community screen)
    try {
      const friendsResponse = await axiosInstance.get('/api/pairing/friends');
      const friendsData = friendsResponse?.data?.data ?? friendsResponse?.data ?? [];
      setFriendsCount(Array.isArray(friendsData) ? friendsData.length : 0);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriendsCount(0);
    }

    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Fetch rating history when game type, sport, or profile data changes
  useEffect(() => {
    if (profileData && selectedGameType && activeTab) {
      fetchRatingHistory(selectedGameType.toLowerCase() as 'singles' | 'doubles', activeTab);
    }
  }, [selectedGameType, activeTab, profileData, fetchRatingHistory]);

  // Auto-select the most recent match when rating history updates and a match was previously selected
  useEffect(() => {
    if (selectedMatch && ratingHistory.length > 0) {
      // Select the most recent match (first in array = most recent)
      // The graph reverses the data, so index 0 in ratingHistory becomes the last point on graph
      // We want to select the "current" point which is the last in the reversed array
      const mostRecentMatch = ratingHistory[0];
      setSelectedGame(mostRecentMatch);
      // In the graph, data is reversed, so the most recent (index 0) becomes the last point
      // The selectedIndex in graph corresponds to the reversed array position
      setSelectedGraphIndex(ratingHistory.length - 1);
    }
  }, [ratingHistory]);

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [fetchProfileData])
  );

  // Entry animation effect - triggers when profile data is loaded
  useEffect(() => {
    if (!isLoading && profileData && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Info card slides up
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
        // Achievements slides up
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
    infoCardEntryOpacity,
    infoCardEntryTranslateY,
    achievementsEntryOpacity,
    achievementsEntryTranslateY,
    statsEntryOpacity,
    statsEntryTranslateY,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // Minimum display time for spinner (800ms) so users can see the refresh feedback
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));

    await Promise.all([
      fetchProfileData(),
      // Also refresh rating history
      selectedGameType && activeTab
        ? fetchRatingHistory(selectedGameType.toLowerCase() as 'singles' | 'doubles', activeTab)
        : Promise.resolve(),
      minDelay,
    ]);

    setRefreshing(false);
  }, [fetchProfileData, fetchRatingHistory, selectedGameType, activeTab]);

  // Transform profile data for display
  const userData = ProfileDataTransformer.transformProfileToUserData(profileData, achievements);

  // Auto-select first available sport when profile data loads
  useEffect(() => {
    if (!hasInitializedSport.current && userData?.sports && userData.sports.length > 0 && userData.sports[0] !== 'No sports yet') {
      const firstSport = userData.sports[0];
      // Only update if the current activeTab is the default 'Tennis' or not in the sports list
      if (activeTab === 'Tennis' || !userData.sports.includes(activeTab)) {
        setActiveTab(firstSport);
        hasInitializedSport.current = true;
      }
    }
  }, [userData?.sports, activeTab, setActiveTab]);

  // Show action sheet for choosing camera or library
  const pickImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        }
      );
    } else {
      // Android: Use Alert
      Alert.alert(
        'Profile Picture',
        'Choose an option',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take Photo', onPress: () => openCamera() },
          { text: 'Choose from Library', onPress: () => pickImageFromLibrary() },
        ],
        { cancelable: true }
      );
    }
  };

  // Helper functions
  const getRatingForType = (sport: string, type: 'singles' | 'doubles') => {
    const normalizedSport = sport.toLowerCase();
    const rating = profileData?.skillRatings?.[normalizedSport]?.[type];
    // Ratings are stored divided by 1000 in the database, multiply by 1000 to display
    if (rating !== undefined && rating !== null) {
      return Math.round(rating * 1000);
    }
    return 0;
  };

  const calculateWinRate = () => {
    if (leagueStatsData.matchesPlayed === 0) return 0;
    return Math.round((leagueStatsData.wins / leagueStatsData.matchesPlayed) * 100);
  };

  const handleRemoveSport = async (sport: string) => {
    const currentSports = (userData.sports || [])
      .filter((s) => s !== 'No sports yet')
      .map((s) => s.toLowerCase())
      .filter((s) => s !== sport.toLowerCase());

    try {
      await axiosInstance.put('/api/player/sports', { sports: currentSports });
      await fetchProfileData();
      toast.success(`${sport} removed`);
    } catch {
      toast.error('Failed to remove sport');
    }
  };

  // Get ELO data - use real rating history if available, otherwise show placeholder
  const getEloData = (): GameData[] => {
    if (ratingHistory.length > 0) {
      return ratingHistory;
    }

    // Fallback: show current rating as a single point
    const currentSport = activeTab || userData.sports?.[0] || 'pickleball';
    const currentGameType = selectedGameType.toLowerCase();
    const currentRating = getRatingForType(currentSport, currentGameType as 'singles' | 'doubles');

    return [{
      date: 'Current Rating',
      time: '',
      rating: currentRating || 0,
      ratingBefore: currentRating || 0,
      opponent: 'No matches played',
      result: 'W' as const,
      score: '-',
      ratingChange: 0,
      league: `${currentSport} ${currentGameType}`,
      player1: userData.name || 'You',
      player2: 'No opponent',
      scores: {
        set1: { player1: null, player2: null },
        set2: { player1: null, player2: null },
        set3: { player1: null, player2: null }
      },
      status: 'upcoming' as const
    }];
  };

  const eloData = getEloData();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading profile...</Text>
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
          onBack={() => router.back()}
          onSettings={handleSettingsPress}
          showSettings={true}
        />

        {/* Top Profile Section */}
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
              onFriendsPress={() => navigateTo('/community')}
              imageUri={profileData?.image}
              isUploadingImage={isUploadingImage}
              onPickImage={pickImage}
              friendsCount={friendsCount}
              isEditableImage={true}
              gender={userData.gender}
              sports={userData.sports || []}
              activeSports={userData.activeSports || []}
              showActionButtons={false}
              isOwnProfile={true}
              onAddSport={() => router.push('/edit-sports')}
              onRemoveSport={handleRemoveSport}
            />
          </Animated.View>
        </View>

        {/* White Content Section */}
        <View style={styles.whiteBackground}>

          {/* Weekly Match Streak — placeholder */}
          <Animated.View
            style={{
              opacity: infoCardEntryOpacity,
              transform: [{ translateY: infoCardEntryTranslateY }],
            }}
          >
            <View style={styles.streakCard}>
              <View>
                <Text style={styles.streakNumber}>{profileData?.weeklyStreak ?? 0}</Text>
                <Text style={styles.streakLabel}>Weekly Match Streak</Text>
              </View>
              <Pressable
                style={styles.streakEditBtn}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              >
                <TorchIcon width={24} height={24} fill="#1D1D1F" />
              </Pressable>
            </View>
          </Animated.View>

          {/* Badges */}
          <Animated.View
            style={{
              opacity: achievementsEntryOpacity,
              transform: [{ translateY: achievementsEntryTranslateY }],
            }}
          >
            <ProfileAchievementsCard
              achievements={userData.achievements || []}
              completedCount={achievementCounts.completed}
              totalCount={achievementCounts.total}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.navigate('/achievements' as any);
              }}
            />
          </Animated.View>

          {/* Stats Section with Animation */}
          <Animated.View
            style={{
              opacity: statsEntryOpacity,
              transform: [{ translateY: statsEntryTranslateY }],
            }}
          >
            {/* Sports Tabs */}
            <ProfileSportsSection
              sports={userData.sports || []}
              activeTab={activeTab}
              onTabPress={(sport) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleTabPress(sport);
              }}
            />

            {/* Skill Level */}
            <ProfileSkillLevelCard
              skillLevel={userData.skillLevel}
              selfAssessedSkillLevels={userData.selfAssessedSkillLevels}
              activeSport={activeTab}
              onEdit={() => router.push({ pathname: '/edit-sports', params: { sport: activeTab.toLowerCase() } } as any)}
            />

            {/* DMR with Graph */}
            <ProfileDMRCard
              activeTab={activeTab}
              selectedGameType={selectedGameType}
              gameTypeOptions={gameTypeOptions}
              onGameTypeSelect={handleGameTypeSelect}
              getRatingForType={getRatingForType}
              eloData={eloData}
              onPointPress={(game, index) => {
                handleGamePointPress(game);
                setSelectedGraphIndex(index);
              }}
              selectedMatch={selectedMatch}
              selectedGraphIndex={selectedGraphIndex}
              profileData={profileData}
              isOwnProfile={true}
              onGetDMR={() => router.push(`/onboarding/skill-assessment?sport=${activeTab.toLowerCase()}&sportIndex=0&fromDashboard=true` as any)}
            />

            {/* Match History Button */}
            <MatchHistoryButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigateTo('/match-history');
              }}
            />

            {/* Division Standings - Filtered by selected sport */}
            {session?.user?.id && (
              <PlayerDivisionStandings
                userId={session.user.id}
                showOnlyCurrentDivisions={false}
                sportFilter={activeTab}
                gameTypeFilter={selectedGameType}
                onStatsCalculated={setLeagueStatsData}
              />
            )}

            {/* League Stats */}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
  },
  refreshOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  whiteBackground: {
    backgroundColor: '#F6FAFC',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    minHeight: '100%',
  },
  profileTopSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
  streakNumber: {
    fontSize: 28,
    fontWeight: '700' as any,
    color: '#111827',
    fontFamily: theme.typography.fontFamily.primary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '500' as any,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  streakEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
