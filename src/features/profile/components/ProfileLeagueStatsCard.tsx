import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';
import { InlineDropdown } from './InlineDropdown';
import { WinRateCircle } from './WinRateCircle';

interface ProfileLeagueStatsCardProps {
  activeTab: string;
  selectedGameType: string;
  gameTypeOptions: string[];
  onGameTypeSelect: (value: string) => void;
  winRate: number;
  wins?: number;
  losses?: number;
}

export const ProfileLeagueStatsCard: React.FC<ProfileLeagueStatsCardProps> = ({
  activeTab,
  selectedGameType,
  gameTypeOptions,
  onGameTypeSelect,
  winRate,
  wins = 0,
  losses = 0,
}) => {
  // Animation values for content transition
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const legendScale = useRef(new Animated.Value(1)).current;

  // Track previous values to detect changes
  const prevGameType = useRef(selectedGameType);
  const prevActiveTab = useRef(activeTab);

  useEffect(() => {
    // Only animate if game type or sport tab changed
    if (prevGameType.current !== selectedGameType || prevActiveTab.current !== activeTab) {
      // Animate out
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(legendScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset position and animate back in
        contentTranslateY.setValue(10);
        Animated.parallel([
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(contentTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(legendScale, {
            toValue: 1,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }),
        ]).start();
      });

      prevGameType.current = selectedGameType;
      prevActiveTab.current = activeTab;
    }
  }, [selectedGameType, activeTab]);

  return (
    <View style={styles.skillLevelSection}>
      <View style={styles.leagueStatsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.skillLabel}>League Stats - {activeTab}</Text>
          <InlineDropdown
            options={gameTypeOptions}
            selectedValue={selectedGameType}
            onSelect={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onGameTypeSelect(value);
            }}
          />
        </View>

        {/* Win Rate Circle Chart with animation */}
        <Animated.View
          style={[
            styles.winRateContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <WinRateCircle winRate={winRate} />
          <Animated.View
            style={[
              styles.winRateLegend,
              {
                transform: [{ scale: legendScale }],
              },
            ]}
          >
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#34C759' }]} />
              <Text style={styles.legendText}>Wins: {wins}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.legendText}>Losses: {losses}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skillLevelSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  leagueStatsContainer: {
    backgroundColor: '#ffffff',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: theme.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.sm,
  },
  skillLabel: {
    color: '#111827',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '600' as any,
  },
  winRateContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  winRateLegend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
  },
});
