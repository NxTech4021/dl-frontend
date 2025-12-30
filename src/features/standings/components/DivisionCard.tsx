import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { DivisionData, MatchResult, SportColors, StandingsPlayer, StandingsTeam } from '../types';
import { isUserInStandings } from '../utils';
import { ResultsSection } from './ResultsSection';
import { StandingsTable } from './StandingsTable';

interface DivisionCardProps {
  division: DivisionData;
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  results: MatchResult[];
  resultsLoading: boolean;
  showResults: boolean;
  sportColors: SportColors;
  isPickleball: boolean;
  isUserDivision: boolean;
  currentUserId?: string;
  showViewMatchesButton?: boolean;
  onToggleResults: () => void;
  onViewMatches?: () => void;
  onPlayerPress?: (playerId: string) => void;
}

export const DivisionCard: React.FC<DivisionCardProps> = ({
  division,
  standings,
  groupedStandings,
  results,
  resultsLoading,
  showResults,
  sportColors,
  isPickleball,
  isUserDivision,
  currentUserId,
  showViewMatchesButton = false,
  onToggleResults,
  onViewMatches,
  onPlayerPress,
}) => {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const isDoubles = division.gameType?.toLowerCase().includes('doubles') || false;

  const handleToggleComments = (matchId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  // Determine container styling based on user's division
  const divisionContainerStyle: ViewStyle[] = [
    styles.divisionContainer,
    { marginBottom: 20 },
    isUserDivision
      ? styles.divisionContainerHighlighted
      : styles.divisionContainerDefault,
  ];

  return (
    <View style={divisionContainerStyle}>
      {/* Division Header - Sport themed */}
      <View style={[styles.divisionHeader, { backgroundColor: sportColors.background }]}>
        <Text style={styles.divisionName}>{division.name}</Text>
        {showViewMatchesButton && onViewMatches && (
          <TouchableOpacity
            style={styles.viewMatchesButton}
            onPress={onViewMatches}
            activeOpacity={0.7}
          >
            <Text style={styles.viewMatchesText}>View Matches</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Standings Table */}
      <StandingsTable
        standings={standings}
        groupedStandings={groupedStandings}
        isDoubles={isDoubles}
        currentUserId={currentUserId}
        isUserDivision={isUserDivision}
        onPlayerPress={onPlayerPress}
      />

      {/* View Results Toggle */}
      <TouchableOpacity
        style={styles.viewResultsButton}
        onPress={onToggleResults}
        activeOpacity={0.7}
      >
        <Text style={styles.viewResultsText}>View Results</Text>
        <Ionicons
          name={showResults ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#F09433"
        />
      </TouchableOpacity>

      {/* Results Section - Horizontal Scroll */}
      {showResults && (
        <ResultsSection
          results={results}
          isLoading={resultsLoading}
          sportColors={sportColors}
          isPickleball={isPickleball}
          expandedComments={expandedComments}
          onToggleComments={handleToggleComments}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  divisionContainer: {
    backgroundColor: '#E9F3F8',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divisionContainerHighlighted: {
    backgroundColor: '#E9F3F8',
    borderWidth: 1,
    borderColor: '#C7E3F2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  divisionContainerDefault: {
    backgroundColor: '#F6FAFC',
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#863A73',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  divisionName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewMatchesButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewMatchesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FEA04D',
  },
  viewResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 12,
    gap: 6,
  },
  viewResultsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F09433',
    textDecorationLine: 'underline',
  },
});

export default DivisionCard;
