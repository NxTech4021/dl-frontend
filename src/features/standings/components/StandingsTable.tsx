import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StandingsPlayer, StandingsTeam } from '../types';
import { StandingsRow } from './StandingsRow';

// LIGHT THEME (active)
const COLORS = {
  background: '#F6FAFC',
  cardBackground: '#FFFFFF',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  gold: '#FFD700',
   brand: '#FEA04D',
  goldDark: '#D4A800',
  silver: '#C0C0C0',
  silverDark: '#A8A8A8',
  bronze: '#CD7F32',
  bronzeDark: '#A66628',
  accent: '#FEA04D',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: 'rgba(0, 0, 0, 0.06)',
};

// DARK THEME — reserved for future dark mode
// const COLORS = {
//   background: '#0A0C10',
//   cardBackground: 'rgba(22, 26, 35, 0.95)',
//   cardBorder: 'rgba(255, 255, 255, 0.08)',
//   gold: '#FFD700',
//   goldDark: '#D4A800',
//   silver: '#C0C0C0',
//   silverDark: '#A8A8A8',
//   bronze: '#CD7F32',
//   bronzeDark: '#A66628',
//   accent: '#00D4FF',
//   textPrimary: '#FFFFFF',
//   textSecondary: '#9CA3AF',
//   textMuted: '#6B7280',
//   divider: 'rgba(255, 255, 255, 0.06)',
// };

interface StandingsTableProps {
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  isDoubles?: boolean;
  currentUserId?: string;
  isUserDivision?: boolean;
  onPlayerPress?: (playerId: string) => void;
  accentColor?: string;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  groupedStandings,
  isDoubles = false,
  currentUserId,
  isUserDivision = false,
  onPlayerPress,
  accentColor = '#AB47BC',
}) => {
  const isEmpty = standings.length === 0;

  const isUserInRow = (player: StandingsPlayer): boolean => {
    return !!currentUserId && player.playerId === currentUserId;
  };

  const isUserInTeam = (team: StandingsTeam): boolean => {
    return !!currentUserId && team.players.some((p) => p.playerId === currentUserId);
  };

  // Get medal gradient colors
  const getMedalGradient = (rank: number): readonly [string, string] => {
    switch (rank) {
      case 1:
        return [COLORS.gold, COLORS.goldDark] as const;
      case 2:
        return [COLORS.silver, COLORS.silverDark] as const;
      case 3:
        return [COLORS.bronze, COLORS.bronzeDark] as const;
      default:
        return ['transparent', 'transparent'] as const;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)']}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No Standings Yet</Text>
      <Text style={styles.emptyText}>
        Standings will appear once matches are completed
      </Text>
    </View>
  );

  const renderRows = () => {
    const rawSource = isDoubles && groupedStandings && groupedStandings.length > 0
      ? groupedStandings
      : standings;

    // Separate active from disbanded/inactive rows
    const activeRows = rawSource.filter((item) => item.isActive !== false && !item.isDisbanded);
    const inactiveRows = rawSource.filter((item) => item.isActive === false || item.isDisbanded);

    const renderItem = (item: StandingsPlayer | StandingsTeam, rank: number, isInactive: boolean) => {
      // Compute isDisbanded directly from the item — don't gate it through isInactive,
      // so it works even if a disbanded row ended up in activeRows due to stale DB data.
      const isDisbanded = !!(isDoubles
        ? (item as StandingsTeam).isDisbanded
        : (item as StandingsPlayer).isDisbanded);

      // Suppress top-3 treatment entirely for disbanded rows
      const isTop3 = !isInactive && !isDisbanded && rank <= 3;
      const isHighlighted = !isInactive && !isDisbanded && (
        isDoubles
          ? isUserInTeam(item as StandingsTeam)
          : isUserInRow(item as StandingsPlayer)
      );

      return (
        <Animated.View
          key={isDoubles ? `team-${rank}-${isInactive ? 'old' : 'active'}` : (item as StandingsPlayer).playerId || `player-${rank}`}
          entering={FadeInDown.delay(rank * 50).duration(300).springify()}
        >
          <StandingsRow
            player={isDoubles ? undefined : (item as StandingsPlayer)}
            team={isDoubles ? (item as StandingsTeam) : undefined}
            rank={rank}
            isDoubles={isDoubles}
            isHighlighted={isHighlighted}
            isTop3={isTop3}
            medalGradient={getMedalGradient(rank)}
            onPress={!isInactive ? onPlayerPress : undefined}
            accentColor={accentColor}
            isInactive={isInactive}
            isDisbanded={!!isDisbanded}
          />
        </Animated.View>
      );
    };

    const activeElements = activeRows.map((item, index) =>
      renderItem(item, index + 1, false)
    );

    const inactiveElements = inactiveRows.map((item, index) =>
      renderItem(item, index + 1, true)
    );

    return [...activeElements, ...inactiveElements];
  };

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.rankHeaderCell}>
          <Text style={styles.headerText}>#</Text>
        </View>
        <View style={styles.playerHeaderCell}>
          <Text style={styles.headerText}>PLAYER</Text>
        </View>
        <View style={styles.statsHeaderContainer}>
          <View style={styles.statHeaderCell}>
            <Text style={styles.headerText}>P</Text>
          </View>
          <View style={styles.statHeaderCell}>
            <Text style={styles.headerText}>W</Text>
          </View>
          <View style={styles.statHeaderCell}>
            <Text style={styles.headerText}>L</Text>
          </View>
          <View style={styles.ptsHeaderCell}>
            <Text style={[styles.headerText, styles.ptsHeaderText]}>PTS</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.headerDivider} />

      {/* Table Body */}
      <View style={styles.tableBody}>
        {isEmpty ? renderEmptyState() : renderRows()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  rankHeaderCell: {
    width: 40,
    alignItems: 'center',
  },
  playerHeaderCell: {
    flex: 1,
    paddingLeft: 4,
  },
  statsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statHeaderCell: {
    width: 32,
    alignItems: 'center',
  },
  ptsHeaderCell: {
    width: 50,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ptsHeaderText: {
    color: COLORS.brand,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: 8,
  },
  tableBody: {
    paddingVertical: 8,
    gap: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

export default StandingsTable;
