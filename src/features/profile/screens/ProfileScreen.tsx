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
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { CircularImageCropper } from '../../onboarding/components';
import {
  MatchHistoryButton,
  PlayerDivisionStandings,
  ProfileAchievementsCard,
  ProfileHeaderWithCurve,
  ProfileInfoCard,
  ProfileLeagueStatsCard,
  ProfilePictureSection,
  ProfileSkillLevelCard,
  ProfileSportsSection,
  ProfileDMRCard,
} from '../components';
import { getBackendBaseURL } from '@/config/network';
import { authClient, useSession } from '@/lib/auth-client';
import { toast } from 'sonner-native';
import { useProfileHandlers } from '../hooks/useProfileHandlers';
import { useProfileState } from '../hooks/useProfileState';
import { ProfileDataTransformer } from '../services/ProfileDataTransformer';
import { useProfileImageUpload } from '@/src/shared/hooks/useProfileImageUpload';
import type { GameData } from '../types';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [ratingHistory, setRatingHistory] = useState<GameData[]>([]);
  const [selectedGraphIndex, setSelectedGraphIndex] = useState<number | null>(null);
  const [leagueStatsData, setLeagueStatsData] = useState<{
    wins: number;
    losses: number;
    matchesPlayed: number;
  }>({ wins: 0, losses: 0, matchesPlayed: 0 });
  const hasInitializedSport = useRef(false);

  // Entry animation values
  const profilePictureEntryOpacity = useRef(new Animated.Value(0)).current;
  const profilePictureEntryTranslateY = useRef(new Animated.Value(-20)).current;
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
    showCropper,
    selectedImageUri,
    pickImageFromLibrary,
    openCamera,
    handleCropComplete,
    handleCropCancel,
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

      const backendUrl = getBackendBaseURL();
      const sportParam = sport.toUpperCase();
      const response = await authClient.$fetch(
        `${backendUrl}/api/ratings/me/history?gameType=${gameType.toUpperCase()}&sport=${sportParam}&limit=20`,
        { method: 'GET' }
      );

      // API returns { success: true, data: [...] }
      // authClient.$fetch wraps it in { data: { success, data } }
      let historyData: any[] = [];

      if (response && (response as any).data) {
        const responseData = (response as any).data;
        // Check if it's the nested structure from authClient
        if (responseData.data && Array.isArray(responseData.data)) {
          historyData = responseData.data;
        } else if (Array.isArray(responseData)) {
          historyData = responseData;
        }
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
    try {
      if (!session?.user?.id) {
        console.log('No user session');
        setIsLoading(false);
        return;
      }

      const backendUrl = getBackendBaseURL();

      // Fetch profile and achievements in parallel
      const [profileResponse, achievementsResponse] = await Promise.all([
        authClient.$fetch(`${backendUrl}/api/player/profile/me`, { method: 'GET' }),
        authClient.$fetch(`${backendUrl}/api/player/profile/achievements`, { method: 'GET' })
      ]);

      // API response structure: response.data.data contains the actual profile
      if (profileResponse && (profileResponse as any).data?.data) {
        console.log('Setting profile data (nested):', (profileResponse as any).data.data);
        setProfileData((profileResponse as any).data.data);
      } else if (profileResponse && (profileResponse as any).data) {
        console.log('Setting profile data (direct):', (profileResponse as any).data);
        setProfileData((profileResponse as any).data);
      }

      if (achievementsResponse && (achievementsResponse as any).data?.achievements) {
        setAchievements((achievementsResponse as any).data.achievements);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error', {
        description: 'Failed to load profile data',
      });
    } finally {
      setIsLoading(false);
    }
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
        // Profile picture slides down
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
    profilePictureEntryOpacity,
    profilePictureEntryTranslateY,
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
      rating: currentRating || 1400,
      ratingBefore: currentRating || 1400,
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

        {/* Content */}
        <View style={styles.whiteBackground}>
          {/* Profile Picture */}
          <Animated.View
            style={{
              opacity: profilePictureEntryOpacity,
              transform: [{ translateY: profilePictureEntryTranslateY }],
            }}
          >
            <ProfilePictureSection
              imageUri={profileData?.image}
              isUploading={isUploadingImage}
              onPickImage={pickImage}
              isEditable={true}
            />
          </Animated.View>

          {/* Profile Info */}
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
              sports={userData.sports || []}
              activeSports={userData.activeSports || []}
              showActionButtons={false}
            />
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

      {/* Image Cropper Modal */}
      {selectedImageUri && (
        <CircularImageCropper
          visible={showCropper}
          imageUri={selectedImageUri}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.primary,
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
    backgroundColor: '#ffffff',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    minHeight: '100%',
  },
});
