import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StandingsPlayer, StandingsTeam } from '../types';
import { formatTeamNames } from '../utils';
import { PlayerAvatar } from './PlayerAvatar';
import { TeamAvatars } from './TeamAvatars';

interface StandingsRowProps {
  player?: StandingsPlayer;
  team?: StandingsTeam;
  rank: number;
  isDoubles?: boolean;
  isHighlighted?: boolean;
  onPress?: (playerId: string) => void;
}

export const StandingsRow: React.FC<StandingsRowProps> = ({
  player,
  team,
  rank,
  isDoubles = false,
  isHighlighted = false,
  onPress,
}) => {
  // Determine if we're rendering a team or single player
  const isTeamRender = isDoubles && team && team.players.length > 1;

  const handlePress = () => {
    if (onPress) {
      if (isTeamRender && team) {
        // For teams, press on first player
        onPress(team.players[0]?.playerId);
      } else if (player) {
        onPress(player.playerId);
      }
    }
  };

  const renderContent = () => {
    if (isTeamRender && team) {
      // Render doubles team row
      return (
        <>
          {/* Rank */}
          <View style={styles.rankCell}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>

          {/* Players */}
          <View style={styles.playerCell}>
            <View style={styles.teamAvatarsContainer}>
              <TeamAvatars
                players={team.players.map((p) => ({ name: p.name, image: p.image }))}
                size={32}
                overlap={7}
              />
              <Text style={styles.teamPlayerName} numberOfLines={1}>
                {formatTeamNames(team.players)}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statCell}>
            <Text style={styles.statText}>{team.played}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statText}>{team.wins}</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statText}>{team.losses}</Text>
          </View>
          <View style={styles.ptsCell}>
            <Text style={styles.ptsText}>{team.points}pts</Text>
          </View>
        </>
      );
    }

    // Render single player row (also handles team with 1 player)
    const playerData = player || team?.players[0];
    if (!playerData) return null;

    return (
      <>
        {/* Rank */}
        <View style={styles.rankCell}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>

        {/* Player */}
        <View style={styles.playerCell}>
          <PlayerAvatar
            image={playerData.image}
            name={playerData.name}
            size={28}
          />
          <Text style={styles.playerName} numberOfLines={1}>
            {playerData.name}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statCell}>
          <Text style={styles.statText}>{playerData.played}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{playerData.wins}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{playerData.losses}</Text>
        </View>
        <View style={styles.ptsCell}>
          <Text style={styles.ptsText}>{playerData.points}pts</Text>
        </View>
      </>
    );
  };

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress: handlePress, activeOpacity: 0.7 } : {};

  return (
    <Container
      style={[styles.playerCard, isHighlighted && styles.playerCardHighlighted]}
      {...containerProps}
    >
      {renderContent()}
    </Container>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#DCE1E4',
  },
  playerCardHighlighted: {
    borderColor: '#C7E3F2',
    backgroundColor: '#F0F9FF',
  },
  rankCell: {
    width: 35,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  playerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  teamAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  teamPlayerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statCell: {
    width: 25,
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  ptsCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  ptsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
});

export default StandingsRow;
