import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface OptionButtonProps {
  title: string;
  isSelected?: boolean;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'compact';
  sport?: 'pickleball' | 'tennis' | 'padel';
}

const OptionButton: React.FC<OptionButtonProps> = ({
  title,
  isSelected = false,
  onPress,
  disabled = false,
  variant = 'default',
  sport = 'pickleball',
}) => {
  // Get sport-specific colors
  const getSportColors = () => {
    switch (sport) {
      case 'tennis':
        return {
          borderColor: '#587A27',
          textColor: '#587A27',
          selectedBorderColor: '#FE9F4D',
          selectedBackgroundColor: '#FE9F4D',
        };
      case 'padel':
        return {
          borderColor: '#4DABFE',
          textColor: '#4DABFE',
          selectedBorderColor: '#FE9F4D',
          selectedBackgroundColor: '#FE9F4D',
        };
      case 'pickleball':
      default:
        return {
          borderColor: '#A04DFE',
          textColor: '#A04DFE',
          selectedBorderColor: '#FE9F4D',
          selectedBackgroundColor: '#FE9F4D',
        };
    }
  };

  const sportColors = getSportColors();

  const buttonStyle: ViewStyle[] = [
    variant === 'compact' ? styles.buttonCompact : styles.button,
    { borderColor: sportColors.borderColor },
    ...(isSelected ? [{ 
      borderColor: sportColors.selectedBorderColor,
      backgroundColor: sportColors.selectedBackgroundColor 
    }] : []),
    ...(disabled ? [styles.buttonDisabled] : []),
  ];

  const textStyle: TextStyle[] = [
    variant === 'compact' ? styles.textCompact : styles.text,
    { color: sportColors.textColor },
    ...(isSelected ? [styles.textSelected] : []),
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ 
        selected: isSelected,
        disabled: disabled 
      }}
      accessibilityHint={`${isSelected ? 'Selected' : 'Not selected'}. Tap to ${isSelected ? 'deselect' : 'select'}.`}
    >
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonCompact: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  textCompact: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
    textAlign: 'center',
  },
  textSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default OptionButton;