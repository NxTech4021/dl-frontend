import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type SkillLevel = 'BEGINNER' | 'IMPROVER' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'EXPERT';

interface SkillLevelSelectorProps {
  selectedLevels: SkillLevel[];
  onChange: (levels: SkillLevel[]) => void;
  sportColor?: string;
}

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'IMPROVER', label: 'Improver' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'UPPER_INTERMEDIATE', label: 'Upper Intermediate' },
  { value: 'EXPERT', label: 'Expert' },
];

export const SkillLevelSelector: React.FC<SkillLevelSelectorProps> = ({
  selectedLevels,
  onChange,
  sportColor = '#A04DFE',
}) => {
  const toggleLevel = (level: SkillLevel) => {
    if (selectedLevels.includes(level)) {
      // Remove if already selected
      if (selectedLevels.length > 1) {
        // Must have at least one selected
        onChange(selectedLevels.filter(l => l !== level));
      }
    } else {
      // Add if not selected
      onChange([...selectedLevels, level]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chipsContainer}>
        {SKILL_LEVELS.map((level) => {
          const isSelected = selectedLevels.includes(level.value);
          return (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.chip,
                isSelected && { backgroundColor: sportColor, borderColor: sportColor },
                !isSelected && styles.chipUnselected,
              ]}
              onPress={() => toggleLevel(level.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  !isSelected && { color: '#86868B' },
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedLevels.length === 0 && (
        <Text style={styles.errorText}>At least one skill level is required</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  chipUnselected: {
    backgroundColor: '#F2F2F2',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
});

export default SkillLevelSelector;
