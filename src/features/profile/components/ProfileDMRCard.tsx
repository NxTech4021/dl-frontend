import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';
import { InlineDropdown } from './InlineDropdown';
import { EloProgressGraph } from './EloProgressGraph';
import { MatchDetailsBox } from './MatchDetailsBox';
import type { GameData } from '../types';

interface ProfileDMRCardProps {
  activeTab: string;
  selectedGameType: string;
  gameTypeOptions: string[];
  onGameTypeSelect: (value: string) => void;
  getRatingForType: (sport: string, type: 'singles' | 'doubles') => number;
  eloData: GameData[];
  onPointPress: (game: GameData, index: number) => void;
  selectedMatch: any | null;
  selectedGraphIndex?: number | null;
  profileData: any;
}

export const ProfileDMRCard: React.FC<ProfileDMRCardProps> = ({
  activeTab,
  selectedGameType,
  gameTypeOptions,
  onGameTypeSelect,
  getRatingForType,
  eloData,
  onPointPress,
  selectedMatch,
  selectedGraphIndex,
  profileData,
}) => {
  return (
    <View style={styles.skillLevelSection}>
      <View style={styles.dmrContainer}>
        {/* DMR Label and Ratings */}
        <View style={styles.dmrHeader}>
          <Text style={styles.skillLabel}>DMR - {activeTab}</Text>
          <View style={styles.dmrRatingsRow}>
            <View style={styles.dmrItemVertical}>
              <Text style={styles.dmrTypeLabel}>Singles</Text>
              <View style={styles.ratingCircleSmall}>
                <Text style={styles.ratingTextSmall}>
                  {getRatingForType(activeTab || 'pickleball', 'singles') || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.dmrItemVertical}>
              <Text style={styles.dmrTypeLabel}>Doubles</Text>
              <View style={styles.ratingCircleSmall}>
                <Text style={styles.ratingTextSmall}>
                  {getRatingForType(activeTab || 'pickleball', 'doubles') || 'N/A'}
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

        {/* Match Details Box */}
        <MatchDetailsBox match={selectedMatch} profileData={profileData} />

        {/* ELO Progress Graph */}
        <EloProgressGraph
          data={eloData}
          onPointPress={onPointPress}
          selectedIndex={selectedGraphIndex ?? undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skillLevelSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  dmrContainer: {
    backgroundColor: '#ffffff',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: theme.colors.neutral.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dmrHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    paddingLeft: theme.spacing.md,
  },
  dmrRatingsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginRight: theme.spacing.md,
  },
  dmrItemVertical: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dmrTypeLabel: {
    color: theme.colors.neutral.gray[600],
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.medium as any,
    marginBottom: theme.spacing.xs,
  },
  ratingCircleSmall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fef7f0',
    borderWidth: 2,
    borderColor: '#fea04d',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fea04d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingTextSmall: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700' as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  dropdownSection: {
    marginBottom: theme.spacing.md,
  },
  skillLabel: {
    color: '#111827',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '600' as any,
  },
});
