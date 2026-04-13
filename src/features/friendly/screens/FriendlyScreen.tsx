import { getSportColors, SportType } from "@/constants/SportsColor";
import { useSession } from "@/lib/auth-client";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { MatchCardSkeleton } from "@/src/components/MatchCardSkeleton";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
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
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { toast } from "sonner-native";
import {
  FriendlyFilterBottomSheet,
  FriendlyFilterBottomSheetRef,
  FriendlyFilterOptions,
} from "../components/FriendlyFilterBottomSheet";
import {
  FriendlyMatch,
  FriendlyMatchCard,
} from "../components/FriendlyMatchCard";
import { HorizontalDateScroll } from "../components/HorizontalDateScroll";

const { width } = Dimensions.get("window");
// Cache key for friendly match summary
const FRIENDLY_SUMMARY_CACHE_KEY = "friendly_matches_summary";

interface FriendlyScreenProps {
  sport: "pickleball" | "tennis" | "padel";
}

export const FriendlyScreen: React.FC<FriendlyScreenProps> = ({ sport }) => {
  const { data: session } = useSession();
  const sportType: SportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);

  const [matches, setMatches] = useState<FriendlyMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const hasInitializedRef = useRef(false);

  // Filter state
  const [filters, setFilters] = useState<FriendlyFilterOptions>({
    status: "all",
    gameType: null,
    skillLevels: [],
  });
  // Default to today's date
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const filterBottomSheetRef = useRef<FriendlyFilterBottomSheetRef>(null);

  // Entry animation values - start visible (opacity 1) to avoid blank screen issues
  const contentEntryOpacity = useRef(new Animated.Value(1)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(0)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Check if there's new content by comparing summary with cache
  const checkForNewContent = useCallback(async (): Promise<boolean> => {
    if (!session?.user?.id) return false;

    try {
      const response = await authenticatedFetch(
        `/api/friendly/summary?sport=${sportType}`,
      );

      if (!response.ok) return true;

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
      console.error("Error checking for new friendly content:", error);
      return true; // On error, assume new content to be safe
    }
  }, [session?.user?.id, sportType]);

  const fetchFriendlyMatches = useCallback(
    async (isManualRefresh = false) => {
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
          page: "1",
          limit: "100",
        };

        if (selectedDate) {
          // Set start date to beginning of selected day
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          params.fromDate = startOfDay.toISOString();

          // Set end date to end of same day
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          params.toDate = endOfDay.toISOString();
        }

        // Add skill level filter if any are selected
        if (filters.skillLevels.length > 0) {
          params.skillLevels = filters.skillLevels;
        }

        const response = await axiosInstance.get(endpoints.friendly.getAll, {
          params,
        });
        const data = response.data?.data || response.data;
        const matchesData = data?.matches || data || [];

        setMatches(Array.isArray(matchesData) ? matchesData : []);
      } catch (error: any) {
        console.error("Error fetching friendly matches:", error);
        toast.error("Failed to load friendly matches");
        setMatches([]);
      } finally {
        setRefreshing(false);
        setShowSkeleton(false);
      }
    },
    [sportType, selectedDate, filters.skillLevels, checkForNewContent],
  );

  // Refresh matches when screen comes into focus (e.g., after creating a match)
  useFocusEffect(
    useCallback(() => {
      fetchFriendlyMatches();
    }, [fetchFriendlyMatches]),
  );

  // Reset animation values when skeleton starts showing
  useEffect(() => {
    if (showSkeleton) {
      contentEntryOpacity.setValue(0);
      contentEntryTranslateY.setValue(30);
      hasPlayedEntryAnimation.current = false;
    }
  }, [showSkeleton, contentEntryOpacity, contentEntryTranslateY]);

  // Entry animation effect - trigger when skeleton finishes
  useEffect(() => {
    if (
      !showSkeleton &&
      !hasPlayedEntryAnimation.current &&
      hasInitializedRef.current
    ) {
      // Only animate if we were showing skeleton before
      hasPlayedEntryAnimation.current = true;
      Animated.parallel([
        Animated.spring(contentEntryOpacity, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(contentEntryTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSkeleton, contentEntryOpacity, contentEntryTranslateY]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFriendlyMatches(true); // Manual refresh - don't show skeleton
  }, [fetchFriendlyMatches]);

  // Filter matches based on filters and selected date
  const filteredMatches = useMemo(() => {
    let filtered = [...matches];

    // Filter by status (open/full)
    if (filters.status === "open") {
      filtered = filtered.filter((match) => {
        const requiredParticipants = match.matchType === "DOUBLES" ? 4 : 2;
        const activeParticipants =
          match.participants?.filter(
            (p) =>
              !p.invitationStatus ||
              p.invitationStatus === "ACCEPTED" ||
              p.invitationStatus === "PENDING",
          ) || [];
        return activeParticipants.length < requiredParticipants;
      });
    } else if (filters.status === "full") {
      filtered = filtered.filter((match) => {
        const requiredParticipants = match.matchType === "DOUBLES" ? 4 : 2;
        const activeParticipants =
          match.participants?.filter(
            (p) =>
              !p.invitationStatus ||
              p.invitationStatus === "ACCEPTED" ||
              p.invitationStatus === "PENDING",
          ) || [];
        return activeParticipants.length >= requiredParticipants;
      });
    }

    // Filter by game type (singles/doubles)
    if (filters.gameType) {
      filtered = filtered.filter(
        (match) => match.matchType === filters.gameType,
      );
    }

    // Filter by skill level (match if any selected level overlaps with match's skill levels)
    if (filters.skillLevels.length > 0) {
      filtered = filtered.filter((match) => {
        // If match has no skill levels defined, don't include it when filtering
        if (!match.skillLevels || match.skillLevels.length === 0) {
          return false;
        }
        // Include match if any of the selected skill levels match the match's skill levels
        return filters.skillLevels.some((level) =>
          match.skillLevels?.includes(level),
        );
      });
    }

    // Future matches first (ascending), then past matches (most recent first)
    const nowMs = Date.now();
    const futureMatches = filtered
      .filter(
        (m) => new Date(m.scheduledTime || m.matchDate || 0).getTime() >= nowMs,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledTime || a.matchDate || 0).getTime() -
          new Date(b.scheduledTime || b.matchDate || 0).getTime(),
      );
    const pastMatches = filtered
      .filter(
        (m) => new Date(m.scheduledTime || m.matchDate || 0).getTime() < nowMs,
      )
      .sort(
        (a, b) =>
          new Date(b.scheduledTime || b.matchDate || 0).getTime() -
          new Date(a.scheduledTime || a.matchDate || 0).getTime(),
      );
    filtered = [...futureMatches, ...pastMatches];

    return filtered;
  }, [matches, filters]);

  // Group matches by date
  const groupedMatches = React.useMemo(() => {
    const grouped: { [key: string]: FriendlyMatch[] } = {};

    filteredMatches.forEach((match) => {
      const dateString = match.scheduledTime || match.matchDate;
      if (!dateString) return;

      const date = new Date(dateString);
      const dateKey = format(date, "EEEE, d MMMM yyyy");

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
      pathname: "/match/match-details" as any,
      params: {
        matchId: match.id,
        matchType: match.matchType,
        date: format(startDate, "MMM dd, yyyy"),
        time: `${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`,
        location: match.location || match.venue || "TBD",
        sportType: sport,
        leagueName: "Friendly Match",
        season: "",
        division: "",
        status: match.status,
        participants: JSON.stringify(match.participants || []),
        divisionId: "",
        seasonId: "",
        fee: match.fee || "FREE",
        feeAmount: String(match.feeAmount || "0.00"),
        description: match.notes || match.description || "",
        courtBooked: match.courtBooked ? "true" : "false",
        isFriendly: "true",
        duration: String(duration),
        genderRestriction: match.genderRestriction || "",
        skillLevels: JSON.stringify(match.skillLevels || []),
      },
    });
  };

  const handleFilterApply = (newFilters: FriendlyFilterOptions) => {
    setFilters(newFilters);
  };

  const handleFilterButtonPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    filterBottomSheetRef.current?.present();
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== "all" ||
      filters.gameType !== null ||
      filters.skillLevels.length > 0 ||
      selectedDate !== null
    );
  }, [filters, selectedDate]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No friendly matches found</Text>
      <Text style={styles.emptyDescription}>
        {hasActiveFilters
          ? "Try adjusting your filters"
          : "Be the first to create a friendly match!"}
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
          <FriendlyMatchCard
            key={match.id}
            match={match}
            onPress={handleMatchPress}
            isPast={
              new Date(match.scheduledTime || match.matchDate || 0) < new Date()
            }
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View
        style={[
          styles.headerSection,
          {
            borderBottomColor: sportColors.background + "20",
            paddingHorizontal: 0,
            paddingTop: 0,
            paddingBottom: 0,
            backgroundColor: "transparent",
            borderBottomWidth: 0,
          },
        ]}
      >
        <LinearGradient
          colors={[
            "#FFFFFF",
            `${sportColors.background}79`,
            sportColors.background,
          ]}
          style={styles.headerGradient}
        >
          <View style={[styles.headerGradient, { paddingHorizontal: 16 }]}>
            {/* Header Title */}
            <Text style={styles.headerTitle}>Friendly Matches</Text>

            {/* Row: Filter | Dates */}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[
                  styles.filterButtonContainer,
                  hasActiveFilters && {
                    backgroundColor: "transparent",
                    borderColor: sportColors.background,
                  },
                ]}
                onPress={handleFilterButtonPress}
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={hasActiveFilters ? "#FFFFFF" : "#6B7280"}
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <View style={styles.dateScrollContainer}>
                <HorizontalDateScroll
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  sportColor={sportColors.background}
                />
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        {/* Matches List - Animated */}
        <Animated.View
          style={[
            styles.matchListWrapper,
            {
              opacity: contentEntryOpacity,
              transform: [{ translateY: contentEntryTranslateY }],
            },
          ]}
        >
          {showSkeleton ? (
            <View style={{ flex: 1 }} key="skeleton-view">
              <MatchCardSkeleton count={4} />
            </View>
          ) : Object.keys(groupedMatches).length === 0 ? (
            <View style={{ flex: 1 }} key="empty-view">
              {renderEmptyState()}
            </View>
          ) : (
            <View style={{ flex: 1 }} key="list-view">
              <FlatList
                data={Object.entries(groupedMatches)}
                keyExtractor={([dateKey]) => dateKey}
                renderItem={({ item: [dateKey, dateMatches] }) =>
                  renderMatchGroup(dateKey, dateMatches)
                }
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
            </View>
          )}
        </Animated.View>
      </View>

      {/* Create Match FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: sportColors.background }]}
        onPress={() =>
          router.push({
            pathname: "/friendly/create",
            params: { sportType: sport },
          })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Filter Bottom Sheet */}
      <FriendlyFilterBottomSheet
        ref={filterBottomSheetRef}
        onClose={() => {}}
        onApply={handleFilterApply}
        currentFilters={filters}
        sportColor={sportColors.background}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 25,
    paddingBottom: 25,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",

    gap: 12,
  },
  filterButtonContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#181818",
    position: "relative",
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#3b3b3b",
    marginHorizontal: 12,
  },
  dateScrollContainer: {
    flex: 1,
    justifyContent: "center",
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
    paddingTop: 20,
    zIndex: 1,
  },
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerLeftColumn: {
    flex: 1,
    justifyContent: "flex-start",
  },
  headerRightColumn: {
    width: "50%",
    alignItems: "flex-end",
    gap: 12,
  },
  headerDateSection: {
    width: "100%",
    gap: 8,
  },
  headerDateScrollWrapper: {
    width: "100%",
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 16,
  },
  headerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  headerRight: {
    flex: 1,
    gap: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    // backgroundColor: "#F3F4F6",
    gap: 8,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dateContainer: {
    gap: 8,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: "center",
  },
  headerContent: {
    alignItems: "center",
  },
  matchListWrapper: {
    flex: 1,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    marginBottom: 16,
    gap: 12,
    overflow: "hidden",
  },
  filterButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    // borderColor: "#E5E7EB",
    gap: 4,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  dateDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D1D5DB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  //  headerGradient: {
  //   paddingTop: 20,
  //   paddingBottom: 16,
  //   paddingHorizontal: 0,
  // },
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default FriendlyScreen;
