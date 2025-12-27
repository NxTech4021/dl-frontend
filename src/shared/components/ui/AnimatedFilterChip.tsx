import React, { useEffect } from 'react';
import { Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
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

// Convert hex to RGB object
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 160, g: 77, b: 254 }; // Default to pickleball purple
};

/**
 * AnimatedFilterChip - A filter chip with smooth color transitions
 *
 * Uses Reanimated for buttery smooth 60fps color animations
 * when switching between sports.
 */
export function AnimatedFilterChip({
  label,
  isActive,
  activeColor,
  onPress,
  style,
  textStyle,
}: AnimatedFilterChipProps) {
  const rgb = hexToRgb(activeColor);

  // Shared values for RGB channels - smoother than color string interpolation
  const r = useSharedValue(rgb.r);
  const g = useSharedValue(rgb.g);
  const b = useSharedValue(rgb.b);

  // Animate RGB values when color changes
  useEffect(() => {
    const newRgb = hexToRgb(activeColor);
    const config = {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    };
    r.value = withTiming(newRgb.r, config);
    g.value = withTiming(newRgb.g, config);
    b.value = withTiming(newRgb.b, config);
  }, [activeColor, r, g, b]);

  // Animated styles for the chip container
  const animatedChipStyle = useAnimatedStyle(() => {
    const color = `rgb(${Math.round(r.value)}, ${Math.round(g.value)}, ${Math.round(b.value)})`;
    return {
      backgroundColor: isActive ? color : '#FFFFFF',
      borderColor: isActive ? color : color,
      borderWidth: 1,
    };
  });

  // Animated styles for the text
  const animatedTextStyle = useAnimatedStyle(() => {
    const color = `rgb(${Math.round(r.value)}, ${Math.round(g.value)}, ${Math.round(b.value)})`;
    return {
      color: isActive ? '#FFFFFF' : color,
    };
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
