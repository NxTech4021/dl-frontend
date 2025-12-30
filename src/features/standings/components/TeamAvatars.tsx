import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { PlayerAvatar } from './PlayerAvatar';

interface TeamAvatarsProps {
  players: Array<{ name: string; image?: string | null }>;
  size?: number;
  overlap?: number;
  style?: ViewStyle;
}

export const TeamAvatars: React.FC<TeamAvatarsProps> = ({
  players,
  size = 32,
  overlap = 7,
  style,
}) => {
  if (players.length === 0) return null;

  // Single player - just show one avatar
  if (players.length === 1) {
    return (
      <View style={[styles.container, style]}>
        <PlayerAvatar
          image={players[0].image}
          name={players[0].name}
          size={size}
          showBorder
        />
      </View>
    );
  }

  // Multiple players - overlapping avatars
  return (
    <View style={[styles.container, style]}>
      <View style={styles.avatarsRow}>
        {players.map((player, index) => (
          <View
            key={`player-${index}`}
            style={index > 0 ? { marginLeft: -overlap } : undefined}
          >
            <PlayerAvatar
              image={player.image}
              name={player.name}
              size={size}
              showBorder
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default TeamAvatars;
