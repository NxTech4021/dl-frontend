import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ConfirmButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  loadingText?: string;
}

const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  onPress,
  disabled = false,
  isLoading = false,
  text = 'Confirm',
  loadingText = 'Saving...',
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      style={styles.touchableContainer}
    >
      <LinearGradient
        colors={disabled || isLoading ? ['#BABABA', '#BABABA'] : ['#FF7903', '#FEA04D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.button,
          (disabled || isLoading) && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.buttonText}>
          {isLoading ? loadingText : text}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchableContainer: {
    borderRadius: 22, // Half of height for pill shape
    overflow: 'hidden',
  },
  button: {
    height: 44,
    borderRadius: 22, // Half of height for pill shape
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
  },
});

export default ConfirmButton;
