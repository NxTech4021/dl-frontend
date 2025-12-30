import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const isSmallScreen = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH > 768;

interface SeasonCardSkeletonProps {
  sport?: 'pickleball' | 'tennis' | 'padel';
  count?: number;
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
          colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const getSeasonCardGradientColors = (sport: 'pickleball' | 'tennis' | 'padel'): [string, string] => {
  switch (sport) {
    case 'tennis':
      return ['#A2E047', '#FEA04D'];
    case 'padel':
      return ['#4DABFE', '#FEA04D'];
    case 'pickleball':
    default:
      return ['#A04DFE', '#FEA04D'];
  }
};

const SingleSeasonCardSkeleton: React.FC<{ sport: 'pickleball' | 'tennis' | 'padel' }> = ({ sport }) => {
  return (
    <LinearGradient
      colors={getSeasonCardGradientColors(sport)}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.seasonCardWrapper}
    >
      <View style={styles.seasonCard}>
        {/* Header - Season title + category chip */}
        <View style={styles.seasonCardHeader}>
          <ShimmerPlaceholder width={180} height={20} borderRadius={6} />
          <ShimmerPlaceholder width={80} height={28} borderRadius={10} />
        </View>

        {/* Date row */}
        <View style={styles.dateRow}>
          <ShimmerPlaceholder width={SCREEN_WIDTH - 100} height={14} borderRadius={6} />
        </View>

        {/* Player count */}
        <View style={styles.seasonPlayerCountContainer}>
          <ShimmerPlaceholder width={8} height={8} borderRadius={4} />
          <ShimmerPlaceholder width={80} height={14} borderRadius={6} style={{ marginLeft: 8 }} />
        </View>

        {/* Profile pictures */}
        <View style={styles.seasonProfilePicturesContainer}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ShimmerPlaceholder
              key={i}
              width={28}
              height={28}
              borderRadius={14}
              style={i > 0 ? { marginLeft: -8 } : undefined}
            />
          ))}
        </View>

        {/* Registration deadline */}
        <View style={styles.detailRow}>
          <ShimmerPlaceholder width={200} height={14} borderRadius={6} />
        </View>

        {/* Entry fee */}
        <View style={styles.entryFeeContainer}>
          <ShimmerPlaceholder width={150} height={14} borderRadius={6} />
        </View>

        {/* Button */}
        <View style={styles.buttonRow}>
          <ShimmerPlaceholder width={140} height={44} borderRadius={12} />
        </View>
      </View>
    </LinearGradient>
  );
};

export const SeasonCardSkeleton: React.FC<SeasonCardSkeletonProps> = ({ sport = 'pickleball', count = 2 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <ShimmerPlaceholder width={130} height={18} borderRadius={6} />
      </View>
      {Array.from({ length: count }).map((_, index) => (
        <SingleSeasonCardSkeleton key={index} sport={sport} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  seasonCardWrapper: {
    borderRadius: 16,
    padding: 2,
    marginBottom: 12,
  },
  seasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: isSmallScreen ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  seasonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  seasonPlayerCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  seasonProfilePicturesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  entryFeeContainer: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SeasonCardSkeleton;
