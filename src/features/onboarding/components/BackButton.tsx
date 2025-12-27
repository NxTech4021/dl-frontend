import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BackButtonProps {
  onPress?: () => void;
  top?: number;
  left?: number;
}

/**
 * BackButton Component
 * Reusable back navigation button used across onboarding screens
 *
 * @param onPress - Optional custom onPress handler (defaults to router.back())
 * @param top - Optional top position (auto-calculated from safe area if not provided)
 * @param left - Optional left position (defaults to 19)
 */
const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  top,
  left = 19,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  // Calculate responsive top position if not provided
  // Use safe area insets on both platforms for consistent positioning
  const calculatedTop = top !== undefined ? top : insets.top + 20;

  return (
    <TouchableOpacity
      style={[styles.backButton, { top: calculatedTop, left }]}
      onPress={handlePress}
    >
      <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <Path
          d="M22.5 27L13.5 18L22.5 9"
          stroke="#000000"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default BackButton;
