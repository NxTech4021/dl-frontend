import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type GenderRestriction = 'MALE' | 'FEMALE' | 'OPEN';

interface GenderSelectorProps {
  value: GenderRestriction | null;
  onChange: (value: GenderRestriction | null) => void;
  sportColor?: string;
}

export const GenderSelector: React.FC<GenderSelectorProps> = ({
  value,
  onChange,
  sportColor = '#A04DFE',
}) => {
  const options: { label: string; value: GenderRestriction | null }[] = [
    { label: 'All', value: null },
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.label}
              style={[
                styles.option,
                isSelected && { backgroundColor: sportColor },
                !isSelected && styles.optionUnselected,
              ]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                  !isSelected && { color: '#86868B' },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  optionUnselected: {
    backgroundColor: '#F2F2F2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});

export default GenderSelector;
