import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MatchResult, SportColors } from '../types';
import StandingsScoreCard from './StandingsScoreCard';
import { ScrollProgressBar } from './ScrollProgressBar';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Card takes up most of the container but caps at 600 logical px.
// On small phones (~360px) this gives ~300px; on large phones (~430px) ~310px.
// The cap at 600 prevents it going huge on tablets while still looking natural.
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 80, 400);
const CARD_HEIGHT = 200;
const CARD_GAP = 16;

// Light theme palette — mirrors DivisionCard light theme
const COLORS = {
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  cardBackground: 'rgba(30, 35, 45, 0.6)',
  divider: 'rgba(0, 0, 0, 0.06)',
};

interface ResultsSectionProps {
  results: MatchResult[];
  isLoading: boolean;
  sportColors: SportColors;
  isPickleball: boolean;
  expandedComments: Set<string>;
  onToggleComments: (matchId: string) => void;
  onScrollUpdate?: (progress: number, viewWidth: number, contentWidth: number) => void;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  results: resultsProp,
  isLoading,
  sportColors,
  isPickleball,
  expandedComments,
  onToggleComments,
  onScrollUpdate,
}) => {
  const results: MatchResult[] = Array.isArray(resultsProp) ? resultsProp : [];
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  if (isLoading) {
    return (
      <View style={styles.resultsLoadingContainer}>
        <View style={styles.loadingSpinner}>
          <ActivityIndicator size="small" color={sportColors.background} />
        </View>
        <Text style={styles.resultsLoadingText}>Loading results...</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.noResultsContainer}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          style={styles.noResultsIconContainer}
        >
          <Ionicons name="document-text-outline" size={28} color={COLORS.textMuted} />
        </LinearGradient>
        <Text style={styles.noResultsText}>No completed matches yet</Text>
        <Text style={styles.noResultsSubtext}>Results will appear here after matches are played</Text>
      </View>
    );
  }

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollX = contentOffset.x;
    const maxScrollX = contentSize.width - layoutMeasurement.width;
    const progress = maxScrollX > 0 ? scrollX / maxScrollX : 0;
    setScrollProgress(progress);
    onScrollUpdate?.(progress, layoutMeasurement.width, contentSize.width);
  };

  const handleContentSizeChange = (width: number) => {
    setContentWidth(width);
  };

  const handleLayout = (event: any) => {
    const layoutWidth = event.nativeEvent.layout.width;
    setScrollViewWidth(layoutWidth);
  };

  return (
    <View style={styles.resultsSectionNew}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Matches</Text>
        <Text style={styles.matchCount}>{results.length} match{results.length !== 1 ? 'es' : ''}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="center"
        pagingEnabled={false}
        contentContainerStyle={styles.resultsScrollContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        {results.map((match, index) => (
          <View
            key={match.id}
            style={[
              styles.cardWrapper,
              {
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                marginRight: CARD_GAP,
              }
            ]}
          >
            <StandingsScoreCard
              match={match}
              sportColors={sportColors}
            />
          </View>
        ))}
      </ScrollView>

      {/* Progress Slider */}
      {results.length > 1 && (
        <ScrollProgressBar
          progress={scrollProgress}
          viewWidth={scrollViewWidth}
          contentWidth={contentWidth}
          accentColor={sportColors.background}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  resultsSectionNew: {
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  matchCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  resultsScrollContent: {
    paddingVertical: 4,
    // Centre the first card by offsetting with half the remaining space
    paddingHorizontal: Math.max((SCREEN_WIDTH - CARD_WIDTH) / 2, 16),
  },
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsLoadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  noResultsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  noResultsSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

export default ResultsSection;
