import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, Text as RNText, ViewStyle, TextStyle } from 'react-native';
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
  badge?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  noBorder?: boolean;
  inactiveTextColor?: string;
  inactiveBackgroundColor?: string;
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
  badge,
  style,
  textStyle,
  noBorder,
  inactiveTextColor,
  inactiveBackgroundColor,
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
      [inactiveBackgroundColor || '#FFFFFF', activeColor]
    );

    return {
      backgroundColor,
      ...(noBorder ? {} : { borderColor: activeColor, borderWidth: 1 }),
      transform: [{ scale: 1 + progress.value * 0.02 }],
    };
  });

  // Animated styles for the text
  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveTextColor || activeColor, '#FFFFFF']
    );
    return { color };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <View style={styles.chipWrapper}>
        <Animated.View style={[styles.chip, animatedChipStyle, style]}>
          <Animated.Text style={[styles.chipText, animatedTextStyle, textStyle]}>
            {label}
          </Animated.Text>
        </Animated.View>
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <RNText style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </RNText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
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
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },
});

export default AnimatedFilterChip;
