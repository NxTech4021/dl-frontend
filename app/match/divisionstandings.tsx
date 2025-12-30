import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { endpoints } from '@/lib/endpoints';
import axiosInstance from '@/lib/endpoints';
import { useSession } from '@/lib/auth-client';
import {
  DivisionCard,
  groupPlayersByTeam,
  StandingsPlayer,
  StandingsTeam,
  MatchResult,
} from '@/src/features/standings';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
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

export default function DivisionStandingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || '';
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState<string>('');

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Trigger entry animation when loading is done, regardless of data
  useEffect(() => {
    if (!loading && !hasPlayedEntryAnimation.current) {
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
  }, [loading, divisions]);

  // Get params from parent
  const divisionId = params.divisionId as string;
  const sportType = (params.sportType as string) as SportType;
  const leagueName = (params.leagueName as string) || 'Petaling Jaya Padel League';
  const seasonName = (params.seasonName as string) || 'Season 1 (2025)';
  const seasonStartDate = params.seasonStartDate as string;
  const seasonEndDate = params.seasonEndDate as string;
  const gameType = (params.gameType as string) || '';
  const genderCategory = (params.genderCategory as string) || '';

  // Format dates
  const formatDate = (dateString: string | null | undefined, fallback: string) => {
    if (!dateString) return fallback;
    try {
      return format(new Date(dateString), 'd MMMM yyyy');
    } catch {
      return fallback;
    }
  };

  const startDate = formatDate(seasonStartDate, '');
  const endDate = formatDate(seasonEndDate, '');

  // Get sport-specific icon
  const getSportIcon = () => {
    const sport = sportType?.toUpperCase();
    if (sport?.includes('TENNIS')) return TennisIcon;
    if (sport?.includes('PADEL')) return PadelIcon;
    if (sport?.includes('PICKLEBALL')) return PickleballIcon;
    return PickleballIcon;
  };

  // Get game type label with gender category
  const getGameTypeLabel = (): string => {
    if (!gameType) return '';

    const gameTypeUpper = gameType?.toUpperCase();
    const genderCategoryUpper = genderCategory?.toUpperCase();

    let genderPrefix = '';
    if (genderCategoryUpper === 'MALE') {
      genderPrefix = "Men's ";
    } else if (genderCategoryUpper === 'FEMALE') {
      genderPrefix = "Women's ";
    } else if (genderCategoryUpper === 'MIXED') {
      genderPrefix = 'Mixed ';
    }

    if (gameTypeUpper === 'SINGLES') {
      return `${genderPrefix}Singles`;
    } else if (gameTypeUpper === 'DOUBLES') {
      return `${genderPrefix}Doubles`;
    }

    return '';
  };

  // Fetch all divisions for the season
  useEffect(() => {
    if (divisionId) {
      fetchDivisionsForSeason();
    }
  }, [divisionId]);

  const fetchDivisionsForSeason = async () => {
    try {
      setLoading(true);

      // First, get the division details to obtain the seasonId
      const divisionResponse = await axiosInstance.get(
        endpoints.division.getById(divisionId)
      );

      // Handle response structure: {data: {...}, success: true} or {division: {...}}
      const divisionData = divisionResponse.data.data || divisionResponse.data.division || divisionResponse.data;
      const fetchedSeasonId = divisionData.seasonId;

      if (!fetchedSeasonId) {
        console.error('No seasonId found for division', divisionData);
        setLoading(false);
        return;
      }

      setSeasonId(fetchedSeasonId);

      // Now fetch all divisions for this season
      const divisionsResponse = await axiosInstance.get(
        endpoints.division.getbySeasionId(fetchedSeasonId)
      );

      const divisionsData = divisionsResponse.data.data || divisionsResponse.data || [];

      // Initialize divisions with basic data
      const initializedDivisions: Division[] = divisionsData.map((div: any) => ({
        id: div.id,
        name: div.name,
        gameType: div.gameType,
        genderCategory: div.genderCategory,
        standings: [],
        groupedStandings: [],
        results: [],
        resultsLoading: false,
        showResults: false,
      }));

      setDivisions(initializedDivisions);

      // Fetch standings for each division
      await Promise.all(
        initializedDivisions.map((division) => fetchStandingsForDivision(division.id))
      );

      // Pre-fetch results for all divisions
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) => ({ ...div, resultsLoading: true }))
      );

      initializedDivisions.forEach((division) => {
        fetchResultsForDivision(division.id);
      });

    } catch (error) {
      console.error('Error fetching divisions for season:', error);
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandingsForDivision = async (divId: string) => {
    try {
      const response = await axiosInstance.get(
        endpoints.standings.getDivisionStandings(divId)
      );

      const standingsData = response.data.data || response.data || [];

      // Transform backend data to match our interface
      const transformedStandings: StandingsPlayer[] = standingsData.map((standing: any, index: number) => ({
        rank: standing.rank || index + 1,
        playerId: standing.odlayerId || standing.userId || standing.playerId,
        name: standing.odlayerName || standing.user?.name || standing.userName || 'Unknown Player',
        image: standing.odlayerImage || standing.user?.image || standing.userImage || null,
        played: standing.matchesPlayed || 0,
        wins: standing.wins || 0,
        losses: standing.losses || 0,
        points: standing.totalPoints || 0,
      }));

      // Update the specific division
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) => {
          if (div.id === divId) {
            const isDoubles = div.gameType?.toLowerCase().includes('doubles') || false;
            const grouped = isDoubles ? groupPlayersByTeam(transformedStandings) : [];

            return {
              ...div,
              standings: transformedStandings,
              groupedStandings: grouped,
            };
          }
          return div;
        })
      );
    } catch (error) {
      console.error(`Error fetching standings for division ${divId}:`, error);
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

  const sportColors = getSportColors(sportType);
  const isPickleball = sportType?.toLowerCase() === 'pickleball';

  const handleViewMatches = (divId: string) => {
    router.push({
      pathname: '/match/all-matches',
      params: {
        divisionId: divId,
        sportType,
        leagueName,
        seasonName,
      },
    });
  };

  // Check if current user is in a division's standings
  const isUserInDivision = (division: Division): boolean => {
    if (!currentUserId) return false;
    const standings = division.standings || [];
    const groupedStandings = division.groupedStandings || [];

    const inIndividualStandings = standings.some(player => player.playerId === currentUserId);
    const inGroupedStandings = groupedStandings.some(team =>
      team.players.some(player => player.playerId === currentUserId)
    );

    return inIndividualStandings || inGroupedStandings;
  };

  const SportIcon = getSportIcon();
  const categoryLabel = getGameTypeLabel();

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: sportColors.badgeColor }]}>
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            {categoryLabel ? (
              <Text style={styles.categoryTitle}>{categoryLabel}</Text>
            ) : null}

            <Text style={styles.leagueTitle}>{leagueName}</Text>

            <View style={[styles.seasonInfoBox, { backgroundColor: sportColors.buttonColor, borderColor: sportColors.badgeColor }]}>
              <View style={styles.seasonInfoIcon}>
                <SportIcon width={40} height={40} fill="#FFFFFF" />
              </View>

              <View style={styles.seasonInfoDetails}>
                <Text style={styles.seasonInfoTitle}>{seasonName}</Text>
                <Text style={styles.seasonInfoDate}>Start date: {startDate}</Text>
                <Text style={styles.seasonInfoDate}>End date: {endDate}</Text>
              </View>

              <TouchableOpacity style={styles.seasonInfoButton} activeOpacity={0.7}>
                <Text style={[styles.seasonInfoButtonText, { color: sportColors.buttonColor }]}>Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.standingsSection}>
            <Text style={styles.standingsTitle}>Standings</Text>

          {loading ? (
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
                currentUserId={currentUserId}
                showViewMatchesButton
                onToggleResults={() => toggleShowResults(division.id)}
                onViewMatches={() => handleViewMatches(division.id)}
              />
            ))
          )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  header: {
    paddingHorizontal: 16,
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
    width: '100%',
    paddingHorizontal: 24,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0E0E10',
    marginBottom: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  leagueTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  seasonInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
    width: '100%',
    borderWidth: 3,
  },
  seasonInfoIcon: {
    marginRight: 12,
  },
  seasonInfoDetails: {
    flex: 1,
  },
  seasonInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  seasonInfoDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 15,
  },
  seasonInfoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 8,
  },
  seasonInfoButtonText: {
    fontSize: 14,
    fontWeight: '700',
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
