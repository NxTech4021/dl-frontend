import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchCardSkeletonProps {
  count?: number;
}

const ShimmerPlaceholder: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 4, style }) => {
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
          backgroundColor: '#E5E7EB',
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

const SingleCardSkeleton: React.FC = () => {
  return (
    <View style={styles.matchCard}>
      {/* Top Section - Player avatars and badge */}
      <View style={styles.cardTopSection}>
        <View style={styles.playersRow}>
          {/* Player 1 */}
          <View style={styles.playerColumn}>
            <ShimmerPlaceholder width={56} height={56} borderRadius={28} />
            <ShimmerPlaceholder width={50} height={12} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
          {/* Player 2 */}
          <View style={styles.playerColumn}>
            <ShimmerPlaceholder width={56} height={56} borderRadius={28} />
            <ShimmerPlaceholder width={50} height={12} borderRadius={6} style={{ marginTop: 6 }} />
          </View>
        </View>
        {/* Badge */}
        <ShimmerPlaceholder width={70} height={28} borderRadius={12} />
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Info Section */}
      <View style={styles.cardInfoSection}>
        {/* Title */}
        <ShimmerPlaceholder width={180} height={18} borderRadius={6} />

        {/* Time row */}
        <View style={styles.infoRow}>
          <ShimmerPlaceholder width={16} height={16} borderRadius={8} />
          <ShimmerPlaceholder width={'100%'} height={14} borderRadius={6} style={{ marginLeft: 8, maxWidth: 200 }} />
        </View>

        {/* Location row */}
        <View style={styles.infoRow}>
          <ShimmerPlaceholder width={16} height={16} borderRadius={8} />
          <ShimmerPlaceholder width={'100%'} height={14} borderRadius={6} style={{ marginLeft: 8, maxWidth: 150 }} />
        </View>

        {/* Fee row */}
        <View style={styles.infoRow}>
          <ShimmerPlaceholder width={16} height={16} borderRadius={8} />
          <ShimmerPlaceholder width={'100%'} height={14} borderRadius={6} style={{ marginLeft: 8, maxWidth: 180 }} />
        </View>

        {/* Footer with status */}
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }} />
          <ShimmerPlaceholder width={90} height={28} borderRadius={14} />
        </View>
      </View>
    </View>
  );
};

export const MatchCardSkeleton: React.FC<MatchCardSkeletonProps> = ({ count = 3 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SingleCardSkeleton key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  playerColumn: {
    alignItems: 'center',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  cardInfoSection: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
});

export default MatchCardSkeleton;
