import { theme } from '@core/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Responsive margin: ~7% of screen height, capped between -50 and -80
const CARD_TOP_MARGIN = Math.max(-80, Math.min(-50, -SCREEN_HEIGHT * 0.07));

const SPORT_COLORS = {
  Tennis: '#A2E047',
  Pickleball: '#A04DFE',
  Padel: '#4DABFE',
} as const;

interface ProfileInfoCardProps {
  name: string;
  username: string;
  bio: string;
  location: string;
  gender?: string;
  sports?: string[];
  activeSports?: string[];
  showActionButtons?: boolean;
  onAddFriend?: () => void;
  onChat?: () => void;
  onSportPress?: (sport: string) => void;
  isLoadingChat?: boolean;
}

export const ProfileInfoCard: React.FC<ProfileInfoCardProps> = ({
  name,
  username,
  bio,
  location,
  gender,
  sports = [],
  activeSports = [],
  showActionButtons = false,
  onAddFriend,
  onChat,
  onSportPress,
  isLoadingChat = false,
}) => {
  return (
    <View style={styles.profileInfoCard}>
      {/* Name and Gender Row */}
      <View style={styles.nameRow}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{name}</Text>
          {gender && gender !== 'Gender not set' && (
            <Ionicons
              name={gender.toLowerCase() === 'male' ? 'male' : 'female'}
              size={16}
              color={gender.toLowerCase() === 'male' ? '#4A90E2' : '#E91E63'}
              style={styles.genderIcon}
            />
          )}
        </View>
        {showActionButtons && (
          <View style={styles.actionIconsRow}>
            {onAddFriend && (
              <Pressable
                style={[styles.actionIcon, styles.addFriendIcon]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onAddFriend();
                }}
              >
                <Ionicons name="person-add" size={14} color="#20659d" />
              </Pressable>
            )}
            {onChat && (
              <Pressable
                style={styles.actionIcon}
                onPress={() => {
                  if (!isLoadingChat) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onChat();
                  }
                }}
                disabled={isLoadingChat}
              >
                {isLoadingChat ? (
                  <ActivityIndicator size="small" color={theme.colors.neutral.gray[600]} />
                ) : (
                  <Ionicons name="chatbubble" size={14} color={theme.colors.neutral.gray[600]} />
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Username */}
      <Text style={styles.username}>@{username}</Text>

      {/* Bio */}
      <Text style={styles.bio}>{bio}</Text>

      {/* Location and Sports Row */}
      <View style={styles.locationSportsRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-sharp" size={14} color="#6de9a0" />
          <Text style={styles.locationText}>{location}</Text>
        </View>

        <View style={styles.sportsContainer}>
          <Text style={styles.sportsLabel}>Sports</Text>
          <View style={styles.sportsPills}>
            {sports.slice(0, 3).map((sport) => {
              const isActive = activeSports.includes(sport);

              return (
                <Pressable
                  key={sport}
                  style={[
                    styles.sportPill,
                    {
                      backgroundColor: SPORT_COLORS[sport as keyof typeof SPORT_COLORS] || '#6de9a0',
                      opacity: isActive ? 1 : 0.7,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSportPress?.(sport);
                  }}
                >
                  <Text style={styles.sportPillText}>
                    {sport}
                  </Text>
                </Pressable>
              );
            })}
            {sports.length > 3 && (
              <Text style={styles.moreSportsText}>+{sports.length - 3}</Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginTop: CARD_TOP_MARGIN,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700' as any,
    color: '#1a1a1a',
    fontFamily: theme.typography.fontFamily.primary,
    letterSpacing: -0.3,
  },
  genderIcon: {
    marginLeft: theme.spacing.xs,
  },
  actionIconsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionIcon: {
    padding: theme.spacing.sm,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addFriendIcon: {
    borderColor: '#20659d',
    backgroundColor: '#f0f8ff',
  },
  username: {
    color: '#6b7280',
    marginBottom: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500' as any,
  },
  bio: {
    color: '#9ca3af',
    marginBottom: theme.spacing.md,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 18,
    fontWeight: '400' as any,
  },
  locationSportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  locationText: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '400' as any,
  },
  sportsContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  sportsLabel: {
    fontSize: 11,
    fontWeight: '600' as any,
    color: theme.colors.neutral.gray[500],
    marginBottom: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sportsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    justifyContent: 'flex-end',
  },
  sportPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 6,
    alignItems: 'center',
  },
  sportPillText: {
    color: theme.colors.neutral.white,
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '600' as any,
    opacity: 0.95,
  },
  moreSportsText: {
    color: theme.colors.neutral.gray[500],
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500' as any,
    marginLeft: theme.spacing.xs,
    alignSelf: 'center',
  },
});
