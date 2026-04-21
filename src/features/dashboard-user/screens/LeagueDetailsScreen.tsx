import BackButtonIcon from "@/assets/icons/back-button.svg";
import LeagueInfoIcon from "@/assets/icons/league-info.svg";
import LeagueInfoIcon2 from "@/assets/icons/league-info2.svg";
import CalendarMinusIcon from "@/assets/icons/season-details/calendar-minus.svg";
import CalendarIcon from "@/assets/icons/season-details/calendar.svg";
import { useActivePartnership } from "@/features/pairing/hooks";
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { NavBar } from "@/shared/components/layout";
import { SportSwitcher } from "@/shared/components/ui/SportSwitcher";
import { SeasonCardSkeleton } from "@/src/components/SeasonCardSkeleton";
import { theme } from "@/src/core/theme/theme";
import { useUnreadCount } from "@/src/features/chat/hooks/useUnreadCount";
import {
  Category,
  CategoryService,
} from "@/src/features/dashboard-user/services/CategoryService";
import {
  Season,
  SeasonService,
} from "@/src/features/dashboard-user/services/SeasonService";
import {
  WaitlistService,
  WaitlistStatus,
} from "@/src/features/dashboard-user/services/WaitlistService";
import { useMyGamesStore } from "@/src/features/dashboard-user/stores/MyGamesStore";
import { useUserPartnerships } from "@/src/features/pairing/hooks/useUserPartnerships";
import { FiuuPaymentService } from "@/src/features/payments/services/FiuuPaymentService";
import {
  LeaveWaitlistDialog,
  RegisterInterestBottomSheet,
  WaitlistBottomSheet,
} from "@/src/features/waitlist/components";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { PaymentOptionsBottomSheet } from "../components";
import { useLeagueData } from "../hooks/useLeagueData";
import { useSeasonSelection } from "../hooks/useSeasonSelection";
import { useUserProfile } from "../hooks/useUserProfile";
import { normalizeCategoriesFromSeason } from "../utils/categoryNormalization";
import { formatEntryFee } from "../utils/formatEntryFee";
import {
  checkQuestionnaireStatus,
  getSeasonSport,
} from "../utils/questionnaireCheck";

const { width } = Dimensions.get("window");

const LEAGUE_SEASONS_CACHE_KEY_PREFIX = "league_seasons_summary_";

const isSmallScreen = width < 375;
const isTablet = width > 768;
const isLargeTablet = width >= 1024;

interface LeagueDetailsScreenProps {
  leagueId: string;
  leagueName?: string;
  sport?: "pickleball" | "tennis" | "padel";
}

export default function LeagueDetailsScreen({
  leagueId,
  leagueName = "League",
  sport = "pickleball",
}: LeagueDetailsScreenProps) {
  const { data: session } = useSession();
  const chatUnreadCount = useUnreadCount();
  const { pendingInviteCount: myGamesBadgeCount } = useMyGamesStore();
  const [activeTab, setActiveTab] = React.useState(2);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [selectedSport, setSelectedSport] = React.useState<
    "pickleball" | "tennis" | "padel"
  >("pickleball");
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [showSeasonsSkeleton, setShowSeasonsSkeleton] = React.useState(false);
  const [showRulesModal, setShowRulesModal] = React.useState(false);
  const [waitlistStatuses, setWaitlistStatuses] = React.useState<
    Map<string, WaitlistStatus>
  >(new Map());
  const [isJoiningWaitlist, setIsJoiningWaitlist] = React.useState<
    string | null
  >(null);
  const [waitlistBottomSheetSeasonId, setWaitlistBottomSheetSeasonId] =
    React.useState<string | null>(null);
  const [leaveWaitlistDialogSeasonId, setLeaveWaitlistDialogSeasonId] =
    React.useState<string | null>(null);
  const [
    registerInterestBottomSheetSeasonId,
    setRegisterInterestBottomSheetSeasonId,
  ] = React.useState<string | null>(null);
  const hasInitializedSeasonsRef = React.useRef(false);
  const isManualRefreshRef = React.useRef(false);
  const insets = useSafeAreaInsets();
  const STATUS_BAR_HEIGHT = insets.top;

  const userId = session?.user?.id;

  // Track user's registered season IDs (fetched from membership API)
  const [userRegisteredSeasonIds, setUserRegisteredSeasonIds] = React.useState<
    Set<string>
  >(new Set());

  // Use custom hook for user profile and gender management
  const { profileData, userGender, fetchProfileData, fetchUserGender } =
    useUserProfile(userId);

  // Helper function to check if a category is visible - all categories are now visible to all users
  const isCategoryVisibleToUser = React.useCallback(
    (category: any): boolean => {
      return category !== null && category !== undefined;
    },
    [],
  );

  // Helper function to check if user can JOIN a category based on gender restrictions
  const canUserJoinCategory = React.useCallback(
    (category: any): boolean => {
      if (!category) return false;

      const genderCategory =
        category.gender_category?.toUpperCase() ||
        category.genderCategory?.toUpperCase();
      const genderRestriction = category.genderRestriction?.toUpperCase();
      const categoryGender = genderCategory || genderRestriction;
      const isDoubles =
        CategoryService.getEffectiveGameType(category, "SINGLES") === "DOUBLES";

      // If user gender is not yet loaded, allow joining (will be validated on backend)
      if (!userGender) {
        return true;
      }

      const normalizedUserGender = userGender.toUpperCase();

      // OPEN categories allow all genders - check this FIRST
      if (categoryGender === "OPEN") {
        return true;
      }

      if (normalizedUserGender === "FEMALE") {
        if (categoryGender === "FEMALE" || categoryGender === "WOMEN")
          return true;
        if (categoryGender === "MIXED" && isDoubles) return true;
        return false;
      }

      if (normalizedUserGender === "MALE") {
        if (categoryGender === "MALE" || categoryGender === "MEN") return true;
        if (categoryGender === "MIXED" && isDoubles) return true;
        return false;
      }

      return false;
    },
    [userGender],
  );

  // Use custom hook for league data management
  const { league, seasons, categories, isLoading, error, fetchAllData } =
    useLeagueData(leagueId, userGender, isCategoryVisibleToUser);

  // Sorted categories: Open Singles → User gender Singles → User gender Doubles → Mixed Doubles → Restricted Singles 🔒 → Restricted Doubles 🔒
  // Computed BEFORE useSeasonSelection so the hook uses the sorted order for the default pill selection
  const sortedCategories = React.useMemo(() => {
    const getCategoryOrder = (category: any): number => {
      const genderCategory =
        category.gender_category?.toUpperCase() ||
        category.genderCategory?.toUpperCase();
      const genderRestriction = category.genderRestriction?.toUpperCase();
      const categoryGender = genderCategory || genderRestriction;
      const isDoubles =
        CategoryService.getEffectiveGameType(category, "SINGLES") === "DOUBLES";
      const g = userGender?.toUpperCase();

      if (categoryGender === "OPEN" && !isDoubles) return 0; // Open Singles
      if (categoryGender === "OPEN" && isDoubles) return 0.5; // Open Doubles

      if (g) {
        const isUserGender =
          (g === "MALE" &&
            (categoryGender === "MALE" || categoryGender === "MEN")) ||
          (g === "FEMALE" &&
            (categoryGender === "FEMALE" || categoryGender === "WOMEN"));
        if (isUserGender && !isDoubles) return 1; // User's gender Singles
        if (isUserGender && isDoubles) return 2; // User's gender Doubles
        if (categoryGender === "MIXED" && isDoubles) return 3; // Mixed Doubles
        if (!isDoubles) return 4; // Restricted Singles 🔒
        return 5; // Restricted Doubles 🔒
      }
      if (categoryGender === "MIXED") return 3;
      return isDoubles ? 5 : 4;
    };
    return [...categories]
      .filter((category) => Boolean(category?.id))
      .sort((a, b) => getCategoryOrder(a) - getCategoryOrder(b));
  }, [categories, userGender]);

  // Use custom hook for season selection management (pass sortedCategories so default pill = Open Singles)
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSeason,
    setSelectedSeason,
  } = useSeasonSelection(sortedCategories);

  // Use custom hook for user partnerships management
  const { partnerships, loading: partnershipsLoading } =
    useUserPartnerships(userId);

  // Animated scroll value for collapsing header (using reanimated for native thread performance)
  const scrollY = useSharedValue(0);

  // Entry animation values (using reanimated for consistency)
  const headerEntryOpacity = useSharedValue(0);
  const headerEntryTranslateY = useSharedValue(-20);
  const infoCardEntryOpacity = useSharedValue(0);
  const infoCardEntryTranslateY = useSharedValue(30);
  const categoriesEntryOpacity = useSharedValue(0);
  const categoriesEntryTranslateY = useSharedValue(30);
  const seasonsEntryOpacity = useSharedValue(0);
  const seasonsEntryTranslateY = useSharedValue(30);

  // Reset entry animations to hidden state when loading starts or when navigating to different league/sport
  // This ensures animations play fresh each time data loads
  React.useEffect(() => {
    if (isLoading) {
      headerEntryOpacity.value = 0;
      headerEntryTranslateY.value = -20;
      infoCardEntryOpacity.value = 0;
      infoCardEntryTranslateY.value = 30;
      categoriesEntryOpacity.value = 0;
      categoriesEntryTranslateY.value = 30;
      seasonsEntryOpacity.value = 0;
      seasonsEntryTranslateY.value = 30;
    }
  }, [isLoading]);

  // Constants for header animation
  const TOP_HEADER_HEIGHT =
    STATUS_BAR_HEIGHT + (isSmallScreen ? 36 : isTablet ? 44 : 40);
  const HEADER_MAX_HEIGHT = 180; // Full header height
  const HEADER_MIN_HEIGHT = 80; // Collapsed header height
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const COLLAPSE_START_THRESHOLD = 40; // Start collapsing after scrolling 50px
  const COLLAPSE_END_THRESHOLD =
    COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE; // End of collapse range

  // Set selected sport based on route param
  React.useEffect(() => {
    setSelectedSport(sport);
  }, [sport]);

  React.useEffect(() => {
    if (!showPaymentOptions) {
      setIsProcessingPayment(false);
    }
  }, [showPaymentOptions]);

  // Fetch all data on mount - trigger when dependencies change
  React.useEffect(() => {
    if (leagueId && userGender !== undefined) {
      fetchAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, userGender]); // fetchAllData omitted to break circular dependency

  // Function to fetch user's registered season IDs
  const fetchUserRegisteredSeasons = React.useCallback(async () => {
    if (!userId) {
      // console.log("🔍 LeagueDetails: No userId, skipping membership fetch");
      return;
    }
    try {
      // console.log(
      //   "🔍 LeagueDetails: Fetching memberships from /api/season/membership/me",
      // );
      const response = await axiosInstance.get("/api/season/membership/me");
      // console.log(
      //   "🔍 LeagueDetails: Raw response:",
      //   JSON.stringify(response.data, null, 2),
      // );

      // Parse the response - backend returns { success: true, data: [...] }
      let memberships: any[] = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
        memberships = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        memberships = response.data;
      } else if (Array.isArray(response)) {
        memberships = response;
      }

      console.log("🔍 LeagueDetails: Parsed memberships:", memberships.length);
      const seasonIds = new Set<string>(
        memberships.map((m: any) => m.seasonId).filter(Boolean),
      );
      console.log(
        "🔍 LeagueDetails: Season IDs user is registered for:",
        Array.from(seasonIds),
      );
      setUserRegisteredSeasonIds(seasonIds);
    } catch (error) {
      console.error(
        "❌ LeagueDetails: Error fetching user memberships:",
        error,
      );
    }
  }, [userId]);

  // Fetch user's registered season IDs on mount
  React.useEffect(() => {
    console.log(
      "🔍 LeagueDetails: useEffect for fetchUserRegisteredSeasons triggered",
    );
    fetchUserRegisteredSeasons();
  }, [fetchUserRegisteredSeasons]);

  const filterCategoriesByGender = (
    categories: Category[],
    userGender: string | null,
  ): Category[] => {
    return categories.filter((category) => isCategoryVisibleToUser(category));
  };

  // Smart skeleton: Update cache with current seasons summary
  const updateSeasonsCache = React.useCallback(async () => {
    if (!leagueId || seasons.length === 0) return;

    try {
      const cacheKey = `${LEAGUE_SEASONS_CACHE_KEY_PREFIX}${leagueId}`;
      const newSummary = {
        count: seasons.length,
        seasonIds: seasons
          .map((s) => s.id)
          .sort()
          .join(","),
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(newSummary));
    } catch (error) {
      console.error("Error updating seasons cache:", error);
    }
  }, [leagueId, seasons]);

  // Smart skeleton: Control skeleton display based on loading state and cache
  React.useEffect(() => {
    let isMounted = true;

    const handleSkeletonDisplay = async () => {
      try {
        // Skip skeleton logic during manual refresh
        if (isManualRefreshRef.current) return;

        // Only trigger skeleton on first load when we haven't initialized yet
        if (isLoading && !hasInitializedSeasonsRef.current) {
          // First load ever - check if we have cached data
          const cacheKey = `${LEAGUE_SEASONS_CACHE_KEY_PREFIX}${leagueId}`;
          const cachedSummaryStr = await AsyncStorage.getItem(cacheKey);

          if (!isMounted) return;

          if (!cachedSummaryStr) {
            // No cache = truly first time, show skeleton
            setShowSeasonsSkeleton(true);
          }

          hasInitializedSeasonsRef.current = true;
        } else if (!isLoading && seasons.length > 0) {
          if (!isMounted) return;
          // Data loaded - hide skeleton and update cache
          setShowSeasonsSkeleton(false);
          await updateSeasonsCache();
        } else if (!isLoading && seasons.length === 0 && !error) {
          if (!isMounted) return;
          // No seasons but no error - hide skeleton
          setShowSeasonsSkeleton(false);
        }
      } catch (error) {
        console.error("Error in skeleton display logic:", error);
        if (isMounted) {
          setShowSeasonsSkeleton(false); // Fail gracefully
        }
      }
    };

    handleSkeletonDisplay();

    return () => {
      isMounted = false;
    };
  }, [isLoading, seasons, leagueId, error, updateSeasonsCache]);

  // Fetch waitlist statuses for upcoming and register-interest seasons
  React.useEffect(() => {
    const fetchWaitlistStatuses = async () => {
      console.log(
        "[Waitlist:League] fetchWaitlistStatuses called, seasons:",
        seasons?.length,
      );
      if (!seasons || seasons.length === 0) return;

      const relevantSeasons = seasons.filter(
        (s) => s.status === "UPCOMING" || s.status === "REGISTER_INTEREST",
      );
      console.log(
        "[Waitlist:League] Relevant seasons:",
        relevantSeasons.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        })),
      );
      if (relevantSeasons.length === 0) return;

      const statusMap = new Map<string, WaitlistStatus>();

      await Promise.all(
        relevantSeasons.map(async (season) => {
          try {
            console.log(
              "[Waitlist:League] Fetching status for season:",
              season.id,
            );
            const status = await WaitlistService.getStatus(season.id);
            console.log(
              "[Waitlist:League] Status for",
              season.name,
              ":",
              status,
            );
            statusMap.set(season.id, status);
          } catch (err) {
            console.error(
              `[Waitlist:League] Error fetching waitlist status for season ${season.id}:`,
              err,
            );
          }
        }),
      );

      console.log(
        "[Waitlist:League] Setting waitlistStatuses, count:",
        statusMap.size,
      );
      setWaitlistStatuses(statusMap);
    };

    fetchWaitlistStatuses();
  }, [seasons]);

  // Entry animations - trigger staggered fade-in and slide-up when content loads
  // Using reanimated for smooth native thread animations
  // Runs whenever data becomes ready - animations will only visually play if values aren't already at target
  React.useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (!isLoading && !error && league) {
      const springConfig = { damping: 15, stiffness: 100, mass: 0.8 };
      const staggerDelay = 80;

      // Header animation (immediate)
      headerEntryOpacity.value = withSpring(1, springConfig);
      headerEntryTranslateY.value = withSpring(0, springConfig);

      // Info card animation (delayed by 80ms)
      timeouts.push(
        setTimeout(() => {
          infoCardEntryOpacity.value = withSpring(1, springConfig);
          infoCardEntryTranslateY.value = withSpring(0, springConfig);
        }, staggerDelay),
      );

      // Categories animation (delayed by 160ms)
      timeouts.push(
        setTimeout(() => {
          categoriesEntryOpacity.value = withSpring(1, springConfig);
          categoriesEntryTranslateY.value = withSpring(0, springConfig);
        }, staggerDelay * 2),
      );

      // Seasons animation (delayed by 240ms)
      timeouts.push(
        setTimeout(() => {
          seasonsEntryOpacity.value = withSpring(1, springConfig);
          seasonsEntryTranslateY.value = withSpring(0, springConfig);
        }, staggerDelay * 3),
      );
    }

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [isLoading, error, league]);

  const handleTabPress = (tabIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabIndex);

    // Navigate based on tab index
    // Tab indices: 0=Connect, 1=Friendly, 2=Leagues, 3=My Games, 4=Chat
    if (tabIndex === 0) {
      // Navigate to Connect
      router.push({
        pathname: "/user-dashboard" as any,
        params: { view: "connect", sport: selectedSport },
      });
    } else if (tabIndex === 1) {
      // Navigate to Friendly
      router.push({
        pathname: "/user-dashboard" as any,
        params: { view: "friendly", sport: selectedSport },
      });
    } else if (tabIndex === 2) {
      // Navigate to Leagues (main dashboard)
      router.push({
        pathname: "/user-dashboard" as any,
        params: { view: "dashboard", sport: selectedSport },
      });
    } else if (tabIndex === 3) {
      // Navigate to My Games
      router.push({
        pathname: "/user-dashboard" as any,
        params: { view: "myGames", sport: selectedSport },
      });
    } else if (tabIndex === 4) {
      // Navigate to Chat
      router.push({
        pathname: "/user-dashboard" as any,
        params: { view: "chat", sport: selectedSport },
      });
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategoryId(categoryId);
  };

  const handleRegisterPress = (season: Season) => {
    // Determine the season's sport type
    const seasonSport = getSeasonSport(season) || sport || "pickleball";

    // Check if user has completed questionnaire for this sport
    if (profileData) {
      const questionnaireStatus = checkQuestionnaireStatus(
        profileData,
        seasonSport,
      );

      if (
        !questionnaireStatus.hasSelectedSport ||
        !questionnaireStatus.hasCompletedQuestionnaire
      ) {
        // User hasn't selected/completed questionnaire for this sport
        // Navigate to complete questionnaire screen
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: "/user-dashboard/complete-questionnaire" as any,
          params: {
            sport: seasonSport,
            seasonId: season.id,
            leagueId: leagueId || "",
            returnPath: "league-details",
          },
        });
        return;
      }
    }

    // Check if this is a doubles season by checking category name
    const normalizedCategories = normalizeCategoriesFromSeason(season);
    const isDoublesSeason = normalizedCategories.some(
      (cat) =>
        cat?.name?.toLowerCase().includes("doubles") ||
        cat?.matchFormat?.toLowerCase().includes("doubles") ||
        (cat as any)?.game_type === "DOUBLES",
    );

    if (isDoublesSeason) {
      // Navigate to doubles team pairing screen
      router.push({
        pathname: "/user-dashboard/doubles-team-pairing" as any,
        params: {
          seasonId: season.id,
          seasonName: season.name,
          leagueId: leagueId,
          sport: seasonSport,
        },
      });
    } else {
      // Check if payment is required for this season
      const isFreeEntry =
        !season.paymentRequired || !season.entryFee || season.entryFee === 0;

      if (isFreeEntry) {
        // Free season - register directly without payment flow
        handlePayLater(season);
      } else {
        // Paid season - show payment options
        setSelectedSeason(season);
        setShowPaymentOptions(true);
      }
    }
  };

  const handleRegisterInterestPress = (seasonId: string) => {
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentStatus = waitlistStatuses.get(seasonId);
    if (currentStatus?.isWaitlisted) {
      setLeaveWaitlistDialogSeasonId(seasonId);
      return;
    }
    setRegisterInterestBottomSheetSeasonId(seasonId);
  };

  const handleConfirmRegisterInterest = async (seasonId: string) => {
    try {
      setIsJoiningWaitlist(seasonId);
      const result = await WaitlistService.joinWaitlist(seasonId);
      if (result.success) {
        toast.success(`You've registered interest!`);
        const status = await WaitlistService.getStatus(seasonId);
        setWaitlistStatuses((prev) => new Map(prev).set(seasonId, status));
        setRegisterInterestBottomSheetSeasonId(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to register interest");
    } finally {
      setIsJoiningWaitlist(null);
    }
  };

  const handleJoinWaitlistPress = (seasonId: string) => {
    console.log("[Waitlist:League] handleJoinWaitlistPress called:", {
      seasonId,
      userId,
    });
    if (!userId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentStatus = waitlistStatuses.get(seasonId);
    console.log("[Waitlist:League] Current status for season:", currentStatus);

    // If already on waitlist, show leave confirmation dialog
    if (currentStatus?.isWaitlisted) {
      console.log("[Waitlist:League] User on waitlist, showing leave dialog");
      setLeaveWaitlistDialogSeasonId(seasonId);
      return;
    }

    // Show join waitlist bottom sheet
    console.log("[Waitlist:League] Showing join bottom sheet");
    setWaitlistBottomSheetSeasonId(seasonId);
  };

  const handleConfirmJoinWaitlist = async (seasonId: string) => {
    console.log(
      "[Waitlist:League] handleConfirmJoinWaitlist called:",
      seasonId,
    );
    try {
      setIsJoiningWaitlist(seasonId);
      const result = await WaitlistService.joinWaitlist(seasonId);
      console.log("[Waitlist:League] Join result:", result);

      if (result.success) {
        toast.success(`You're #${result.position} on the waitlist!`);
        // Refresh waitlist status
        const status = await WaitlistService.getStatus(seasonId);
        console.log("[Waitlist:League] Updated status:", status);
        setWaitlistStatuses((prev) => new Map(prev).set(seasonId, status));
        setWaitlistBottomSheetSeasonId(null);
      }
    } catch (err: any) {
      console.error("[Waitlist:League] Error joining:", err);
      toast.error(err.message || "Failed to join waitlist");
    } finally {
      setIsJoiningWaitlist(null);
    }
  };

  const handleLeaveWaitlist = async (seasonId: string) => {
    console.log("[Waitlist:League] handleLeaveWaitlist called:", seasonId);
    try {
      setIsJoiningWaitlist(seasonId);
      const result = await WaitlistService.leaveWaitlist(seasonId);
      console.log("[Waitlist:League] Leave result:", result);

      if (result.success) {
        toast.success("You have left the waitlist");
        // Refresh to get latest status
        const status = await WaitlistService.getStatus(seasonId);
        console.log("[Waitlist:League] Updated status:", status);
        setWaitlistStatuses((prev) => new Map(prev).set(seasonId, status));
        setLeaveWaitlistDialogSeasonId(null);
      }
    } catch (err: any) {
      console.error("[Waitlist:League] Error leaving:", err);
      toast.error(err.message || "Failed to leave waitlist");
    } finally {
      setIsJoiningWaitlist(null);
    }
  };

  // Helper to convert Date | string | undefined to string for router params
  const dateToParamString = (
    date: string | Date | undefined,
  ): string | undefined => {
    if (!date) return undefined;
    if (typeof date === "string") return date;
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

  const handleViewStandingsPress = (season: Season) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Get category info for display
    const normalizedCategories = normalizeCategoriesFromSeason(season);
    const seasonCategory =
      normalizedCategories && normalizedCategories.length > 0
        ? normalizedCategories[0]
        : null;
    const categoryDisplayName = seasonCategory ? seasonCategory.name || "" : "";

    router.push({
      pathname: "/standings" as any,
      params: {
        seasonId: season.id,
        seasonName: season.name,
        leagueId: leagueId,
        leagueName: league?.name || leagueName,
        categoryName: categoryDisplayName,
        sportType: selectedSport?.toUpperCase() || "PICKLEBALL",
        startDate: dateToParamString(season.startDate),
        endDate: dateToParamString(season.endDate),
      },
    });
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
    setSelectedSeason(null);
  };

  const handlePayNow = async (season: Season) => {
    if (!userId) {
      toast.error("You must be logged in to continue");
      return;
    }

    if (isProcessingPayment) return;

    try {
      setIsProcessingPayment(true);
      console.log("Starting FIUU payment for season:", season.id);
      const checkout = await FiuuPaymentService.createCheckout(
        season.id,
        userId,
      );
      const payload = encodeURIComponent(
        JSON.stringify({
          ...checkout,
          returnTo: {
            pathname: "/user-dashboard/league-details",
            params: {
              leagueId: leagueId,
              leagueName: league?.name || leagueName,
              sport: sport || "pickleball",
            },
            dismissCount: 1, // Go back 1 screen: fiuu-checkout -> league-details
          },
        }),
      );

      // Close payment options sheet before navigating
      setShowPaymentOptions(false);

      router.push({
        pathname: "/payments/fiuu-checkout",
        params: { payload },
      });
    } catch (error: any) {
      console.error("Error launching FIUU payment:", error);
      const message =
        error?.message || "Unable to start payment. Please try again.";
      toast.error(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayLater = async (season: Season) => {
    if (!userId) {
      toast.error("You must be logged in to register");
      return;
    }

    if (!SeasonService.isRegistrationOpen(season)) {
      toast.error("Registration deadline has passed for this season");
      return;
    }

    try {
      console.log("Registering user for season (Pay Later):", season.id);
      const success = await SeasonService.registerForSeason(
        season.id,
        userId,
        true,
      );

      if (success) {
        console.log("User registered successfully");
        toast.success("Registered successfully!");
        fetchAllData(); // Refresh data
      } else {
        console.warn("Registration failed");
        toast.error("Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Error registering:", err);
      toast.error("An error occurred while registering.");
    }
  };

  // Get filtered seasons for selected category (no longer filtered by gender - all users see all seasons)
  const getFilteredSeasons = () => {
    let filtered = seasons;

    // Only filter out seasons with no categories
    filtered = filtered.filter((season) => {
      const normalizedCategories = normalizeCategoriesFromSeason(season);
      const hasCategories =
        normalizedCategories && normalizedCategories.length > 0;

      if (!hasCategories) {
        console.log(
          `   Filtering out season ${season.id} (${season.name}) - no categories`,
        );
      }

      return hasCategories;
    });

    // Filter by selected category if one is selected
    if (selectedCategoryId) {
      filtered = filtered.filter((season) => {
        const normalizedCategories = normalizeCategoriesFromSeason(season);
        const seasonCategoryIds = normalizedCategories
          .map((c) => c?.id)
          .filter(Boolean);
        const matches = seasonCategoryIds.includes(selectedCategoryId);

        // console.log(`   Season ${season.name} categories:`, seasonCategoryIds, 'matches selected:', matches);

        return matches;
      });
    }
    return filtered;
  };

  // Get current selected category
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId,
  );
  const isDoublesCategory = selectedCategory
    ? CategoryService.getEffectiveGameType(selectedCategory, "SINGLES") ===
      "DOUBLES"
    : false;

  const { partnership } = useActivePartnership(
    isDoublesCategory && selectedSeason ? selectedSeason.id : null,
    userId,
  );

  // Group seasons by status
  const groupedSeasons =
    SeasonService.groupSeasonsByStatus(getFilteredSeasons());
  const currentSeasons = groupedSeasons.active;
  const upcomingSeasons = groupedSeasons.upcoming;
  const registerInterestSeasons = groupedSeasons.registerInterest;
  const pastSeasons = groupedSeasons.finished;

  const formatSeasonDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) {
      return "Date TBD";
    }
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Short date: "25 Feb" (no year)
  const formatShortDate = (date: string | Date): string => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(dateObj.getTime())) return "TBD";
    return dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  const renderSeasonCard = (season: Season) => {
    const entryFee = formatEntryFee(season.entryFee);
    const userMembership = season.memberships?.find(
      (m: any) => m.userId === userId,
    );
    const waitlistStatus = waitlistStatuses.get(season.id);
    // Check both membership data from season AND the separately fetched user memberships
    const isUserRegistered =
      !!userMembership || userRegisteredSeasonIds.has(season.id);

    console.log(
      `🔍 Season ${season.name}: userMembership=${!!userMembership}, inRegisteredIds=${userRegisteredSeasonIds.has(season.id)}, isUserRegistered=${isUserRegistered}`,
    );

    // Get category info
    const normalizedCategories = normalizeCategoriesFromSeason(season);
    const isDoublesSeason = normalizedCategories.some(
      (cat) =>
        cat?.name?.toLowerCase().includes("doubles") ||
        cat?.matchFormat?.toLowerCase().includes("doubles") ||
        (cat as any)?.game_type === "DOUBLES",
    );
    const canJoin = normalizedCategories.some((cat) =>
      canUserJoinCategory(cat),
    );
    const isRegistrationOpen = SeasonService.isRegistrationOpen(season);
    const displayPlayerCount =
      season.status === "UPCOMING"
        ? (waitlistStatus?.totalWaitlisted ??
          season._count?.memberships ??
          season.registeredUserCount ??
          0)
        : (season._count?.memberships ?? season.registeredUserCount ?? 0);
    const isUserInMembershipList = (season.memberships || []).some(
      (m: any) => m.userId === userId,
    );
    const currentUserAvatarUri =
      session?.user?.image ||
      (session?.user as any)?.avatar ||
      (session?.user as any)?.profileImage;
    const currentUserInitial =
      session?.user?.name?.charAt(0)?.toUpperCase() || "U";
    const shouldShowCurrentUserWaitlistAvatar =
      season.status === "UPCOMING" &&
      !!waitlistStatus?.isWaitlisted &&
      !isUserInMembershipList;
    console.log(
      `🔍 Season ${season.name}: isRegistrationOpen=${isRegistrationOpen}, status=${season.status}, regiDeadline=${season.regiDeadline}`,
    );

    // Check if user has partnership for this season
    const hasPartnership = partnerships.has(season.id);
    const partnership = partnerships.get(season.id);
    const showManageTeam =
      isDoublesSeason && hasPartnership && isUserRegistered;
    const seasonCategory =
      normalizedCategories && normalizedCategories.length > 0
        ? normalizedCategories[0]
        : null;
    const categoryDisplayName = seasonCategory ? seasonCategory.name || "" : "";

    // ── Bottom action row builder ──────────────────────────────────────────
    const renderBottomRow = () => {
      // Doubles-specific overrides first
      if (
        isDoublesSeason &&
        userMembership &&
        userMembership.status === "PENDING"
      ) {
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.viewMatchesButton, { backgroundColor: "#FEA04D" }]}
              onPress={() => handleRegisterPress(season)}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Register Team</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (
        isDoublesSeason &&
        userMembership &&
        userMembership.status === "REMOVED"
      ) {
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.viewMatchesButton, { backgroundColor: "#FEA04D" }]}
              onPress={() => handleRegisterPress(season)}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Join Season</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Registered user
      if (isUserRegistered) {
        if (userMembership) {
          const isAssigned = !!userMembership.divisionId;
          if (!isAssigned) {
            // Awaiting division assignment
            return (
              <View style={styles.buttonRow}>
                <View style={styles.divisionPendingPill}>
                  <Text style={styles.divisionPendingPillText}>
                    ⏳ Division assignment pending
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.helpIconButton}
                  onPress={() =>
                    toast.info(
                      "You've registered for this season! You'll be notified once admin assigns you to a division.",
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            );
          }
          // Fully registered + assigned — View Matches (primary) + View Standings (secondary)
          return (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.viewMatchesButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/match/all-matches" as any,
                    params: {
                      divisionId: userMembership.divisionId,
                      sportType: (selectedSport || sport).toUpperCase(),
                      leagueName: league?.name || leagueName,
                      seasonName: season.name,
                      gameType:
                        seasonCategory?.matchFormat ||
                        (seasonCategory as any)?.game_type ||
                        "",
                      genderCategory:
                        seasonCategory?.genderRestriction ||
                        (seasonCategory as any)?.gender_category ||
                        "",
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>View Matches</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleViewStandingsPress(season)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewStandingsLink}>View Standings</Text>
              </TouchableOpacity>
            </View>
          );
        }
        // Registered via registeredSeasonIds but no membership details
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.viewMatchesButton, { backgroundColor: "#9CA3AF" }]}
              onPress={() => toast.info("You are registered for this season.")}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Joined</Text>
            </TouchableOpacity>
          </View>
        );
      }

      // Not registered — ACTIVE season
      if (season.status === "ACTIVE") {
        if (!isRegistrationOpen) {
          // Registration closed — View Standings replaces the grey "Registration Closed" button
          return (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => handleViewStandingsPress(season)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewStandingsLink}>View Standings</Text>
              </TouchableOpacity>
              <Text style={styles.registrationClosedText}>
                Registration{"\n"}closed
              </Text>
            </View>
          );
        }
        // Registration open
        if (!canJoin) {
          // Gender restricted — show lock pill + View Standings link
          return (
            <View style={styles.buttonRow}>
              <View style={styles.genderRestrictedPill}>
                <Ionicons name="lock-closed" size={13} color="#86868B" />
                <Text style={styles.genderRestrictedPillText}>
                  Gender restricted
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleViewStandingsPress(season)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewStandingsLink}>View Standings →</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.viewMatchesButton}
              onPress={() => handleRegisterPress(season)}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Join Season</Text>
            </TouchableOpacity>
            <Text style={styles.registrationOpenText}>
              Registration{"\n"}open
            </Text>
          </View>
        );
      }

      // UPCOMING season
      if (season.status === "UPCOMING") {
        if (!canJoin) {
          return (
            <View style={[styles.buttonRow, styles.centeredButtonRow]}>
              <TouchableOpacity
                style={[
                  styles.viewMatchesButton,
                  styles.compactActionButton,
                  { backgroundColor: "#B2B2B2" },
                ]}
                onPress={() =>
                  toast.info("This season is restricted to a different gender")
                }
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>View Only</Text>
              </TouchableOpacity>
            </View>
          );
        }
        const isProcessing = isJoiningWaitlist === season.id;
        if (waitlistStatus?.isWaitlisted) {
          return (
            <View style={[styles.buttonRow, styles.centeredButtonRow]}>
              <TouchableOpacity
                style={[
                  styles.viewMatchesButton,
                  styles.compactActionButton,
                  { backgroundColor: "#F2F2F2" },
                ]}
                onPress={() => handleJoinWaitlistPress(season.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>
                  Leave Waitlist (#{waitlistStatus.position})
                </Text>
              </TouchableOpacity>
            </View>
          );
        }
        if (waitlistStatus && WaitlistService.isWaitlistFull(waitlistStatus)) {
          return (
            <View style={[styles.buttonRow, styles.centeredButtonRow]}>
              <TouchableOpacity
                style={[
                  styles.viewMatchesButton,
                  styles.compactActionButton,
                  { backgroundColor: "#B2B2B2" },
                ]}
                onPress={() => toast.info("The waitlist is currently full")}
                activeOpacity={0.8}
              >
                <Text style={styles.registerButtonText}>Waitlist Full</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={[styles.buttonRow, styles.centeredButtonRow]}>
            <TouchableOpacity
              style={[
                styles.viewMatchesButton,
                styles.compactActionButton,
                { backgroundColor: "#F2F2F2" },
              ]}
              onPress={() => handleJoinWaitlistPress(season.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.registerButtonText, { color: "#374151" }]}>
                {isProcessing ? "Joining..." : "Join Waitlist"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }

      // FINISHED or default
      return (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => handleViewStandingsPress(season)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewStandingsLink}>View Standings</Text>
          </TouchableOpacity>
        </View>
      );
    };
    // ──────────────────────────────────────────────────────────────────────

    // End-year for the date range
    const endYear = season.endDate
      ? new Date(season.endDate).toLocaleDateString("en-GB", {
          year: "numeric",
        })
      : "";

    const renderSeasonContainer = (children: React.ReactNode) => {
      if (season.status === "ACTIVE") {
        return (
          <LinearGradient
            colors={getSeasonCardGradientColors(sport)}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.seasonCardWrapper}
          >
            {children}
          </LinearGradient>
        );
      }

      return <View style={styles.seasonCardPlainWrapper}>{children}</View>;
    };

    return (
      <TouchableOpacity
        key={season.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          // Closed-registration ACTIVE seasons and past seasons → go straight to standings
          if (
            !isUserRegistered &&
            !isRegistrationOpen &&
            season.status === "ACTIVE"
          ) {
            handleViewStandingsPress(season);
            return;
          }
          router.push({
            pathname: "/user-dashboard/season-details" as any,
            params: {
              seasonId: season.id,
              seasonName: season.name,
              leagueId: leagueId,
              sport: sport,
            },
          });
        }}
        activeOpacity={0.9}
      >
        {renderSeasonContainer(
          <View style={styles.seasonCard}>
            {/* Header: season name + status pill */}
            <View style={styles.seasonCardHeader}>
              <Text style={styles.seasonTitle}>{season.name}</Text>
              {(() => {
                const now = new Date();
                const seasonStartDate = season.startDate
                  ? new Date(season.startDate)
                  : null;
                const registrationDeadlineDate = season.regiDeadline
                  ? new Date(season.regiDeadline)
                  : null;
                const isUpcomingBeforeStart =
                  season.status === "UPCOMING" &&
                  !!seasonStartDate &&
                  seasonStartDate > now;

                let label: string | null = null;
                let dotColor = "#22C55E";
                let bgColor = "#F0FDF4";
                let textColor = "#16A34A";
                let borderColor = "#BBF7D0";

                if (seasonStartDate && seasonStartDate <= now) {
                  label = "In Progress";
                  dotColor = "#3B82F6";
                  bgColor = "#EFF6FF";
                  textColor = "#3B82F6";
                  borderColor = "#BFDBFE";
                } else if (
                  registrationDeadlineDate &&
                  registrationDeadlineDate < now
                ) {
                  label = "Registration Closed";
                  dotColor = "#EF4444";
                  bgColor = "#FEF2F2";
                  textColor = "#EF4444";
                  borderColor = "#FECACA";
                } else if (
                  registrationDeadlineDate &&
                  registrationDeadlineDate <=
                    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                ) {
                  label = "Closing Soon";
                  dotColor = "#F59E0B";
                  bgColor = "#FFFBEB";
                  textColor = "#D97706";
                  borderColor = "#FDE68A";
                } else if (!isUpcomingBeforeStart && isRegistrationOpen) {
                  label = "Registration Open";
                }

                if (!label) {
                  return null;
                }

                return (
                  <View
                    style={[
                      styles.seasonStatusBadge,
                      { backgroundColor: bgColor, borderColor },
                    ]}
                  >
                    <View
                      style={[
                        styles.seasonStatusDot,
                        { backgroundColor: dotColor },
                      ]}
                    />
                    <Text
                      style={[styles.seasonStatusText, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })()}
            </View>

            {/* Category as plain grey secondary text */}
            {categoryDisplayName ? (
              <Text style={styles.categoryPlainText}>
                {categoryDisplayName}
              </Text>
            ) : null}

            {/* Date row: 📅 25 Feb – 30 Apr 2026 */}
            {season.startDate && season.endDate && (
              <View style={styles.dateIconRow}>
                <CalendarIcon width={16} height={16} />
                <Text style={styles.dateText}>
                  {formatShortDate(season.startDate)} –{" "}
                  {formatShortDate(season.endDate)} {endYear}
                </Text>
              </View>
            )}

            {/* Registration deadline row: 📋 Registration closes DD Mon (only when still open) */}
            {season.regiDeadline && isRegistrationOpen && (
              <View style={styles.dateIconRow}>
                <CalendarMinusIcon width={16} height={16} />
                <Text style={styles.dateText}>
                  Registration closes {formatShortDate(season.regiDeadline)}
                </Text>
              </View>
            )}

            {/* Players + entry fee on same row */}
            <View style={styles.playersEntryRow}>
              {/* Left: avatars + player count */}
              <TouchableOpacity
                style={styles.playersLeft}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: "/user-dashboard/players-list",
                    params: {
                      contextType: "season",
                      contextId: season.id,
                      contextName: season.name,
                      sport: sport,
                      totalPlayers: displayPlayerCount,
                    },
                  });
                }}
                activeOpacity={0.7}
              >
                {season.memberships && season.memberships.length > 0 && (
                  <View style={styles.avatarRow}>
                    {season.memberships
                      .slice(0, 5)
                      .map((membership, index: number) => {
                        if (!membership.user) return null;
                        return (
                          <View
                            key={membership.id}
                            style={[
                              styles.seasonMemberProfilePicture,
                              index > 0 &&
                                styles.seasonMemberProfilePictureOverlap,
                            ]}
                          >
                            {membership.user.image ? (
                              <Image
                                source={{ uri: membership.user.image }}
                                style={styles.seasonMemberProfileImage}
                              />
                            ) : (
                              <View
                                style={styles.defaultSeasonMemberProfileImage}
                              >
                                <Text
                                  style={styles.defaultSeasonMemberProfileText}
                                >
                                  {membership.user.name
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    {displayPlayerCount > 5 && (
                      <View
                        style={[
                          styles.seasonRemainingCount,
                          styles.seasonMemberProfilePictureOverlap,
                        ]}
                      >
                        <Text style={styles.seasonRemainingCountText}>
                          +{displayPlayerCount - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {shouldShowCurrentUserWaitlistAvatar && (
                  <View
                    style={[
                      styles.seasonMemberProfilePicture,
                      season.memberships &&
                        season.memberships.length > 0 &&
                        styles.seasonMemberProfilePictureOverlap,
                    ]}
                  >
                    {currentUserAvatarUri ? (
                      <Image
                        source={{ uri: currentUserAvatarUri }}
                        style={styles.seasonMemberProfileImage}
                      />
                    ) : (
                      <View style={styles.defaultSeasonMemberProfileImage}>
                        <Text style={styles.defaultSeasonMemberProfileText}>
                          {currentUserInitial}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={styles.playerCountText}>
                  • {displayPlayerCount} player
                  {displayPlayerCount !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>

              {/* Right: entry fee */}
              {season.paymentRequired && entryFee && (
                <Text style={styles.entryFeeInlineText}>
                  RM{entryFee} entry
                </Text>
              )}
            </View>

            {/* Bottom action row */}
            {renderBottomRow()}

            {/* ManageTeam button (doubles) REMOVED
            {showManageTeam && partnership && (
              <View style={{ marginTop: 8 }}>
                <ManageTeamButton
                  seasonId={season.id}
                  partnershipId={partnership.id}
                />
              </View>
            )} */}
          </View>,
        )}
      </TouchableOpacity>
    );
  };

  const getRegisterInterestAccentColor = (
    sportType: "pickleball" | "tennis" | "padel",
  ): string => {
    switch (sportType) {
      case "tennis":
        return "#A2E047";
      case "padel":
        return "#4DABFE";
      case "pickleball":
      default:
        return "#A04DFE";
    }
  };

  const getRegisterInterestButtonTintColor = (
    sportType: "pickleball" | "tennis" | "padel",
  ): string => {
    switch (sportType) {
      case "tennis":
        return "#EAF7D8";
      case "padel":
        return "#E3F1FF";
      case "pickleball":
      default:
        return "#F4EAFE";
    }
  };

  const renderRegisterInterestCard = (season: Season) => {
    const normalizedCategories = normalizeCategoriesFromSeason(season);
    const seasonCategory =
      normalizedCategories && normalizedCategories.length > 0
        ? normalizedCategories[0]
        : null;
    const categoryDisplayName = seasonCategory ? seasonCategory.name || "" : "";

    const interestedStatus = waitlistStatuses.get(season.id);
    const isProcessing = isJoiningWaitlist === season.id;
    const isInterested = interestedStatus?.isWaitlisted ?? false;
    const interestedCount =
      interestedStatus?.totalWaitlisted ?? season.registeredUserCount ?? 0;
    const isUserInMembershipList = (season.memberships || []).some(
      (m: any) => m.userId === userId,
    );
    const currentUserAvatarUri =
      session?.user?.image ||
      (session?.user as any)?.avatar ||
      (session?.user as any)?.profileImage;
    const currentUserInitial =
      session?.user?.name?.charAt(0)?.toUpperCase() || "U";
    const shouldShowCurrentUserInterestedAvatar =
      isInterested && !isUserInMembershipList;
    const registerInterestButtonTint =
      getRegisterInterestButtonTintColor(selectedSport);
    const registerInterestButtonBorder =
      getRegisterInterestAccentColor(selectedSport);

    const entryFee = formatEntryFee(season.entryFee);

    return (
      <View key={season.id} style={styles.registerInterestCardWrapper}>
        <View style={styles.registerInterestCard}>
          {/* Header row: name + category pill + status badge */}
          <View style={styles.seasonCardHeader}>
            <Text style={styles.seasonTitle} numberOfLines={1}>
              {season.name}
            </Text>
            <View
              style={[
                styles.seasonStatusBadge,
                {
                  backgroundColor: "rgba(255,255,255,0.15)",
                  borderColor: "rgba(255,255,255,0.3)",
                },
              ]}
            >
              <View
                style={[styles.seasonStatusDot, { backgroundColor: "#FFFFFF" }]}
              />
              <Text
                style={[styles.seasonStatusText, { color: "#FFFFFF" }]}
                numberOfLines={1}
              >
                Registering Interest
              </Text>
            </View>
          </View>
          {categoryDisplayName ? (
            <Text style={styles.categoryPlainText}>{categoryDisplayName}</Text>
          ) : null}

          {/* Date rows — only shown if dates exist */}
          {season.startDate && season.endDate && (
            <View style={styles.dateIconRow}>
              <CalendarIcon width={16} height={16} />
              <Text style={styles.dateText}>
                {formatShortDate(season.startDate)} –{" "}
                {formatShortDate(season.endDate)}{" "}
                {new Date(season.endDate as string).toLocaleDateString(
                  "en-GB",
                  { year: "numeric" },
                )}
              </Text>
            </View>
          )}

          {season.regiDeadline && (
            <View style={styles.dateIconRow}>
              <CalendarMinusIcon width={16} height={16} />
              <Text style={styles.dateText}>
                Last registration: {formatSeasonDate(season.regiDeadline)}
              </Text>
            </View>
          )}

          {/* Interested count + avatars — centered */}
          <TouchableOpacity
            style={styles.playersEntryRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/user-dashboard/players-list",
                params: {
                  contextType: "season",
                  contextId: season.id,
                  contextName: season.name,
                  sport: sport,
                  totalPlayers: interestedCount,
                },
              });
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.playersLeft, { justifyContent: "center" }]}>
              {season.memberships && season.memberships.length > 0 && (
                <View style={styles.avatarRow}>
                  {season.memberships
                    .slice(0, 5)
                    .map((membership, index: number) => {
                      if (!membership.user) return null;
                      return (
                        <View
                          key={membership.id}
                          style={[
                            styles.seasonMemberProfilePicture,
                            index > 0 &&
                              styles.seasonMemberProfilePictureOverlap,
                          ]}
                        >
                          {membership.user.image ? (
                            <Image
                              source={{ uri: membership.user.image }}
                              style={styles.seasonMemberProfileImage}
                            />
                          ) : (
                            <View
                              style={styles.defaultSeasonMemberProfileImage}
                            >
                              <Text
                                style={styles.defaultSeasonMemberProfileText}
                              >
                                {membership.user.name
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  {interestedCount > 5 && (
                    <View
                      style={[
                        styles.seasonRemainingCount,
                        styles.seasonMemberProfilePictureOverlap,
                      ]}
                    >
                      <Text style={styles.seasonRemainingCountText}>
                        +{interestedCount - 5}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {shouldShowCurrentUserInterestedAvatar && (
                <View
                  style={[
                    styles.seasonMemberProfilePicture,
                    season.memberships &&
                      season.memberships.length > 0 &&
                      styles.seasonMemberProfilePictureOverlap,
                  ]}
                >
                  {currentUserAvatarUri ? (
                    <Image
                      source={{ uri: currentUserAvatarUri }}
                      style={styles.seasonMemberProfileImage}
                    />
                  ) : (
                    <View style={styles.defaultSeasonMemberProfileImage}>
                      <Text style={styles.defaultSeasonMemberProfileText}>
                        {currentUserInitial}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={styles.playerCountText}>
                • {interestedCount} interested
              </Text>
            </View>
            {season.paymentRequired && entryFee && (
              <Text style={styles.entryFeeInlineText}>RM{entryFee} entry</Text>
            )}
          </TouchableOpacity>

          {/* Register Interest / Leave button */}
          <View style={[styles.buttonRow, styles.centeredButtonRow]}>
            {isInterested ? (
              <TouchableOpacity
                style={[
                  styles.viewMatchesButton,
                  styles.compactActionButton,
                  // { backgroundColor: registerInterestButtonTint }
                  { backgroundColor: "#F2F2F2" },
                ]}
                onPress={() => handleRegisterInterestPress(season.id)}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Text style={[styles.registerButtonText, { color: "#1F2937" }]}>
                  {isProcessing ? "Leaving..." : "Remove Interest"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.viewMatchesButton,
                  styles.compactActionButton,
                  { backgroundColor: "#F2F2F2" },
                ]}
                onPress={() => handleRegisterInterestPress(season.id)}
                activeOpacity={0.8}
                disabled={isProcessing}
              >
                <Text style={[styles.registerButtonText, { color: "#1F2937" }]}>
                  {isProcessing ? "Registering..." : "Register Interest"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderPastSeasonCard = (season: Season) => {
    const normalizedCategories = normalizeCategoriesFromSeason(season);
    const seasonCategory =
      normalizedCategories && normalizedCategories.length > 0
        ? normalizedCategories[0]
        : null;
    const categoryDisplayName = seasonCategory ? seasonCategory.name || "" : "";

    const dateRange =
      season.startDate && season.endDate
        ? `${formatSeasonDate(season.startDate)} – ${formatSeasonDate(season.endDate)}`
        : null;

    return (
      <TouchableOpacity
        key={season.id}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          handleViewStandingsPress(season);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.pastSeasonCardWrapper}>
          {/* Header row */}
          <View style={styles.seasonCardHeader}>
            <Text style={styles.seasonTitle}>{season.name}</Text>
            {(() => {
              const now = new Date();
              let label = "Finished";
              let dotColor = "#9CA3AF";
              let bgColor = "#F3F4F6";
              let textColor = "#6B7280";
              let borderColor = "#E5E7EB";
              if (season.startDate && new Date(season.startDate) > now) {
                label = "Registration Open";
                dotColor = "#22C55E";
                bgColor = "#F0FDF4";
                textColor = "#16A34A";
                borderColor = "#BBF7D0";
              } else if (
                season.startDate &&
                new Date(season.startDate) <= now &&
                season.endDate &&
                new Date(season.endDate) > now
              ) {
                label = "In Progress";
                dotColor = "#3B82F6";
                bgColor = "#EFF6FF";
                textColor = "#3B82F6";
                borderColor = "#BFDBFE";
              }
              return (
                <View
                  style={[
                    styles.seasonStatusBadge,
                    { backgroundColor: bgColor, borderColor },
                  ]}
                >
                  <View
                    style={[
                      styles.seasonStatusDot,
                      { backgroundColor: dotColor },
                    ]}
                  />
                  <Text
                    style={[styles.seasonStatusText, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Category as plain grey secondary text */}
          {categoryDisplayName ? (
            <Text style={styles.categoryPlainText}>{categoryDisplayName}</Text>
          ) : null}

          {/* Date range with calendar icon */}
          {dateRange && (
            <View style={styles.pastDateRow}>
              <Text style={styles.pastDateIcon}>📅</Text>
              <Text style={styles.pastDateText}>{dateRange}</Text>
            </View>
          )}

          {/* Profile pictures */}
          {season.memberships && season.memberships.length > 0 && (
            <TouchableOpacity
              style={[
                styles.seasonProfilePicturesContainer,
                { justifyContent: "flex-start", marginBottom: 12 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/user-dashboard/players-list",
                  params: {
                    contextType: "season",
                    contextId: season.id,
                    contextName: season.name,
                    sport: sport,
                    totalPlayers:
                      season._count?.memberships ||
                      season.registeredUserCount ||
                      0,
                  },
                });
              }}
              activeOpacity={0.7}
            >
              {season.memberships
                .slice(0, 6)
                .map((membership, index: number) => {
                  if (!membership.user) return null;
                  return (
                    <View
                      key={membership.id}
                      style={[
                        styles.seasonMemberProfilePicture,
                        index > 0 && styles.seasonMemberProfilePictureOverlap,
                      ]}
                    >
                      {membership.user.image ? (
                        <Image
                          source={{ uri: membership.user.image }}
                          style={styles.seasonMemberProfileImage}
                        />
                      ) : (
                        <View style={styles.defaultSeasonMemberProfileImage}>
                          <Text style={styles.defaultSeasonMemberProfileText}>
                            {membership.user.name?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              {season._count?.memberships && season._count.memberships > 6 && (
                <View
                  style={[
                    styles.seasonRemainingCount,
                    styles.seasonMemberProfilePictureOverlap,
                  ]}
                >
                  <Text style={styles.seasonRemainingCountText}>
                    +{season._count.memberships - 6}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Bottom: View Standings link + Ended badge */}
          <View style={styles.pastCardFooter}>
            <TouchableOpacity
              onPress={() => handleViewStandingsPress(season)}
              activeOpacity={0.7}
            >
              <Text style={styles.pastViewStandingsText}>View Standings</Text>
            </TouchableOpacity>
            <Text style={styles.pastEndedBadge}>Ended</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getSportConfig = () => {
    if (selectedSport === "tennis") {
      return {
        gradient: ["#B3CFBC", "#FFFFFF"] as const,
        color: "#008000",
        name: "Tennis",
      };
    }
    if (selectedSport === "padel") {
      return {
        gradient: ["#4DABFE", "#FFFFFF"] as const,
        color: "#4DABFE",
        name: "Padel",
      };
    }
    return {
      gradient: ["#B98FAF", "#FFFFFF"] as const,
      color: "#A04DFE",
      name: "Pickleball",
    };
  };

  const sportConfig = getSportConfig();

  const getHeaderGradientColors = (
    sport: "pickleball" | "tennis" | "padel",
  ): [string, string] => {
    switch (sport) {
      case "tennis":
        return ["#A2E047", "#587A27"];
      case "padel":
        return ["#4DABFE", "#2E6698"];
      case "pickleball":
      default:
        return ["#A04DFE", "#602E98"];
    }
  };

  const getSeasonCardGradientColors = (
    sport: "pickleball" | "tennis" | "padel",
  ): [string, string] => {
    switch (sport) {
      case "tennis":
        return ["#A2E047", "#FEA04D"];
      case "padel":
        return ["#4DABFE", "#FEA04D"];
      case "pickleball":
      default:
        return ["#A04DFE", "#FEA04D"];
    }
  };

  const getCategoryChipGradientColors = (
    sport: "pickleball" | "tennis" | "padel",
  ): [string, string] => {
    switch (sport) {
      case "tennis":
        return ["#A2E047", "#729E32"];
      case "padel":
        return ["#4DABFE", "#377FBF"];
      case "pickleball":
      default:
        return ["#A04DFE", "#602E98"];
    }
  };

  // Helper function to get available sports for SportSwitcher
  const getUserSelectedSports = () => {
    return ["pickleball", "tennis", "padel"];
  };

  // Refresh profile data when screen comes into focus (e.g., after completing questionnaire)
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔍 LeagueDetails: useFocusEffect triggered");
      const refreshData = async () => {
        // Fetch profile data first (which also updates gender)
        await fetchProfileData();
        // Refresh user's registered seasons
        console.log(
          "🔍 LeagueDetails: useFocusEffect calling fetchUserRegisteredSeasons",
        );
        await fetchUserRegisteredSeasons();
        // Then refresh league/season data to show updated membership status
        if (leagueId) {
          await fetchAllData();
        }
      };
      refreshData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchProfileData, fetchUserRegisteredSeasons, leagueId, fetchAllData]),
  );

  // Set selected sport based on route param
  React.useEffect(() => {
    setSelectedSport(sport);
  }, [sport]);

  // Pull-to-refresh handler - never show skeleton on manual refresh
  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    isManualRefreshRef.current = true; // Flag manual refresh to skip skeleton logic
    setShowSeasonsSkeleton(false); // Never show skeleton on manual refresh
    try {
      // Fetch profile data first (which also updates gender), then fetch league data
      // This ensures categories are properly filtered with the correct gender
      await fetchProfileData();
      await fetchUserRegisteredSeasons();
      await fetchAllData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
      isManualRefreshRef.current = false; // Clear manual refresh flag
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfileData, fetchUserRegisteredSeasons, fetchAllData]);

  // Animated styles for collapsing header using reanimated (runs on native UI thread)
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, COLLAPSE_START_THRESHOLD, COLLAPSE_END_THRESHOLD],
      [HEADER_MAX_HEIGHT, HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolation.CLAMP,
    );
    return { height };
  });

  const leagueNameAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.7,
      ],
      [1, 1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.7,
      ],
      [1, 1, 0.8],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  });

  const infoContainerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.5,
      ],
      [1, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.5,
      ],
      [0, 0, -20],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  const collapsedLeagueNameAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.7,
        COLLAPSE_END_THRESHOLD,
      ],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const collapsedPlayerCountAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [
        0,
        COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE * 0.5,
        COLLAPSE_END_THRESHOLD,
      ],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // Entry animation styles using reanimated
  const headerEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: headerEntryOpacity.value,
      transform: [{ translateY: headerEntryTranslateY.value }],
    };
  });

  const infoCardEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: infoCardEntryOpacity.value,
      transform: [{ translateY: infoCardEntryTranslateY.value }],
    };
  });

  const categoriesEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: categoriesEntryOpacity.value,
      transform: [{ translateY: categoriesEntryTranslateY.value }],
    };
  });

  const seasonsEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: seasonsEntryOpacity.value,
      transform: [{ translateY: seasonsEntryTranslateY.value }],
    };
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with profile picture, sport switcher */}
      <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
        <TouchableOpacity
          style={styles.headerProfilePicture}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile");
          }}
        >
          {profileData?.image || session?.user?.image ? (
            <Image
              source={{ uri: profileData?.image || session?.user?.image }}
              style={styles.headerProfileImage}
            />
          ) : (
            <View style={styles.defaultHeaderAvatarContainer}>
              <Text style={styles.defaultHeaderAvatarText}>
                {(profileData?.name || session?.user?.name)
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <SportSwitcher
          currentSport={selectedSport}
          availableSports={getUserSelectedSports()}
          onSportChange={(newSport) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: "/user-dashboard" as any,
              params: { sport: newSport },
            });
          }}
        />

        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.contentBox}>
          {isLoading && userGender === undefined ? (
            // Only show full-page spinner when BOTH loading AND no gender
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={sportConfig.color} />
              <Text style={styles.loadingText}>Loading league details...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchAllData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Animated.View
                style={[
                  styles.gradientHeaderContainer,
                  headerAnimatedStyle,
                  headerEntryAnimatedStyle,
                ]}
              >
                <LinearGradient
                  colors={getHeaderGradientColors(sport)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.leagueHeaderGradient, { flex: 1 }]}
                >
                  <View style={styles.leagueHeaderContent}>
                    <View style={styles.topRow}>
                      <View style={styles.backButtonContainer}>
                        <TouchableOpacity
                          style={styles.backButtonIcon}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            router.back();
                          }}
                        >
                          <BackButtonIcon width={12} height={19} />
                        </TouchableOpacity>
                      </View>
                      <Animated.View
                        style={[
                          styles.leagueNameContainer,
                          leagueNameAnimatedStyle,
                        ]}
                      >
                        <Text style={styles.leagueName} numberOfLines={2}>
                          {league?.name || leagueName}
                        </Text>
                      </Animated.View>
                      {/* Collapsed header content */}
                      <Animated.View
                        style={[
                          styles.collapsedHeaderContent,
                          collapsedLeagueNameAnimatedStyle,
                        ]}
                      >
                        <Text
                          style={styles.collapsedLeagueName}
                          numberOfLines={1}
                        >
                          {league?.name || leagueName}
                        </Text>
                        {currentSeasons.length > 0 && (
                          <Text
                            style={styles.collapsedSeasonName}
                            numberOfLines={1}
                          >
                            {currentSeasons[0].name}
                          </Text>
                        )}
                        <Animated.View
                          style={[
                            styles.collapsedPlayerCountContainer,
                            collapsedPlayerCountAnimatedStyle,
                          ]}
                        >
                          <View style={styles.statusCircle} />
                          <Text style={styles.collapsedPlayerCount}>
                            {league?.totalSeasonMemberships || 0} players
                          </Text>
                        </Animated.View>
                      </Animated.View>
                    </View>
                    <Animated.View
                      style={[
                        styles.leagueInfoContainer,
                        infoContainerAnimatedStyle,
                      ]}
                    >
                      <View style={styles.playerCountContainer}>
                        <View style={styles.statusCircle} />
                        <Text style={styles.playerCount}>
                          {league?.totalSeasonMemberships || 0} players
                        </Text>
                      </View>

                      {/* Profile pictures */}
                      {league?.memberships && league.memberships.length > 0 && (
                        <TouchableOpacity
                          style={styles.profilePicturesContainer}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            router.push({
                              pathname: "/user-dashboard/players-list",
                              params: {
                                contextType: "league",
                                contextId: leagueId,
                                contextName: league?.name || leagueName,
                                sport: sport,
                                totalPlayers:
                                  league?.totalSeasonMemberships ||
                                  league?._count?.memberships ||
                                  0,
                              },
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          {league.memberships
                            .slice(0, 6)
                            .map((membership: any, index: number) => {
                              if (!membership.user) return null;
                              return (
                                <View
                                  key={membership.id}
                                  style={[
                                    styles.memberProfilePicture,
                                    index > 0 &&
                                      styles.memberProfilePictureOverlap,
                                  ]}
                                >
                                  {membership.user.image ? (
                                    <Image
                                      source={{ uri: membership.user.image }}
                                      style={styles.memberProfileImage}
                                    />
                                  ) : (
                                    <View
                                      style={styles.defaultMemberProfileImage}
                                    >
                                      <Text
                                        style={styles.defaultMemberProfileText}
                                      >
                                        {membership.user.name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "U"}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          {league._count?.memberships &&
                            league._count.memberships > 6 && (
                              <View
                                style={[
                                  styles.remainingCount,
                                  styles.memberProfilePictureOverlap,
                                ]}
                              >
                                <Text style={styles.remainingCountText}>
                                  +{league._count.memberships - 6}
                                </Text>
                              </View>
                            )}
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  </View>
                </LinearGradient>
              </Animated.View>

              <Animated.ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor={sportConfig.color}
                    colors={[sportConfig.color]}
                  />
                }
              >
                <View style={{ height: HEADER_MAX_HEIGHT }} />
                {/* League Info Card */}
                <Animated.View style={infoCardEntryAnimatedStyle}>
                  <View style={styles.leagueInfoCard}>
                    <View style={styles.leagueInfoContent}>
                      {sport === "pickleball" ? (
                        <LeagueInfoIcon
                          width={43}
                          height={43}
                          style={styles.leagueInfoIcon}
                        />
                      ) : (
                        <LeagueInfoIcon2
                          width={43}
                          height={43}
                          style={styles.leagueInfoIcon}
                        />
                      )}
                      <View style={styles.leagueInfoTextContainer}>
                        <Text style={styles.leagueInfoTitle}>Info & Rules</Text>
                        <Text style={styles.leagueInfoText}>
                          {league?.description ||
                            "This is a friendly, competitive flex league. Join a league to meet new players in your area, stay active, and level up your game. All adult players are welcome to join!"}
                        </Text>
                        <TouchableOpacity
                          style={styles.visitWebsiteButton}
                          onPress={() =>
                            WebBrowser.openBrowserAsync(
                              "https://deuceleague.com/league-rules",
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.visitWebsiteText}>
                            View League Rules
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {league?.rules ? (
                      <>
                        <View style={styles.rulesInfoDivider} />
                        <TouchableOpacity
                          style={styles.viewRulesButton}
                          onPress={() => setShowRulesModal(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewRulesText}>
                            View League Rules →
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </Animated.View>

                {/* League Rules Modal */}
                <Modal
                  visible={showRulesModal}
                  animationType="slide"
                  transparent
                  onRequestClose={() => setShowRulesModal(false)}
                >
                  <View style={styles.rulesModalOverlay}>
                    <View style={styles.rulesModalContainer}>
                      <View style={styles.rulesModalHeader}>
                        <Text style={styles.rulesModalTitle}>League Rules</Text>
                        <TouchableOpacity
                          onPress={() => setShowRulesModal(false)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.rulesModalClose}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView
                        style={styles.rulesModalScroll}
                        showsVerticalScrollIndicator={false}
                      >
                        <Text style={styles.rulesModalText}>
                          {league?.rules}
                        </Text>
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                {/* Category Filter Buttons */}
                {categories.length > 0 && (
                  <Animated.View style={categoriesEntryAnimatedStyle}>
                    <View style={styles.categoriesContainer}>
                      <View style={styles.categoryButtons}>
                        {sortedCategories.map((category) => {
                          const displayName =
                            CategoryService.getCategoryDisplayName(
                              category,
                              CategoryService.getEffectiveGameType(
                                category,
                                "SINGLES",
                              ),
                            );
                          const isSelected = selectedCategoryId === category.id;
                          const isRestricted = !canUserJoinCategory(category);

                          return (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.categoryButton,
                                isSelected && styles.categoryButtonSelected,
                              ]}
                              onPress={() => {
                                handleCategoryPress(category.id);
                              }}
                              activeOpacity={0.7}
                            >
                              {isSelected && (
                                <Text style={styles.tickIcon}>✓</Text>
                              )}
                              <Text
                                style={[
                                  styles.categoryButtonText,
                                  isSelected &&
                                    styles.categoryButtonTextSelected,
                                ]}
                              >
                                {displayName}
                              </Text>
                              {isRestricted && (
                                <Ionicons
                                  name="lock-closed"
                                  size={12}
                                  color={isSelected ? "#FEA04D" : "#9CA3AF"}
                                  style={{ marginLeft: 4 }}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Season Cards Section - Show skeleton OR content */}
                <Animated.View style={seasonsEntryAnimatedStyle}>
                  {showSeasonsSkeleton ? (
                    <SeasonCardSkeleton sport={sport} count={2} />
                  ) : (
                    <>
                      {/* Upcoming Seasons - shown ABOVE current season */}
                      {(registerInterestSeasons.length > 0 ||
                        upcomingSeasons.length > 0) && (
                        <View style={styles.seasonsSection}>
                          <Text style={styles.sectionTitle}>
                            Upcoming Seasons
                          </Text>
                          {registerInterestSeasons.map(
                            renderRegisterInterestCard,
                          )}
                          {upcomingSeasons.map(renderSeasonCard)}
                        </View>
                      )}

                      {/* Current Season */}
                      {currentSeasons.length > 0 && (
                        <View style={styles.seasonsSection}>
                          <Text style={styles.sectionTitle}>
                            Current Season
                          </Text>
                          {currentSeasons.map(renderSeasonCard)}
                        </View>
                      )}

                      {/* Past Seasons */}
                      {pastSeasons.length > 0 && (
                        <View style={styles.seasonsSection}>
                          <Text style={styles.sectionTitle}>Past Seasons</Text>
                          {pastSeasons.map(renderPastSeasonCard)}
                        </View>
                      )}

                      {/* Empty state */}
                      {categories.length === 0 ||
                      (currentSeasons.length === 0 &&
                        upcomingSeasons.length === 0 &&
                        pastSeasons.length === 0) ? (
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyText}>
                            {categories.length === 0
                              ? "There are currently no seasons available for this league."
                              : selectedCategoryId
                                ? "There are currently no seasons available for this category."
                                : "There are currently no seasons available for this league."}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </Animated.View>
              </Animated.ScrollView>
            </>
          )}
        </View>
      </View>

      <NavBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        sport={selectedSport}
        badgeCounts={{ chat: chatUnreadCount, myGames: myGamesBadgeCount }}
      />

      <PaymentOptionsBottomSheet
        visible={showPaymentOptions}
        onClose={handleClosePaymentOptions}
        season={selectedSeason}
        onPayNow={handlePayNow}
        onPayLater={handlePayLater}
        isProcessingPayment={isProcessingPayment}
        sport={sport}
      />

      {/* Waitlist Bottom Sheet */}
      {waitlistBottomSheetSeasonId &&
        (() => {
          const season = seasons.find(
            (s: Season) => s.id === waitlistBottomSheetSeasonId,
          );
          const status = waitlistStatuses.get(waitlistBottomSheetSeasonId);
          return (
            <WaitlistBottomSheet
              visible={true}
              onClose={() => setWaitlistBottomSheetSeasonId(null)}
              onJoin={() =>
                handleConfirmJoinWaitlist(waitlistBottomSheetSeasonId)
              }
              seasonName={season?.name || ""}
              currentWaitlistCount={status?.totalWaitlisted || 0}
              sport={selectedSport}
              isLoading={isJoiningWaitlist === waitlistBottomSheetSeasonId}
            />
          );
        })()}

      {/* Register Interest Bottom Sheet */}
      {registerInterestBottomSheetSeasonId &&
        (() => {
          const season = seasons.find(
            (s: Season) => s.id === registerInterestBottomSheetSeasonId,
          );
          const status = waitlistStatuses.get(
            registerInterestBottomSheetSeasonId,
          );
          return (
            <RegisterInterestBottomSheet
              visible={true}
              onClose={() => setRegisterInterestBottomSheetSeasonId(null)}
              onConfirm={() =>
                handleConfirmRegisterInterest(
                  registerInterestBottomSheetSeasonId,
                )
              }
              seasonName={season?.name || ""}
              interestedCount={status?.totalWaitlisted || 0}
              sport={selectedSport}
              isLoading={
                isJoiningWaitlist === registerInterestBottomSheetSeasonId
              }
            />
          );
        })()}

      {/* Leave Waitlist Dialog */}
      {leaveWaitlistDialogSeasonId &&
        (() => {
          const season = seasons.find(
            (s: Season) => s.id === leaveWaitlistDialogSeasonId,
          );
          const status = waitlistStatuses.get(leaveWaitlistDialogSeasonId);
          return (
            <LeaveWaitlistDialog
              visible={true}
              onClose={() => setLeaveWaitlistDialogSeasonId(null)}
              onConfirm={() => handleLeaveWaitlist(leaveWaitlistDialogSeasonId)}
              position={status?.position || 0}
              seasonName={season?.name || ""}
              sport={selectedSport}
              isLoading={isJoiningWaitlist === leaveWaitlistDialogSeasonId}
            />
          );
        })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
    paddingBottom: 120,
  },
  scrollTopSpacer: {
    height: 20,
  },
  gradientHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  leagueHeaderGradient: {
    borderRadius: 0,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  leagueHeaderContent: {
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    gap: 12,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonIcon: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  leagueNameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 52, // Offset to balance the back button width + gap
  },
  collapsedHeaderContent: {
    position: "absolute",
    left: 52, // Start after back button
    right: 0,
    alignItems: "flex-start",
    justifyContent: "center",
    top: 0,
    bottom: 0,
    paddingLeft: 12,
  },
  leagueInfoContainer: {
    alignItems: "center",
    width: "100%",
  },
  leagueName: {
    fontSize: isSmallScreen ? 18 : isTablet ? 22 : 20,
    fontWeight: "700",
    color: "#FDFDFD",
    textAlign: "center",
    marginBottom: 8,
  },
  collapsedLeagueName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
    color: "#FDFDFD",
    textAlign: "left",
    marginBottom: 4,
  },
  collapsedPlayerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  collapsedPlayerCount: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#FDFDFD",
    fontWeight: "600",
  },
  playerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6EC531",
    marginRight: 8,
  },
  playerCount: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FDFDFD",
    fontWeight: "600",
    textAlign: "center",
  },
  profilePicturesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  // Header profile picture
  headerProfilePicture: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultHeaderAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultHeaderAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "System",
  },
  // Member profile pictures in gradient header
  memberProfilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  memberProfilePictureOverlap: {
    marginLeft: -10,
  },
  memberProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultMemberProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultMemberProfileText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  remainingCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  remainingCountText: {
    color: "#1C1A1A",
    fontSize: 11,
    fontWeight: "700",
  },
  leagueInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leagueInfoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  leagueInfoIcon: {
    flexShrink: 0,
  },
  leagueInfoTextContainer: {
    flex: 1,
  },
  leagueInfoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#1A1C1E",
    marginBottom: 8,
  },
  leagueInfoText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#747477",
    lineHeight: 20,
  },
  visitWebsiteButton: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  visitWebsiteText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: theme.colors.primary,
    fontWeight: "500",
  },
  rulesInfoDivider: {
    height: 0.5,
    backgroundColor: "#E0E0E0",
    marginTop: 12,
    marginHorizontal: -20,
  },
  viewRulesButton: {
    paddingTop: 10,
    paddingBottom: 2,
    alignSelf: "flex-start",
  },
  viewRulesText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#86868B",
    fontWeight: "400",
  },
  rulesModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  rulesModalContainer: {
    backgroundColor: theme.colors.background.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "75%",
  },
  rulesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rulesModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1C1E",
  },
  rulesModalClose: {
    fontSize: 18,
    color: "#86868B",
    fontWeight: "400",
    padding: 4,
  },
  rulesModalScroll: {
    flexGrow: 0,
  },
  rulesModalText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 12,
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EAEAEA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButtonSelected: {
    backgroundColor: "#2C2C2C",
  },
  categoryButtonText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#606060",
    fontWeight: "400",
  },
  categoryButtonTextSelected: {
    color: "#F5F5F5",
    fontWeight: "600",
  },
  tickIcon: {
    fontSize: 14,
    color: "#FEA04D",
    fontWeight: "bold",
    marginRight: 6,
  },
  seasonsSection: {
    marginBottom: 24,
  },
  pastSeasonCardWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: isSmallScreen ? 14 : 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  pastDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  pastDateIcon: {
    fontSize: 13,
  },
  pastDateText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#6B7280",
    fontWeight: "400",
  },
  pastCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  pastViewStandingsText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FEA04D",
    fontWeight: "500",
  },
  pastEndedBadge: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "500",
  },
  pastCategoryChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
  },
  pastCategoryChipText: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  seasonCardWrapper: {
    borderRadius: 16,
    padding: 2,
    marginBottom: 12,
  },
  seasonCardPlainWrapper: {
    marginBottom: 12,
  },
  seasonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: isSmallScreen ? 16 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  seasonCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  seasonTitle: {
    flex: 1,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "700",
    color: "#1A1C1E",
    marginRight: 8,
    paddingRight: 4,
  },
  categoryChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipText: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "600",
    color: "#F9F9F9",
  },
  categoryPlainText: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "500",
    color: "#86868B",
    marginBottom: 6,
  },
  seasonStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    flexShrink: 0,
    marginLeft: 8,
  },
  seasonStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  seasonStatusText: {
    fontSize: isSmallScreen ? 10 : 11,
    fontWeight: "600",
    maxWidth: isLargeTablet ? 180 : isTablet ? 150 : isSmallScreen ? 90 : 120,
  },
  dateRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  dateText: {
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: "500",
    color: "#2B2929",
  },
  dateTextBold: {
    fontWeight: "700",
  },
  seasonPlayerCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  seasonPlayerCount: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "400",
    color: "#1A1C1E",
  },
  seasonProfilePicturesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  // Smaller profile pictures for season cards
  seasonMemberProfilePicture: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  seasonMemberProfilePictureOverlap: {
    marginLeft: -8,
  },
  seasonMemberProfileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  defaultSeasonMemberProfileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultSeasonMemberProfileText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  seasonRemainingCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  seasonRemainingCountText: {
    color: "#1C1A1A",
    fontSize: 9,
    fontWeight: "700",
  },
  seasonDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: "#2B2929",
  },
  entryFeeContainer: {
    marginBottom: 12,
  },
  entryFeeText: {
    fontSize: 14,
    color: "#2B2929",
  },
  entryFeeAmount: {
    color: "#2B2929",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  registerButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  seasonCardButtons: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {},
  manageTeamButton: {
    flex: 0.85,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#FEA04D",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  manageTeamButtonText: {
    fontFamily: "Inter",
    fontSize: 14,
    fontWeight: "600",
    color: "#FEA04D",
  },
  registrationOpenText: {
    fontSize: 12,
    fontWeight: "400",
    fontStyle: "italic",
    color: "#34C759",
    textAlign: "right",
  },
  registrationClosedText: {
    fontSize: 12,
    fontWeight: "400",
    fontStyle: "italic",
    color: "#EF4444",
    textAlign: "right",
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2B2929",
  },
  // New season card styles
  dateIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  dateIconEmoji: {
    fontSize: 13,
  },
  playersEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 4,
  },
  playersLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  playerCountText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  entryFeeInlineText: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  viewMatchesButton: {
    flex: 1,
    backgroundColor: "#F09433",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  compactActionButton: {
    flex: 0,
    width: isLargeTablet ? "48%" : isTablet ? "54%" : "60%",
    minWidth: isLargeTablet ? 240 : isTablet ? 210 : 180,
    maxWidth: isLargeTablet ? 380 : isTablet ? 320 : 280,
  },
  centeredButtonRow: {
    justifyContent: "center",
  },
  viewStandingsLink: {
    fontSize: 14,
    fontWeight: "500",
    color: "#F09433",
    textAlign: "right",
  },
  genderRestrictedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 5,
  },
  genderRestrictedPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#86868B",
  },
  divisionPendingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF4E0",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E89A2A",
    flex: 1,
  },
  divisionPendingPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#E89A2A",
  },
  helpIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  collapsedSeasonName: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "400",
    marginBottom: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    minHeight: isSmallScreen ? 36 : isTablet ? 44 : 40,
  },
  headerRight: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "System",
  },
  contentBox: {
    flex: 1,
    backgroundColor: "#F6FAFC",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // marginTop: 0,
    overflow: "hidden",
  },
  // Register Interest card styles
  registerInterestCardWrapper: {
    padding: 0,
    marginBottom: 12,
  },
  registerInterestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: isSmallScreen ? 16 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  riCategoryPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
    flexShrink: 0,
  },
  riCategoryPillText: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
