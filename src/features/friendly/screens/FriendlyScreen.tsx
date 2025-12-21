import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { toast } from 'sonner-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { FriendlyMatchCard, FriendlyMatch } from '../components/FriendlyMatchCard';
import { DateRangeFilterModal, DateRangeFilterModalRef } from '../components/DateRangeFilterModal';
import { CreateFriendlyMatchScreen, FriendlyMatchFormData } from './CreateFriendlyMatchScreen';

interface FriendlyScreenProps {
  sport: 'pickleball' | 'tennis' | 'padel';
}

type FilterTab = 'all' | 'open' | 'full';

export const FriendlyScreen: React.FC<FriendlyScreenProps> = ({ sport }) => {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const sportType: SportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);

  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const dateRangeFilterRef = useRef<DateRangeFilterModalRef>(null);

  const fetchFriendlyMatches = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        sport: sportType,
        page: '1',
        limit: '100',
      };

      if (dateRange.start) {
        params.fromDate = dateRange.start.toISOString();
      }
      if (dateRange.end) {
        params.toDate = dateRange.end.toISOString();
      }

      const response = await axiosInstance.get(endpoints.friendly.getAll, { params });
      const data = response.data?.data || response.data;
      const matchesData = data?.matches || data || [];

      setMatches(Array.isArray(matchesData) ? matchesData : []);
    } catch (error: any) {
      console.error('Error fetching friendly matches:', error);
      toast.error('Failed to load friendly matches');
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sportType, dateRange]);

  useEffect(() => {
    fetchFriendlyMatches();
  }, [fetchFriendlyMatches]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriendlyMatches();
  }, [fetchFriendlyMatches]);

  // Filter matches based on active tab
  const filteredMatches = React.useMemo(() => {
    let filtered = [...matches];

    // Filter by tab (open/full)
    if (activeTab === 'open') {
      filtered = filtered.filter(match => {
        const requiredParticipants = match.matchType === 'DOUBLES' ? 4 : 2;
        const activeParticipants = match.participants?.filter(
          p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
        ) || [];
        return activeParticipants.length < requiredParticipants;
      });
    } else if (activeTab === 'full') {
      filtered = filtered.filter(match => {
        const requiredParticipants = match.matchType === 'DOUBLES' ? 4 : 2;
        const activeParticipants = match.participants?.filter(
          p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
        ) || [];
        return activeParticipants.length >= requiredParticipants;
      });
    }

    // Sort by date (soonest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduledTime || a.matchDate || 0);
      const dateB = new Date(b.scheduledTime || b.matchDate || 0);
      return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  }, [matches, activeTab]);

  // Group matches by date
  const groupedMatches = React.useMemo(() => {
    const grouped: { [key: string]: FriendlyMatch[] } = {};

    filteredMatches.forEach((match) => {
      const dateString = match.scheduledTime || match.matchDate;
      if (!dateString) return;

      const date = new Date(dateString);
      const dateKey = format(date, 'EEEE, d MMMM yyyy');

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    });

    return grouped;
  }, [filteredMatches]);


  const handleCreateMatch = async (formData: FriendlyMatchFormData) => {
    try {
      // Parse date and time - same approach as league match creation
      const extractStartTime = (timeRange: string): string => {
        if (timeRange.includes(' - ')) {
          return timeRange.split(' - ')[0].trim();
        }
        return timeRange.trim();
      };

      const convertTo24Hour = (time12h: string): string => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') {
          hours = modifier === 'AM' ? '00' : '12';
        } else {
          hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
        }
        
        return `${hours}:${minutes}`;
      };

      // TIMEZONE HANDLING:
      // User selects time in their local timezone using device picker
      // We send the time + device timezone to backend
      // Backend converts from device timezone → Malaysia timezone → UTC for storage
      const startTime = extractStartTime(formData.time);
      const time24 = convertTo24Hour(startTime);
      const dateTimeString = `${formData.date}T${time24}:00`;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Use sport from formData (user's selection)
      const selectedSportType = formData.sport.toUpperCase() as 'PICKLEBALL' | 'TENNIS' | 'PADEL';

      const payload = {
        sport: selectedSportType,
        matchType: formData.numberOfPlayers === 4 ? 'DOUBLES' : 'SINGLES',
        format: 'STANDARD',
        matchDate: dateTimeString,
        deviceTimezone,
        location: formData.location,
        notes: formData.description,
        duration: formData.duration,
        courtBooked: formData.courtBooked,
        fee: formData.fee,
        feeAmount: formData.fee !== 'FREE' ? parseFloat(formData.feeAmount || '0') : undefined,
        genderRestriction: formData.genderRestriction,
        skillLevels: formData.skillLevels,
      };

      await axiosInstance.post(endpoints.friendly.create, payload);
      toast.success('Friendly match created successfully');
      setShowCreateModal(false);
      fetchFriendlyMatches();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create match';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const handleMatchPress = (match: FriendlyMatch) => {
    const dateString = match.scheduledTime || match.matchDate;
    if (!dateString) return;

    const startDate = new Date(dateString);
    const duration = match.duration || 2;
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

    router.push({
      pathname: '/match/match-details' as any,
      params: {
        matchId: match.id,
        matchType: match.matchType,
        date: format(startDate, 'MMM dd, yyyy'),
        time: `${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`,
        location: match.location || match.venue || 'TBD',
        sportType: sport,
        leagueName: 'Friendly Match',
        season: '',
        division: '',
        status: match.status,
        participants: JSON.stringify(match.participants || []),
        divisionId: '',
        seasonId: '',
        fee: match.fee || 'FREE',
        feeAmount: String(match.feeAmount || '0.00'),
        description: match.notes || match.description || '',
        courtBooked: match.courtBooked ? 'true' : 'false',
        isFriendly: 'true',
      },
    });
  };

  const handleDateRangeApply = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No friendly matches found</Text>
      <Text style={styles.emptyDescription}>
        {dateRange.start || dateRange.end
          ? 'Try adjusting your date filter'
          : 'Be the first to create a friendly match!'}
      </Text>
    </View>
  );

  const renderMatchGroup = (dateKey: string, dateMatches: FriendlyMatch[]) => (
    <View key={dateKey} style={styles.dateSection}>
      <View style={styles.dateDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dateLabel}>{dateKey}</Text>
        <View style={styles.dividerLine} />
      </View>
      {dateMatches.map((match) => (
        <FriendlyMatchCard key={match.id} match={match} onPress={handleMatchPress} />
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: sportColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={sportColors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: sportColors.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Friendly</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {/* Filter Controls */}
        <View style={styles.controlsContainer}>
          <View style={styles.chipsContainer}>
            {(['all', 'open', 'full'] as FilterTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.chip,
                  activeTab === tab
                    ? { backgroundColor: sportColors.background }
                    : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: sportColors.background }
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[
                  styles.chipText,
                  activeTab === tab ? { color: '#FFFFFF' } : { color: sportColors.background }
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Filter Button */}
          <TouchableOpacity
            style={[
              styles.dateFilterButton,
              (dateRange.start || dateRange.end) && styles.dateFilterButtonActive
            ]}
            onPress={() => dateRangeFilterRef.current?.present()}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={(dateRange.start || dateRange.end) ? '#FFFFFF' : sportColors.background}
            />
            {(dateRange.start || dateRange.end) && (
              <Text style={styles.dateFilterText}>
                {dateRange.start && format(dateRange.start, 'MMM dd')}
                {dateRange.end && ` - ${format(dateRange.end, 'MMM dd')}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Matches List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sportColors.background} />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        ) : Object.keys(groupedMatches).length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={Object.entries(groupedMatches)}
            keyExtractor={([dateKey]) => dateKey}
            renderItem={({ item: [dateKey, dateMatches] }) => renderMatchGroup(dateKey, dateMatches)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={sportColors.background}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Create Match FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: sportColors.background }]}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Date Range Filter Modal */}
      <DateRangeFilterModal
        ref={dateRangeFilterRef}
        onClose={() => {}}
        onApply={handleDateRangeApply}
        sportColor={sportColors.background}
      />

      {/* Create Match Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <CreateFriendlyMatchScreen
          sport={sport}
          onClose={() => setShowCreateModal(false)}
          onCreateMatch={handleCreateMatch}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  dateFilterButtonActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default FriendlyScreen;
