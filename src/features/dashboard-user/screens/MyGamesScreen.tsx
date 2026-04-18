import { getSportColors, SportType } from "@/constants/SportsColor";
import { useSession } from "@/lib/auth-client";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { MatchCardSkeleton } from "@/src/components/MatchCardSkeleton";
import { useSeasonInvitations } from "@/src/features/community/hooks/useSeasonInvitations";
import { AnimatedFilterChip } from "@/src/shared/components/ui/AnimatedFilterChip";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMyGamesStore } from "../stores/MyGamesStore";

// Cache key for match summary
const MATCH_SUMMARY_CACHE_KEY = "my_matches_summary";
const { width: SCREEN_W } = Dimensions.get("window");
const IS_TABLET = SCREEN_W >= 768;
const IS_LARGE_TABLET = SCREEN_W >= 1024;

import {
  FilterBottomSheet,
  FilterBottomSheetRef,
  FilterOptions,
  FilterTab,
  formatMatchDate,
  formatMatchTime,
  getMatchTime,
  InvitationCard,
  isMatchPast,
  isUnfilledMatch,
  Match,
  MatchCard,
  MatchInvitation,
  MyGamesScreenProps,
  SeasonInvitationCard,
  styles,
} from "./my-games";

export default function MyGamesScreen({
  sport = "pickleball",
  initialTab,
}: MyGamesScreenProps) {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<Match[]>([]);
  const [invitations, setInvitations] = useState<MatchInvitation[]>([]);
  const {
    seasonInvitations,
    actionLoading: seasonInviteActionLoading,
    fetchSeasonInvitations,
    acceptSeasonInvitation,
    denySeasonInvitation,
  } = useSeasonInvitations();

  // Convert to uppercase for getSportColors (expects 'PICKLEBALL', 'TENNIS', 'PADEL')
  const sportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);
  // Sport-specific dark color for Invites pill (per Figma)
  const invitesColor =
    sportType === "TENNIS"
      ? "#587A27"
      : sportType === "PADEL"
        ? "#2E6698"
        : "#602E98"; // Pickleball / default
  const filterBottomSheetRef = useRef<FilterBottomSheetRef>(null);

  // Responsive chip sizing tuned for phone, tablet, and large tablet widths
  const chipPaddingH = IS_LARGE_TABLET
    ? 26
    : IS_TABLET
      ? 22
      : SCREEN_W < 380
        ? 12
        : SCREEN_W < 420
          ? 14
          : 18;
  const chipPaddingV = IS_LARGE_TABLET ? 12 : IS_TABLET ? 11 : 10;
  const chipFontSize = IS_LARGE_TABLET
    ? 20
    : IS_TABLET
      ? 18
      : SCREEN_W < 420
        ? 16
        : 18;

  // Entry animation values
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  const [refreshing, setRefreshing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const hasInitializedRef = useRef(false);
  const skeletonStartTimeRef = useRef<number | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSkeletonWithTimer = () => {
    skeletonStartTimeRef.current = Date.now();
    setShowSkeleton(true);
  };

  const hideSkeletonWithDelay = () => {
    if (skeletonStartTimeRef.current === null) {
      setShowSkeleton(false);
      return;
    }
    const elapsed = Date.now() - skeletonStartTimeRef.current;
    const remaining = Math.max(0, 2000 - elapsed);
    skeletonStartTimeRef.current = null;
    if (remaining > 0) {
      skeletonTimerRef.current = setTimeout(
        () => setShowSkeleton(false),
        remaining,
      );
    } else {
      setShowSkeleton(false);
    }
  };

  // Filter states
  const [activeTab, setActiveTab] = useState<FilterTab>(initialTab || "ALL");
  const [upcomingPastTab, setUpcomingPastTab] = useState<"UPCOMING" | "PAST">(
    "UPCOMING",
  );
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  // Handle initialTab changes from navigation
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
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
      const response = await axiosInstance.get("/api/match/my/summary");
      const newSummary = response.data?.data ?? response.data;

      const cachedSummaryStr = await AsyncStorage.getItem(
        MATCH_SUMMARY_CACHE_KEY,
      );

      if (!cachedSummaryStr) {
        // First time - store and show skeleton
        await AsyncStorage.setItem(
          MATCH_SUMMARY_CACHE_KEY,
          JSON.stringify(newSummary),
        );
        return true;
      }

      const cachedSummary = JSON.parse(cachedSummaryStr);

      // Check if anything changed
      const hasNewContent =
        newSummary.count !== cachedSummary.count ||
        newSummary.latestUpdatedAt !== cachedSummary.latestUpdatedAt;

      // Update cache with new summary
      await AsyncStorage.setItem(
        MATCH_SUMMARY_CACHE_KEY,
        JSON.stringify(newSummary),
      );

      return hasNewContent;
    } catch (error) {
      console.error("Error checking for new content:", error);
      return true; // On error, assume new content to be safe
    }
  }, [session?.user?.id]);

  const fetchMyMatches = useCallback(
    async (isManualRefresh = false) => {
      if (!session?.user?.id) {
        console.log(`[MyGamesScreen] No session or user ID available`, {
          session,
        });
        return;
      }

      // Only show skeleton on very first initialization, not on tab switches
      if (!hasInitializedRef.current) {
        // First load ever - check if we have cached data
        const cachedSummaryStr = await AsyncStorage.getItem(
          MATCH_SUMMARY_CACHE_KEY,
        );
        if (!cachedSummaryStr) {
          // No cache = truly first time, show skeleton
          showSkeletonWithTimer();
        } else {
          // Has cache = check for new content
          const hasNewContent = await checkForNewContent();
          if (hasNewContent) {
            showSkeletonWithTimer();
          }
        }
        hasInitializedRef.current = true;
      } else if (!isManualRefresh) {
        // Subsequent automatic loads - check for new content
        const hasNewContent = await checkForNewContent();
        if (hasNewContent) {
          showSkeletonWithTimer();
        }
      }
      // Manual refresh - never show skeleton

      try {
        const response = await axiosInstance.get(endpoints.match.getMy);
        // Unwrap sendSuccess envelope: { success: true, data: T }
        const payload = response.data?.data ?? response.data;
        const matchesData = payload?.matches || payload;
        const finalMatches = Array.isArray(matchesData) ? matchesData : [];
        setMatches(finalMatches);
      } catch (error: any) {
        console.error(
          "Error fetching my matches:",
          error?.response?.status,
          error?.response?.data,
          error?.message,
        );
        setMatches([]);
      } finally {
        setRefreshing(false);
        hideSkeletonWithDelay();
      }
    },
    [session?.user?.id, checkForNewContent],
  );

  const fetchPendingInvitations = useCallback(async () => {
    if (!session?.user?.id) {
      console.log(`[MyGamesScreen] No session for invitations`, { session });
      return;
    }

    console.log(
      `[MyGamesScreen] Fetching pending invitations for user:`,
      session.user.id,
    );

    try {
      const response = await axiosInstance.get(
        endpoints.match.getPendingInvitations,
      );
      console.log(`[MyGamesScreen] Invitations response:`, response.data);
      // Unwrap sendSuccess envelope: { success: true, data: T }
      const payload = response.data?.data ?? response.data;
      setInvitations(Array.isArray(payload) ? payload : []);
    } catch (error: any) {
      console.error(
        "Error fetching invitations:",
        error?.response?.status,
        error?.response?.data,
        error?.message,
      );
      setInvitations([]);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchMyMatches();
    fetchPendingInvitations();
    fetchSeasonInvitations();
  }, [fetchMyMatches, fetchPendingInvitations, fetchSeasonInvitations]);

  // Cleanup skeleton timer on unmount
  useEffect(() => {
    return () => {
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
    };
  }, []);

  // Entry animation effect - trigger when loading is done, regardless of data
  useEffect(() => {
    if (
      !showSkeleton &&
      hasInitializedRef.current &&
      !hasPlayedEntryAnimation.current
    ) {
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
    } else if (!showSkeleton && !hasInitializedRef.current) {
      // Fallback: Show content immediately if not initialized properly
      contentEntryOpacity.setValue(1);
      contentEntryTranslateY.setValue(0);
    }
  }, [
    showSkeleton,
    matches,
    invitations,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  // Listen for refresh signal from match-details (after submit/confirm/join/cancel)
  const { shouldRefresh, clearRefresh, setPendingInviteCount } =
    useMyGamesStore();

  useEffect(() => {
    if (shouldRefresh) {
      fetchMyMatches(true); // Manual refresh style (no skeleton)
      fetchPendingInvitations();
      fetchSeasonInvitations();
      clearRefresh();
    }
  }, [
    shouldRefresh,
    clearRefresh,
    fetchMyMatches,
    fetchPendingInvitations,
    fetchSeasonInvitations,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches(true);
    fetchPendingInvitations();
    fetchSeasonInvitations();
  };

  // Extract unique values for filters
  const uniqueSports = useMemo(() => {
    const sports = new Set(
      matches
        .map((m) => m.sport || m.division?.league?.sportType)
        .filter(Boolean),
    );
    return Array.from(sports) as string[];
  }, [matches]);

  const uniqueDivisions = useMemo(() => {
    const divisions = new Set(
      matches.map((m) => m.division?.name).filter(Boolean),
    );
    return Array.from(divisions) as string[];
  }, [matches]);

  const uniqueSeasons = useMemo(() => {
    const seasons = new Set(
      matches.map((m) => m.division?.season?.name).filter(Boolean),
    );
    return Array.from(seasons) as string[];
  }, [matches]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(
      matches.map((m) => m.status.toUpperCase()).filter(Boolean),
    );
    return Array.from(statuses) as string[];
  }, [matches]);

  // Filter matches based on all criteria
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Filter by the currently selected sport from the dashboard
    filtered = filtered.filter((match) => {
      const matchSport = (
        match.sport ||
        match.division?.league?.sportType ||
        ""
      ).toUpperCase();
      return matchSport === sportType;
    });

    // Exclude DRAFT matches where user's invitation is still PENDING
    // (these should appear in INVITES tab instead)
    filtered = filtered.filter((match) => {
      if (
        match.status.toUpperCase() === "DRAFT" &&
        match.invitationStatus === "PENDING"
      ) {
        // Check if user is the creator - creators should see their DRAFT matches
        const isCreator = match.createdById === session?.user?.id;
        if (!isCreator) {
          return false; // Hide from non-creators who haven't responded yet
        }
      }
      return true;
    });

    // Filter by Upcoming/Past tab.
    // DRAFT always stays Upcoming regardless of time.
    // Terminal statuses always go to Past.
    // All other non-terminal statuses use the scheduled start time:
    //   - start time has passed => Past
    //   - start time is in the future (or unknown) => Upcoming
    if (upcomingPastTab === "UPCOMING") {
      filtered = filtered.filter((m) => {
        const status = m.status.toUpperCase();
        // DRAFT is always upcoming
        if (status === "DRAFT") return true;
        // Terminal statuses belong to Past
        if (
          [
            "COMPLETED",
            "FINISHED",
            "CANCELLED",
            "VOID",
            "UNFINISHED",
            "WALKOVER_PENDING",
          ].includes(status)
        )
          return false;
        // Non-terminal: show in Upcoming only if start time hasn't passed yet
        return !isMatchPast(m);
      });
    } else if (upcomingPastTab === "PAST") {
      filtered = filtered.filter((m) => {
        const status = m.status.toUpperCase();
        // DRAFT never appears in Past
        if (status === "DRAFT") return false;
        // Terminal statuses always Past
        if (
          [
            "COMPLETED",
            "FINISHED",
            "CANCELLED",
            "VOID",
            "UNFINISHED",
            "WALKOVER_PENDING",
          ].includes(status)
        )
          return true;
        // Non-terminal: Past only once start time has passed
        return isMatchPast(m);
      });
    }

    // Filter by ALL/LEAGUE/FRIENDLY tab
    if (activeTab === "LEAGUE") {
      filtered = filtered.filter((m) => m.isFriendly !== true);
    } else if (activeTab === "FRIENDLY") {
      filtered = filtered.filter((m) => m.isFriendly === true);
    }

    // Filter by sport (from bottom sheet)
    if (filters.sport) {
      filtered = filtered.filter(
        (m) => (m.sport || m.division?.league?.sportType) === filters.sport,
      );
    }

    // Filter by division (from bottom sheet)
    if (filters.division) {
      filtered = filtered.filter((m) => m.division?.name === filters.division);
    }

    // Filter by season (from bottom sheet)
    if (filters.season) {
      filtered = filtered.filter(
        (m) => m.division?.season?.name === filters.season,
      );
    }

    // Filter by match type (League vs Friendly)
    if (filters.matchType) {
      if (filters.matchType === "FRIENDLY") {
        filtered = filtered.filter((m) => m.isFriendly === true);
      } else if (filters.matchType === "LEAGUE") {
        filtered = filtered.filter((m) => m.isFriendly !== true);
      }
    }

    // Filter by game type (Singles vs Doubles)
    if (filters.gameType) {
      filtered = filtered.filter(
        (m) => m.matchType?.toUpperCase() === filters.gameType,
      );
    }

    // Filter by status (from bottom sheet - overrides tab filter if set)
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((m) =>
        filters.status!.includes(m.status.toUpperCase()),
      );
    }

    // Sort: upcoming = soonest first (ascending); past = most recent first (descending)
    filtered.sort((a, b) => {
      const aTime = new Date(getMatchTime(a) || 0).getTime();
      const bTime = new Date(getMatchTime(b) || 0).getTime();
      return upcomingPastTab === "PAST" ? bTime - aTime : aTime - bTime;
    });

    return filtered;
  }, [
    matches,
    activeTab,
    upcomingPastTab,
    filters,
    session?.user?.id,
    sportType,
  ]);

  const groupMatchesByDate = (matchList: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};
    if (!Array.isArray(matchList)) return grouped;
    matchList.forEach((match) => {
      const dateString =
        match.matchDate || match.scheduledStartTime || match.scheduledTime;
      if (!dateString) return;
      const dateKey = format(new Date(dateString), "EEEE, d MMMM yyyy");
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(match);
    });
    return grouped;
  };

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

  const groupedMatches = useMemo(
    () => groupMatchesByDate(filteredMatches ?? []),
    [filteredMatches],
  );

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  // Filter invitations by the currently selected sport
  const filteredInvitations = useMemo(() => {
    return invitations.filter((invitation) => {
      const invitationSport = (invitation.match?.sport || "").toUpperCase();
      return invitationSport === sportType;
    });
  }, [invitations, sportType]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  // Total pending invites count for the badge on the Invites chip
  const totalPendingInvites = useMemo(() => {
    const matchInvites = filteredInvitations?.length ?? 0;
    const seasonInvites =
      seasonInvitations?.received?.filter((i) => i.status === "PENDING")
        ?.length ?? 0;
    return matchInvites + seasonInvites;
  }, [filteredInvitations, seasonInvitations]);

  // Keep the shared store in sync so the NavBar badge in userDashboard stays accurate
  useEffect(() => {
    setPendingInviteCount(totalPendingInvites);
  }, [totalPendingInvites, setPendingInviteCount]);

  // Get filter button color based on selected sport filter
  const getFilterButtonColor = (): string => {
    if (!hasActiveFilters) return "#A04DFE";

    if (filters.sport) {
      const sportType = filters.sport.toUpperCase() as SportType;
      const colors = getSportColors(sportType);
      return colors.background;
    }

    return "#6B7280";
  };

  const filterButtonColor = getFilterButtonColor();

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await axiosInstance.post(
        endpoints.match.respondToInvitation(invitationId),
        {
          accept: true,
        },
      );
      Alert.alert("Success", "Invitation accepted!");
      fetchPendingInvitations();
      fetchMyMatches();
    } catch (error: any) {
      console.error(
        "Error accepting invitation:",
        error?.response?.data || error,
      );
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Failed to accept invitation";
      Alert.alert("Error", message);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    Alert.alert(
      "Decline Invitation",
      "Are you sure you want to decline this invitation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await axiosInstance.post(
                endpoints.match.respondToInvitation(invitationId),
                {
                  accept: false,
                  declineReason: "Not available",
                },
              );
              Alert.alert("Success", "Invitation declined");
              fetchPendingInvitations();
            } catch (error) {
              console.error("Error declining invitation:", error);
              Alert.alert("Error", "Failed to decline invitation");
            }
          },
        },
      ],
    );
  };

  const handleMatchPress = (match: Match) => {
    // Cancelled and unfilled matches have no detail view
    const status = match.status?.toUpperCase();
    if (status === "CANCELLED" || isUnfilledMatch(match)) return;

    const matchTime = getMatchTime(match);

    // For friendly matches build a time range using the duration field
    // (same format as FriendlyScreen). For league matches, pass start time only.
    const formatTime = () => {
      if (match.isFriendly && matchTime) {
        const startDate = new Date(matchTime);
        const durationHours = match.duration || 2;
        const endDate = new Date(
          startDate.getTime() + durationHours * 60 * 60 * 1000,
        );
        return `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`;
      }
      return formatMatchTime(matchTime);
    };

    router.push({
      pathname: "/match/match-details" as any,
      params: {
        matchId: match.id,
        matchType: match.matchType,
        date: formatMatchDate(matchTime),
        time: formatTime(),
        location: match.location || "TBD",
        sportType: match.sport || sport,
        leagueName: match.isFriendly
          ? "Friendly Match"
          : match.division?.league?.name || "League Match",
        season: match.division?.season?.name || "Season",
        division: match.division?.name || "Division",
        status: match.status,
        participants: JSON.stringify(match.participants || []),
        divisionId: match.division?.id || "",
        seasonId: match.division?.season?.id || "",
        fee: match.fee || "",
        feeAmount: match.feeAmount?.toString() || "",
        description: match.notes || match.description || "",
        courtBooked: match.courtBooked ? "true" : "false",
        isFriendly: match.isFriendly ? "true" : "false",
        duration: match.duration?.toString() || "2",
        genderRestriction: match.genderRestriction || "",
        skillLevels: JSON.stringify(match.skillLevels || []),
      },
    });
  };

  // TODO(empty-states): Same "No matches found" text shown for all filter combinations.
  // Consider contextual messages: "No league matches found", "No friendly matches found", etc.
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No matches found</Text>
      <Text style={styles.emptyText}>
        You haven't joined any matches yet. Start by browsing available matches
        or create your own!
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
    <View style={localStyles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[
          "#FFFFFF",
          `${sportColors.background}79`,
          sportColors.background,
        ]}
        style={localStyles.headerGradient}
      >
        <View style={localStyles.headerContent}>
          {/* My Games Title */}
          <Text style={localStyles.title}>My Games</Text>

          {/* Filter Chips: All, League, Friendly, Invites */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={localStyles.chipsContainer}
          >
            <AnimatedFilterChip
              label="All"
              isActive={activeTab === "ALL"}
              activeColor="#000000"
              onPress={() => setActiveTab("ALL")}
              noBorder
              inactiveTextColor="#86868B"
              inactiveBackgroundColor="rgba(255, 255, 255, 0.78)"
              style={{
                paddingVertical: chipPaddingV,
                paddingHorizontal: chipPaddingH,
              }}
              textStyle={{ fontSize: chipFontSize, fontWeight: "700" }}
            />
            <AnimatedFilterChip
              label="League"
              isActive={activeTab === "LEAGUE"}
              activeColor="#F5900A"
              onPress={() => setActiveTab("LEAGUE")}
              noBorder
              inactiveTextColor="#86868B"
              inactiveBackgroundColor="rgba(255, 255, 255, 0.78)"
              style={{
                paddingVertical: chipPaddingV,
                paddingHorizontal: chipPaddingH,
              }}
              textStyle={{ fontSize: chipFontSize, fontWeight: "700" }}
            />
            <AnimatedFilterChip
              label="Friendly"
              isActive={activeTab === "FRIENDLY"}
              activeColor="#4DABFE"
              onPress={() => setActiveTab("FRIENDLY")}
              noBorder
              inactiveTextColor="#86868B"
              inactiveBackgroundColor="rgba(255, 255, 255, 0.78)"
              style={{
                paddingVertical: chipPaddingV,
                paddingHorizontal: chipPaddingH,
              }}
              textStyle={{ fontSize: chipFontSize, fontWeight: "700" }}
            />
            <AnimatedFilterChip
              label="Invites"
              isActive={activeTab === "INVITES"}
              activeColor={invitesColor}
              onPress={() => setActiveTab("INVITES")}
              badge={totalPendingInvites}
              noBorder
              inactiveTextColor="#86868B"
              inactiveBackgroundColor="rgba(255, 255, 255, 0.78)"
              style={{
                paddingVertical: chipPaddingV,
                paddingHorizontal: chipPaddingH,
              }}
              textStyle={{ fontSize: chipFontSize, fontWeight: "700" }}
            />
          </ScrollView>
        </View>
      </LinearGradient>

      {/* Upcoming/Past Tabs - Only show when not in INVITES mode */}
      <View style={localStyles.roundedContainer}>
        {activeTab !== "INVITES" && (
          <View style={localStyles.tabsContainer}>
            <TouchableOpacity
              style={[
                localStyles.tab,
                upcomingPastTab === "UPCOMING" && {
                  borderBottomColor: sportColors.background,
                },
              ]}
              onPress={() => setUpcomingPastTab("UPCOMING")}
            >
              <Text
                style={[
                  localStyles.tabText,
                  upcomingPastTab === "UPCOMING" && {
                    color: sportColors.background,
                    fontWeight: "700",
                  },
                ]}
              >
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                localStyles.tab,
                upcomingPastTab === "PAST" && {
                  borderBottomColor: sportColors.background,
                },
              ]}
              onPress={() => setUpcomingPastTab("PAST")}
            >
              <Text
                style={[
                  localStyles.tabText,
                  upcomingPastTab === "PAST" && {
                    color: sportColors.background,
                    fontWeight: "700",
                  },
                ]}
              >
                Past
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content wrapper */}
        <View style={styles.contentWrapper}>
          {/* Skeleton - rendered outside Animated.View so it shows at full opacity */}
          {showSkeleton && <MatchCardSkeleton count={4} />}

          {/* Match List - Animated */}
          <Animated.View
            style={[
              styles.matchListWrapper,
              {
                opacity: contentEntryOpacity,
                transform: [{ translateY: contentEntryTranslateY }],
              },
            ]}
          >
            {/* Skeleton Loading - Only when new content detected */}
            {!showSkeleton && activeTab === "INVITES" ? (
              <ScrollView
                contentContainerStyle={[styles.listContent, { paddingTop: 16 }]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={sportColors.background}
                  />
                }
                showsVerticalScrollIndicator={false}
              >
                {/* ── Match Invitations ── */}
                {(filteredInvitations?.length ?? 0) > 0 && (
                  <>
                    <View style={inviteStyles.sectionHeader}>
                      <Ionicons name="mail" size={14} color="#6B7280" />
                      <Text style={inviteStyles.sectionTitle}>
                        Match Invites
                      </Text>
                      <View style={inviteStyles.countBadge}>
                        <Text style={inviteStyles.countText}>
                          {filteredInvitations.length}
                        </Text>
                      </View>
                    </View>
                    {filteredInvitations.map((item) => (
                      <InvitationCard
                        key={item.id}
                        invitation={item}
                        defaultSport={sport}
                        onAccept={handleAcceptInvitation}
                        onDecline={handleDeclineInvitation}
                      />
                    ))}
                  </>
                )}

                {/* ── Partnership Invitations ── */}
                {(seasonInvitations?.received?.filter(
                  (i) => i.status === "PENDING",
                )?.length ?? 0) > 0 && (
                  <>
                    <View
                      style={[
                        inviteStyles.sectionHeader,
                        (filteredInvitations?.length ?? 0) > 0 && {
                          marginTop: 8,
                        },
                      ]}
                    >
                      <Ionicons name="people" size={14} color="#6B7280" />
                      <Text style={inviteStyles.sectionTitle}>
                        Partnership Invites
                      </Text>
                      <View
                        style={[
                          inviteStyles.countBadge,
                          { backgroundColor: "#EDE9FE" },
                        ]}
                      >
                        <Text
                          style={[inviteStyles.countText, { color: "#A04DFE" }]}
                        >
                          {
                            seasonInvitations.received.filter(
                              (i) => i.status === "PENDING",
                            ).length
                          }
                        </Text>
                      </View>
                    </View>
                    {seasonInvitations.received
                      .filter((i) => i.status === "PENDING")
                      .map((item) => (
                        <SeasonInvitationCard
                          key={item.id}
                          invitation={item as any}
                          currentUserId={session?.user?.id ?? ""}
                          actionLoading={seasonInviteActionLoading}
                          onAccept={acceptSeasonInvitation}
                          onDeny={denySeasonInvitation}
                        />
                      ))}
                  </>
                )}

                {/* Empty state when no invites at all */}
                {(filteredInvitations?.length ?? 0) === 0 &&
                  (seasonInvitations?.received?.filter(
                    (i) => i.status === "PENDING",
                  )?.length ?? 0) === 0 &&
                  renderEmptyInvitationsState()}
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.listContent,
                  Object.keys(groupedMatches).length === 0 && { flex: 1 },
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={sportColors.background}
                  />
                }
              >
                {Object.keys(groupedMatches).length === 0
                  ? renderEmptyState()
                  : Object.entries(groupedMatches).map(
                      ([dateKey, dateMatches]) => {
                        const isCollapsed = collapsedDates.has(dateKey);
                        return (
                          <View key={dateKey} style={styles.dateSection}>
                            <TouchableOpacity
                              style={styles.dateDivider}
                              onPress={() => toggleDateSection(dateKey)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={
                                  isCollapsed
                                    ? "chevron-forward"
                                    : "chevron-down"
                                }
                                size={16}
                                color="#6B7280"
                              />
                              <Text style={styles.dateLabel}>{dateKey}</Text>
                            </TouchableOpacity>
                            {!isCollapsed &&
                              dateMatches.map((match) => (
                                <MatchCard
                                  key={match.id}
                                  match={match}
                                  onPress={handleMatchPress}
                                />
                              ))}
                          </View>
                        );
                      },
                    )}
              </ScrollView>
            )}
          </Animated.View>

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
    </View>
  );
}

// Local styles for this component
const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginBottom: IS_LARGE_TABLET ? 30 : IS_TABLET ? 26 : 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: IS_LARGE_TABLET ? 30 : IS_TABLET ? 26 : 24,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 12,
    marginTop: 24,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
    paddingRight: 12,
  },
  roundedContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -10,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4CAF50",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  activeTabText: {
    fontWeight: "700",
    color: "#1A1C1E",
  },
});

const inviteStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  countBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
});
