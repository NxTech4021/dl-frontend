import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchCardSkeleton } from '@/src/components/MatchCardSkeleton';
import { AnimatedFilterChip } from '@/src/shared/components/ui/AnimatedFilterChip';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { toast } from 'sonner-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { getBackendBaseURL } from '@/src/config/network';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { FriendlyMatchCard, FriendlyMatch } from '../components/FriendlyMatchCard';
import { DateRangeFilterModal, DateRangeFilterModalRef } from '../components/DateRangeFilterModal';

// Cache key for friendly match summary
const FRIENDLY_SUMMARY_CACHE_KEY = 'friendly_matches_summary';

interface FriendlyScreenProps {
  sport: 'pickleball' | 'tennis' | 'padel';
}

type FilterTab = 'all' | 'open' | 'full';

export const FriendlyScreen: React.FC<FriendlyScreenProps> = ({ sport }) => {
  const { data: session } = useSession();
  const sportType: SportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);

  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false); // Only true when new content detected
  const hasInitializedRef = useRef(false); // Track if we've done the first load
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const dateRangeFilterRef = useRef<DateRangeFilterModalRef>(null);

  // Entry animation values
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Check if there's new content by comparing summary with cache
  const checkForNewContent = useCallback(async (): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const backendUrl = getBackendBaseURL();
      const response = await fetch(`${backendUrl}/api/friendly/summary?sport=${sportType}`, {
        headers: { 'x-user-id': session.user.id },
      });

      if (!response.ok) return true; // If summary fails, assume new content

      const newSummary = await response.json();
      const cacheKey = `${FRIENDLY_SUMMARY_CACHE_KEY}_${sportType}`;
      const cachedSummaryStr = await AsyncStorage.getItem(cacheKey);

      if (!cachedSummaryStr) {
        // First time - store and show skeleton
        await AsyncStorage.setItem(cacheKey, JSON.stringify(newSummary));
        return true;
      }

      const cachedSummary = JSON.parse(cachedSummaryStr);

      // Check if anything changed
      const hasNewContent =
        newSummary.count !== cachedSummary.count ||
        newSummary.latestUpdatedAt !== cachedSummary.latestUpdatedAt;

      // Update cache with new summary
      await AsyncStorage.setItem(cacheKey, JSON.stringify(newSummary));

      return hasNewContent;
    } catch (error) {
      console.error('Error checking for new friendly content:', error);
      return true; // On error, assume new content to be safe
    }
  }, [session?.user?.id, sportType]);

  const fetchFriendlyMatches = useCallback(async (isManualRefresh = false) => {
    // Only show skeleton on very first initialization, not on tab switches
    const cacheKey = `${FRIENDLY_SUMMARY_CACHE_KEY}_${sportType}`;

    if (!hasInitializedRef.current) {
      // First load ever - check if we have cached data
      const cachedSummaryStr = await AsyncStorage.getItem(cacheKey);
      if (!cachedSummaryStr) {
        // No cache = truly first time, show skeleton
        setShowSkeleton(true);
      } else {
        // Has cache = check for new content
        const hasNewContent = await checkForNewContent();
        if (hasNewContent) {
          setShowSkeleton(true);
        }
      }
      hasInitializedRef.current = true;
    } else if (!isManualRefresh) {
      // Subsequent automatic loads - check for new content
      const hasNewContent = await checkForNewContent();
      if (hasNewContent) {
        setShowSkeleton(true);
      }
    }
    // Manual refresh - never show skeleton

    try {
      const params: any = {
        sport: sportType,
        page: '1',
        limit: '100',
      };

      if (dateRange.start) {
        // Set start date to beginning of day (00:00:00.000)
        const startOfDay = new Date(dateRange.start);
        startOfDay.setHours(0, 0, 0, 0);
        params.fromDate = startOfDay.toISOString();

        // Set end date to end of day (23:59:59.999) to include all matches on that day
        // If no end date is selected, use the start date (single day filter)
        const endDate = dateRange.end || dateRange.start;
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.toDate = endOfDay.toISOString();
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
      setRefreshing(false);
      setShowSkeleton(false);
    }
  }, [sportType, dateRange, checkForNewContent]);

  // Refresh matches when screen comes into focus (e.g., after creating a match)
  useFocusEffect(
    useCallback(() => {
      fetchFriendlyMatches();
    }, [fetchFriendlyMatches])
  );

  // Entry animation effect - trigger when loading is done, regardless of data
  useEffect(() => {
    if (!showSkeleton && hasInitializedRef.current && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.parallel([
        Animated.spring(contentEntryOpacity, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.spring(contentEntryTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [showSkeleton, matches, contentEntryOpacity, contentEntryTranslateY]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriendlyMatches(true); // Manual refresh - don't show skeleton
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

  const renderMatchGroup = (dateKey: string, dateMatches: FriendlyMatch[]) => {
    return (
      <View key={dateKey} style={styles.dateSection}>
        <View style={styles.dateDivider}>
          <View style={styles.dateDividerLine} />
          <Text style={styles.dateLabel}>{dateKey}</Text>
          <View style={styles.dateDividerLine} />
        </View>
        {dateMatches.map((match) => (
          <FriendlyMatchCard key={match.id} match={match} onPress={handleMatchPress} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={styles.contentWrapper}>
        {/* Filter Controls - No animation, instant */}
        <View style={styles.controlsContainer}>
          <View style={styles.chipsContainer}>
            {(['all', 'open', 'full'] as FilterTab[]).map((tab) => (
              <AnimatedFilterChip
                key={tab}
                label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                isActive={activeTab === tab}
                activeColor={sportColors.background}
                onPress={() => setActiveTab(tab)}
              />
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

        {/* Matches List - Animated */}
        <Animated.View
          style={[
            styles.matchListWrapper,
            {
              opacity: contentEntryOpacity,
              transform: [{ translateY: contentEntryTranslateY }],
            }
          ]}
        >
          {showSkeleton ? (
            <MatchCardSkeleton count={4} />
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
        </Animated.View>
      </View>

      {/* Create Match FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: sportColors.background }]}
        onPress={() => router.push({ pathname: '/friendly/create', params: { sportType: sport } })}
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
    paddingTop: 16,
  },
  matchListWrapper: {
    flex: 1,
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
    flexGrow: 1,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
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
    paddingBottom: 80,
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
