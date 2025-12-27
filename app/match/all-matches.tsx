import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { MatchCard, MatchDetailModal, Match, DivisionData } from './components';

const matchFilterIcon = `<svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15.4792 0.764978C15.3684 0.535033 15.1936 0.340997 14.9754 0.205541C14.7572 0.0700843 14.5045 -0.00120018 14.2468 1.5288e-05H1.36793C1.11052 3.58633e-05 0.858334 0.0718368 0.640358 0.207167C0.422381 0.342498 0.247458 0.535866 0.135689 0.765052C0.0239198 0.994238 -0.0201597 1.24994 0.0085157 1.50278C0.0371911 1.75561 0.137458 1.99532 0.297794 2.19436L5.43925 8.57693V19.1969C5.43925 19.3378 5.47679 19.4763 5.5481 19.5984C5.61942 19.7205 5.72199 19.8219 5.84552 19.8924C5.96904 19.9629 6.10916 20 6.2518 20C6.39444 20 6.53456 19.9629 6.65809 19.8924L9.76922 18.117C9.89274 18.0465 9.99531 17.9452 10.0666 17.8231C10.1379 17.701 10.1755 17.5625 10.1755 17.4215V8.57693L15.317 2.19476C15.4785 1.99624 15.5796 1.75636 15.6083 1.50317C15.637 1.24998 15.5922 0.993938 15.4792 0.764978ZM13.7135 1.60624L12.8597 2.66614H2.75507L1.90122 1.60624H13.7135ZM8.72726 7.79601C8.61274 7.93817 8.55038 8.11452 8.55038 8.29624V16.9579L7.06437 17.8058V8.29624C7.06436 8.11452 7.00201 7.93817 6.88748 7.79601L4.04902 4.27236H7.8074H11.5658L8.72726 7.79601ZM15.3601 4.4898C15.3601 4.7028 15.4457 4.90708 15.5981 5.05769C15.7504 5.2083 15.9571 5.29291 16.1726 5.29291H18.0821C18.2479 5.73409 18.5464 6.11456 18.9373 6.38323C19.3283 6.6519 19.793 6.79591 20.2692 6.79591C20.7454 6.79591 21.2101 6.6519 21.6011 6.38323C21.992 6.11456 22.2904 5.73409 22.4562 5.29291H25.1874C25.4029 5.29291 25.6096 5.2083 25.762 5.05769C25.9144 4.90708 26 4.7028 26 4.4898C26 4.27681 25.9144 4.07253 25.762 3.92192C25.6096 3.77131 25.4029 3.68669 25.1874 3.68669H22.4565C22.2907 3.2455 21.9923 2.86502 21.6013 2.59634C21.2103 2.32767 20.7456 2.18366 20.2694 2.18366C19.7932 2.18366 19.3284 2.32767 18.9375 2.59634C18.5465 2.86502 18.2481 3.2455 18.0823 3.68669H16.1728C16.0661 3.68667 15.9604 3.70743 15.8618 3.74778C15.7632 3.78813 15.6736 3.84729 15.5981 3.92187C15.5226 3.99644 15.4628 4.08498 15.4219 4.18243C15.3811 4.27988 15.3601 4.38432 15.3601 4.4898ZM20.2694 3.78989C20.4571 3.79013 20.637 3.86392 20.7697 3.99508C20.9024 4.12623 20.9771 4.30405 20.9774 4.48955C20.9773 4.62797 20.9358 4.76377 20.8579 4.87884C20.7801 4.9939 20.6695 5.08357 20.5401 5.13651C20.4107 5.18944 20.2683 5.20327 20.1309 5.17623C19.9936 5.1492 19.8674 5.08252 19.7684 4.98463C19.6694 4.88673 19.602 4.76202 19.5747 4.62626C19.5474 4.49049 19.5614 4.34978 19.615 4.2219C19.6686 4.09402 19.7594 3.98473 19.8758 3.90783C19.9923 3.83094 20.1293 3.78989 20.2694 3.78989ZM25.1874 9.48078H17.8795C17.7137 9.03959 17.4153 8.6591 17.0243 8.39042C16.6334 8.12173 16.1686 7.97772 15.6924 7.97772C15.2163 7.97772 14.7515 8.12173 14.3605 8.39042C13.9696 8.6591 13.6711 9.03959 13.5054 9.48078H12.5552C12.3397 9.48078 12.133 9.56539 11.9807 9.71601C11.8283 9.86662 11.7427 10.0709 11.7427 10.2839C11.7427 10.4969 11.8283 10.7012 11.9807 10.8518C12.133 11.0024 12.3397 11.087 12.5552 11.087H13.5053C13.6711 11.5282 13.9695 11.9087 14.3605 12.1774C14.7514 12.4461 15.2162 12.5901 15.6924 12.5901C16.1686 12.5901 16.6333 12.4461 17.0243 12.1774C17.4152 11.9087 17.7137 11.5282 17.8795 11.087H25.1874C25.4029 11.087 25.6096 11.0024 25.762 10.8518C25.9144 10.7012 26 10.4969 26 10.2839C26 10.0709 25.9144 9.86662 25.762 9.71601C25.6096 9.56539 25.4029 9.48078 25.1874 9.48078ZM15.6924 10.9838C15.5523 10.9838 15.4154 10.9428 15.2989 10.8659C15.1824 10.7889 15.0916 10.6796 15.038 10.5517C14.9844 10.4238 14.9704 10.2831 14.9977 10.1473C15.025 10.0115 15.0925 9.88679 15.1915 9.78889C15.2906 9.691 15.4168 9.62433 15.5542 9.59733C15.6915 9.57032 15.8339 9.58419 15.9633 9.63717C16.0927 9.69016 16.2034 9.77988 16.2812 9.895C16.359 10.0101 16.4005 10.1454 16.4005 10.2839C16.4003 10.4695 16.3256 10.6474 16.1929 10.7786C16.0601 10.9098 15.8801 10.9836 15.6924 10.9838ZM25.1874 15.2748H24.297C24.1312 14.8336 23.8328 14.4531 23.4419 14.1845C23.0509 13.9158 22.5861 13.7718 22.11 13.7718C21.6338 13.7718 21.169 13.9158 20.778 14.1845C20.3871 14.4531 20.0887 14.8336 19.9229 15.2748H12.5552C12.3397 15.2748 12.133 15.3594 11.9807 15.51C11.8283 15.6607 11.7427 15.8649 11.7427 16.0779C11.7427 16.2909 11.8283 16.4952 11.9807 16.6458C12.133 16.7964 12.3397 16.881 12.5552 16.881H19.9229C20.0887 17.3222 20.3871 17.7027 20.778 17.9714C21.169 18.2401 21.6338 18.3841 22.11 18.3841C22.5861 18.3841 23.0509 18.2401 23.4419 17.9714C23.8328 17.7027 24.1312 17.3222 24.297 16.881H25.1874C25.4029 16.881 25.6096 16.7964 25.762 16.6458C25.9144 16.4952 26 16.2909 26 16.0779C26 15.8649 25.9144 15.6607 25.762 15.51C25.6096 15.3594 25.4029 15.2748 25.1874 15.2748ZM22.1099 16.7779C21.9698 16.7779 21.8329 16.7369 21.7164 16.66C21.6 16.5831 21.5092 16.4738 21.4556 16.3459C21.402 16.218 21.3879 16.0773 21.4152 15.9415C21.4425 15.8057 21.5099 15.681 21.609 15.5831C21.708 15.4852 21.8341 15.4185 21.9715 15.3915C22.1089 15.3644 22.2512 15.3782 22.3807 15.4312C22.5101 15.4841 22.6207 15.5738 22.6985 15.6889C22.7764 15.8039 22.818 15.9392 22.818 16.0777C22.8177 16.2632 22.743 16.4415 22.6103 16.5727C22.4775 16.7039 22.2976 16.7777 22.1099 16.7779Z" fill="#FEA04D"/>
</svg>`;

type SortOption = 'soonest' | 'date' | 'past';

export default function AllMatchesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'full'>('all');
  const [divisionData, setDivisionData] = useState<DivisionData | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('soonest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Get params from navigation
  const divisionId = params.divisionId as string;
  const sportType = (params.sportType as string) as SportType;
  const leagueName = (params.leagueName as string) || 'League';
  const seasonName = (params.seasonName as string) || 'Season 1 (2025)';
  const gameType = (params.gameType as string) || '';
  const genderCategory = (params.genderCategory as string) || '';
  const paramSeasonStartDate = params.seasonStartDate as string | undefined;
  const paramSeasonEndDate = params.seasonEndDate as string | undefined;

  const sportColors = getSportColors(sportType);

  // Get sport-specific icon
  const getSportIcon = () => {
    const sport = sportType?.toUpperCase();
    if (sport?.includes('TENNIS')) return TennisIcon;
    if (sport?.includes('PADEL')) return PadelIcon;
    if (sport?.includes('PICKLEBALL')) return PickleballIcon;
    return PickleballIcon;
  };

  useEffect(() => {
    if (divisionId) {
      fetchDivisionData();
      fetchMatches();
    }
  }, [divisionId, activeTab, sortOption]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      // Always fetch all matches and filter client-side
      const endpoint = `/api/match?divisionId=${divisionId}`;

      const response = await axiosInstance.get(endpoint);
      const paginatedData = response.data?.data || response.data;
      const matchesData = paginatedData?.matches || paginatedData || [];

      let filteredMatches = Array.isArray(matchesData) ? matchesData : [];

      // Filter based on active tab
      if (activeTab === 'open') {
        // Show matches that have empty slots (not full)
        filteredMatches = filteredMatches.filter(match => {
          const requiredParticipants = match.matchType === 'DOUBLES' ? 4 : 2;
          const activeParticipants = match.participants?.filter(
            (p: Match['participants'][0]) => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
          ) || [];
          return activeParticipants.length < requiredParticipants;
        });
      } else if (activeTab === 'full') {
        // Show matches that are full (all slots filled)
        filteredMatches = filteredMatches.filter(match => {
          const requiredParticipants = match.matchType === 'DOUBLES' ? 4 : 2;
          const activeParticipants = match.participants?.filter(
            (p: Match['participants'][0]) => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
          ) || [];
          return activeParticipants.length >= requiredParticipants;
        });
      }
      // 'all' tab shows all matches without filtering

      // Sort matches based on sortOption
      const now = new Date();
      if (sortOption === 'soonest') {
        // Sort all matches by date (earliest first) - shows matches closest to now first
        filteredMatches = filteredMatches.sort((a, b) => {
          const dateA = new Date(a.scheduledTime || a.matchDate || 0);
          const dateB = new Date(b.scheduledTime || b.matchDate || 0);
          return dateA.getTime() - dateB.getTime();
        });
      } else if (sortOption === 'date') {
        // Sort all matches by date (earliest first)
        filteredMatches = filteredMatches.sort((a, b) => {
          const dateA = new Date(a.scheduledTime || a.matchDate || 0);
          const dateB = new Date(b.scheduledTime || b.matchDate || 0);
          return dateA.getTime() - dateB.getTime();
        });
      } else if (sortOption === 'past') {
        // Show only past matches, most recent first
        filteredMatches = filteredMatches
          .filter(match => {
            const dateString = match.scheduledTime || match.matchDate;
            if (!dateString) return false;
            return new Date(dateString) < now;
          })
          .sort((a, b) => {
            const dateA = new Date(a.scheduledTime || a.matchDate || 0);
            const dateB = new Date(b.scheduledTime || b.matchDate || 0);
            return dateB.getTime() - dateA.getTime(); // Most recent first
          });
      }

      setMatches(filteredMatches);
    } catch (error) {
      console.error('❌ Error fetching matches:', error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDivisionData = async () => {
    try {
      const response = await axiosInstance.get(`/api/division/${divisionId}`);
      const division = response.data?.data || response.data;

      if (division) {
        setDivisionData({
          gameType: division.gameType,
          genderCategory: division.genderCategory || null,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching division data:', error);
    }
  };

  const getGameTypeLabel = (): string => {
    // Use divisionData if available, otherwise fall back to params
    const gameTypeValue = divisionData?.gameType || gameType;
    const genderCategoryValue = divisionData?.genderCategory || genderCategory;

    if (!gameTypeValue) return '';

    const gameTypeUpper = gameTypeValue?.toUpperCase();
    const genderCategoryUpper = genderCategoryValue?.toUpperCase();

    let genderPrefix = '';
    if (genderCategoryUpper === 'MALE') {
      genderPrefix = "Men's ";
    } else if (genderCategoryUpper === 'FEMALE') {
      genderPrefix = "Women's ";
    } else if (genderCategoryUpper === 'MIXED') {
      genderPrefix = 'Mixed ';
    }

    if (gameTypeUpper === 'SINGLES') {
      return `${genderPrefix}Singles`;
    } else if (gameTypeUpper === 'DOUBLES') {
      return `${genderPrefix}Doubles`;
    }

    return '';
  };

  const groupMatchesByDate = (matches: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};

    if (!Array.isArray(matches)) return grouped;

    matches.forEach((match) => {
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
  };

  const openMatchModal = (match: Match) => {
    setSelectedMatch(match);
    setModalVisible(true);
  };

  const closeMatchModal = () => {
    setModalVisible(false);
    setSelectedMatch(null);
  };

  const isUserInMatch = (match: Match): boolean => {
    if (!currentUserId) return false;
    if (match.createdBy?.id === currentUserId) return true;

    return (match.participants || []).some(
      p => p.user.id === currentUserId &&
           (!p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING')
    );
  };

  const handleJoinMatch = async (match: Match) => {
    if (!match.id || !currentUserId) return;

    setIsJoining(true);

    try {
      const dateString = match.scheduledTime || match.matchDate;
      if (!dateString) return;

      const startDate = new Date(dateString);
      const duration = match.duration || 2;
      const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);

      const formattedDate = format(startDate, 'MMM dd, yyyy');
      const formattedStartTime = format(startDate, 'h:mm a');
      const formattedEndTime = format(endDate, 'h:mm a');

      router.push({
        pathname: '/match/match-details',
        params: {
          matchId: match.id,
          matchType: match.matchType,
          date: formattedDate,
          time: `${formattedStartTime} – ${formattedEndTime}`,
          location: match.location || match.venue || 'TBD',
          sportType: sportType,
          leagueName: leagueName,
          season: seasonName,
          division: match.division?.name || 'Division',
          courtBooked: match.courtBooked ? 'true' : 'false',
          fee: match.fee || 'FREE',
          feeAmount: String(match.feeAmount || '0.00'),
          description: match.description || '',
          duration: String(duration),
          divisionId: divisionId,
          seasonId: match.division?.season?.id || '',
          participants: JSON.stringify(match.participants || []),
          status: match.status,
        },
      });

      closeMatchModal();
    } catch (error) {
      console.error('Error navigating to join match:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const groupedMatches = groupMatchesByDate(matches);

  const toggleDateSection = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  const seasonStartDate = paramSeasonStartDate
    ? format(new Date(paramSeasonStartDate), 'd MMMM yyyy')
    : matches[0]?.division?.season?.startDate
    ? format(new Date(matches[0].division.season.startDate), 'd MMMM yyyy')
    : '1 February 2026';
  const seasonEndDate = paramSeasonEndDate
    ? format(new Date(paramSeasonEndDate), 'd MMMM yyyy')
    : matches[0]?.division?.season?.endDate
    ? format(new Date(matches[0].division.season.endDate), 'd MMMM yyyy')
    : '1 April 2026';

  const SportIcon = getSportIcon();
  const categoryLabel = getGameTypeLabel();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: sportColors.badgeColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {/* Category title - big and black, aligned with back button */}
          {categoryLabel ? (
            <Text style={styles.categoryTitle}>{categoryLabel}</Text>
          ) : null}

          {/* League name - smaller, gray */}
          <Text style={styles.leagueTitle}>{leagueName}</Text>

          {/* Season info box - compact */}
          <View style={[styles.seasonInfoBox, { backgroundColor: sportColors.buttonColor, borderColor: sportColors.badgeColor }]}>
            {/* Sport icon on the left */}
            <View style={styles.seasonInfoIcon}>
              <SportIcon width={40} height={40} fill="#FFFFFF" />
            </View>

            {/* Season details in the middle */}
            <View style={styles.seasonInfoDetails}>
              <Text style={styles.seasonInfoTitle}>{seasonName}</Text>
              <Text style={styles.seasonInfoDate}>Start date: {seasonStartDate}</Text>
              <Text style={styles.seasonInfoDate}>End date: {seasonEndDate}</Text>
            </View>

            {/* Info button on the right */}
            <TouchableOpacity style={styles.seasonInfoButton} activeOpacity={0.7}>
              <Text style={[styles.seasonInfoButtonText, { color: sportColors.buttonColor }]}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Matches Section */}
      <View style={styles.matchesSection}>
        <View style={styles.matchesHeader}>
          <Text style={styles.matchesLabel}>Matches</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowSortModal(true)}>
            <SvgXml xml={matchFilterIcon} width={24} height={18} />
          </TouchableOpacity>
        </View>
        <View style={styles.matchesControls}>
          <View style={styles.chipsContainer}>
            {(['all', 'open', 'full'] as const).map((tab) => (
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
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={sportColors.background} />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptyDescription}>Check back later for upcoming matches</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedMatches).map(([dateKey, dateMatches]) => {
            const isCollapsed = collapsedDates.has(dateKey);
            return (
              <View key={dateKey} style={styles.dateSection}>
                <TouchableOpacity
                  style={styles.dateDivider}
                  onPress={() => toggleDateSection(dateKey)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={18}
                    color="#86868B"
                  />
                  <Text style={styles.dateLabel}>{dateKey}</Text>
                </TouchableOpacity>
                {!isCollapsed && dateMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPress={openMatchModal}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Match Detail Bottom Sheet Modal */}
      <MatchDetailModal
        match={selectedMatch}
        visible={modalVisible}
        onClose={closeMatchModal}
        onJoinMatch={handleJoinMatch}
        isUserInMatch={selectedMatch ? isUserInMatch(selectedMatch) : false}
        isJoining={isJoining}
        sportType={sportType}
        sportColors={sportColors}
      />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            {([
              { key: 'soonest', label: 'Soonest first' },
              { key: 'date', label: 'Date' },
              { key: 'past', label: 'Past' },
            ] as const).map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.sortOption}
                onPress={() => {
                  setSortOption(option.key);
                  setShowSortModal(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOption === option.key && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                {sortOption === option.key && (
                  <Ionicons name="checkmark" size={20} color="#FEA04D" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0E0E10',
    marginBottom: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  leagueTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  seasonInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
    width: '100%',
    borderWidth: 3,
  },
  seasonInfoIcon: {
    marginRight: 12,
  },
  seasonInfoDetails: {
    flex: 1,
  },
  seasonInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  seasonInfoDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 15,
  },
  seasonInfoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 8,
  },
  seasonInfoButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchesSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  matchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  matchesLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  matchesControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
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
  filterButton: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
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
  dateSection: {
    marginBottom: 16,
  },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#86868B',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '80%',
    maxWidth: 300,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#FEA04D',
    fontWeight: '600',
  },
});
