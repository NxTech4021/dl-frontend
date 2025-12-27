import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FRIENDLY_BADGE_COLOR = '#5A5E6A';

interface FriendlyBadgeProps {
  style?: any;
}

export const FriendlyBadge: React.FC<FriendlyBadgeProps> = ({ style }) => {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>FRIENDLY</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: FRIENDLY_BADGE_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A4E5A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
});

export default FriendlyBadge;
