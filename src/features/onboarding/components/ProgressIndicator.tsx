import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  activeColor?: string;
  inactiveColor?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  activeColor = '#FEA04D',
  inactiveColor = '#BABABA',
}) => {
  const animatedValues = useRef(
    Array.from({ length: totalSteps }, (_, index) => 
      new Animated.Value(index === currentStep ? 1 : 0)
    )
  ).current;

  useEffect(() => {
    animatedValues.forEach((animValue, index) => {
      Animated.timing(animValue, {
        toValue: index === currentStep ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [currentStep, animatedValues]);

  const renderStep = (index: number) => {
    const animValue = animatedValues[index];
    const isActive = index === currentStep;

    return (
      <Animated.View
        key={index}
        style={[
          styles.step,
          {
            backgroundColor: isActive ? activeColor : inactiveColor,
            width: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 24],
            }),
            height: 8,
            borderRadius: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 4],
            }),
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, index) => renderStep(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50, // Position above the bottom safe area
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  step: {
    borderRadius: 4,
    marginHorizontal: 3,
  },
});

export default ProgressIndicator;
