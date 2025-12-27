import { getSportColors, SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { getBackendBaseURL } from '@/src/config/network';
import { AnimatedFilterChip } from '@/src/shared/components/ui/AnimatedFilterChip';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchCardSkeleton } from '@/src/components/MatchCardSkeleton';
import { useMyGamesStore } from '../stores/MyGamesStore';

// Cache key for match summary
const MATCH_SUMMARY_CACHE_KEY = 'my_matches_summary';

import {
  Match,
  MatchInvitation,
  MyGamesScreenProps,
  FilterTab,
  MatchCard,
  InvitationCard,
  FilterBottomSheet,
  FilterBottomSheetRef,
  FilterOptions,
  styles,
  formatMatchDate,
  formatMatchTime,
  getMatchTime,
} from './my-games';

export default function MyGamesScreen({ sport = 'pickleball' }: MyGamesScreenProps) {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);

  // Convert to uppercase for getSportColors (expects 'PICKLEBALL', 'TENNIS', 'PADEL')
  const sportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);
  const filterBottomSheetRef = useRef<FilterBottomSheetRef>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false); // Only true when new content detected
  const hasInitializedRef = useRef(false); // Track if we've done the first load

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [filters, setFilters] = useState<FilterOptions>({
    sport: null,
    division: null,
    season: null,
    matchType: null,
    gameType: null,
    status: null,
  });

  // Check if there's new content by comparing summary with cache
  const checkForNewContent = useCallback(async (): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const backendUrl = getBackendBaseURL();
      const response = await fetch(`${backendUrl}/api/match/my/summary`, {
        headers: { 'x-user-id': session.user.id },
      });

      if (!response.ok) return true; // If summary fails, assume new content

      const newSummary = await response.json();
      const cachedSummaryStr = await AsyncStorage.getItem(MATCH_SUMMARY_CACHE_KEY);

      if (!cachedSummaryStr) {
        // First time - store and show skeleton
        await AsyncStorage.setItem(MATCH_SUMMARY_CACHE_KEY, JSON.stringify(newSummary));
        return true;
      }

      const cachedSummary = JSON.parse(cachedSummaryStr);

      // Check if anything changed
      const hasNewContent =
        newSummary.count !== cachedSummary.count ||
        newSummary.latestUpdatedAt !== cachedSummary.latestUpdatedAt;

      // Update cache with new summary
      await AsyncStorage.setItem(MATCH_SUMMARY_CACHE_KEY, JSON.stringify(newSummary));

      return hasNewContent;
    } catch (error) {
      console.error('Error checking for new content:', error);
      return true; // On error, assume new content to be safe
    }
  }, [session?.user?.id]);

  const fetchMyMatches = useCallback(async (isManualRefresh = false) => {
    if (!session?.user?.id) return;

    // Only show skeleton on very first initialization, not on tab switches
    if (!hasInitializedRef.current) {
      // First load ever - check if we have cached data
      const cachedSummaryStr = await AsyncStorage.getItem(MATCH_SUMMARY_CACHE_KEY);
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
      const backendUrl = getBackendBaseURL();
      const response = await fetch(`${backendUrl}/api/match/my`, {
        headers: {
          'x-user-id': session.user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const matchesData = data.matches || data.data || data;
        setMatches(Array.isArray(matchesData) ? matchesData : []);
      } else {
        console.error('Failed to fetch matches:', response.status);
        setMatches([]);
      }
    } catch (error) {
      console.error('Error fetching my matches:', error);
      setMatches([]);
    } finally {
      setRefreshing(false);
      setShowSkeleton(false);
    }
  }, [session?.user?.id, checkForNewContent]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await axiosInstance.get(endpoints.match.getPendingInvitations);
      setInvitations(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching invitations:', error?.response?.status, error?.message);
      setInvitations([]);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMyMatches();
    fetchPendingInvitations();
  }, [fetchMyMatches, fetchPendingInvitations]);

  // Listen for refresh signal from match-details (after submit/confirm/join/cancel)
  const { shouldRefresh, clearRefresh } = useMyGamesStore();

  useEffect(() => {
    if (shouldRefresh) {
      fetchMyMatches(true); // Manual refresh style (no skeleton)
      fetchPendingInvitations();
      clearRefresh();
    }
  }, [shouldRefresh, clearRefresh, fetchMyMatches, fetchPendingInvitations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches(true); // Manual refresh - don't show skeleton
    fetchPendingInvitations();
  };

  // Extract unique values for filters
  const uniqueSports = useMemo(() => {
    const sports = new Set(matches.map(m => m.sport || m.division?.league?.sportType).filter(Boolean));
    return Array.from(sports) as string[];
  }, [matches]);

  const uniqueDivisions = useMemo(() => {
    const divisions = new Set(matches.map(m => m.division?.name).filter(Boolean));
    return Array.from(divisions) as string[];
  }, [matches]);

  const uniqueSeasons = useMemo(() => {
    const seasons = new Set(matches.map(m => m.division?.season?.name).filter(Boolean));
    return Array.from(seasons) as string[];
  }, [matches]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(matches.map(m => m.status.toUpperCase()).filter(Boolean));
    return Array.from(statuses) as string[];
  }, [matches]);

  // Filter matches based on all criteria
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Filter by the currently selected sport from the dashboard
    filtered = filtered.filter(match => {
      const matchSport = (match.sport || match.division?.league?.sportType || '').toUpperCase();
      return matchSport === sportType;
    });

    // Exclude DRAFT matches where user's invitation is still PENDING
    // (these should appear in INVITES tab instead)
    filtered = filtered.filter(match => {
      if (match.status.toUpperCase() === 'DRAFT' && match.invitationStatus === 'PENDING') {
        // Check if user is the creator - creators should see their DRAFT matches
        const isCreator = match.createdById === session?.user?.id;
        if (!isCreator) {
          return false; // Hide from non-creators who haven't responded yet
        }
      }
      return true;
    });

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match => {
        // Build the match title like the MatchCard does
        const matchTypeLabel = match.matchType === 'DOUBLES' ? 'doubles' : 'singles';
        const matchCategoryLabel = match.isFriendly ? 'friendly' : 'league';
        const matchTitle = `${matchTypeLabel} ${matchCategoryLabel} match`;

        return (
          matchTitle.includes(query) ||
          match.division?.league?.name?.toLowerCase().includes(query) ||
          match.location?.toLowerCase().includes(query) ||
          match.division?.name?.toLowerCase().includes(query) ||
          match.division?.season?.name?.toLowerCase().includes(query) ||
          // Also search participant names
          match.participants?.some(p => p.user?.name?.toLowerCase().includes(query))
        );
      });
    }

    // Filter by tab (status)
    // UPCOMING: Active/pending matches that need attention or are scheduled
    // PAST: Historical matches that are done (completed, cancelled, void, unfinished)
    if (activeTab === 'UPCOMING') {
      filtered = filtered.filter(m =>
        ['OPEN', 'SCHEDULED', 'ONGOING', 'IN_PROGRESS', 'DRAFT'].includes(m.status.toUpperCase())
      );
    } else if (activeTab === 'PAST') {
      filtered = filtered.filter(m =>
        ['COMPLETED', 'FINISHED', 'CANCELLED', 'VOID', 'UNFINISHED'].includes(m.status.toUpperCase())
      );
    }

    // Filter by sport (from bottom sheet)
    if (filters.sport) {
      filtered = filtered.filter(m =>
        (m.sport || m.division?.league?.sportType) === filters.sport
      );
    }

    // Filter by division (from bottom sheet)
    if (filters.division) {
      filtered = filtered.filter(m => m.division?.name === filters.division);
    }

    // Filter by season (from bottom sheet)
    if (filters.season) {
      filtered = filtered.filter(m => m.division?.season?.name === filters.season);
    }

    // Filter by match type (League vs Friendly)
    if (filters.matchType) {
      if (filters.matchType === 'FRIENDLY') {
        filtered = filtered.filter(m => m.isFriendly === true);
      } else if (filters.matchType === 'LEAGUE') {
        filtered = filtered.filter(m => m.isFriendly !== true);
      }
    }

    // Filter by game type (Singles vs Doubles)
    if (filters.gameType) {
      filtered = filtered.filter(m => m.matchType?.toUpperCase() === filters.gameType);
    }

    // Filter by status (from bottom sheet - overrides tab filter if set)
    if (filters.status) {
      filtered = filtered.filter(m => m.status.toUpperCase() === filters.status);
    }

    return filtered;
  }, [matches, searchQuery, activeTab, filters, session?.user?.id, sportType]);

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Filter invitations by the currently selected sport
  const filteredInvitations = useMemo(() => {
    return invitations.filter(invitation => {
      const invitationSport = (invitation.match?.sport || '').toUpperCase();
      return invitationSport === sportType;
    });
  }, [invitations, sportType]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Get filter button color based on selected sport filter
  const getFilterButtonColor = (): string => {
    if (!hasActiveFilters) return '#863A73'; // Default purple when no filters

    if (filters.sport) {
      const sportType = filters.sport.toUpperCase() as SportType;
      const colors = getSportColors(sportType);
      return colors.background;
    }

    return '#6B7280'; // Grey when filters active but no sport selected
  };

  const filterButtonColor = getFilterButtonColor();

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await axiosInstance.post(endpoints.match.respondToInvitation(invitationId), {
        accept: true,
      });
      Alert.alert('Success', 'Invitation accepted!');
      fetchPendingInvitations();
      fetchMyMatches();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.post(endpoints.match.respondToInvitation(invitationId), {
                accept: false,
                declineReason: 'Not available',
              });
              Alert.alert('Success', 'Invitation declined');
              fetchPendingInvitations();
            } catch (error) {
              console.error('Error declining invitation:', error);
              Alert.alert('Error', 'Failed to decline invitation');
            }
          },
        },
      ]
    );
  };

  const handleMatchPress = (match: Match) => {
    const matchTime = getMatchTime(match);

    router.push({
      pathname: '/match/match-details' as any,
      params: {
        matchId: match.id,
        matchType: match.matchType,
        date: formatMatchDate(matchTime),
        time: formatMatchTime(matchTime),
        location: match.location || 'TBD',
        sportType: match.sport || sport,
        leagueName: match.isFriendly ? 'Friendly Match' : (match.division?.league?.name || 'League Match'),
        season: match.division?.season?.name || 'Season',
        division: match.division?.name || 'Division',
        status: match.status,
        participants: JSON.stringify(match.participants || []),
        divisionId: match.division?.id || '',
        seasonId: match.division?.season?.id || '',
        fee: match.fee || '',
        feeAmount: match.feeAmount?.toString() || '',
        description: match.notes || match.description || '',
        courtBooked: match.courtBooked ? 'true' : 'false',
        isFriendly: match.isFriendly ? 'true' : 'false',
        genderRestriction: match.genderRestriction || '',
        skillLevels: JSON.stringify(match.skillLevels || []),
      },
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No matches found</Text>
      <Text style={styles.emptyText}>
        You haven't joined any matches yet. Start by browsing available matches or create your own!
      </Text>
    </View>
  );

  const renderEmptyInvitationsState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No pending invitations</Text>
      <Text style={styles.emptyText}>
        You don't have any pending match invitations at the moment.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Content wrapper */}
      <View style={styles.contentWrapper}>
        {/* Search Bar - Compact */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search matches..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Controls */}
        <View style={styles.controlsContainer}>
          {/* Filter Chips with animated color transitions */}
          <View style={styles.chipsContainer}>
            {(['ALL', 'UPCOMING', 'PAST', 'INVITES'] as FilterTab[]).map((tab) => (
              <AnimatedFilterChip
                key={tab}
                label={
                  tab === 'ALL' ? 'All' :
                  tab === 'UPCOMING' ? 'Upcoming' :
                  tab === 'PAST' ? 'Past' :
                  `Invites${filteredInvitations.length > 0 ? ` (${filteredInvitations.length})` : ''}`
                }
                isActive={activeTab === tab}
                activeColor={sportColors.background}
                onPress={() => setActiveTab(tab)}
              />
            ))}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterButton,
              hasActiveFilters && { backgroundColor: filterButtonColor, borderColor: filterButtonColor }
            ]}
            onPress={() => filterBottomSheetRef.current?.present()}
          >
            <Ionicons name="options-outline" size={18} color={hasActiveFilters ? "#FFFFFF" : sportColors.background} />
          </TouchableOpacity>
        </View>

        {/* Skeleton Loading - Only when new content detected */}
        {showSkeleton ? (
          <MatchCardSkeleton count={4} />
        ) : activeTab === 'INVITES' ? (
          <FlatList
            data={filteredInvitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <InvitationCard
                invitation={item}
                defaultSport={sport}
                onAccept={handleAcceptInvitation}
                onDecline={handleDeclineInvitation}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyInvitationsState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={sportColors.background}
              />
            }
          />
        ) : (
          <FlatList
            data={filteredMatches}
            renderItem={({ item }) => (
              <MatchCard match={item} onPress={handleMatchPress} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={sportColors.background}
              />
            }
          />
        )}

        {/* Filter Bottom Sheet */}
        <FilterBottomSheet
          ref={filterBottomSheetRef}
          onClose={() => {}}
          onApply={handleApplyFilters}
          uniqueSports={uniqueSports}
          uniqueDivisions={uniqueDivisions}
          uniqueSeasons={uniqueSeasons}
          uniqueStatuses={uniqueStatuses}
          currentFilters={filters}
          sportColor={sportColors.background}
        />
      </View>
    </View>
  );
}
