import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Image,
  Dimensions,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMatchHistory } from '@/src/features/profile/hooks/useMatchHistory';
import {
  MatchHistoryItem,
  MatchHistoryFilters,
  SetScore,
  MatchParticipant,
  SportType,
} from '@/src/features/profile/types/matchHistory';
import CasualHandshakeIcon from '@/assets/icons/casual-handshake.svg';
import { getSportColors } from '@/constants/SportsColor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors
const COLORS = {
  // Ribbon colors
  leagueRibbon: '#FEA04D',      // Orange for league matches
  friendlyRibbon: '#5A5E6A',    // Gray for friendly matches (with scores)
  casualRibbon: '#8B5CF6',      // Purple for casual play (no scores)
  // Card backgrounds - subtle tints on white base
  cardDefault: '#FFFFFF',
  winBg: '#F0FDF4',      // Very subtle green tint
  lossBg: '#FEF2F2',     // Very subtle red tint
  drawBg: '#FAFAFA',     // Very subtle gray
  walkoverBg: '#FFFBEB', // Very subtle amber/yellow
  disputedBg: '#FFF7ED', // Very subtle orange
  cancelledBg: '#F5F5F5', // Light gray
  // Accent colors
  winAccent: '#16a34a',
  lossAccent: '#dc2626',
  walkoverAccent: '#D97706', // Amber
  disputedAccent: '#EA580C', // Orange
  cancelledAccent: '#737373', // Gray
  casualAccent: '#8B5CF6',   // Purple
  avatarDefault: '#E8B4BC',
  textPrimary: '#1A1C1E',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  divider: 'rgba(0, 0, 0, 0.05)',
  setScoresBg: 'rgba(255, 255, 255, 0.8)',
  // Sport colors
  tennis: '#65B741',
  padel: '#3B82F6',
  pickleball: '#A04DFE',
};

// Sport filter options
const SPORT_OPTIONS: { value: SportType | 'all'; label: string; color?: string }[] = [
  { value: 'all', label: 'All Sports' },
  { value: 'TENNIS', label: 'Tennis', color: COLORS.tennis },
  { value: 'PADEL', label: 'Padel', color: COLORS.padel },
  { value: 'PICKLEBALL', label: 'Pickleball', color: COLORS.pickleball },
];

// Sport gradient colors for header
const SPORT_GRADIENTS: Record<SportType | 'all', [string, string]> = {
  all: [theme.colors.primary, '#FFA366'],      // Default orange
  TENNIS: ['#65B741', '#8FD468'],              // Green gradient
  PADEL: ['#3B82F6', '#60A5FA'],               // Blue gradient
  PICKLEBALL: ['#A04DFE', '#C084FC'],          // Purple gradient
};

// Get theme color for selected sport
const getSportThemeColor = (sport: SportType | 'all'): string => {
  switch (sport) {
    case 'TENNIS': return COLORS.tennis;
    case 'PADEL': return COLORS.padel;
    case 'PICKLEBALL': return COLORS.pickleball;
    default: return theme.colors.primary;
  }
};

// Calculate overall match score (sets won by each side)
const calculateMatchScore = (setScores: SetScore[]): { user: number; opponent: number } => {
  let userSets = 0;
  let opponentSets = 0;

  setScores.forEach(set => {
    if (set.userGames > set.opponentGames) {
      userSets++;
    } else if (set.opponentGames > set.userGames) {
      opponentSets++;
    } else if (set.hasTiebreak) {
      if ((set.userTiebreak || 0) > (set.opponentTiebreak || 0)) {
        userSets++;
      } else {
        opponentSets++;
      }
    }
  });

  return { user: userSets, opponent: opponentSets };
};

// Avatar component
const Avatar = ({
  participant,
  size = 56,
}: {
  participant?: MatchParticipant;
  size?: number;
}) => {
  if (participant?.image) {
    return (
      <Image
        source={{ uri: participant.image }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    );
  }

  const initials = participant?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View
      style={[
        styles.avatarPlaceholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.avatarDefault,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

// Stacked avatars for doubles
const DoublesAvatarStack = ({
  player,
  partner,
}: {
  player?: MatchParticipant;
  partner?: MatchParticipant;
}) => (
  <View style={styles.doublesStack}>
    <View style={styles.doublesAvatarBack}>
      <Avatar participant={player} size={44} />
    </View>
    <View style={styles.doublesAvatarFront}>
      <Avatar participant={partner} size={44} />
    </View>
  </View>
);

// Corner Ribbon Component
// Types: LEAGUE (orange), FRIENDLY (gray - with scores), CASUAL (purple - no scores)
const CornerRibbon = ({
  isFriendly,
  isCasualPlay
}: {
  isFriendly?: boolean;
  isCasualPlay?: boolean;
}) => {
  const getRibbonColor = () => {
    if (isCasualPlay) return COLORS.casualRibbon;
    if (isFriendly) return COLORS.friendlyRibbon;
    return COLORS.leagueRibbon;
  };

  const getRibbonText = () => {
    if (isCasualPlay) return 'CASUAL';
    if (isFriendly) return 'FRIENDLY';
    return 'LEAGUE';
  };

  return (
    <View style={styles.ribbonContainer}>
      <View style={[styles.ribbon, { backgroundColor: getRibbonColor() }]}>
        <Text style={styles.ribbonText}>{getRibbonText()}</Text>
      </View>
    </View>
  );
};

// Filter chip component
const FilterChip = ({
  label,
  isActive,
  onPress,
  activeColor,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor?: string;
}) => (
  <Pressable
    style={[
      styles.filterChip,
      isActive && [styles.filterChipActive, activeColor ? { backgroundColor: activeColor } : null],
    ]}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
  >
    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
      {label}
    </Text>
  </Pressable>
);

// Match Card Component - VS Style
interface MatchCardProps {
  match: MatchHistoryItem;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const isWin = match.outcome === 'WIN';
  const isLoss = match.outcome === 'LOSS';
  const isDoubles = match.matchType === 'DOUBLES';
  const isWalkover = match.isWalkover;
  const isFriendly = match.isFriendly;

  // Determine if this is a casual play (friendly match with no scores)
  const hasScores = match.setScores && match.setScores.length > 0;
  const isCasualPlay = isFriendly && !hasScores && !isWalkover;

  // Calculate match score
  const matchScore = calculateMatchScore(match.setScores);

  // Format date with time
  const formatMatchDateTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const datePart = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} at ${timePart}`;
    } catch {
      return dateStr;
    }
  };

  // Get display name
  const getDisplayName = (participant?: MatchParticipant, short = false): string => {
    if (!participant?.name) return 'Unknown';
    if (short) {
      return participant.name.split(' ')[0];
    }
    return participant.name;
  };

  // Get team display for doubles
  const getTeamDisplay = (player?: MatchParticipant, partner?: MatchParticipant): string => {
    const p1Name = getDisplayName(player, true);
    if (!partner?.name) return p1Name;
    const p2Name = getDisplayName(partner, true);
    return `${p1Name} & ${p2Name}`;
  };

  // Build context parts
  const contextParts: string[] = [];
  if (match.division?.name) contextParts.push(match.division.name);
  if (match.season?.name) contextParts.push(match.season.name);
  contextParts.push(formatMatchDateTime(match.matchDate));

  // Get background color based on outcome and status
  const getBackgroundColor = () => {
    if (isWalkover) return COLORS.walkoverBg;
    if (isWin) return COLORS.winBg;
    if (isLoss) return COLORS.lossBg;
    return COLORS.cardDefault;
  };

  // Get score color based on outcome
  const getScoreColor = () => {
    if (isWalkover) return COLORS.walkoverAccent;
    if (isWin) return COLORS.winAccent;
    if (isLoss) return COLORS.lossAccent;
    return COLORS.textPrimary;
  };

  // Check if any set has a tiebreak
  const hasTiebreaks = match.setScores.some(s => s.hasTiebreak);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.matchCard,
        { backgroundColor: getBackgroundColor() },
        pressed && styles.matchCardPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {/* Corner Ribbon */}
      <CornerRibbon isFriendly={isFriendly} isCasualPlay={isCasualPlay} />

      {/* Arrow indicator - top right */}
      <View style={styles.arrowIndicator}>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>

      {/* VS Section */}
      <View style={styles.vsSection}>
        {/* Left Player (User) */}
        <View style={styles.playerColumn}>
          {isDoubles ? (
            <DoublesAvatarStack
              player={match.userTeam.player}
              partner={match.userTeam.partner}
            />
          ) : (
            <Avatar participant={match.userTeam.player} size={56} />
          )}
          <Text style={[styles.playerName, isWin && styles.playerNameWinner]} numberOfLines={1}>
            {isDoubles
              ? getTeamDisplay(match.userTeam.player, match.userTeam.partner)
              : getDisplayName(match.userTeam.player)}
          </Text>
        </View>

        {/* Center Score */}
        <View style={styles.centerScore}>
          {/* Sport Badge - above score */}
          {match.sportType && (
            <View
              style={[
                styles.sportBadge,
                { backgroundColor: getSportColors(match.sportType).background + '20' },
              ]}
            >
              <Text
                style={[
                  styles.sportBadgeText,
                  { color: getSportColors(match.sportType).background },
                ]}
              >
                {match.sportType.charAt(0) + match.sportType.slice(1).toLowerCase()}
              </Text>
            </View>
          )}
          {isCasualPlay ? (
            // Casual Play - show handshake icon with sport color
            <>
              <CasualHandshakeIcon
                width={40}
                height={32}
                fill={match.sportType ? getSportColors(match.sportType).background : COLORS.casualAccent}
              />
              <Text style={[styles.vsText, { color: match.sportType ? getSportColors(match.sportType).background : COLORS.casualAccent }]}>PLAYED</Text>
            </>
          ) : isWalkover ? (
            // Walkover - show W/O
            <>
              <Text style={[styles.walkoverText, { color: getScoreColor() }]}>W/O</Text>
              <Text style={styles.vsText}>{isWin ? 'WIN' : 'LOSS'}</Text>
            </>
          ) : hasScores ? (
            // Normal match with scores
            <>
              <Text style={[styles.matchScoreText, { color: getScoreColor() }]}>
                {matchScore.user} - {matchScore.opponent}
              </Text>
              <Text style={styles.vsText}>VS</Text>
            </>
          ) : (
            // No scores available
            <>
              <Text style={[styles.matchScoreText, { color: COLORS.textMuted }]}>-</Text>
              <Text style={styles.vsText}>VS</Text>
            </>
          )}
          {/* Rating Change Badge */}
          {match.ratingChange && match.ratingChange.delta !== 0 && (
            <View style={styles.ratingChangeBadge}>
              <Text style={styles.ratingTransitionText}>
                {match.ratingChange.ratingBefore}
              </Text>
              <Text style={styles.ratingArrowSymbol}>→</Text>
              <Text style={styles.ratingTransitionText}>
                {match.ratingChange.ratingAfter}
              </Text>
              <Text
                style={[
                  styles.ratingDeltaText,
                  { color: match.ratingChange.delta > 0 ? COLORS.winAccent : COLORS.lossAccent },
                ]}
              >
                ({match.ratingChange.delta > 0 ? '+' : ''}{match.ratingChange.delta})
              </Text>
              <Text
                style={[
                  styles.ratingChangeArrow,
                  { color: match.ratingChange.delta > 0 ? COLORS.winAccent : COLORS.lossAccent },
                ]}
              >
                {match.ratingChange.delta > 0 ? '↗' : '↘'}
              </Text>
            </View>
          )}
        </View>

        {/* Right Player (Opponent) */}
        <View style={styles.playerColumn}>
          {isDoubles ? (
            <DoublesAvatarStack
              player={match.opponentTeam.player}
              partner={match.opponentTeam.partner}
            />
          ) : (
            <Avatar participant={match.opponentTeam.player} size={56} />
          )}
          <Text style={[styles.playerName, isLoss && styles.playerNameWinner]} numberOfLines={1}>
            {isDoubles
              ? getTeamDisplay(match.opponentTeam.player, match.opponentTeam.partner)
              : getDisplayName(match.opponentTeam.player)}
          </Text>
        </View>
      </View>

      {/* Set Scores Table - Only show if not a walkover, not casual play, and has scores */}
      {!isWalkover && !isCasualPlay && hasScores && (
        <View style={styles.setScoresContainer}>
          {/* Set Labels Row */}
          <View style={styles.setScoresRow}>
            {match.setScores.map((setScore) => (
              <View key={`label-${setScore.setNumber}`} style={styles.setColumn}>
                <Text style={styles.setLabel}>Set {setScore.setNumber}</Text>
              </View>
            ))}
          </View>
          {/* Set Scores Row */}
          <View style={styles.setScoresRow}>
            {match.setScores.map((setScore) => (
              <View key={`score-${setScore.setNumber}`} style={styles.setColumn}>
                <Text style={styles.setScore}>
                  {setScore.userGames}-{setScore.opponentGames}
                </Text>
              </View>
            ))}
          </View>
          {/* Tiebreak Row (if any) */}
          {hasTiebreaks && (
            <View style={styles.tiebreakRow}>
              {match.setScores.map((setScore) => (
                <View key={`tb-${setScore.setNumber}`} style={styles.setColumn}>
                  {setScore.hasTiebreak && setScore.userTiebreak !== undefined && setScore.opponentTiebreak !== undefined ? (
                    <Text style={styles.tiebreakText}>
                      ({setScore.userTiebreak}-{setScore.opponentTiebreak})
                    </Text>
                  ) : (
                    <Text style={styles.tiebreakText}> </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Context Footer */}
      <View style={styles.contextFooter}>
        <Text style={styles.contextText} numberOfLines={1}>
          {contextParts.join(' · ')}
        </Text>
      </View>
    </Pressable>
  );
};

// Loading skeleton - VS Style
const MatchCardSkeleton = () => (
  <View style={[styles.matchCard, styles.skeletonCard, { backgroundColor: COLORS.cardDefault }]}>
    {/* Ribbon skeleton */}
    <View style={styles.ribbonContainer}>
      <View style={[styles.skeleton, { width: 60, height: 20, borderBottomRightRadius: 8 }]} />
    </View>
    {/* VS Section skeleton */}
    <View style={styles.vsSection}>
      <View style={styles.playerColumn}>
        <View style={[styles.skeleton, { width: 56, height: 56, borderRadius: 28 }]} />
        <View style={[styles.skeleton, { width: 60, height: 14, marginTop: 8 }]} />
      </View>
      <View style={styles.centerScore}>
        <View style={[styles.skeleton, { width: 60, height: 28 }]} />
        <View style={[styles.skeleton, { width: 24, height: 12, marginTop: 4 }]} />
      </View>
      <View style={styles.playerColumn}>
        <View style={[styles.skeleton, { width: 56, height: 56, borderRadius: 28 }]} />
        <View style={[styles.skeleton, { width: 80, height: 14, marginTop: 8 }]} />
      </View>
    </View>
    {/* Set scores skeleton */}
    <View style={styles.setScoresContainer}>
      <View style={styles.setScoresRow}>
        {[1, 2].map(i => (
          <View key={i} style={styles.setColumn}>
            <View style={[styles.skeleton, { width: 40, height: 12, marginBottom: 4 }]} />
            <View style={[styles.skeleton, { width: 30, height: 18 }]} />
          </View>
        ))}
      </View>
    </View>
    {/* Footer skeleton */}
    <View style={styles.contextFooter}>
      <View style={[styles.skeleton, { width: 200, height: 12 }]} />
    </View>
  </View>
);

// Empty state component
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="tennisball-outline" size={64} color="#E5E7EB" />
    <Text style={styles.emptyTitle}>No Match History</Text>
    <Text style={styles.emptyText}>
      You haven't completed any matches yet.{'\n'}
      Play some matches to see your history here!
    </Text>
  </View>
);

// Filter bar component
const FilterBar = ({
  filters,
  onFilterChange,
  activeColor,
}: {
  filters: MatchHistoryFilters;
  onFilterChange: (filters: MatchHistoryFilters) => void;
  activeColor?: string;
}) => {
  const [activeOutcome, setActiveOutcome] = useState<'all' | 'win' | 'loss'>(
    filters.outcome || 'all'
  );
  const [activeType, setActiveType] = useState<'all' | 'SINGLES' | 'DOUBLES'>('all');

  const handleOutcomeChange = (outcome: 'all' | 'win' | 'loss') => {
    setActiveOutcome(outcome);
    onFilterChange({
      ...filters,
      outcome: outcome === 'all' ? undefined : outcome,
    });
  };

  const handleTypeChange = (type: 'all' | 'SINGLES' | 'DOUBLES') => {
    setActiveType(type);
    onFilterChange({
      ...filters,
      matchType: type === 'all' ? undefined : type,
    });
  };

  return (
    <View style={styles.filterBar}>
      <View style={styles.filterRow}>
        <FilterChip
          label="All"
          isActive={activeOutcome === 'all'}
          onPress={() => handleOutcomeChange('all')}
          activeColor={activeColor}
        />
        <FilterChip
          label="Wins"
          isActive={activeOutcome === 'win'}
          onPress={() => handleOutcomeChange('win')}
          activeColor={activeColor}
        />
        <FilterChip
          label="Losses"
          isActive={activeOutcome === 'loss'}
          onPress={() => handleOutcomeChange('loss')}
          activeColor={activeColor}
        />
        <View style={styles.filterDivider} />
        <FilterChip
          label="Singles"
          isActive={activeType === 'SINGLES'}
          onPress={() => handleTypeChange(activeType === 'SINGLES' ? 'all' : 'SINGLES')}
          activeColor={activeColor}
        />
        <FilterChip
          label="Doubles"
          isActive={activeType === 'DOUBLES'}
          onPress={() => handleTypeChange(activeType === 'DOUBLES' ? 'all' : 'DOUBLES')}
          activeColor={activeColor}
        />
      </View>
    </View>
  );
};

// Main screen component
export default function MatchHistoryScreen() {
  const {
    matches,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    filters,
    setFilters,
    updateFilter,
    loadMore,
    refresh,
    error,
  } = useMatchHistory();

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Sport dropdown state
  const [showSportDropdown, setShowSportDropdown] = useState(false);
  const selectedSport = filters.sportType || 'all';
  const selectedSportOption = SPORT_OPTIONS.find(o => o.value === selectedSport) || SPORT_OPTIONS[0];

  // Get gradient colors and theme color based on selected sport
  const gradientColors = useMemo(() => SPORT_GRADIENTS[selectedSport], [selectedSport]);
  const themeColor = useMemo(() => getSportThemeColor(selectedSport), [selectedSport]);

  // Entry animation effect
  useEffect(() => {
    if (!isLoading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Header slides down
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Content slides up
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
        ]),
      ]).start();
    }
  }, [
    isLoading,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/profile');
    }
  };

  const handleSportSelect = (value: SportType | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateFilter('sportType', value === 'all' ? undefined : value);
    setShowSportDropdown(false);
  };

  const handleMatchPress = (match: MatchHistoryItem) => {
    // Navigate to match-details with just matchId and isFriendly
    // Let match-details fetch full details from API since match-history
    // has incomplete participant data (user's own ID is not available)
    router.push({
      pathname: '/match/match-details',
      params: {
        matchId: match.id,
        isFriendly: match.isFriendly ? 'true' : 'false',
      },
    });
  };

  const renderItem = useCallback(
    ({ item }: { item: MatchHistoryItem }) => (
      <MatchCard match={item} onPress={() => handleMatchPress(item)} />
    ),
    []
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={themeColor} />
      </View>
    );
  };

  const keyExtractor = useCallback((item: MatchHistoryItem) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header with sport-themed gradient */}
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.safeHeader}>
            <View style={styles.header}>
              <Pressable
                style={styles.backButton}
                onPress={handleBackPress}
                accessible={true}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.headerTitle}>Match History</Text>
              {/* Sport Dropdown Button */}
              <Pressable
                style={styles.sportDropdownButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSportDropdown(true);
                }}
              >
                <Text style={styles.sportDropdownButtonText}>{selectedSportOption.label}</Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* Filter Bar + Content */}
      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
        {/* Filter Bar */}
        <FilterBar filters={filters} onFilterChange={setFilters} activeColor={themeColor} />

        {/* Content */}
        {isLoading ? (
        <View style={styles.loadingContainer}>
          <MatchCardSkeleton />
          <MatchCardSkeleton />
          <MatchCardSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={[styles.retryButton, { backgroundColor: themeColor }]} onPress={refresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : matches.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={matches}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              colors={[themeColor]}
              tintColor={themeColor}
            />
          }
        />
      )}
      </Animated.View>

      {/* Sport Dropdown Modal */}
      <Modal
        visible={showSportDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSportDropdown(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSportDropdown(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sportDropdownModal}>
                <Text style={styles.sportDropdownTitle}>Select Sport</Text>
                {SPORT_OPTIONS.map((option) => {
                  const isSelected = selectedSport === option.value;
                  const optionColor = option.color || theme.colors.primary;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sportDropdownOption,
                        isSelected && { backgroundColor: optionColor + '15' },
                      ]}
                      onPress={() => handleSportSelect(option.value)}
                    >
                      {option.color && (
                        <View style={[styles.sportColorDot, { backgroundColor: option.color }]} />
                      )}
                      <Text
                        style={[
                          styles.sportDropdownOptionText,
                          isSelected && { color: optionColor, fontWeight: '600' },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={optionColor} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  headerGradient: {},
  safeHeader: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 40,
  },

  // Sport dropdown button in header
  sportDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  sportDropdownButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Sport dropdown modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sportDropdownModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 300,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  sportDropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  sportDropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sportDropdownOptionActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  sportColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sportDropdownOptionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  sportDropdownOptionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Filter bar
  filterBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral.gray[100],
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral.gray[600],
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.neutral.gray[300],
    marginHorizontal: 4,
  },

  // List
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },

  // Match Card - VS Style
  matchCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  matchCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },

  // Corner Ribbon
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  ribbon: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomRightRadius: 10,
  },
  ribbonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Arrow indicator - top right
  arrowIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },

  // VS Section
  vsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
  },
  playerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 90,
  },
  playerNameWinner: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Center Score
  centerScore: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  matchScoreText: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  walkoverText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  vsText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 1,
  },
  ratingChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    gap: 3,
  },
  ratingTransitionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  ratingArrowSymbol: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  ratingDeltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratingChangeArrow: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Avatar styles
  avatar: {
    backgroundColor: theme.colors.neutral.gray[200],
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Doubles Avatar Stack
  doublesStack: {
    width: 76,
    height: 56,
    position: 'relative',
  },
  doublesAvatarBack: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  doublesAvatarFront: {
    position: 'absolute',
    right: 0,
    top: 0,
  },

  // Set Scores Table
  setScoresContainer: {
    backgroundColor: COLORS.setScoresBg,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  setScoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  setColumn: {
    alignItems: 'center',
    minWidth: 50,
  },
  setLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  setScore: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tiebreakRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 2,
  },
  tiebreakText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  // Context Footer
  contextFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 12,
  },
  contextText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Loading states
  loadingContainer: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  loadingFooter: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  skeletonCard: {
    opacity: 0.7,
  },
  skeleton: {
    backgroundColor: theme.colors.neutral.gray[300],
    borderRadius: 4,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.neutral.gray[700],
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.neutral.gray[700],
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.neutral.gray[600],
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
