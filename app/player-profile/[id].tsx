import { getBackendBaseURL } from '@/config/network';
import { authClient, useSession } from '@/lib/auth-client';
import { ChatService } from '@/src/features/chat/services/ChatService';
import { useChatStore } from '@/src/features/chat/stores/ChatStore';
import { MatchHistoryButton, PlayerDivisionStandings, ProfileAchievementsCard, ProfileDMRCard, ProfileHeaderWithCurve, ProfileInfoCard, ProfileLeagueStatsCard, ProfilePictureSection, ProfileSkillLevelCard, ProfileSportsSection } from '@/src/features/profile/components';
import { useProfileHandlers } from '@/src/features/profile/hooks/useProfileHandlers';
import { useProfileState } from '@/src/features/profile/hooks/useProfileState';
import { ProfileDataTransformer } from '@/src/features/profile/services/ProfileDataTransformer';
import type { UserData } from '@/src/features/profile/types';
import { theme } from '@core/theme/theme';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');

export default function PlayerProfileScreen() {
  const { id, seasonId, seasonName } = useLocalSearchParams();
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const section1EntryOpacity = useRef(new Animated.Value(0)).current;
  const section1EntryTranslateY = useRef(new Animated.Value(30)).current;
  const section2EntryOpacity = useRef(new Animated.Value(0)).current;
  const section2EntryTranslateY = useRef(new Animated.Value(30)).current;
  const section3EntryOpacity = useRef(new Animated.Value(0)).current;
  const section3EntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Profile handlers
  const {
    handleGameTypeSelect,
    handleTabPress,
    handleGamePointPress,
  } = useProfileHandlers({
    setSelectedGameType,
    setActiveTab,
    setSelectedGame,
    setModalVisible: () => {}, // No-op since we don't use modal in friend profiles
  });

  const fetchPlayerProfile = useCallback(async () => {
    try {
      if (!session?.user?.id || !id) {
        console.log('PlayerProfile: No session or player ID');
        return;
      }

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();
      // console.log('PlayerProfile: Fetching profile from:', `${backendUrl}/api/player/profile/public/${id}`);

      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/public/${id}`, {
        method: 'GET',
      });

      // console.log('PlayerProfile: API response:', authResponse);

      if (authResponse && (authResponse as any).data) {
        const playerData = (authResponse as any).data.data || (authResponse as any).data;
        // console.log('PlayerProfile: Setting profile data:', playerData);
        setProfileData(playerData);

        // Fetch achievements if available
        // TODO: Add achievements endpoint when available
        setAchievements([]);
      }
    } catch (error) {
      console.error('PlayerProfile: Error fetching profile:', error);
      toast.error('Error', {
        description: 'Failed to load player profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlayerProfile();
    setRefreshing(false);
  }, [fetchPlayerProfile]);

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Add friend:', profileData?.name);
    toast('Add friend feature coming soon!');
  };

  const handleChat = async () => {
    if (!session?.user?.id || !id) {
      toast.error('Error', {
        description: 'Unable to start chat. Please try again.',
      });
      return;
    }

    try {
      setIsLoadingChat(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Check if thread already exists
      const existingThread = threads.find(thread => 
        thread.type === 'direct' && 
        thread.participants.some(p => p.id === id) &&
        thread.participants.some(p => p.id === session.user.id)
      );

      if (existingThread) {
        console.log('PlayerProfile: Found existing thread:', existingThread.id);
        setCurrentThread(existingThread);
      } else {
        console.log('PlayerProfile: No existing thread, creating new one');
        const newThread = await ChatService.createThread(
          session.user.id,
          [id as string],
          false
        );
        
        console.log('PlayerProfile: Created new thread:', newThread.id);
        await loadThreads(session.user.id);
        setCurrentThread(newThread);
      }
      
      // Navigate to dashboard with chat view
      router.push({
        pathname: '/user-dashboard',
        params: { view: 'chat' }
      });
      
    } catch (error) {
      console.error('PlayerProfile: Error handling chat:', error);
      toast.error('Error', {
        description: 'Failed to open chat. Please try again.',
      });
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && id) {
      fetchPlayerProfile();
    }
  }, [session?.user?.id, id, fetchPlayerProfile]);

  // Entry animation effect
  useEffect(() => {
    if (!isLoading && profileData && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Header slides down
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
        // Section 1: Profile picture + info card
        Animated.parallel([
          Animated.spring(section1EntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(section1EntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Section 2: Achievements + Sports + Skills
        Animated.parallel([
          Animated.spring(section2EntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(section2EntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Section 3: DMR + Stats + Standings
        Animated.parallel([
          Animated.spring(section3EntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(section3EntryTranslateY, {
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
    headerEntryOpacity,
    headerEntryTranslateY,
    section1EntryOpacity,
    section1EntryTranslateY,
    section2EntryOpacity,
    section2EntryTranslateY,
    section3EntryOpacity,
    section3EntryTranslateY,
  ]);

  // Transform profile data to userData format   
  // update the codebase
  const userData: UserData = profileData
    ? ProfileDataTransformer.transformProfileToUserData(profileData, achievements)
    : {
        name: 'Loading...',
        username: 'loading',
        bio: 'Loading...',
        location: 'Loading...',
        gender: 'Loading...',
        skillLevel: 'Loading...',
        skillRatings: {},
        sports: [],
        activeSports: [],
        image: 'loading...',
        achievements: [],
        leagueStats: {},
      };

  // Helper function to get rating values from skillRatings
  const getRatingForType = (sport: string, type: 'singles' | 'doubles') => {
    const normalizedSport = sport.toLowerCase();
    const rating = profileData?.skillRatings?.[normalizedSport]?.[type];
    // Ratings are stored divided by 1000 in the database, multiply by 1000 to display
    if (rating !== undefined && rating !== null) {
      return Math.round(rating * 1000);
    }
    return 0;
  };

  // Calculate win rate from match history - placeholder until match system is implemented
  const calculateWinRate = () => {
    if (userData.name === 'Loading...') return 0;

    // Check if user has match data
    const hasMatches = profileData?.totalMatches && profileData.totalMatches > 0;
    if (hasMatches) {
      // TODO: Calculate actual win rate from match history when matches exist
      return 0; // For now, return 0 until we have match data
    }
    return 0; // No matches yet
  };

  // Create ELO data based on actual rating values only
  const createEloData = () => {
    const currentSport = activeTab || userData.sports?.[0] || 'pickleball';
    const currentGameType = selectedGameType.toLowerCase();
    const currentRating = getRatingForType(currentSport, currentGameType as 'singles' | 'doubles');

    // Return single point with current rating if no matches played
    return [{
      date: 'Current Rating',
      time: '',
      rating: currentRating || 1400, // Use actual rating or default
      ratingBefore: currentRating || 1400,
      opponent: 'No matches played',
      result: 'W' as const,
      score: '-',
      ratingChange: 0,
      league: `${currentSport} ${currentGameType}`,
      player1: userData.name || 'Player',
      player2: 'No opponent',
      scores: {
        set1: { player1: null, player2: null },
        set2: { player1: null, player2: null },
        set3: { player1: null, player2: null }
      },
      status: 'upcoming' as const
    }];
  };

  const mockEloData = createEloData();

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

  if (isLoading && !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6de9a0"
            colors={["#6de9a0"]}
            progressBackgroundColor="#ffffff"
          />
        }
      >
        {/* Orange Header Background with Curved Bottom */}
        <Animated.View
          style={{
            opacity: headerEntryOpacity,
            transform: [{ translateY: headerEntryTranslateY }],
          }}
        >
          <ProfileHeaderWithCurve
            onBack={() => router.back()}
            showSettings={false}
          />
        </Animated.View>

        {/* White Background */}
        <View style={styles.whiteBackground}>
          {/* Section 1: Profile Picture + Info Card */}
          <Animated.View
            style={{
              opacity: section1EntryOpacity,
              transform: [{ translateY: section1EntryTranslateY }],
            }}
          >
            {/* Profile Picture Section */}
            <ProfilePictureSection
              imageUri={profileData?.image}
              isUploading={false}
              isEditable={false}
            />

            {/* Profile Info Card */}
            <ProfileInfoCard
              name={userData.name}
              username={userData.username}
              bio={userData.bio}
              location={userData.location}
              gender={userData.gender}
              sports={userData.sports || []}
              activeSports={userData.activeSports || []}
              showActionButtons={true}
              onAddFriend={handleAddFriend}
              onChat={handleChat}
              isLoadingChat={isLoadingChat}
            />
          </Animated.View>

          {/* Section 2: Achievements + Sports + Skills */}
          <Animated.View
            style={{
              opacity: section2EntryOpacity,
              transform: [{ translateY: section2EntryTranslateY }],
            }}
          >
            {/* Achievements */}
            <ProfileAchievementsCard
              achievements={userData.achievements || []}
            />

            {/* Sports */}
            <ProfileSportsSection
              sports={userData.sports || []}
              activeTab={activeTab}
              onTabPress={handleTabPress}
            />

            {/* Skill Level */}
            <ProfileSkillLevelCard
              skillLevel={userData.skillLevel}
            />
          </Animated.View>

          {/* Section 3: DMR + Stats + Standings */}
          <Animated.View
            style={{
              opacity: section3EntryOpacity,
              transform: [{ translateY: section3EntryTranslateY }],
            }}
          >
            {/* DMR */}
            <ProfileDMRCard
              activeTab={activeTab}
              selectedGameType={selectedGameType}
              gameTypeOptions={gameTypeOptions}
              onGameTypeSelect={handleGameTypeSelect}
              getRatingForType={getRatingForType}
              eloData={mockEloData}
              onPointPress={handleGamePointPress}
              selectedMatch={selectedMatch}
              profileData={profileData}
            />

            {/* Match History Button */}
            <MatchHistoryButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toast('Match history coming soon!');
              }}
            />

            {/* Division Standings - Shows player's current divisions */}
            {id && (
              <PlayerDivisionStandings
                userId={id as string}
                showOnlyCurrentDivisions={true}
              />
            )}

            {/* League Stats Section */}
            <ProfileLeagueStatsCard
              activeTab={activeTab}
              selectedGameType={selectedGameType}
              gameTypeOptions={gameTypeOptions}
              onGameTypeSelect={handleGameTypeSelect}
              winRate={calculateWinRate()}
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
    backgroundColor: theme.colors.neutral.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral.gray[50],
  },
  whiteBackground: {
    backgroundColor: theme.colors.neutral.gray[50],
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    marginTop: -1,
  },
});
