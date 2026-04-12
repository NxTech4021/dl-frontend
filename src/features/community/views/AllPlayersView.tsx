import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { EmptyState, PlayerListItem } from '../components';
import type { PlayerListMode } from '../components/PlayerListItem';
import { Player } from '../types';
import { theme } from '@/src/core/theme/theme';

interface AllPlayersViewProps {
  players: Player[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  searchQuery: string;
  mode?: PlayerListMode;
  actionLoading?: string | null;
  isFriendCheck: (playerId: string) => boolean;
  isPendingCheck: (playerId: string) => boolean;
  onPlayerPress?: (player: Player) => void;
  onAddFriend: (player: Player) => void;
}

export const AllPlayersView: React.FC<AllPlayersViewProps> = ({
  players,
  isLoading,
  isLoadingMore,
  searchQuery,
  mode = 'friend',
  actionLoading,
  isFriendCheck,
  isPendingCheck,
  onPlayerPress,
  onAddFriend,
}) => {
  if (isLoading) {
    return (
      <EmptyState
        icon="search-outline"
        title="Loading players..."
        subtitle="Please wait"
      />
    );
  }

  if (players.length === 0 && searchQuery.trim().length >= 2) {
    return (
      <EmptyState
        icon="search-outline"
        title="No players found"
        subtitle="Try adjusting your search query"
      />
    );
  }

  return (
    <View style={styles.container}>
      {players.map((player, index) => (
        <React.Fragment key={player.id}>
          <PlayerListItem
            player={player}
            isFriend={isFriendCheck(player.id)}
            isPendingRequest={isPendingCheck(player.id)}
            mode={mode}
            actionLoading={actionLoading === player.id}
            onPress={onPlayerPress}
            onAddFriend={onAddFriend}
          />
          {index < players.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
      {isLoadingMore && (
        <ActivityIndicator style={styles.loadingMore} color={theme.colors.primary} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 63,
  },
  loadingMore: {
    paddingVertical: 16,
  },
});
