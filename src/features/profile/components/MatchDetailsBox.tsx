import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { theme } from '@core/theme/theme';
import type { GameData } from '../types';

interface MatchDetailsBoxProps {
  match: GameData | null;
  profileData: any;
}

// Animated counter component for smooth number transitions
const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  style?: any;
  prefix?: string;
  suffix?: string;
}> = ({ value, duration = 350, style, prefix = '', suffix = '' }) => {
  const [displayedValue, setDisplayedValue] = useState(value);
  const prevValueRef = React.useRef(value);

  useEffect(() => {
    // Animate from previous value to new value
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayedValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = value;
      }
    };

    animate();
  }, [value, duration]);

  return (
    <Text style={style}>
      {prefix}{displayedValue}{suffix}
    </Text>
  );
};

// Component for animated text that fades when content changes
const AnimatedText: React.FC<{
  text: string;
  style?: any;
  animationKey: string;
}> = ({ text, style, animationKey }) => {
  return (
    <Animated.Text
      key={animationKey}
      entering={FadeIn.duration(250)}
      style={style}
    >
      {text}
    </Animated.Text>
  );
};

export const MatchDetailsBox: React.FC<MatchDetailsBoxProps> = ({ match, profileData }) => {
  if (!match) {
    return (
      <View style={styles.matchDetailsBox}>
        <View style={styles.emptyMatchDetails}>
          <Text style={styles.emptyMatchDetailsText}>Click a point on the graph to view match details</Text>
        </View>
      </View>
    );
  }

  const matchKey = match.matchId || `${match.date}-${match.rating}`;

  // Helper to determine if user won a set based on setDetails or scores
  const getUserWonSet = (setNumber: 1 | 2 | 3): boolean | null => {
    // First try setDetails (more reliable)
    if (match.setDetails) {
      const setDetail = match.setDetails.find(s => s.setNumber === setNumber);
      if (setDetail) return setDetail.userWonSet;
    }
    // Fallback to scores
    const setKey = `set${setNumber}` as 'set1' | 'set2' | 'set3';
    const set = match.scores?.[setKey];
    if (set?.player1 !== null && set?.player2 !== null) {
      return set.player1 > set.player2;
    }
    return null;
  };

  // Check if set has valid scores
  const hasSetScores = (setNumber: 1 | 2 | 3): boolean => {
    const setKey = `set${setNumber}` as 'set1' | 'set2' | 'set3';
    const set = match.scores?.[setKey];
    return set?.player1 !== null && set?.player2 !== null;
  };

  // Render a set column with winner highlighting
  const renderSetColumn = (setNumber: 1 | 2 | 3) => {
    const setKey = `set${setNumber}` as 'set1' | 'set2' | 'set3';
    const set = match.scores?.[setKey];
    const userWon = getUserWonSet(setNumber);
    const hasScores = hasSetScores(setNumber);
    const setDelay = 50 + (setNumber - 1) * 40;

    return (
      <View style={styles.matchSetColumn} key={setNumber}>
        <Text style={styles.matchSetHeader}>Set {setNumber}</Text>
        <Animated.View
          key={`${matchKey}-set${setNumber}-p1`}
          entering={FadeIn.delay(setDelay).duration(200)}
          style={[
            styles.setScoreContainer,
            hasScores && userWon === true && styles.setScoreWonBackground
          ]}
        >
          <Text style={[
            styles.matchScore,
            hasScores && userWon === true && styles.setScoreWinner
          ]}>
            {set?.player1 !== null ? set.player1 : '-'}
          </Text>
        </Animated.View>
        <Animated.View
          key={`${matchKey}-set${setNumber}-p2`}
          entering={FadeIn.delay(setDelay + 30).duration(200)}
          style={[
            styles.setScoreContainer,
            hasScores && userWon === false && styles.setScoreLostBackground
          ]}
        >
          <Text style={[
            styles.matchScore,
            hasScores && userWon === false && styles.setScoreWinner
          ]}>
            {set?.player2 !== null ? set.player2 : '-'}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const isGain = match.ratingChange > 0;
  const ratingColor = isGain ? '#16a34a' : '#dc2626';

  return (
    <View style={styles.matchDetailsBox}>
      <View style={styles.matchDetailsContent}>
        {/* Top Row: Date (left) and Rating Transition (right) */}
        <View style={styles.matchTopRow}>
          <AnimatedText
            text={match.date}
            style={styles.matchDateText}
            animationKey={`date-${matchKey}`}
          />
          <View style={styles.matchRatingChangeContainer}>
            {/* Show rating transition: before → after (delta) */}
            {match.ratingBefore !== undefined ? (
              <View style={styles.ratingTransition}>
                <AnimatedCounter
                  value={match.ratingBefore}
                  style={styles.ratingBefore}
                  duration={300}
                />
                <Text style={styles.ratingArrow}>→</Text>
                <AnimatedCounter
                  value={match.rating}
                  style={styles.ratingAfter}
                  duration={400}
                />
                <AnimatedCounter
                  value={Math.abs(match.ratingChange)}
                  style={[styles.ratingDelta, { color: ratingColor }]}
                  prefix={`(${isGain ? '+' : '-'}`}
                  suffix=")"
                  duration={450}
                />
                <Animated.Text
                  key={`arrow-${matchKey}`}
                  entering={FadeIn.delay(200).duration(200)}
                  style={[styles.matchRatingChangeArrow, { color: ratingColor }]}
                >
                  {isGain ? '↗' : '↘'}
                </Animated.Text>
              </View>
            ) : (
              // Fallback to old display if ratingBefore not available
              <>
                <Text style={[styles.matchRatingChangeText, { color: ratingColor }]}>
                  {isGain ? '+' : ''}{match.ratingChange} pts
                </Text>
                {isGain && <Text style={styles.matchRatingChangeArrow}>↗</Text>}
              </>
            )}
          </View>
        </View>

        {/* Players and Sets */}
        <View style={styles.matchPlayersContainer}>
          {/* Player Names Column with Profile Icons */}
          <View style={styles.matchPlayerColumn}>
            <View style={styles.matchPlayerRow}>
              {profileData?.image ? (
                <Image
                  source={{ uri: profileData.image }}
                  style={styles.matchProfileImage}
                  onError={() => console.log('Profile image failed to load')}
                />
              ) : (
                <View style={styles.matchDefaultProfileIcon}>
                  <Text style={styles.matchProfileIconText}>{match.player1?.charAt(0) || 'Y'}</Text>
                </View>
              )}
              <Text style={styles.matchPlayerName}>{match.player1 || 'You'}</Text>
            </View>
            <View style={styles.matchPlayerRow}>
              {match.opponentImage ? (
                <Animated.Image
                  key={`opp-img-${matchKey}`}
                  entering={FadeIn.duration(200)}
                  source={{ uri: match.opponentImage }}
                  style={styles.matchProfileImage}
                  onError={() => console.log('Opponent image failed to load')}
                />
              ) : (
                <View style={styles.matchDefaultProfileIcon}>
                  <Text style={styles.matchProfileIconText}>{match.player2?.charAt(0) || 'O'}</Text>
                </View>
              )}
              <AnimatedText
                text={match.player2 || 'Opponent'}
                style={styles.matchPlayerName}
                animationKey={`opponent-${matchKey}`}
              />
            </View>
          </View>

          {/* Set Columns */}
          {renderSetColumn(1)}
          {renderSetColumn(2)}
          {renderSetColumn(3)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  matchDetailsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyMatchDetails: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyMatchDetailsText: {
    color: theme.colors.neutral.gray[500],
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  matchDetailsContent: {
    gap: theme.spacing.md,
  },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  matchDateText: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500' as any,
  },
  matchRatingChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchRatingChangeText: {
    fontSize: 14,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  matchRatingChangeArrow: {
    fontSize: 16,
    color: '#34C759',
  },
  matchPlayersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  matchPlayerColumn: {
    flex: 2,
    gap: theme.spacing.sm,
  },
  matchPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  matchProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  matchDefaultProfileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchProfileIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  matchPlayerName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '500' as any,
    fontFamily: theme.typography.fontFamily.primary,
    flex: 1,
  },
  matchSetColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  matchSetHeader: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  matchScore: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // New styles for rating transition
  ratingTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBefore: {
    color: '#6b7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  ratingArrow: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
  },
  ratingAfter: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  ratingDelta: {
    fontSize: 13,
    fontWeight: '600' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // New styles for set winner highlighting
  setScoreContainer: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  setScoreWonBackground: {
    backgroundColor: '#dcfce7', // Light green
  },
  setScoreLostBackground: {
    backgroundColor: '#fee2e2', // Light red
  },
  setScoreWinner: {
    fontWeight: '700' as any,
    color: '#111827',
  },
});
