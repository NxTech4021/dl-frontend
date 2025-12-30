import React, { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedFilterChipProps {
  label: string;
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// Spring config for snappy, responsive animations
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.6,
};

/**
 * AnimatedFilterChip - A filter chip with instant, snappy animations
 *
 * Uses Reanimated spring animations for responsive 60fps transitions
 * when switching between active/inactive states.
 */
export function AnimatedFilterChip({
  label,
  isActive,
  activeColor,
  onPress,
  style,
  textStyle,
}: AnimatedFilterChipProps) {
  // Single shared value for active state interpolation
  const progress = useSharedValue(isActive ? 1 : 0);

  // Animate progress when active state changes
  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, SPRING_CONFIG);
  }, [isActive, progress]);

  // Animated styles for the chip container
  const animatedChipStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#FFFFFF', activeColor]
    );
    const borderColor = activeColor;

    return {
      backgroundColor,
      borderColor,
      borderWidth: 1,
      transform: [{ scale: 1 + progress.value * 0.02 }],
    };
  });

  // Animated styles for the text
  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [activeColor, '#FFFFFF']
    );
    return { color };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.chip, animatedChipStyle, style]}>
        <Animated.Text style={[styles.chipText, animatedTextStyle, textStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AnimatedFilterChip;
