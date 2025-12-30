import { getSportColors, SportType } from '@/constants/SportsColor';
import { endpoints } from '@/lib/endpoints';
import axiosInstance from '@/lib/endpoints';
import { useSession } from '@/lib/auth-client';
import { StandingsService } from '@/src/features/leagues/services/StandingsService';
import {
  DivisionCard,
  groupPlayersByTeam,
  StandingsPlayer,
  StandingsTeam,
  MatchResult,
} from '@/src/features/standings';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const userId = session?.user?.id;
  const isPickleball = sportType?.toLowerCase() === 'pickleball';

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  useEffect(() => {
    fetchStandings();
  }, [seasonId, userId]);

  // Entry animation effect - triggers when loading is done
  useEffect(() => {
    if (!isLoading && !hasPlayedEntryAnimation.current) {
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
        // Content slides up
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
  }, [
    isLoading,
    divisions,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  const fetchStandings = async () => {
    if (!seasonId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await StandingsService.getSeasonDivisionsWithStandings(seasonId, userId);

      // Transform data to use shared types
      const transformedDivisions: Division[] = data.map(divData => {
        // Transform standings from StandingEntry to StandingsPlayer
        const transformedStandings: StandingsPlayer[] = divData.standings.map((standing, index) => ({
          rank: standing.rank || index + 1,
          playerId: standing.odlayerId || standing.userId || standing.user?.id || '',
          name: standing.odlayerName || standing.user?.name || 'Unknown Player',
          image: standing.odlayerImage || standing.user?.image || undefined,
          played: standing.matchesPlayed || 0,
          wins: standing.wins || 0,
          losses: standing.losses || 0,
          points: standing.totalPoints || 0,
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

      setDivisions(transformedDivisions);

      // Find which division the user is in
      const userDiv = data.find(d => d.userStanding);
      if (userDiv) {
        setUserDivisionId(userDiv.division.id);
      }

      // Pre-fetch results for all divisions
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

      const matchesData = response.data.matches || response.data.data || [];

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
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Check if current user is in a division's standings
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: sportColors.badgeColor,
            opacity: headerEntryOpacity,
            transform: [{ translateY: headerEntryTranslateY }],
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#000000ff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.seasonTitle}>{seasonName || 'Season 1 (2025)'}</Text>
          <Text style={styles.leagueTitle}>{leagueName || 'League'}</Text>
          <View style={styles.dateRange}>
            {startDate && <Text style={styles.dateText}>Start date: {formatDate(startDate)}</Text>}
            {endDate && <Text style={styles.dateText}>End date: {formatDate(endDate)}</Text>}
          </View>
        </View>
      </Animated.View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.standingsSection,
            {
              opacity: contentEntryOpacity,
              transform: [{ translateY: contentEntryTranslateY }],
            }
          ]}
        >
          <Text style={styles.standingsTitle}>Standings</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={sportColors.background} />
              <Text style={styles.loadingText}>Loading divisions...</Text>
            </View>
          ) : divisions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Divisions Found</Text>
              <Text style={styles.emptyText}>
                No divisions available for this season
              </Text>
            </View>
          ) : (
            divisions.map((division) => (
              <DivisionCard
                key={division.id}
                division={{
                  id: division.id,
                  name: division.name,
                  gameType: division.gameType,
                  genderCategory: division.genderCategory,
                }}
                standings={division.standings}
                groupedStandings={division.groupedStandings}
                results={division.results}
                resultsLoading={division.resultsLoading}
                showResults={division.showResults}
                sportColors={sportColors}
                isPickleball={isPickleball}
                isUserDivision={isUserInDivision(division)}
                currentUserId={userId}
                showViewMatchesButton={false}
                onToggleResults={() => toggleShowResults(division.id)}
              />
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  seasonTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  leagueTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateRange: {
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  standingsSection: {
    padding: 16,
  },
  standingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
