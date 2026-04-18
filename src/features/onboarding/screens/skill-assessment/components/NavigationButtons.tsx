import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './NavigationButtons.styles';

interface NavigationButtonsProps {
  onBack: () => void;
  onNext: () => void;
  nextEnabled: boolean;
  showBack?: boolean;
  sportColor?: string;
}

export const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  onBack,
  onNext,
  nextEnabled,
  showBack = true,
  sportColor,
}) => {
  return (
    <>
      {showBack && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onBack}
        >
          <Text style={[styles.skipButtonText, sportColor ? { color: sportColor } : undefined]}>Back</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.nextButtonContainer,
          !nextEnabled && styles.nextButtonDisabled
        ]}
        onPress={onNext}
        disabled={!nextEnabled}
      >
        <LinearGradient
          colors={['#FEA04D', '#FF7903']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButtonGradient}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
};
