import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  TextInput,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { SeasonService, SeasonMembership } from '@/features/dashboard-user/services/SeasonService';
import { LeagueService } from '@/features/leagues/services/LeagueService';
import { SkillRatings } from '@/src/utils/dmrCalculator';
import BackButtonIcon from '@/assets/icons/back-button.svg';
import { scale, verticalScale, moderateScale } from '@/core/utils/responsive';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface PlayersListScreenProps {
  contextType: 'league' | 'season';
  contextId: string;
  contextName: string;
  sport: 'pickleball' | 'tennis' | 'padel';
  totalPlayers: number;
}

interface PlayerData {
  id: string;
  name: string;
  image?: string;
  divisionName?: string;
  divisionId?: string;
  status?: string;
  skillRatings?: SkillRatings | null;
}

// Animated Player Card Component
const PlayerCard = React.memo(({
  player,
  index,
  sport,
  onPress,
  sportColors,
}: {
  player: PlayerData;
  index: number;
  sport: string;
  onPress: (id: string) => void;
  sportColors: any;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 400,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name: string): [string, string] => {
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const gradients: [string, string][] = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'],
    ];

    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <Animated.View
      style={[
        styles.playerCardContainer,
        {
          opacity: animatedValue,
          transform: [
            { translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            })},
            { scale: scaleValue },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(player.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.playerCard}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {player.image ? (
            <Image source={{ uri: player.image }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={getAvatarGradient(player.name)}
              style={styles.avatarGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarInitials}>{getInitials(player.name)}</Text>
            </LinearGradient>
          )}
          {/* Online indicator dot */}
          <View style={[styles.statusDot, { backgroundColor: sportColors.background }]} />
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
          <View style={styles.playerMeta}>
            <View style={[styles.sportBadge, { backgroundColor: sportColors.background + '15' }]}>
              <Ionicons
                name="tennisball"
                size={moderateScale(10)}
                color={sportColors.background}
              />
              <Text style={[styles.sportBadgeText, { color: sportColors.background }]}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </Text>
            </View>
            {player.status && player.status !== 'ACTIVE' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{player.status}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Ionicons name="chevron-forward" size={moderateScale(18)} color="#C4C4C6" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function PlayersListScreen({
  contextType,
  contextId,
  contextName,
  sport,
  totalPlayers,
}: PlayersListScreenProps) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();

  // Animation values
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchTranslateY = useRef(new Animated.Value(20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const searchBarScale = useRef(new Animated.Value(1)).current;

  const sportColors = getSportColors(sport.toUpperCase() as SportType);

  // Sport-specific gradient colors
  const getGradientColors = (): [string, string, string] => {
    switch (sport) {
      case 'tennis':
        return ['#2D5016', '#4A7A25', '#6BA034'];
      case 'padel':
        return ['#1E4D6B', '#2E6D8E', '#3E8DB1'];
      case 'pickleball':
      default:
        return ['#4A1D6A', '#6B2D8A', '#8C3DAA'];
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [contextType, contextId]);

  useEffect(() => {
    if (!isLoading) {
      // Reset values so animation replays correctly on remount/re-navigation.
      // Without this, native-driver animated values can desync from JS state
      // when React Navigation keeps the component mounted but resets the view.
      headerOpacity.setValue(0);
      headerTranslateY.setValue(-30);
      searchOpacity.setValue(0);
      searchTranslateY.setValue(20);
      contentOpacity.setValue(0);

      // Staggered entry: all groups start in parallel with slight delays.
      // Using parallel+delay instead of sequence avoids the bug where a
      // sequence step never starts if a re-render interrupts mid-flight.
      Animated.parallel([
        Animated.spring(headerOpacity, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(headerTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(searchOpacity, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.spring(searchTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
          delay: 100,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const fetchPlayers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let memberships: SeasonMembership[] = [];

      if (contextType === 'season') {
        // Use direct fetch by ID to include past/finished seasons
        const season = await SeasonService.fetchSeasonById(contextId);
        memberships = season?.memberships || [];
      } else {
        const league = await LeagueService.fetchLeagueById(contextId);
        memberships = (league as any)?.memberships || [];
      }

      const playerData: PlayerData[] = memberships
        .filter(membership => membership.user)
        .map(membership => ({
          id: membership.user!.id,
          name: membership.user!.name || 'Unknown Player',
          image: membership.user!.image,
          divisionId: membership.divisionId,
          divisionName: undefined,
          status: membership.status,
          skillRatings: null,
        }));

      setPlayers(playerData);
    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to load players');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlayers();
    setRefreshing(false);
  }, [contextType, contextId]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    return players.filter(player =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const handlePlayerPress = (playerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/player-profile/[id]',
      params: { id: playerId },
    });
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.spring(searchBarScale, {
      toValue: 1.02,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.spring(searchBarScale, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const renderPlayerItem = ({ item, index }: { item: PlayerData; index: number }) => (
    <PlayerCard
      player={item}
      index={index}
      sport={sport}
      onPress={handlePlayerPress}
      sportColors={sportColors}
    />
  );

  const renderEmptyState = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: sportColors.background + '15' }]}>
            <Ionicons name="search-outline" size={moderateScale(48)} color={sportColors.background} />
          </View>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            No players match "{searchQuery}"
          </Text>
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={[styles.actionButton, { backgroundColor: sportColors.background }]}
          >
            <Text style={styles.actionButtonText}>Clear search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: sportColors.background + '15' }]}>
          <Ionicons name="people-outline" size={moderateScale(48)} color={sportColors.background} />
        </View>
        <Text style={styles.emptyTitle}>No players yet</Text>
        <Text style={styles.emptyText}>
          Players will appear here once they join this {contextType}.
        </Text>
      </View>
    );
  };

  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name="cloud-offline-outline" size={moderateScale(48)} color="#DC2626" />
      </View>
      <Text style={styles.emptyTitle}>Connection error</Text>
      <Text style={styles.emptyText}>
        Unable to load players. Please check your connection and try again.
      </Text>
      <TouchableOpacity
        onPress={fetchPlayers}
        style={[styles.actionButton, { backgroundColor: sportColors.background }]}
      >
        <Ionicons name="refresh" size={moderateScale(16)} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.actionButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={sportColors.background} />
        <Text style={styles.loadingText}>Loading players...</Text>
      </View>
      {/* Skeleton cards */}
      {[1, 2, 3, 4, 5].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.skeletonCard,
            { opacity: 0.3 + (index * 0.1) }
          ]}
        >
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );

  const gradientColors = getGradientColors();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <Animated.View
        style={{
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + verticalScale(8) }]}
        >
          {/* Background pattern overlay */}
          <View style={styles.headerPattern}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.patternCircle,
                  {
                    left: (i % 3) * width * 0.4 - 50,
                    top: Math.floor(i / 3) * 80 - 40,
                    opacity: 0.08 - (i * 0.01),
                  }
                ]}
              />
            ))}
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={handleBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BackButtonIcon width={scale(22)} height={scale(22)} />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerSubtitle}>
                {contextType === 'season' ? 'Season' : 'League'}
              </Text>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {contextName}
              </Text>
              <View style={styles.playerCountBadge}>
                <Ionicons name="people" size={moderateScale(12)} color="#FFFFFF" />
                <Text style={styles.playerCountText}>
                  {players.length} {players.length === 1 ? 'player' : 'players'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: searchOpacity,
            transform: [
              { translateY: searchTranslateY },
              { scale: searchBarScale },
            ],
          },
        ]}
      >
        <View style={[
          styles.searchInputWrapper,
          isSearchFocused && { borderColor: sportColors.background }
        ]}>
          <Ionicons
            name="search-outline"
            size={moderateScale(18)}
            color={isSearchFocused ? sportColors.background : '#9CA3AF'}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={moderateScale(18)} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {isLoading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : (
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayerItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={[
              styles.listContent,
              filteredPlayers.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={sportColors.background}
                colors={[sportColors.background]}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingBottom: verticalScale(24),
    paddingHorizontal: scale(20),
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: moderateScale(12),
    marginRight: scale(12),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: verticalScale(2),
  },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
    alignSelf: 'flex-start',
  },
  playerCountText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: scale(4),
  },
  searchContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    height: verticalScale(48),
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: scale(10),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(15),
    color: '#1E293B',
    fontWeight: '400',
  },
  clearButton: {
    padding: scale(4),
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(24),
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  playerCardContainer: {
    marginBottom: verticalScale(8),
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: scale(14),
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(16),
  },
  avatarGradient: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  playerInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  playerName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1E293B',
    letterSpacing: -0.2,
    marginBottom: verticalScale(4),
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
    gap: scale(4),
  },
  sportBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: moderateScale(8),
  },
  statusText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#D97706',
  },
  arrowContainer: {
    width: scale(32),
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(10),
  },
  separator: {
    height: 0,
  },
  // Empty & Error States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(40),
    paddingBottom: verticalScale(60),
  },
  emptyIconContainer: {
    width: scale(100),
    height: scale(100),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(20),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(40),
  },
  loadingContent: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#64748B',
    fontWeight: '500',
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: scale(14),
    marginBottom: verticalScale(8),
  },
  skeletonAvatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(16),
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: scale(14),
  },
  skeletonLine: {
    height: verticalScale(14),
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(4),
    width: '70%',
    marginBottom: verticalScale(8),
  },
  skeletonLineShort: {
    width: '40%',
    marginBottom: 0,
  },
});
