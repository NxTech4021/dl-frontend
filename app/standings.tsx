import { getSportColors, SportType } from '@/constants/SportsColor';
import { feedTheme } from '@/src/features/feed/theme';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { StandingsService } from '@/src/features/leagues/services/StandingsService';
import {
  DivisionCard,
  groupPlayersByTeam,
  MatchResult,
  StandingsPlayer,
  StandingsTeam,
} from '@/src/features/standings';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/src/core/theme/theme';

const { width } = Dimensions.get('window');

/* DARK THEME — commented out
const COLORS = {
  background: '#0A0C10',
  cardBackground: 'rgba(22, 26, 35, 0.95)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  gold: '#FFD700',
  goldDark: '#D4A800',
  silver: '#C0C0C0',
  silverDark: '#A8A8A8',
  bronze: '#CD7F32',
  bronzeDark: '#A66628',
  accent: '#00D4FF',
  accentDark: '#00A8CC',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  divider: 'rgba(255, 255, 255, 0.06)',
};
*/

// Light theme using feedTheme tokens
const COLORS = {
  background: theme.colors.background.primary,        // '#FDFDFD'
  cardBackground: theme.colors.background.white, // '#FEFEFE'
  cardBorder: feedTheme.colors.border,             // '#E5E5EA'
  gold: '#FFD700',
  goldDark: '#D4A800',
  silver: '#C0C0C0',
  silverDark: '#A8A8A8',
  bronze: '#CD7F32',
  bronzeDark: '#A66628',
  accent: feedTheme.colors.primary,               // '#FEA04D'
  accentDark: '#E08040',
  textPrimary: feedTheme.colors.textPrimary,       // '#1D1D1F'
  textSecondary: feedTheme.colors.textSecondary,   // '#86868B'
  textMuted: feedTheme.colors.textTertiary,        // '#AEAEB2'
  divider: feedTheme.colors.border,                // '#E5E5EA'
};

interface Division {
  id: string;
  name: string;
  gameType: string;
  genderCategory?: string;
  standings: StandingsPlayer[];
  groupedStandings: StandingsTeam[];
  results: MatchResult[];
  resultsLoading: boolean;
  showResults: boolean;
}

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const params = useLocalSearchParams();

  // Extract params
  const seasonId = params.seasonId as string;
  const seasonName = params.seasonName as string;
  const leagueId = params.leagueId as string;
  const leagueName = params.leagueName as string;
  const categoryName = params.categoryName as string;
  const sportType = params.sportType as SportType;
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;

  // Get sport colors
  const sportColors = getSportColors(sportType);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [userDivisionId, setUserDivisionId] = useState<string | null>(null);
  const [activeDivisionIndex, setActiveDivisionIndex] = useState(0);

  const userId = session?.user?.id;
  const isPickleball = sportType?.toLowerCase() === 'pickleball';

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryScale = useRef(new Animated.Value(0.95)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(40)).current;
  const tabsEntryOpacity = useRef(new Animated.Value(0)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Get sport-specific gradient (dark theme — kept for reference)
  // const getSportGradient = (): readonly [string, string, string] => {
  //   switch (sportType?.toLowerCase()) {
  //     case 'tennis':    return ['#1A3D1A', '#2D5A2D', '#1A3D1A'] as const;
  //     case 'padel':     return ['#1A3D5C', '#2D5A8A', '#1A3D5C'] as const;
  //     case 'pickleball':
  //     default:          return ['#2D1A4A', '#4A2D6A', '#2D1A4A'] as const;
  //   }
  // };

  const getAccentColor = (): string => {
    switch (sportType?.toLowerCase()) {
      case 'tennis':
        return '#7CB342';
      case 'padel':
        return '#42A5F5';
      case 'pickleball':
      default:
        return '#AB47BC';
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [seasonId, userId]);

  // Entry animation effect
  useEffect(() => {
    if (!isLoading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;

      Animated.sequence([
        // Header fades in and scales
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
          Animated.spring(headerEntryScale, {
            toValue: 1,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
        ]),
        // Tabs fade in
        Animated.timing(tabsEntryOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Content slides up
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
      ]).start();
    }
  }, [isLoading, divisions]);

  const fetchStandings = async () => {
    if (!seasonId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await StandingsService.getSeasonDivisionsWithStandings(seasonId, userId);

      const transformedDivisions: Division[] = data.map(divData => {
        const transformedStandings: StandingsPlayer[] = divData.standings.map((standing, index) => ({
          rank: standing.rank || index + 1,
          playerId: standing.odlayerId || standing.userId || standing.user?.id || '',
          name: standing.odlayerName || standing.user?.name || 'Unknown Player',
          image: standing.odlayerImage || standing.user?.image || undefined,
          played: standing.matchesPlayed || 0,
          wins: standing.wins || 0,
          losses: standing.losses || 0,
          points: standing.totalPoints || 0,
          partnerId: standing.partnerId,
          partnerName: standing.partnerName,
          partnerImage: standing.partnerImage,
        }));

        const isDoubles = divData.division.gameType?.toLowerCase().includes('doubles') || false;
        const grouped = isDoubles ? groupPlayersByTeam(transformedStandings) : [];

        return {
          id: divData.division.id,
          name: divData.division.name,
          gameType: divData.division.gameType,
          genderCategory: divData.division.genderCategory,
          standings: transformedStandings,
          groupedStandings: grouped,
          results: [],
          resultsLoading: false,
          showResults: false,
        };
      });

      const sortedDivisions = [...transformedDivisions].sort((a, b) => a.id.localeCompare(b.id));
      setDivisions(sortedDivisions);

      // Find user's division and set as active
      const userDivIndex = data.findIndex(d => d.userStanding);
      if (userDivIndex >= 0) {
        setUserDivisionId(data[userDivIndex].division.id);
        setActiveDivisionIndex(userDivIndex);
      }

      // Pre-fetch results
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) => ({ ...div, resultsLoading: true }))
      );

      transformedDivisions.forEach((division) => {
        fetchResultsForDivision(division.id);
      });
    } catch (error) {
      console.error('Error fetching standings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResultsForDivision = async (divId: string) => {
    try {
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId ? { ...div, resultsLoading: true } : div
        )
      );

      const response = await axiosInstance.get(
        endpoints.match.getDivisionResults(divId),
        { params: { limit: 10 } }
      );

      const raw = response.data?.data?.matches ?? response.data?.matches ?? response.data?.data ?? [];
      const matchesData: MatchResult[] = Array.isArray(raw) ? raw : [];

      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId
            ? { ...div, results: matchesData, resultsLoading: false }
            : div
        )
      );
    } catch (error) {
      console.error(`Error fetching results for division ${divId}:`, error);
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId
            ? { ...div, results: [], resultsLoading: false }
            : div
        )
      );
    }
  };

  const toggleShowResults = (divId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDivisions((prevDivisions) =>
      prevDivisions.map((div) => {
        if (div.id === divId) {
          const newShowResults = !div.showResults;
          if (newShowResults && (!div.results || div.results.length === 0) && !div.resultsLoading) {
            fetchResultsForDivision(divId);
          }
          return { ...div, showResults: newShowResults };
        }
        return div;
      })
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isUserInDivision = (division: Division): boolean => {
    if (!userId) return false;
    const standings = division.standings || [];
    const groupedStandings = division.groupedStandings || [];

    const inIndividualStandings = standings.some(player => player.playerId === userId);
    const inGroupedStandings = groupedStandings.some(team =>
      team.players.some(player => player.playerId === userId)
    );

    return inIndividualStandings || inGroupedStandings;
  };

  const handleDivisionChange = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDivisionIndex(index);
  };

  const accentColor = getAccentColor();
  // const sportGradient = getSportGradient(); // dark theme — commented out

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Gradient Background Overlay — dark theme, commented out */}
      {/* <LinearGradient
        colors={sportGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      /> */}

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            opacity: headerEntryOpacity,
            transform: [{ scale: headerEntryScale }],
          }
        ]}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#F5F5F7', '#EBEBF0']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Header Content */}
        <View style={styles.headerContent}>
          {/* League Badge */}
          <View style={[styles.leagueBadge, { backgroundColor: accentColor + '25' }]}>
            <View style={[styles.leagueDot, { backgroundColor: accentColor }]} />
            <Text style={[styles.leagueText, { color: accentColor }]}>
              {leagueName || 'League'}
            </Text>
          </View>

          {/* Season Title */}
          <Text style={styles.seasonTitle}>{seasonName || 'Season'}</Text>

          {/* Date Range */}
          <View style={styles.dateContainer}>
            {startDate && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </View>
            )}
            {startDate && endDate && (
              <Text style={styles.dateSeparator}>-</Text>
            )}
            {endDate && (
              <View style={styles.dateItem}>
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Trophy Icon */}
        <View style={styles.trophyContainer}>
          <LinearGradient
            colors={[COLORS.gold, COLORS.goldDark]}
            style={styles.trophyGradient}
          >
            <Ionicons name="trophy" size={20} color="#1A1A1A" />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Division Tabs */}
      {divisions.length > 1 && (
        <Animated.View style={[styles.tabsContainer, { opacity: tabsEntryOpacity }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {divisions.map((division, index) => {
              const isActive = index === activeDivisionIndex;
              const isUserDiv = isUserInDivision(division);

              return (
                <TouchableOpacity
                  key={division.id}
                  onPress={() => handleDivisionChange(index)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.tab,
                      isActive && styles.tabActive,
                      isUserDiv && !isActive && styles.tabUserDivision,
                    ]}
                  >
                    {isActive && (
                      <LinearGradient
                        colors={[accentColor, accentColor + 'CC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.tabTextActive,
                        isUserDiv && !isActive && styles.tabTextUserDivision,
                      ]}
                    >
                      {division.name}
                    </Text>
                    {isUserDiv && (
                      <View style={[styles.userIndicator, isActive && styles.userIndicatorActive]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: contentEntryOpacity,
              transform: [{ translateY: contentEntryTranslateY }],
            }
          ]}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <ActivityIndicator size="large" color={accentColor} />
              </View>
              <Text style={styles.loadingText}>Loading standings...</Text>
            </View>
          ) : divisions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)']}
                style={styles.emptyIconContainer}
              >
                <Ionicons name="trophy-outline" size={56} color={COLORS.textMuted} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No Divisions Yet</Text>
              <Text style={styles.emptyText}>
                Divisions will appear once they're created for this season
              </Text>
            </View>
          ) : (
            <View>
              {/* Show only active division */}
              {divisions[activeDivisionIndex] && (
                <DivisionCard
                  key={divisions[activeDivisionIndex].id}
                  division={{
                    id: divisions[activeDivisionIndex].id,
                    name: divisions[activeDivisionIndex].name,
                    gameType: divisions[activeDivisionIndex].gameType,
                    genderCategory: divisions[activeDivisionIndex].genderCategory,
                  }}
                  standings={divisions[activeDivisionIndex].standings}
                  groupedStandings={divisions[activeDivisionIndex].groupedStandings}
                  results={divisions[activeDivisionIndex].results}
                  resultsLoading={divisions[activeDivisionIndex].resultsLoading}
                  showResults={divisions[activeDivisionIndex].showResults}
                  sportColors={sportColors}
                  isPickleball={isPickleball}
                  isUserDivision={isUserInDivision(divisions[activeDivisionIndex])}
                  currentUserId={userId}
                  showViewMatchesButton={false}
                  onToggleResults={() => toggleShowResults(divisions[activeDivisionIndex].id)}
                />
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
  },
  headerContent: {
    flex: 1,
  },
  leagueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  leagueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  leagueText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  seasonTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dateSeparator: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginHorizontal: 8,
  },
  trophyContainer: {
    marginTop: 4,
  },
  trophyGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingBottom: 16,
  },
  tabsScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  tabActive: {
    borderColor: 'transparent',
  },
  tabUserDivision: {
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.gold + '10',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextUserDivision: {
    color: COLORS.gold,
  },
  userIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
  userIndicatorActive: {
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    gap: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
