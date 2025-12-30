import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StandingsPlayer, StandingsTeam } from '../types';
import { StandingsRow } from './StandingsRow';

interface StandingsTableProps {
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  isDoubles?: boolean;
  currentUserId?: string;
  isUserDivision?: boolean;
  onPlayerPress?: (playerId: string) => void;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  standings,
  groupedStandings,
  isDoubles = false,
  currentUserId,
  isUserDivision = false,
  onPlayerPress,
}) => {
  const isEmpty = standings.length === 0;

  // Determine if user is in the standings
  const isUserInRow = (player: StandingsPlayer): boolean => {
    return !!currentUserId && player.playerId === currentUserId;
  };

  const isUserInTeam = (team: StandingsTeam): boolean => {
    return !!currentUserId && team.players.some((p) => p.playerId === currentUserId);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Standings Yet</Text>
      <Text style={styles.emptyText}>
        Standings will appear once matches are completed
      </Text>
    </View>
  );

  const renderRows = () => {
    if (isDoubles && groupedStandings && groupedStandings.length > 0) {
      // Render grouped teams for doubles
      return groupedStandings.map((team, index) => (
        <StandingsRow
          key={`team-${team.rank}-${index}`}
          team={team}
          rank={index + 1}
          isDoubles
          isHighlighted={isUserInTeam(team)}
          onPress={onPlayerPress}
        />
      ));
    }

    // Render individual players for singles (or fallback)
    return standings.map((player, index) => (
      <StandingsRow
        key={player.playerId || `player-${index}`}
        player={player}
        rank={player.rank || index + 1}
        isHighlighted={isUserInRow(player)}
        onPress={onPlayerPress}
      />
    ));
  };

  return (
    <View
      style={[
        styles.standingsTableContainer,
        isUserDivision
          ? styles.standingsTableContainerHighlighted
          : styles.standingsTableContainerDefault,
      ]}
    >
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.rankHeaderCell}>
          <Text style={styles.headerText}>#</Text>
        </View>
        <View style={styles.playerHeaderCell}>
          <Text style={styles.headerText}>Player</Text>
        </View>
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
          <Text style={styles.headerText}>Pts</Text>
        </View>
      </View>

      {/* Table Body */}
      <View style={styles.tableBody}>
        {isEmpty ? renderEmptyState() : renderRows()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  standingsTableContainer: {
    backgroundColor: '#E9F3F8',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  standingsTableContainerHighlighted: {
    backgroundColor: '#E9F3F8',
  },
  standingsTableContainerDefault: {
    backgroundColor: '#F6FAFC',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rankHeaderCell: {
    width: 35,
    alignItems: 'center',
  },
  playerHeaderCell: {
    flex: 1,
    paddingLeft: 0,
    minWidth: 0,
  },
  statHeaderCell: {
    width: 25,
    alignItems: 'center',
  },
  ptsHeaderCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
    textTransform: 'uppercase',
  },
  tableBody: {
    paddingHorizontal: 0,
    gap: 4,
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

export default StandingsTable;
