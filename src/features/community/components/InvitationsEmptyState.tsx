import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface InvitationsEmptyStateProps {
  type: 'received' | 'sent';
}

const EMPTY_STATE_CONTENT = {
  received: {
    icon: 'people-outline' as const,
    title: 'No friend requests yet',
    subtitle: 'Connect with players in your community to receive friend requests and season invitations',
  },
  sent: {
    icon: 'paper-plane-outline' as const,
    title: 'No pending requests',
    subtitle: 'Search for players and send friend requests to grow your tennis network',
  },
};

export const InvitationsEmptyState: React.FC<InvitationsEmptyStateProps> = ({ type }) => {
  const content = EMPTY_STATE_CONTENT[type];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={content.icon} size={48} color="#BABABA" />
      </View>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 17 : isTablet ? 22 : 19,
    color: '#1A1A1A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    color: '#999999',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: isSmallScreen ? 18 : isTablet ? 24 : 21,
    maxWidth: 280,
  },
});
