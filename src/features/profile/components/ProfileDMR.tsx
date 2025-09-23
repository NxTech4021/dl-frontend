import React from 'react';
import { View, Text } from 'react-native';
import { InlineDropdown, EloProgressGraph } from './index';
import * as Haptics from 'expo-haptics';

interface ProfileDMRProps {
  styles: any; // Preserving exact styles from parent
  userData: any;
  activeTab: string;
  gameTypeOptions: string[];
  selectedGameType: string;
  onGameTypeSelect: (value: string) => void;
  getRatingForType: (sport: string, type: 'singles' | 'doubles') => string | null;
  mockEloData: any[];
  onGamePointPress: (game: any) => void;
}

/**
 * ProfileDMR - DMR (Dynamic Match Rating) section component
 *
 * CRITICAL: This component preserves exact styling and positioning from profile.tsx
 */
export const ProfileDMR: React.FC<ProfileDMRProps> = ({
  styles,
  userData,
  activeTab,
  gameTypeOptions,
  selectedGameType,
  onGameTypeSelect,
  getRatingForType,
  mockEloData,
  onGamePointPress,
}) => {
  return (
    <View style={styles.skillLevelSection}>
      <View style={styles.dmrContainer}>
        {/* DMR Label and Ratings */}
        <View style={styles.dmrHeader}>
          <Text style={styles.skillLabel}>DMR</Text>
          <View style={styles.dmrRatingsRow}>
            <View style={styles.dmrItemVertical}>
              <Text style={styles.dmrTypeLabel}>Singles</Text>
              <View style={styles.ratingCircleSmall}>
                <Text style={styles.ratingTextSmall}>
                  {getRatingForType(activeTab || userData.sports?.[0] || 'pickleball', 'singles') || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.dmrItemVertical}>
              <Text style={styles.dmrTypeLabel}>Doubles</Text>
              <View style={styles.ratingCircleSmall}>
                <Text style={styles.ratingTextSmall}>
                  {getRatingForType(activeTab || userData.sports?.[0] || 'pickleball', 'doubles') || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dropdown above graph */}
        <View style={styles.dropdownSection}>
          <InlineDropdown
            options={gameTypeOptions}
            selectedValue={selectedGameType}
            onSelect={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onGameTypeSelect(value);
            }}
          />
        </View>

        {/* ELO Progress Graph */}
        <EloProgressGraph
          data={mockEloData}
          onPointPress={onGamePointPress}
        />
      </View>
    </View>
  );
};