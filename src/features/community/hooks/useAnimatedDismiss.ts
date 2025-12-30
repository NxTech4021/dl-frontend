import { useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface UseAnimatedDismissOptions {
  cardHeight: number;
  marginBottom?: number;
}

export const useAnimatedDismiss = ({
  cardHeight,
  marginBottom = 12,
}: UseAnimatedDismissOptions) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue(cardHeight);
  const margin = useSharedValue(marginBottom);
  const padding = useSharedValue(16);
  const callbackRef = useRef<(() => void) | null>(null);

  const executeCallback = useCallback(() => {
    if (callbackRef.current) {
      callbackRef.current();
      callbackRef.current = null;
    }
  }, []);

  const dismiss = useCallback(
    (direction: 'left' | 'right' = 'right', onComplete?: () => void) => {
      callbackRef.current = onComplete || null;
      const targetX = direction === 'right' ? SCREEN_WIDTH + 50 : -SCREEN_WIDTH - 50;

      // Slide out and fade
      translateX.value = withTiming(targetX, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });

      opacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      // Collapse height after slide starts
      height.value = withDelay(
        200,
        withTiming(0, {
          duration: 200,
          easing: Easing.inOut(Easing.cubic),
        })
      );

      margin.value = withDelay(
        200,
        withTiming(0, {
          duration: 200,
          easing: Easing.inOut(Easing.cubic),
        })
      );

      padding.value = withDelay(
        200,
        withTiming(
          0,
          {
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
          },
          (finished) => {
            if (finished && onComplete) {
              runOnJS(executeCallback)();
            }
          }
        )
      );
    },
    [executeCallback]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
    height: height.value === cardHeight ? 'auto' : height.value,
    marginBottom: margin.value,
    paddingVertical: padding.value,
    overflow: 'hidden',
  }));

  const reset = useCallback(() => {
    translateX.value = 0;
    opacity.value = 1;
    height.value = cardHeight;
    margin.value = marginBottom;
    padding.value = 16;
  }, [cardHeight, marginBottom]);

  return {
    animatedStyle,
    dismiss,
    reset,
  };
};
