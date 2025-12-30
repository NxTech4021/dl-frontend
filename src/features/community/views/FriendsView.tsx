import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PillTabSwitcher, FriendListItem, EmptyState } from '../components';
import { Friend } from '../types';

interface FriendsViewProps {
  friends: Friend[];
  partnerships: any[]; // TODO: Add proper Partnership type
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  friends,
  partnerships,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'pairs'>('friends');

  const tabs = [
    { key: 'friends', label: 'Friends', count: friends.length },
    { key: 'pairs', label: 'Pairs', count: partnerships.length },
  ];

  const displayedItems = activeTab === 'friends' ? friends : [];

  return (
    <View style={styles.container}>
      <PillTabSwitcher activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as 'friends' | 'pairs')} tabs={tabs} />
      {activeTab === 'friends' ? (
        friends.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No friends yet"
            subtitle="Send friend requests to connect with other players"
          />
        ) : (
          <View style={styles.listContainer}>
            {friends.map((friend, index) => (
              <React.Fragment key={friend.friendshipId}>
                <FriendListItem friend={friend} />
                {index < friends.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        )
      ) : (
        <EmptyState
          icon="people-outline"
          title="No pairs yet"
          subtitle="Pairs will appear here when you join seasons with friends"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginLeft: 60,
  },
});
