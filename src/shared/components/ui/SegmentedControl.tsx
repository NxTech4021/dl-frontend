import React, { useCallback, useEffect } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  activeColor?: string;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeColor = '#111827',
}: SegmentedControlProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const segmentWidth = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Update position when selection changes
  useEffect(() => {
    translateX.value = withSpring(selectedIndex * segmentWidth.value, SPRING_CONFIG);
  }, [selectedIndex, translateX, segmentWidth]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width / options.length;
      segmentWidth.value = width;
      // Set initial position without animation
      translateX.value = selectedIndex * width;
    },
    [options.length, selectedIndex, segmentWidth, translateX]
  );

  const handlePress = useCallback(
    (optionValue: T, index: number) => {
      if (optionValue !== value) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(optionValue);
      }
    },
    [value, onChange]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth.value,
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Sliding indicator */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: activeColor },
          indicatorStyle,
        ]}
      />

      {/* Segment buttons */}
      {options.map((option, index) => (
        <SegmentButton
          key={option.value}
          label={option.label}
          isActive={option.value === value}
          activeColor={activeColor}
          onPress={() => handlePress(option.value, index)}
        />
      ))}
    </View>
  );
}

interface SegmentButtonProps {
  label: string;
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
}

function SegmentButton({ label, isActive, activeColor, onPress }: SegmentButtonProps) {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isActive ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isActive, progress]);

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ['#6B7280', '#FFFFFF']),
  }));

  return (
    <Pressable style={styles.segment} onPress={onPress}>
      <Animated.Text style={[styles.segmentText, textStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SegmentedControl;
