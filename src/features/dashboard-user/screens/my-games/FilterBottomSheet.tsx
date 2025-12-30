import React, { useState, useCallback, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

export interface FilterOptions {
  sport: string | null;
  division: string | null;
  season: string | null;
  matchType: 'LEAGUE' | 'FRIENDLY' | null;
  gameType: 'SINGLES' | 'DOUBLES' | null;
  status: string | null;
}

interface FilterBottomSheetProps {
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  uniqueSports: string[];
  uniqueDivisions: string[];
  uniqueSeasons: string[];
  uniqueStatuses: string[];
  currentFilters: FilterOptions;
  sportColor?: string;
}

export interface FilterBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

const MATCH_TYPES = [
  { value: 'LEAGUE', label: 'League' },
  { value: 'FRIENDLY', label: 'Friendly' },
];

const GAME_TYPES = [
  { value: 'SINGLES', label: 'Singles' },
  { value: 'DOUBLES', label: 'Doubles' },
];

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'DRAFT', label: 'Draft' },
];

const formatSportName = (sport: string): string => {
  return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
};

export const FilterBottomSheet = forwardRef<FilterBottomSheetRef, FilterBottomSheetProps>(({
  onClose,
  onApply,
  uniqueSports,
  uniqueDivisions,
  uniqueSeasons,
  uniqueStatuses,
  currentFilters,
  sportColor = '#A04DFE',
}, ref) => {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);

  // Local state for filters (to allow cancel without applying)
  const [localFilters, setLocalFilters] = useState<FilterOptions>(currentFilters);

  const snapPoints = useMemo(() => ['85%'], []);

  // Reset local filters when sheet opens with new current filters
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  useImperativeHandle(ref, () => ({
    present: () => {
      setLocalFilters(currentFilters); // Reset to current on open
      bottomSheetModalRef.current?.present();
    },
    dismiss: () => {
      bottomSheetModalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={() => bottomSheetModalRef.current?.dismiss()}
      />
    ),
    []
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleClearAll = () => {
    const clearedFilters = {
      sport: null,
      division: null,
      season: null,
      matchType: null,
      gameType: null,
      status: null,
    };
    setLocalFilters(clearedFilters);
    onApply(clearedFilters);
    bottomSheetModalRef.current?.dismiss();
  };

  const handleApply = () => {
    onApply(localFilters);
    bottomSheetModalRef.current?.dismiss();
  };

  const toggleFilter = <K extends keyof FilterOptions>(
    key: K,
    value: FilterOptions[K]
  ) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  const activeFilterCount = Object.values(localFilters).filter(Boolean).length;

  const renderFilterChip = (
    key: string,
    label: string,
    isActive: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.filterChip,
        isActive && { backgroundColor: sportColor },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          isActive && styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
      {isActive && (
        <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          {activeFilterCount > 0 ? (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllButton}>
              <Text style={[styles.clearAllText, { color: sportColor }]}>Clear All</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          <Text style={styles.title}>Filter Matches</Text>
          <TouchableOpacity
            onPress={() => bottomSheetModalRef.current?.dismiss()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#1D1D1F" />
          </TouchableOpacity>
        </View>

        {/* Filter Sections */}
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {/* Match Type (League vs Friendly) */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Match Type</Text>
            <View style={styles.chipsContainer}>
              {MATCH_TYPES.map(({ value, label }) =>
                renderFilterChip(
                  value,
                  label,
                  localFilters.matchType === value,
                  () => toggleFilter('matchType', value as 'LEAGUE' | 'FRIENDLY')
                )
              )}
            </View>
          </View>

          {/* Game Type (Singles vs Doubles) */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Game Type</Text>
            <View style={styles.chipsContainer}>
              {GAME_TYPES.map(({ value, label }) =>
                renderFilterChip(
                  value,
                  label,
                  localFilters.gameType === value,
                  () => toggleFilter('gameType', value as 'SINGLES' | 'DOUBLES')
                )
              )}
            </View>
          </View>

          {/* Sport */}
          {uniqueSports.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Sport</Text>
              <View style={styles.chipsContainer}>
                {uniqueSports.map((sport) =>
                  renderFilterChip(
                    sport,
                    formatSportName(sport),
                    localFilters.sport === sport,
                    () => toggleFilter('sport', sport)
                  )
                )}
              </View>
            </View>
          )}

          {/* Division */}
          {uniqueDivisions.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Division</Text>
              <View style={styles.chipsContainer}>
                {uniqueDivisions.map((division) =>
                  renderFilterChip(
                    division,
                    division,
                    localFilters.division === division,
                    () => toggleFilter('division', division)
                  )
                )}
              </View>
            </View>
          )}

          {/* Season */}
          {uniqueSeasons.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.sectionTitle}>Season</Text>
              <View style={styles.chipsContainer}>
                {uniqueSeasons.map((season) =>
                  renderFilterChip(
                    season,
                    season,
                    localFilters.season === season,
                    () => toggleFilter('season', season)
                  )
                )}
              </View>
            </View>
          )}

          {/* Status */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.chipsContainer}>
              {STATUS_OPTIONS.map(({ value, label }) =>
                renderFilterChip(
                  value,
                  label,
                  localFilters.status === value,
                  () => toggleFilter('status', value)
                )
              )}
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleClearAll}
          >
            <Ionicons name="refresh-outline" size={20} color="#6B7280" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: sportColor }]}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

FilterBottomSheet.displayName = 'FilterBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: '#E5E7EB',
    width: 40,
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  clearAllButton: {
    padding: 4,
    zIndex: 1,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  checkIcon: {
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FilterBottomSheet;
