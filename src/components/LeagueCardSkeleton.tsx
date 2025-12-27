import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid item width calculation (2 columns with 12px gap, 20px padding on each side)
const GRID_GAP = 12;
const HORIZONTAL_PADDING = 20;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - GRID_GAP) / 2;

interface LeagueCardSkeletonProps {
  variant?: 'featured' | 'grid';
  gridCount?: number;
}

const ShimmerPlaceholder: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  backgroundColor?: string;
}> = ({ width, height, borderRadius = 4, style, backgroundColor = '#E5E7EB' }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View
      style={[
        {
          width: typeof width === 'number' ? width : undefined,
          height,
          borderRadius,
          backgroundColor,
          overflow: 'hidden',
        },
        typeof width === 'string' && { flex: 1 },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.3)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const FeaturedCardSkeleton: React.FC = () => {
  return (
    <View style={styles.featuredCard}>
      <LinearGradient
        colors={['#C4B5DC', '#D4D4D4']}
        style={styles.featuredGradient}
      >
        <View style={styles.featuredContent}>
          {/* Header */}
          <View style={styles.featuredHeader}>
            <View style={styles.featuredTitleSection}>
              <ShimmerPlaceholder
                width={180}
                height={20}
                borderRadius={6}
                backgroundColor="rgba(255,255,255,0.3)"
              />
              {/* Category chips */}
              <View style={styles.categoryChips}>
                <ShimmerPlaceholder
                  width={80}
                  height={24}
                  borderRadius={12}
                  backgroundColor="rgba(0,0,0,0.2)"
                />
                <ShimmerPlaceholder
                  width={70}
                  height={24}
                  borderRadius={12}
                  backgroundColor="rgba(0,0,0,0.2)"
                />
              </View>
            </View>
          </View>

          {/* Profile pictures */}
          <View style={styles.profileSection}>
            <View style={styles.profileRow}>
              {[0, 1, 2, 3, 4].map((i) => (
                <ShimmerPlaceholder
                  key={i}
                  width={36}
                  height={36}
                  borderRadius={18}
                  backgroundColor="rgba(255,255,255,0.4)"
                  style={i > 0 ? { marginLeft: -10 } : undefined}
                />
              ))}
            </View>
          </View>

          {/* Bottom stats */}
          <View style={styles.featuredBottom}>
            <View style={styles.statsRow}>
              <ShimmerPlaceholder
                width={8}
                height={8}
                borderRadius={4}
                backgroundColor="rgba(255,255,255,0.5)"
              />
              <ShimmerPlaceholder
                width={80}
                height={14}
                borderRadius={6}
                backgroundColor="rgba(255,255,255,0.3)"
                style={{ marginLeft: 8 }}
              />
            </View>
            <ShimmerPlaceholder
              width={100}
              height={12}
              borderRadius={6}
              backgroundColor="rgba(255,255,255,0.3)"
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const GridCardSkeleton: React.FC = () => {
  return (
    <View style={styles.gridCard}>
      <LinearGradient
        colors={['#C4B5DC', '#D4D4D4']}
        style={styles.gridGradient}
      >
        <View style={styles.gridContent}>
          {/* Header with title and season badge */}
          <View style={styles.gridHeader}>
            <ShimmerPlaceholder
              width={90}
              height={16}
              borderRadius={6}
              backgroundColor="rgba(255,255,255,0.3)"
            />
            <ShimmerPlaceholder
              width={40}
              height={22}
              borderRadius={12}
              backgroundColor="rgba(0,0,0,0.2)"
            />
          </View>

          {/* Player count */}
          <View style={styles.playerCount}>
            <ShimmerPlaceholder
              width={8}
              height={8}
              borderRadius={4}
              backgroundColor="rgba(255,255,255,0.5)"
            />
            <ShimmerPlaceholder
              width={60}
              height={12}
              borderRadius={6}
              backgroundColor="rgba(255,255,255,0.3)"
              style={{ marginLeft: 8 }}
            />
          </View>

          {/* Profile pictures */}
          <View style={styles.gridProfileRow}>
            {[0, 1, 2].map((i) => (
              <ShimmerPlaceholder
                key={i}
                width={32}
                height={32}
                borderRadius={16}
                backgroundColor="rgba(255,255,255,0.4)"
                style={i > 0 ? { marginLeft: -8 } : undefined}
              />
            ))}
          </View>

          {/* Registration text */}
          <ShimmerPlaceholder
            width={90}
            height={12}
            borderRadius={6}
            backgroundColor="rgba(255,255,255,0.3)"
          />
        </View>
      </LinearGradient>
    </View>
  );
};

export const LeagueCardSkeleton: React.FC<LeagueCardSkeletonProps> = ({
  variant = 'featured',
  gridCount = 4
}) => {
  if (variant === 'featured') {
    return <FeaturedCardSkeleton />;
  }

  return (
    <View style={styles.gridWrapper}>
      {Array.from({ length: gridCount }).map((_, index) => (
        <GridCardSkeleton key={index} />
      ))}
    </View>
  );
};

export const LeagueSkeletonLoader: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Featured card skeleton */}
      <FeaturedCardSkeleton />

      {/* Section header skeleton */}
      <View style={styles.sectionHeader}>
        <ShimmerPlaceholder width={150} height={18} borderRadius={6} />
        <ShimmerPlaceholder width={20} height={18} borderRadius={6} />
      </View>

      {/* Search bar skeleton */}
      <View style={styles.searchSkeleton}>
        <ShimmerPlaceholder width={'100%'} height={44} borderRadius={12} style={{ flex: 1 }} />
      </View>

      {/* Grid skeleton */}
      <View style={styles.gridWrapper}>
        {[0, 1, 2, 3].map((index) => (
          <GridCardSkeleton key={index} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  featuredCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredGradient: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  featuredContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featuredTitleSection: {
    flex: 1,
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  profileSection: {
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchSkeleton: {
    marginBottom: 16,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: GRID_ITEM_WIDTH,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gridGradient: {
    width: '100%',
    minHeight: 160,
    borderRadius: 16,
  },
  gridContent: {
    padding: 14,
    flex: 1,
    justifyContent: 'space-between',
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default LeagueCardSkeleton;
