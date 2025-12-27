import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';
import { AchievementIcon } from './AchievementIcon';

interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlockedAt?: string;
}

interface ProfileAchievementsCardProps {
  achievements: Achievement[];
  onPress?: () => void;
}

export const ProfileAchievementsCard: React.FC<ProfileAchievementsCardProps> = ({
  achievements,
  onPress,
}) => {
  const hasAchievements = achievements && achievements.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      <Pressable
        style={styles.achievementContainer}
        onPress={() => {
          if (hasAchievements && onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }
        }}
        disabled={!hasAchievements || !onPress}
      >
        <View style={styles.achievementsContent}>
          {hasAchievements ? (
            achievements.slice(0, 2).map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <AchievementIcon iconName={achievement.icon} />
                <View style={styles.achievementTextContainer}>
                  <Text style={styles.achievementText}>{achievement.title}</Text>
                  {achievement.unlockedAt && (
                    <Text style={styles.achievementYear}>
                      ({new Date(achievement.unlockedAt).getFullYear()})
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noAchievementsContainer}>
              <Ionicons name="trophy-outline" size={32} color={theme.colors.neutral.gray[400]} />
              <Text style={styles.noAchievementsText}>No achievements yet</Text>
              <Text style={styles.noAchievementsSubtext}>Keep playing to unlock achievements!</Text>
            </View>
          )}
        </View>
        {hasAchievements && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} style={styles.achievementChevron} />
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as any,
    color: '#111827',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
    letterSpacing: -0.3,
  },
  achievementContainer: {
    backgroundColor: '#ffffff',
    padding: theme.spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  achievementsContent: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.lg,
  },
  achievementItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  achievementTextContainer: {
    marginTop: theme.spacing.xs,
    alignItems: 'center',
  },
  achievementText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
  },
  achievementYear: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[400],
    fontFamily: theme.typography.fontFamily.primary,
  },
  achievementChevron: {
    marginLeft: theme.spacing.sm,
  },
  noAchievementsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  noAchievementsText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500' as const,
    marginTop: theme.spacing.sm,
  },
  noAchievementsSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[400],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
