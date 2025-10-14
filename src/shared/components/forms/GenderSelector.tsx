import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';

import type { GenderType } from '@features/onboarding/types';

// Male icon (Mars symbol)
const MaleIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Circle cx="6" cy="10" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
    <Path d="M8.5 7.5L12 4M12 4H9.5M12 4V6.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Female icon (Venus symbol)
const FemaleIcon = ({ color }: { color: string }) => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Circle cx="8" cy="6" r="3.5" stroke={color} strokeWidth="1.5" fill="none" />
    <Path d="M8 9.5V14M6 12H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface GenderSelectorProps {
  selectedGender: GenderType | null;
  onGenderSelect: (gender: GenderType) => void;
  label?: string;
  error?: string;
}

const GenderSelector: React.FC<GenderSelectorProps> = ({
  selectedGender,
  onGenderSelect,
  label = "Your Gender",
  error,
}) => {
  const genders: { label: string; value: GenderType }[] = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
  ];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.optionsContainer}>
        {genders.map((gender) => {
          const isSelected = selectedGender === gender.value;
          const iconColor = isSelected ? '#FFFFFF' : '#1A1C1E';
          return (
            <TouchableOpacity
              key={gender.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isSelected && gender.value === 'male' && styles.optionSelectedMale,
                isSelected && gender.value === 'female' && styles.optionSelectedFemale,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onGenderSelect(gender.value);
              }}
            >
              <View style={styles.optionContent}>
                {gender.value === 'male' ? (
                  <MaleIcon color={iconColor} />
                ) : (
                  <FemaleIcon color={iconColor} />
                )}
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {gender.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7278',
    marginBottom: 8,
    letterSpacing: -0.02,
    fontFamily: 'Roboto',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(254, 160, 77, 0.5)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E4E5E7',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionSelected: {
    borderWidth: 0,
  },
  optionSelectedMale: {
    backgroundColor: 'rgba(22, 94, 153, 0.85)',
  },
  optionSelectedFemale: {
    backgroundColor: 'rgba(22, 94, 153, 0.85)',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1C1E',
    textAlign: 'center',
    letterSpacing: -0.01,
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default GenderSelector;