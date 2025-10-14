import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth } = Dimensions.get('window');

interface BackgroundGradientProps {
  sport?: string;
}

/**
 * BackgroundGradient Component
 * 
 * Provides a consistent gradient background for all onboarding screens.
 * The gradient transitions from the brand orange color at the top to white
 * at the bottom, creating a subtle and professional appearance.
 * 
 * For pickleball, uses a custom purple gradient from #A04DFE to #602E98.
 * 
 * Features:
 * - Responsive width that adapts to screen size
 * - Positioned absolutely to sit behind all screen content
 * - Smooth gradient transition
 * - Sport-specific gradient support
 * - Optimized z-index to ensure proper layering
 * 
 * @component
 * @param sport - Optional sport name to determine gradient colors
 * @example
 * ```tsx
 * <SafeAreaView style={styles.container}>
 *   <BackgroundGradient sport="pickleball" />
 *   // Your screen content here
 * </SafeAreaView>
 * ```
 */
const BackgroundGradient: React.FC<BackgroundGradientProps> = React.memo(({ sport }) => {
  // Define gradient colors based on sport
  const getGradientColors = (): [string, string, ...string[]] => {
    if (sport === 'pickleball') {
      return ['#A04DFE', '#602E98'];
    }
    if (sport === 'tennis') {
      return ['#A2E047', '#587A27'];
    }
    if (sport === 'padel') {
      return ['#4DABFE', '#2E6698'];
    }
    // Default gradient for other sports
    return ['#FE9F4D', '#FFF5EE', '#FFFFFF'];
  };

  const getGradientLocations = (): [number, number, ...number[]] => {
    if (sport === 'pickleball') {
      return [0, 1];
    }
    if (sport === 'tennis') {
      return [0, 1];
    }
    if (sport === 'padel') {
      return [0, 1];
    }
    // Default locations for other sports
    return [0, 0.3, 0.7];
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      locations={getGradientLocations()}
      style={styles.gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
});

BackgroundGradient.displayName = 'BackgroundGradient';

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: screenWidth,
    zIndex: 0,
  },
});

export default BackgroundGradient;