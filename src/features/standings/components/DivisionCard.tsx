import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { DivisionData, MatchResult, SportColors, StandingsPlayer, StandingsTeam } from '../types';
import { ResultsSection } from './ResultsSection';
import { StandingsTable } from './StandingsTable';

// Championship color palette
const COLORS = {
  background: '#0A0C10',
  cardBackground: 'rgba(22, 26, 35, 0.95)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  gold: '#FFD700',
  goldDark: '#D4A800',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  accent: '#00D4FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  divider: 'rgba(255, 255, 255, 0.06)',
};

interface DivisionCardProps {
  division: DivisionData;
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  results: MatchResult[];
  resultsLoading: boolean;
  showResults: boolean;
  sportColors: SportColors;
  isPickleball: boolean;
  isUserDivision: boolean;
  currentUserId?: string;
  showViewMatchesButton?: boolean;
  onToggleResults: () => void;
  onViewMatches?: () => void;
  onPlayerPress?: (playerId: string) => void;
}

export const DivisionCard: React.FC<DivisionCardProps> = ({
  division,
  standings,
  groupedStandings,
  results,
  resultsLoading,
  showResults,
  sportColors,
  isPickleball,
  isUserDivision,
  currentUserId,
  showViewMatchesButton = false,
  onToggleResults,
  onViewMatches,
  onPlayerPress,
}) => {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const chevronRotation = useSharedValue(0);

  const isDoubles = division.gameType?.toLowerCase().includes('doubles') || false;

  // Get sport-specific accent color
  const getAccentColor = (): string => {
    const sport = sportColors.background?.toLowerCase();
    if (sport?.includes('#7cb342') || sport?.includes('#4caf50') || sport?.includes('green')) {
      return '#7CB342'; // Tennis green
    }
    if (sport?.includes('#42a5f5') || sport?.includes('#2196f3') || sport?.includes('blue')) {
      return '#42A5F5'; // Padel blue
    }
    return '#AB47BC'; // Pickleball purple
  };

  // Get gradient colors based on sport
  const getHeaderGradient = (): readonly [string, string] => {
    const accentColor = getAccentColor();
    return [accentColor, accentColor + 'CC'] as const;
  };

  const handleToggleComments = (matchId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const handleToggleResults = () => {
    chevronRotation.value = withSpring(showResults ? 0 : 180);
    onToggleResults();
  };

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const accentColor = getAccentColor();

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={[
        styles.container,
        isUserDivision && styles.containerHighlighted,
      ]}
    >
      {/* Card Background with Gradient Border Effect */}
      <LinearGradient
        colors={[
          isUserDivision ? COLORS.gold + '20' : 'rgba(255,255,255,0.08)',
          'rgba(255,255,255,0.02)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Division Title Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              {/* Division Icon */}
              <LinearGradient
                colors={getHeaderGradient()}
                style={styles.divisionIcon}
              >
                <Text style={styles.divisionIconText}>
                  {division.name.charAt(division.name.length - 1)}
                </Text>
              </LinearGradient>

              {/* Division Name & Type */}
              <View style={styles.titleTextContainer}>
                <Text style={styles.divisionName}>{division.name}</Text>
                {division.gameType && (
                  <View style={styles.gameTypeBadge}>
                    <Text style={styles.gameTypeText}>
                      {division.gameType.replace('_', ' ')}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Player Count Badge */}
            <View style={styles.playerCountBadge}>
              <Ionicons name="people" size={12} color={COLORS.textSecondary} />
              <Text style={styles.playerCountText}>
                {standings.length}
              </Text>
            </View>
          </View>

          {/* User Division Indicator */}
          {isUserDivision && (
            <View style={styles.userDivisionBadge}>
              <Ionicons name="star" size={10} color={COLORS.gold} />
              <Text style={styles.userDivisionText}>Your Division</Text>
            </View>
          )}
        </View>

        {/* TODO(dmr-display): Division threshold (pointsThreshold) available from backend but not displayed here. */}
        {/* Consider showing "Min DMR: {threshold}" badge if division.threshold is set. */}

        {/* Standings Table */}
        <StandingsTable
          standings={standings}
          groupedStandings={groupedStandings}
          isDoubles={isDoubles}
          currentUserId={currentUserId}
          isUserDivision={isUserDivision}
          onPlayerPress={onPlayerPress}
          accentColor={accentColor}
        />

        {/* Results Toggle */}
        <TouchableOpacity
          style={styles.resultsToggle}
          onPress={handleToggleResults}
          activeOpacity={0.7}
        >
          <View style={styles.resultsToggleContent}>
            <View style={[styles.resultsIconContainer, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="stats-chart" size={14} color={accentColor} />
            </View>
            <Text style={[styles.resultsToggleText, { color: accentColor }]}>
              {showResults ? 'Hide Recent Results' : 'View Recent Results'}
            </Text>
          </View>
          <Animated.View style={chevronAnimatedStyle}>
            <Ionicons name="chevron-down" size={18} color={accentColor} />
          </Animated.View>
        </TouchableOpacity>

        {/* Results Section */}
        {showResults && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ResultsSection
              results={results}
              isLoading={resultsLoading}
              sportColors={sportColors}
              isPickleball={isPickleball}
              expandedComments={expandedComments}
              onToggleComments={handleToggleComments}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  containerHighlighted: {
    borderColor: COLORS.gold + '40',
  },
  cardGradient: {
    backgroundColor: COLORS.cardBackground,
  },
  headerSection: {
    padding: 20,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  divisionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  divisionIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  titleTextContainer: {
    flex: 1,
  },
  divisionName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  gameTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gameTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  playerCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  userDivisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 12,
  },
  userDivisionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  resultsToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultsIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DivisionCard;
