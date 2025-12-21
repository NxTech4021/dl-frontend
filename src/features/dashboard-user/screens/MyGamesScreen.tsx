import { getSportColors, SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { getBackendBaseURL } from '@/src/config/network';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Match,
  MatchInvitation,
  MyGamesScreenProps,
  FilterTab,
  MatchCard,
  InvitationCard,
  FilterModal,
  styles,
  formatMatchDate,
  formatMatchTime,
  getMatchTime,
} from './my-games';

export default function MyGamesScreen({ sport = 'pickleball' }: MyGamesScreenProps) {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);

  const sportColors = getSportColors(sport as SportType);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const fetchMyMatches = useCallback(async () => {
    if (!session?.user?.id) return;

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
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches();
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

  // Filter matches based on all criteria
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

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
      filtered = filtered.filter(match =>
        match.division?.league?.name?.toLowerCase().includes(query) ||
        match.location?.toLowerCase().includes(query) ||
        match.division?.name?.toLowerCase().includes(query) ||
        match.division?.season?.name?.toLowerCase().includes(query)
      );
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

    // Filter by sport
    if (selectedSport) {
      filtered = filtered.filter(m =>
        (m.sport || m.division?.league?.sportType) === selectedSport
      );
    }

    // Filter by division
    if (selectedDivision) {
      filtered = filtered.filter(m => m.division?.name === selectedDivision);
    }

    // Filter by season
    if (selectedSeason) {
      filtered = filtered.filter(m => m.division?.season?.name === selectedSeason);
    }

    return filtered;
  }, [matches, searchQuery, activeTab, selectedSport, selectedDivision, selectedSeason, session?.user?.id]);

  const clearAdvancedFilters = () => {
    setSelectedSport(null);
    setSelectedDivision(null);
    setSelectedSeason(null);
  };

  const hasActiveFilters = selectedSport || selectedDivision || selectedSeason;

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
      <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Matches Yet</Text>
      <Text style={styles.emptyText}>
        You haven't joined any matches yet. Start by browsing available matches or create your own!
      </Text>
    </View>
  );

  const renderEmptyInvitationsState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="mail-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Pending Invitations</Text>
      <Text style={styles.emptyText}>
        You don't have any pending match invitations at the moment.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FEA04D" />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: sportColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={sportColors.background} />

      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: sportColors.background, paddingTop: insets.top }]}>
        <View style={styles.headerTopRight} />
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Games</Text>
        </View>
      </View>

      {/* Content wrapper with grey background */}
      <View style={styles.contentWrapper}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search matches, leagues, or locations..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={20} color={hasActiveFilters ? "#FFFFFF" : "#4B5563"} />
            {hasActiveFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsContainer}>
          {(['ALL', 'UPCOMING', 'PAST', 'INVITES'] as FilterTab[]).map((tab) => (
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
                {tab === 'ALL' ? 'All' :
                  tab === 'UPCOMING' ? 'Upcoming' :
                    tab === 'PAST' ? 'Past' :
                      `Invites${invitations.length > 0 ? ` (${invitations.length})` : ''}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Matches/Invitations List */}
        {activeTab === 'INVITES' ? (
          <FlatList
            data={invitations}
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          uniqueSports={uniqueSports}
          uniqueDivisions={uniqueDivisions}
          uniqueSeasons={uniqueSeasons}
          selectedSport={selectedSport}
          selectedDivision={selectedDivision}
          selectedSeason={selectedSeason}
          onSelectSport={setSelectedSport}
          onSelectDivision={setSelectedDivision}
          onSelectSeason={setSelectedSeason}
          onClearAll={clearAdvancedFilters}
        />
      </View>
    </View>
  );
}
