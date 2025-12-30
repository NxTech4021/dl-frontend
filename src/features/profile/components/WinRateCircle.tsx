import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '@core/theme/theme';
import type { WinRateCircleProps } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const WinRateCircle: React.FC<WinRateCircleProps> = ({ winRate }) => {
  const size = 120;
  const strokeWidth = 12; // Thicker stroke (was 8)
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // Animation values
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const animatedScale = useRef(new Animated.Value(0.8)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;
  const displayedWinRate = useRef(new Animated.Value(0)).current;

  // Track displayed percentage for text
  const [displayPercentage, setDisplayPercentage] = React.useState(0);

  useEffect(() => {
    // Reset and animate when winRate changes
    animatedProgress.setValue(0);
    animatedScale.setValue(0.8);
    animatedOpacity.setValue(0);
    displayedWinRate.setValue(0);

    // Animate the progress arc
    Animated.parallel([
      // Scale in animation
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // Fade in
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Progress arc animation
      Animated.timing(animatedProgress, {
        toValue: winRate,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // Can't use native driver for SVG props
      }),
      // Percentage counter animation
      Animated.timing(displayedWinRate, {
        toValue: winRate,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    // Listen to the animated value for text updates
    const listenerId = displayedWinRate.addListener(({ value }) => {
      setDisplayPercentage(Math.round(value));
    });

    return () => {
      displayedWinRate.removeListener(listenerId);
    };
  }, [winRate]);

  // Interpolate progress to strokeDashoffset
  const animatedStrokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View
      style={[
        styles.circleContainer as ViewStyle,
        {
          transform: [{ scale: animatedScale }],
          opacity: animatedOpacity,
        },
      ]}
    >
      <Svg width={size} height={size}>
        {/* Background circle (losses) */}
        <Circle
          stroke="#FF3B30"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          opacity={0.9}
        />
        {/* Win rate arc (animated) */}
        <AnimatedCircle
          stroke="#34C759"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={animatedStrokeDashoffset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.circleTextContainer as ViewStyle}>
        <Text style={styles.circlePercentage as TextStyle}>{displayPercentage}%</Text>
        <Text style={styles.circleLabel as TextStyle}>Win Rate</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circlePercentage: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
  },
  circleLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
});
