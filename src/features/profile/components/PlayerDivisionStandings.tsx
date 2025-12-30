import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';
import { StandingsService, DivisionWithStandings } from '@/src/features/leagues/services/StandingsService';
import { getSportColors, SportType } from '@/constants/SportsColor';

interface PlayerDivisionStandingsProps {
  userId: string;
  showOnlyCurrentDivisions?: boolean;
  sportFilter?: string;  // e.g., "Pickleball", "Tennis", "Padel"
  gameTypeFilter?: string;  // e.g., "Singles", "Doubles" - only affects stats aggregation
  onStatsCalculated?: (stats: { wins: number; losses: number; matchesPlayed: number }) => void;
}

// Helper to get sport color
const getSportColor = (sportType?: string): string => {
  if (!sportType) return '#FEA04D'; // Default orange
  return getSportColors(sportType as SportType).background;
};

// Normalize sport type for comparison (e.g., "PICKLEBALL" -> "Pickleball")
const normalizeSportType = (sport?: string): string => {
  if (!sport) return '';
  return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
};

// Normalize game type for comparison (e.g., "SINGLES" -> "Singles")
const normalizeGameType = (gameType?: string): string => {
  if (!gameType) return '';
  return gameType.charAt(0).toUpperCase() + gameType.slice(1).toLowerCase();
};

export const PlayerDivisionStandings: React.FC<PlayerDivisionStandingsProps> = ({
  userId,
  showOnlyCurrentDivisions = false, // Changed default to false to show all seasons
  sportFilter,
  gameTypeFilter,
  onStatsCalculated,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [divisionsWithStandings, setDivisionsWithStandings] = useState<DivisionWithStandings[]>([]);

  useEffect(() => {
    if (userId) {
      fetchUserDivisions();
    }
  }, [userId]);

  const fetchUserDivisions = async () => {
    try {
      setIsLoading(true);
      console.log('🏆 PlayerDivisionStandings: Fetching divisions for user:', userId);
      const data = await StandingsService.getUserStandings(userId);
      console.log('🏆 PlayerDivisionStandings: Received', data.length, 'divisions');
      console.log('🏆 PlayerDivisionStandings: Division data:', JSON.stringify(data.map(d => ({
        id: d.division.id,
        name: d.division.name,
        hasUserStanding: !!d.userStanding,
        league: d.division.league?.name,
        season: d.division.season?.name,
      })), null, 2));
      setDivisionsWithStandings(data);
    } catch (error) {
      console.error('🏆 PlayerDivisionStandings: Error fetching user divisions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate and report aggregated stats when divisions change or filters change
  useEffect(() => {
    if (!onStatsCalculated) return;

    let totalWins = 0;
    let totalLosses = 0;
    let totalMatchesPlayed = 0;

    divisionsWithStandings.forEach(({ division, userStanding }) => {
      // Apply sport filter
      if (sportFilter) {
        const divisionSport = normalizeSportType(division.league?.sportType);
        if (divisionSport !== sportFilter) return;
      }

      // Apply game type filter (for stats aggregation)
      if (gameTypeFilter) {
        const divisionGameType = normalizeGameType(division.gameType);
        if (divisionGameType !== gameTypeFilter) return;
      }

      if (userStanding) {
        totalWins += userStanding.wins || 0;
        totalLosses += userStanding.losses || 0;
        totalMatchesPlayed += userStanding.matchesPlayed || 0;
      }
    });

    onStatsCalculated({ wins: totalWins, losses: totalLosses, matchesPlayed: totalMatchesPlayed });
  }, [divisionsWithStandings, sportFilter, gameTypeFilter, onStatsCalculated]);

  // Filter divisions by sport for display
  const filteredDivisions = divisionsWithStandings.filter((divisionData) => {
    if (!sportFilter) return true;
    const divisionSport = normalizeSportType(divisionData.division.league?.sportType);
    return divisionSport === sportFilter;
  });

  const handleDivisionPress = (divisionData: DivisionWithStandings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { division } = divisionData;

    // Default to PICKLEBALL if no sportType (matches other screens like LeagueDetailsScreen)
    const sportType = division.league?.sportType || 'PICKLEBALL';

    router.push({
      pathname: '/standings' as any,
      params: {
        seasonId: division.seasonId,
        seasonName: division.season?.name || 'Season',
        leagueId: division.leagueId || '',
        leagueName: division.league?.name || 'League',
        sportType: sportType,
        startDate: division.season?.startDate || '',
        endDate: division.season?.endDate || '',
      }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Division Standings</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading standings...</Text>
        </View>
      </View>
    );
  }

  if (filteredDivisions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Division Standings</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={40} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            {sportFilter ? `No ${sportFilter} divisions yet` : 'Not in any divisions yet'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Division Standings</Text>

      {filteredDivisions.map((divisionData) => {
        const { division, userStanding } = divisionData;

        if (!userStanding && showOnlyCurrentDivisions) return null;

        const sportColor = getSportColor(division.league?.sportType);
        const leagueName = division.league?.name || 'League';
        const seasonName = division.season?.name || 'Season';

        return (
          <TouchableOpacity
            key={division.id}
            style={styles.divisionCard}
            onPress={() => handleDivisionPress(divisionData)}
            activeOpacity={0.7}
          >
            {/* Division Header with arrow */}
            <View style={styles.divisionHeader}>
              <Text style={styles.divisionName}>{division.name}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>

            {/* League & Season Context */}
            <View style={styles.contextRow}>
              <View style={[styles.sportIndicator, { backgroundColor: sportColor }]} />
              <Text style={styles.contextText}>
                {leagueName} · {seasonName}
              </Text>
            </View>

            {/* User's Standing */}
            {userStanding ? (
              <View style={styles.userStandingRow}>
                <View style={styles.rankContainer}>
                  <Text style={styles.rankText}>#{userStanding.rank || '-'}</Text>
                </View>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userStanding.matchesPlayed}</Text>
                    <Text style={styles.statLabel}>P</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.winText]}>{userStanding.wins}</Text>
                    <Text style={styles.statLabel}>W</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.lossText]}>{userStanding.losses}</Text>
                    <Text style={styles.statLabel}>L</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, styles.pointsText]}>{userStanding.totalPoints}pts</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noStandingRow}>
                <Text style={styles.noStandingText}>No matches played yet</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
    letterSpacing: -0.3,
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    padding: theme.spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    padding: theme.spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: theme.spacing.sm,
    fontSize: 14,
    color: '#6B7280',
  },
  divisionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  divisionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sportIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  contextText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  userStandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: theme.spacing.md,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FEA04D',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  winText: {
    color: '#34C759',
  },
  lossText: {
    color: '#FF3B30',
  },
  pointsText: {
    color: '#FEA04D',
    fontWeight: '700',
  },
  noStandingRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  noStandingText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
