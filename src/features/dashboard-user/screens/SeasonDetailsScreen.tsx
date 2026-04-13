import BackButtonIcon from "@/assets/icons/back-button.svg";
import { ManageTeamButton } from "@/features/pairing/components";
import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { SportSwitcher } from "@/shared/components/ui/SportSwitcher";
import { CategoryService } from "@/src/features/dashboard-user/services/CategoryService";
import {
  Season,
  SeasonService,
} from "@/src/features/dashboard-user/services/SeasonService";
import {
  WaitlistService,
  WaitlistStatus,
} from "@/src/features/dashboard-user/services/WaitlistService";
import { LeagueService } from "@/src/features/leagues/services/LeagueService";
import { useUserPartnerships } from "@/src/features/pairing/hooks/useUserPartnerships";
import { FiuuPaymentService } from "@/src/features/payments/services/FiuuPaymentService";
import {
  LeaveWaitlistDialog,
  WaitlistBottomSheet,
} from "@/src/features/waitlist/components";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/src/core/theme/theme";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import { getSeasonInfoIcons } from "../components/SeasonInfoIcons";
import { formatEntryFee } from "../utils/formatEntryFee";
import {
  checkQuestionnaireStatus,
  getSeasonSport,
} from "../utils/questionnaireCheck";

const { width } = Dimensions.get("window");

const isSmallScreen = width < 375;
const isTablet = width > 768;
const isLargeTablet = width >= 1024;

// Module-level constants so Reanimated worklets capture stable values
// (avoids jitter caused by recaptured closures on every render)
const HEADER_MAX_HEIGHT = isSmallScreen ? 190 : isTablet ? 230 : 210;
const HEADER_MIN_HEIGHT = 62;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
const COLLAPSE_START_THRESHOLD = 40;
const COLLAPSE_END_THRESHOLD =
  COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE;

interface SeasonDetailsScreenProps {
  seasonId: string;
  seasonName?: string;
  leagueId?: string;
  sport?: "pickleball" | "tennis" | "padel";
}

export default function SeasonDetailsScreen({
  seasonId,
  seasonName = "Season",
  leagueId,
  sport = "pickleball",
}: SeasonDetailsScreenProps) {
  const { data: session } = useSession();
  const [season, setSeason] = React.useState<Season | null>(null);
  const [league, setLeague] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profileData, setProfileData] = React.useState<any>(null);
  const [selectedSport, setSelectedSport] = React.useState<
    "pickleball" | "tennis" | "padel"
  >("pickleball");
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [waitlistStatus, setWaitlistStatus] =
    React.useState<WaitlistStatus | null>(null);
  const [isJoiningWaitlist, setIsJoiningWaitlist] = React.useState(false);
  const [showWaitlistBottomSheet, setShowWaitlistBottomSheet] =
    React.useState(false);
  const [showLeaveWaitlistDialog, setShowLeaveWaitlistDialog] =
    React.useState(false);
  const insets = useSafeAreaInsets();
  const STATUS_BAR_HEIGHT = insets.top;
  const formattedEntryFee = season ? formatEntryFee(season.entryFee) : null;

  const userId = session?.user?.id;

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
  const howItWorksEntryOpacity = useSharedValue(0);
  const howItWorksEntryTranslateY = useSharedValue(30);
  const buttonEntryOpacity = useSharedValue(0);
  const hasPlayedEntryAnimation = React.useRef(false);

  React.useEffect(() => {
    fetchSeasonData();
  }, [seasonId]);

  React.useEffect(() => {
    const fetchProfileData = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await axiosInstance.get("/api/player/profile/me");
        if (response?.data?.data) {
          setProfileData(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };
    fetchProfileData();
  }, [session?.user?.id]);

  React.useEffect(() => {
    setSelectedSport(sport);
  }, [sport]);

  React.useEffect(() => {
    if (!showPaymentOptions) {
      setIsProcessingPayment(false);
    }
  }, [showPaymentOptions]);

  // Entry animation effect - triggers when data is loaded
  // Using reanimated for smooth native thread animations
  React.useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (!isLoading && !error && season && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;

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

      // How It Works animation (delayed by 160ms)
      timeouts.push(
        setTimeout(() => {
          howItWorksEntryOpacity.value = withSpring(1, springConfig);
          howItWorksEntryTranslateY.value = withSpring(0, springConfig);
        }, staggerDelay * 2),
      );

      // Button animation (delayed by 240ms)
      timeouts.push(
        setTimeout(() => {
          buttonEntryOpacity.value = withSpring(1, springConfig);
        }, staggerDelay * 3),
      );
    }

    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [isLoading, error, season]);

  const fetchSeasonData = async () => {
    if (!seasonId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const allSeasons = await SeasonService.fetchAllSeasons();
      const foundSeason = allSeasons.find((s) => s.id === seasonId);

      if (foundSeason) {
        setSeason(foundSeason);

        // Fetch league data if leagueId is available
        if (leagueId) {
          try {
            const leagueData = await LeagueService.fetchLeagueById(leagueId);
            setLeague(leagueData);
          } catch (err) {
            console.error("Error fetching league data:", err);
          }
        }

        // Fetch waitlist status for UPCOMING seasons
        if (foundSeason.status === "UPCOMING") {
          try {
            console.log(
              "[Waitlist] Season is UPCOMING, fetching waitlist status...",
            );
            const status = await WaitlistService.getStatus(seasonId);
            console.log("[Waitlist] Initial status fetched:", status);
            setWaitlistStatus(status);
          } catch (err) {
            console.error("[Waitlist] Error fetching waitlist status:", err);
          }
        } else {
          console.log(
            "[Waitlist] Season status is",
            foundSeason.status,
            "- skipping waitlist fetch",
          );
        }
      } else {
        setError("Season not found");
      }
    } catch (err) {
      console.error("Error fetching season data:", err);
      setError("Failed to load season details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPress = () => {
    if (!season) return;
    console.log("Register button pressed for season:", season.id);

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
            returnPath: "season-details",
          },
        });
        return;
      }
    }

    // Check if this is a doubles season by checking category name
    // Categories like "Men's Doubles", "Women's Doubles", "Mixed Doubles" should go to team pairing
    const doublesSeason = isDoublesSeason(season);
    const categories = getNormalizedCategories(season);

    console.log(
      "Is doubles season?",
      doublesSeason,
      "Categories:",
      categories.map((c) => c?.name),
    );

    if (doublesSeason) {
      // Navigate to doubles team pairing screen
      router.push({
        pathname: "/user-dashboard/doubles-team-pairing" as any,
        params: {
          seasonId: season.id,
          seasonName: season.name,
          leagueId: leagueId || "",
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
        setShowPaymentOptions(true);
      }
    }
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
  };

  const handlePayNow = async (season: Season) => {
    if (!season) return;
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
      const payload = encodeURIComponent(JSON.stringify(checkout));

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
    if (!userId || !season) {
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
        fetchSeasonData(); // Refresh data
      } else {
        console.warn("Registration failed");
        toast.error("Registration failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Error registering:", err);

      // Extract error message from axios error response
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "An error occurred while registering.";

      // Handle specific error cases with user-friendly messages
      if (errorMessage.toLowerCase().includes("already registered")) {
        toast.info("You are already registered for this season!");
        fetchSeasonData(); // Refresh to show current status
      } else {
        toast.error(errorMessage);
      }
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

  const handleJoinMatchPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!season) {
      toast.info("Season data not available");
      return;
    }

    const membership = season.memberships?.find(
      (m: any) => m.userId === userId,
    );
    const divisionId = membership?.divisionId;

    if (!divisionId) {
      toast.info("You are not yet assigned to a division.");
      return;
    }

    const categories = getNormalizedCategories(season);
    const category = categories?.[0];

    router.push({
      pathname: "/match/all-matches" as any,
      params: {
        divisionId,
        sportType:
          selectedSport?.toUpperCase() || sport?.toUpperCase() || "PICKLEBALL",
        leagueName: league?.name || "",
        seasonName: season.name || seasonName,
        gameType: category?.gameType || "",
        genderCategory: category?.genderCategory || "",
        seasonStartDate: dateToParamString(season.startDate),
        seasonEndDate: dateToParamString(season.endDate),
      },
    });
  };

  const handleViewStandingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!season) {
      toast.info("Season data not available");
      return;
    }

    // Get category info for display
    const category = (season as any).category;
    const categories =
      (season as any).categories || (category ? [category] : []);
    const normalizedCategories = Array.isArray(categories)
      ? categories
      : [categories].filter(Boolean);
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
        leagueId: leagueId || "",
        leagueName: league?.name || "",
        categoryName: categoryDisplayName,
        sportType:
          selectedSport?.toUpperCase() || sport?.toUpperCase() || "PICKLEBALL",
        startDate: dateToParamString(season.startDate),
        endDate: dateToParamString(season.endDate),
      },
    });
  };

  const handleJoinWaitlistPress = () => {
    console.log("[Waitlist] handleJoinWaitlistPress called", {
      seasonId: season?.id,
      userId,
      isWaitlisted: waitlistStatus?.isWaitlisted,
      position: waitlistStatus?.position,
    });

    if (!season || !userId) {
      console.log("[Waitlist] Early return - missing season or userId");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If already on waitlist, show leave confirmation dialog
    if (waitlistStatus?.isWaitlisted) {
      console.log("[Waitlist] User is on waitlist, showing leave dialog");
      setShowLeaveWaitlistDialog(true);
      return;
    }

    // Show join waitlist bottom sheet
    console.log("[Waitlist] Showing join waitlist bottom sheet");
    setShowWaitlistBottomSheet(true);
  };

  const handleConfirmJoinWaitlist = async () => {
    console.log("[Waitlist] handleConfirmJoinWaitlist called", {
      seasonId: season?.id,
    });

    if (!season) {
      console.log("[Waitlist] Early return - no season");
      return;
    }

    try {
      setIsJoiningWaitlist(true);
      console.log("[Waitlist] Calling WaitlistService.joinWaitlist...");
      const result = await WaitlistService.joinWaitlist(season.id);
      console.log("[Waitlist] Join result:", result);

      if (result.success) {
        toast.success(`You're #${result.position} on the waitlist!`);
        // Refresh waitlist status
        console.log("[Waitlist] Refreshing waitlist status...");
        const status = await WaitlistService.getStatus(season.id);
        console.log("[Waitlist] Updated status:", status);
        setWaitlistStatus(status);
        setShowWaitlistBottomSheet(false);
      }
    } catch (err: any) {
      console.error("[Waitlist] Error joining waitlist:", err);
      toast.error(err.message || "Failed to join waitlist");
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    console.log("[Waitlist] handleLeaveWaitlist called", {
      seasonId: season?.id,
    });

    if (!season) {
      console.log("[Waitlist] Early return - no season");
      return;
    }

    try {
      setIsJoiningWaitlist(true);
      console.log("[Waitlist] Calling WaitlistService.leaveWaitlist...");
      const result = await WaitlistService.leaveWaitlist(season.id);
      console.log("[Waitlist] Leave result:", result);

      if (result.success) {
        toast.success("You have left the waitlist");
        // Refresh to get latest status
        console.log("[Waitlist] Refreshing waitlist status...");
        const status = await WaitlistService.getStatus(season.id);
        console.log("[Waitlist] Updated status:", status);
        setWaitlistStatus(status);
        setShowLeaveWaitlistDialog(false);
      }
    } catch (err: any) {
      console.error("[Waitlist] Error leaving waitlist:", err);
      toast.error(err.message || "Failed to leave waitlist");
    } finally {
      setIsJoiningWaitlist(false);
    }
  };

  const formatSeasonDate = (date: string | Date | undefined): string => {
    if (!date) return "N/A";
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

  // Get sport-specific info icons based on selectedSport
  const InfoIcons = getSeasonInfoIcons(selectedSport);
  const InfoIcon1 = InfoIcons.Icon1;
  const InfoIcon2 = InfoIcons.Icon2;
  const InfoIcon3 = InfoIcons.Icon3;
  const InfoIcon4 = InfoIcons.Icon4;
  const InfoIcon5 = InfoIcons.Icon5;
  const InfoIcon6 = InfoIcons.Icon6;

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

  const getBannerBackgroundColor = (
    sport: "pickleball" | "tennis" | "padel",
  ): string => {
    switch (sport) {
      case "tennis":
        return "#314116";
      case "padel":
        return "#1A3852";
      case "pickleball":
      default:
        return "#331850";
    }
  };

  const getSubheadingGradientColors = (
    sport: "pickleball" | "tennis" | "padel",
  ): [string, string] => {
    switch (sport) {
      case "tennis":
        return ["#A2E047", "#587A27"];
      case "padel":
        return ["#4DABFE", "#2E6698"];
      case "pickleball":
      default:
        return ["#602E98", "#A04DFE"];
    }
  };

  const getSubheadingTextColor = (
    sport: "pickleball" | "tennis" | "padel",
  ): string => {
    return getSubheadingGradientColors(sport)[0];
  };

  // Helper function to normalize categories (handle both singular and plural)
  const getNormalizedCategories = (season: Season | null): any[] => {
    if (!season) return [];
    const category = (season as any)?.category;
    const categories =
      (season as any)?.categories || (category ? [category] : []);
    const normalizedCategories = Array.isArray(categories)
      ? categories
      : [categories].filter(Boolean);
    return normalizedCategories;
  };

  // Helper function to check if season is doubles
  const isDoublesSeason = (season: Season | null): boolean => {
    if (!season) return false;
    const categories = getNormalizedCategories(season);
    return categories.some(
      (cat) =>
        cat.name?.toLowerCase().includes("doubles") ||
        cat.matchFormat?.toLowerCase().includes("doubles") ||
        (cat as any).game_type === "DOUBLES",
    );
  };

  // Helper function to check if user can JOIN a category based on gender restrictions
  const canUserJoinCategory = (category: any): boolean => {
    if (!category) return false;

    const genderCategory =
      category.gender_category?.toUpperCase() ||
      category.genderCategory?.toUpperCase();
    const genderRestriction = category.genderRestriction?.toUpperCase();
    const categoryGender = genderCategory || genderRestriction;
    const isDoubles =
      CategoryService.getEffectiveGameType(category, "SINGLES") === "DOUBLES";

    // Get user gender from profile data
    const userGender = profileData?.gender?.toUpperCase();

    // If user gender is not yet loaded, allow joining (will be validated on backend)
    if (!userGender) {
      return true;
    }

    // OPEN categories allow all genders - check this FIRST
    if (categoryGender === "OPEN") {
      return true;
    }

    if (userGender === "FEMALE") {
      if (categoryGender === "FEMALE" || categoryGender === "WOMEN")
        return true;
      if (categoryGender === "MIXED" && isDoubles) return true;
      return false;
    }

    if (userGender === "MALE") {
      if (categoryGender === "MALE" || categoryGender === "MEN") return true;
      if (categoryGender === "MIXED" && isDoubles) return true;
      return false;
    }

    return false;
  };

  // Helper function to check if user can join the current season
  const canUserJoinSeason = (season: Season | null): boolean => {
    if (!season) return false;
    const categories = getNormalizedCategories(season);
    return categories.some((cat) => canUserJoinCategory(cat));
  };

  // Button configuration based on user registration status
  const getButtonConfig = () => {
    if (!season || !userId) {
      return {
        text: "Loading...",
        color: "#B2B2B2",
      };
    }

    const userMembership = season.memberships?.find(
      (m: any) => m.userId === userId,
    );
    const isUserRegistered = !!userMembership;

    // For doubles seasons, check if user needs to complete team registration/payment
    const doublesSeason = isDoublesSeason(season);

    // Check if user can join this season based on gender restrictions
    const canJoin = canUserJoinSeason(season);

    // If doubles season and membership is PENDING (not paid), show Register Team
    if (
      doublesSeason &&
      userMembership &&
      userMembership.status === "PENDING"
    ) {
      return {
        text: "Register Team",
        color: "#FEA04D",
        onPress: handleRegisterPress,
        disabled: false,
      };
    }

    // If doubles season and membership was REMOVED (player left), they must re-register and pay again
    if (
      doublesSeason &&
      userMembership &&
      userMembership.status === "REMOVED"
    ) {
      return {
        text: "Join Season",
        color: "#FEA04D",
        onPress: handleRegisterPress,
        disabled: false,
      };
    }

    if (isUserRegistered) {
      // Check if user has been assigned to a division
      const isUserAssignedToDivision = !!(
        userMembership && userMembership.divisionId
      );

      if (!isUserAssignedToDivision) {
        return {
          text: "Awaiting Division Assignment",
          color: "#FEA04D",
          onPress: () =>
            toast.info(
              "Please wait for admin to assign you to a division before viewing the leaderboard.",
            ),
          disabled: false,
        };
      }

      return {
        text: "Join a Match",
        color: "#FEA04D",
        onPress: handleJoinMatchPress,
        disabled: false,
      };
    }

    if (season.status === "ACTIVE") {
      // Check gender restriction - show "View Only" if user cannot join
      if (!canJoin) {
        return {
          text: "View Only",
          color: "#B2B2B2",
          onPress: () =>
            toast.info("This season is restricted to a different gender"),
          disabled: false,
        };
      }
      return {
        text: "Join Season",
        color: "#FEA04D",
        onPress: handleRegisterPress,
        disabled: false,
      };
    }

    if (season.status === "UPCOMING") {
      console.log("[Waitlist] getButtonConfig for UPCOMING season:", {
        canJoin,
        isWaitlisted: waitlistStatus?.isWaitlisted,
        position: waitlistStatus?.position,
        totalWaitlisted: waitlistStatus?.totalWaitlisted,
        isJoiningWaitlist,
      });

      // Check gender restriction for waitlist too
      if (!canJoin) {
        return {
          text: "View Only",
          color: "#B2B2B2",
          onPress: () =>
            toast.info("This season is restricted to a different gender"),
          disabled: false,
        };
      }

      // Already on waitlist - show leave option
      if (waitlistStatus?.isWaitlisted) {
        console.log("[Waitlist] User is on waitlist, showing Leave button");
        return {
          text: `Leave Waitlist (#${waitlistStatus.position})`,
          color: "#6B7280",
          onPress: handleJoinWaitlistPress,
          disabled: isJoiningWaitlist,
        };
      }

      // Check if waitlist is full
      if (waitlistStatus && WaitlistService.isWaitlistFull(waitlistStatus)) {
        console.log("[Waitlist] Waitlist is full");
        return {
          text: "Waitlist Full",
          color: "#B2B2B2",
          onPress: () => toast.info("The waitlist is currently full"),
          disabled: true,
        };
      }

      console.log("[Waitlist] Showing Join Waitlist button");
      return {
        text: isJoiningWaitlist ? "Joining..." : "Join Waitlist",
        color: "#000000",
        onPress: handleJoinWaitlistPress,
        disabled: isJoiningWaitlist,
      };
    }

    return {
      text: "View Standings",
      color: "#B2B2B2",
      onPress: handleViewStandingsPress,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();
  const isAwaitingAssignmentButton =
    buttonConfig.text === "Awaiting Division Assignment";

  // Check if user has partnership for this season (for doubles seasons)
  const hasPartnership = season ? partnerships.has(season.id) : false;
  const partnership = season ? partnerships.get(season.id) : undefined;
  const userMembership = season?.memberships?.find(
    (m: any) => m.userId === userId,
  );
  const isUserRegistered = !!userMembership;

  // Show manage team button for doubles seasons with active partnership
  const showManageTeam =
    isDoublesSeason(season) && hasPartnership && isUserRegistered;

  // Helper function to get available sports for SportSwitcher
  const getUserSelectedSports = () => {
    return ["pickleball", "tennis", "padel"];
  };

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
    return { opacity };
  });

  const bannerContainerAnimatedStyle = useAnimatedStyle(() => {
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

  const collapsedSeasonNameAnimatedStyle = useAnimatedStyle(() => {
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

  const howItWorksEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: howItWorksEntryOpacity.value,
      transform: [{ translateY: howItWorksEntryTranslateY.value }],
    };
  });

  const buttonEntryAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonEntryOpacity.value,
    };
  });

  // Scroll handler — runs on UI thread (Reanimated worklet), works on both iOS & Android
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={sportConfig.color} />
              <Text style={styles.loadingText}>Loading season details...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <TouchableOpacity
                style={styles.errorBackButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/user-dashboard");
                  }
                }}
              >
                <BackButtonIcon width={24} height={24} />
              </TouchableOpacity>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchSeasonData}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Banner Section */}
              <Animated.View
                style={[
                  styles.gradientHeaderContainer,
                  styles.gradientHeaderAbsolute,
                  headerAnimatedStyle,
                  headerEntryAnimatedStyle,
                ]}
              >
                <LinearGradient
                  colors={getHeaderGradientColors(sport)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.seasonHeaderGradient,
                    {
                      flex: 1,
                      paddingTop: isSmallScreen ? 10 : isTablet ? 16 : 12,
                    },
                  ]}
                >
                  <View style={styles.seasonHeaderContent}>
                    <View style={styles.topRow}>
                      <View style={styles.backButtonContainer}>
                        <TouchableOpacity
                          style={styles.backButtonIcon}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            if (router.canGoBack()) {
                              router.back();
                            } else {
                              router.replace("/user-dashboard");
                            }
                          }}
                        >
                          <BackButtonIcon width={12} height={19} />
                        </TouchableOpacity>
                      </View>
                      {/* Collapsed header content */}
                      <Animated.View
                        style={[
                          styles.collapsedHeaderContent,
                          collapsedSeasonNameAnimatedStyle,
                        ]}
                      >
                        <View style={styles.collapsedTitleRow}>
                          <Text
                            style={styles.collapsedCategoryName}
                            numberOfLines={1}
                          >
                            {(() => {
                              const categories =
                                getNormalizedCategories(season);
                              return categories?.[0]?.name || "";
                            })()}
                          </Text>
                          <Text style={styles.collapsedSeasonLabel}>
                            {season?.name || seasonName}
                          </Text>
                        </View>
                        <Text
                          style={styles.collapsedLeagueSubtitle}
                          numberOfLines={1}
                        >
                          {league?.name || ""}
                        </Text>
                      </Animated.View>
                    </View>
                    <Animated.View
                      style={[
                        styles.expandedBannerContainer,
                        bannerContainerAnimatedStyle,
                      ]}
                    >
                      <Text
                        style={styles.expandedCategoryTitle}
                        numberOfLines={2}
                      >
                        {(() => {
                          const categories = getNormalizedCategories(season);
                          return categories?.[0]?.name || "";
                        })()}
                      </Text>
                      <Text style={styles.expandedLeagueName} numberOfLines={1}>
                        {league?.name || ""}
                      </Text>
                      <View style={styles.expandedSeasonPlayerRow}>
                        <Text style={styles.expandedSeasonLabel}>
                          {season?.name || seasonName}
                        </Text>
                        <View style={styles.statusCircle} />
                        <Text style={styles.expandedPlayerCount}>
                          {`${season?._count?.memberships || season?.memberships?.length || 0} players`}
                        </Text>
                      </View>

                      {season?.memberships && season.memberships.length > 0 && (
                        <TouchableOpacity
                          style={styles.profilePicturesContainer}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            );
                            router.push({
                              pathname: "/user-dashboard/players-list",
                              params: {
                                contextType: "season",
                                contextId: seasonId,
                                contextName: season?.name || seasonName,
                                sport: sport,
                                totalPlayers:
                                  season?._count?.memberships ||
                                  season?.memberships?.length ||
                                  0,
                              },
                            });
                          }}
                          activeOpacity={0.7}
                        >
                          {season.memberships
                            .slice(0, 6)
                            .map((membership: any, index: number) => (
                              <View
                                key={membership.id}
                                style={[
                                  styles.memberProfilePicture,
                                  index > 0 &&
                                    styles.memberProfilePictureOverlap,
                                ]}
                              >
                                {membership.user?.image ? (
                                  <Image
                                    source={{ uri: membership.user.image }}
                                    style={styles.memberProfileImage}
                                  />
                                ) : (
                                  <View
                                    style={styles.defaultMemberProfileImage}
                                  >
                                    <Ionicons
                                      name="person"
                                      size={20}
                                      color={getHeaderGradientColors(sport)[0]}
                                    />
                                  </View>
                                )}
                              </View>
                            ))}
                          {season._count?.memberships &&
                            season._count.memberships > 6 && (
                              <View
                                style={[
                                  styles.remainingCount,
                                  styles.memberProfilePictureOverlap,
                                ]}
                              >
                                <Text style={styles.remainingCountText}>
                                  +{season._count.memberships - 6}
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
              >
                {/* Top spacer pushes content below the absolute-positioned header */}
                <View style={styles.scrollTopSpacer} />

                <Animated.View
                  style={[styles.seasonInfoCard, infoCardEntryAnimatedStyle]}
                >
                  <View style={styles.seasonInfoContent}>
                    <View style={styles.seasonInfoTextContainer}>
                      {/* Season name + status badge on the same row */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={[
                            styles.seasonCardTitle,
                            { flex: 1, marginRight: 8 },
                          ]}
                        >
                          {season?.name || seasonName}
                        </Text>

                        {/* Registration status badge */}
                        {(() => {
                          const now = new Date();
                          let label = "Registration Open";
                          let dotColor = "#22C55E";
                          let bgColor = "#F0FDF4";
                          let textColor = "#16A34A";
                          let borderColor = "#BBF7D0";

                          if (
                            season?.startDate &&
                            new Date(season.startDate) <= now
                          ) {
                            label = "In Progress";
                            dotColor = "#3B82F6";
                            bgColor = "#EFF6FF";
                            textColor = "#3B82F6";
                            borderColor = "#BFDBFE";
                          } else if (
                            season?.regiDeadline &&
                            new Date(season.regiDeadline) < now
                          ) {
                            label = "Registration Closed";
                            dotColor = "#EF4444";
                            bgColor = "#FEF2F2";
                            textColor = "#EF4444";
                            borderColor = "#FECACA";
                          } else if (
                            season?.regiDeadline &&
                            new Date(season.regiDeadline) <=
                              new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                          ) {
                            label = "Closing Soon";
                            dotColor = "#F59E0B";
                            bgColor = "#FFFBEB";
                            textColor = "#D97706";
                            borderColor = "#FDE68A";
                          }

                          return (
                            <View
                              style={[
                                styles.statusBadge,
                                { backgroundColor: bgColor, borderColor },
                              ]}
                            >
                              <View
                                style={[
                                  styles.statusBadgeDot,
                                  { backgroundColor: dotColor },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  { color: textColor },
                                ]}
                                numberOfLines={1}
                              >
                                {label}
                              </Text>
                            </View>
                          );
                        })()}
                      </View>

                      {/* Players joined */}
                      <Text style={styles.playersJoinedText}>
                        {season?._count?.memberships ||
                          season?.memberships?.length ||
                          0}{" "}
                        players joined
                      </Text>

                      {/* Stacked detail rows */}
                      <View style={styles.stackedDetailRow}>
                        <Text style={styles.detailLabel}>Entry fee</Text>
                        <Text style={styles.detailValue}>
                          {season?.paymentRequired && formattedEntryFee
                            ? `RM${formattedEntryFee}`
                            : "Free"}
                        </Text>
                      </View>

                      <View style={styles.stackedDetailRow}>
                        <Text style={styles.detailLabel}>
                          Registration closes
                        </Text>
                        <Text style={styles.detailValue}>
                          {season?.regiDeadline
                            ? formatSeasonDate(season.regiDeadline)
                            : "???"}
                        </Text>
                      </View>

                      <View style={styles.stackedDetailRow}>
                        <Text style={styles.detailLabel}>Start</Text>
                        <Text style={styles.detailValue}>
                          {season?.startDate
                            ? formatSeasonDate(season.startDate)
                            : "???"}
                        </Text>
                      </View>

                      <View
                        style={[styles.stackedDetailRow, { marginBottom: 0 }]}
                      >
                        <Text style={styles.detailLabel}>End</Text>
                        <Text style={styles.detailValue}>
                          {season?.endDate
                            ? formatSeasonDate(season.endDate)
                            : "???"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                <Animated.View
                  style={[styles.howItWorksCard, howItWorksEntryAnimatedStyle]}
                >
                  <View style={styles.howItWorksContent}>
                    <Text style={styles.howItWorksTitle}>
                      How{" "}
                      <Text style={styles.howItWorksTitleItalic}>DEUCE</Text>{" "}
                      League Works?
                    </Text>
                    <Text style={styles.howItWorksDescription}>
                      DEUCE runs on a Flex League format — you play on your
                      schedule, at your pace. Friendly competition, but every
                      match counts.
                    </Text>
                    <Text
                      style={[
                        styles.howItWorksSubheadingGradient,
                        { color: getSubheadingTextColor(selectedSport) },
                      ]}
                    >
                      Here's how it goes:
                    </Text>

                    <View style={styles.infoItem}>
                      <InfoIcon1 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>
                          Flexible Scheduling
                        </Text>
                        <Text style={styles.infoItemDescription}>
                          Arrange matches and book courts at a time and place
                          that suits both players. Coordinate with your opponent
                          through in-app chat.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <InfoIcon2 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>Court Fees</Text>
                        <Text style={styles.infoItemDescription}>
                          Court rental is not included in your Season Entry Fee.
                          Split the cost with your opponent each time you play.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <InfoIcon3 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>Fair Play</Text>
                        <Text style={styles.infoItemDescription}>
                          Matches are self-umpired. Keep it respectful, fair and
                          fun — that's what the league runs on.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <InfoIcon4 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>League Goal</Text>
                        <Text style={styles.infoItemDescription}>
                          The season runs for ~8 weeks. Play at least 6 matches
                          to stay competitive for the top spot.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <InfoIcon5 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>
                          Track Your Progress
                        </Text>
                        <Text style={styles.infoItemDescription}>
                          Your{" "}
                          <Text style={styles.infoItemDescriptionItalic}>
                            DEUCE
                          </Text>{" "}
                          Match Rating (DMR) updates live as you submit scores.
                          Watch your progress on your performance chart.
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <InfoIcon6 width={43} height={43} />
                      <View style={styles.infoItemTextContainer}>
                        <Text style={styles.infoItemTitle}>
                          Prizes for Winners
                        </Text>
                        <Text style={styles.infoItemDescription}>
                          Top of the leaderboard? League champions take home
                          prizes, not just bragging rights.
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "center", marginTop: 4 }}>
                      <Text style={styles.endTitle}>
                        Ready to hit the court?
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </Animated.ScrollView>
            </>
          )}
        </View>
      </View>

      {/* Sticky action footer */}
      {!isLoading && !error && season && (
        <View
          style={[
            styles.actionSheetContainer,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          <Animated.View
            style={[
              styles.actionSheetContent,
              styles.stickyButtonColumn,
              buttonEntryAnimatedStyle,
            ]}
          >
            {/* Primary action button — or awaiting assignment label */}
            {isAwaitingAssignmentButton ? (
              <View style={styles.awaitingAssignmentContainer}>
                <Text style={styles.awaitingAssignmentText}>
                  {buttonConfig.text}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.stickyButton,
                  styles.stickyButtonPrimary,
                  buttonConfig.disabled && styles.stickyButtonDisabled,
                ]}
                onPress={buttonConfig.onPress}
                disabled={buttonConfig.disabled}
                activeOpacity={0.8}
              >
                <Text style={styles.stickyButtonText}>{buttonConfig.text}</Text>
              </TouchableOpacity>
            )}

            {/* View Standings secondary button */}
            <TouchableOpacity
              style={[styles.stickyButton, styles.stickyButtonSecondary]}
              onPress={handleViewStandingsPress}
              activeOpacity={0.8}
            >
              <Text style={styles.stickyButtonSecondaryText}>
                View Standings
              </Text>
            </TouchableOpacity>

            {showManageTeam && partnership && (
              <ManageTeamButton
                seasonId={season.id}
                partnershipId={partnership.id}
                size="large"
              />
            )}
          </Animated.View>
        </View>
      )}

      <PaymentOptionsBottomSheet
        visible={showPaymentOptions}
        onClose={handleClosePaymentOptions}
        season={season}
        onPayNow={handlePayNow}
        onPayLater={handlePayLater}
        isProcessingPayment={isProcessingPayment}
        sport={sport}
      />

      {/* Waitlist Bottom Sheet */}
      <WaitlistBottomSheet
        visible={showWaitlistBottomSheet}
        onClose={() => setShowWaitlistBottomSheet(false)}
        onJoin={handleConfirmJoinWaitlist}
        seasonName={season?.name || ""}
        currentWaitlistCount={waitlistStatus?.totalWaitlisted || 0}
        sport={selectedSport}
        isLoading={isJoiningWaitlist}
      />

      {/* Leave Waitlist Dialog */}
      <LeaveWaitlistDialog
        visible={showLeaveWaitlistDialog}
        onClose={() => setShowLeaveWaitlistDialog(false)}
        onConfirm={handleLeaveWaitlist}
        position={waitlistStatus?.position || 0}
        seasonName={season?.name || ""}
        sport={selectedSport}
        isLoading={isJoiningWaitlist}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.white,
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
    paddingBottom: isLargeTablet ? 120 : isTablet ? 140 : 180,
  },
  scrollTopSpacer: {
    height: HEADER_MAX_HEIGHT + 20,
  },
  gradientHeaderContainer: {
    width: "100%",
    overflow: "hidden",
  },
  gradientHeaderAbsolute: {
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
  errorBackButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
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
  seasonHeaderGradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  seasonHeaderContent: {
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 0,
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
  },
  collapsedHeaderContent: {
    position: "absolute",
    left: 52,
    right: 0,
    alignItems: "flex-start",
    top: 0,
    bottom: 0,
    paddingLeft: 12,
    justifyContent: "center",
  },
  collapsedTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  collapsedCategoryName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: "700",
    color: "#FDFDFD",
    flex: 1,
  },
  collapsedSeasonLabel: {
    fontSize: isSmallScreen ? 12 : 13,
    color: "#FDFDFD",
    fontWeight: "600",
  },
  collapsedLeagueSubtitle: {
    fontSize: isSmallScreen ? 11 : 12,
    color: "rgba(255, 255, 255, 0.75)",
  },
  expandedBannerContainer: {
    width: "100%",
  },
  expandedCategoryTitle: {
    fontSize: isSmallScreen ? 20 : isTablet ? 26 : 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  expandedLeagueName: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: 10,
  },
  expandedSeasonPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  expandedSeasonLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 8,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6EC531",
    marginRight: 8,
  },
  expandedPlayerCount: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  profilePicturesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    overflow: "visible",
    paddingBottom: 8,
  },
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
  memberProfilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
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
    backgroundColor: "#FFFFFF",
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
  seasonInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  seasonInfoContent: {
    flexDirection: "column",
  },
  seasonInfoTextContainer: {
    width: "100%",
  },
  seasonInfoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#1A1C1E",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  detailLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#1D1D1F",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#1A1C1E",
    fontWeight: "600",
  },
  seasonCardTitle: {
    fontSize: isSmallScreen ? 20 : 22,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 10,
  },
  playersJoinedText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#747477",
    marginTop: 10,
    marginBottom: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },
  stackedDetailRow: {
    flexDirection: "column",
    paddingTop: 5,
    marginBottom: 14,
  },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: isSmallScreen ? 11 : 12,
    fontWeight: "600",
    maxWidth: isSmallScreen ? 92 : 120,
  },
  howItWorksCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  howItWorksContent: {
    gap: 16,
  },
  howItWorksTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#212427",
  },
  howItWorksTitleItalic: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: "600",
    color: "#212427",
    fontStyle: "italic",
  },
  howItWorksDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#555555",
    lineHeight: 20,
  },
  howItWorksSubheading: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "600",
    color: "#A04DFE",
    marginTop: 8,
  },
  howItWorksSubheadingGradient: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "600",
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 12,
  },
  infoItemTextContainer: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  infoItemDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#747477",
    lineHeight: 20,
  },
  infoItemDescriptionItalic: {
    fontSize: isSmallScreen ? 13 : 14,
    color: "#747477",
    fontStyle: "italic",
  },
  endTitle: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: "600",
    color: "#555555",
    textAlign: "center",
    marginBottom: 6,
  },
  endDescription: {
    fontWeight: "600",
    fontSize: isSmallScreen ? 13 : 14,
    color: "#FEA04D",
    textAlign: "left",
  },
  endButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: theme.colors.background.white,
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    minHeight: isSmallScreen ? 36 : isTablet ? 44 : 40,
  },
  headerRight: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  contentBox: {
    flex: 1,
    backgroundColor: "#F6FAFC",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  actionSheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 12,
    backgroundColor: theme.colors.background.white,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingTop: 12,
  },
  actionSheetContent: {
    width: "100%",
    maxWidth: isLargeTablet ? 760 : isTablet ? 680 : 9999,
    alignSelf: "center",
  },
  stickyButtonRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyButtonColumn: {
    flexDirection: "column",
    gap: 10,
  },
  stickyButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyButtonWithManageTeam: {
    flex: 1,
  },
  stickyButtonPrimary: {
    backgroundColor: "#FEA04D",
  },
  stickyButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FEA04D",
  },
  stickyButtonDisabled: {
    backgroundColor: "#B2B2B2",
  },
  stickyButtonText: {
    fontSize: isLargeTablet ? 18 : isTablet ? 17 : 17,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  stickyButtonSecondaryText: {
    fontSize: isLargeTablet ? 18 : isTablet ? 17 : 17,
    fontWeight: "700",
    color: "#FEA04D",
    textAlign: "center",
  },
  stickyButtonTextSmall: {
    fontSize: 14,
    fontWeight: "600",
  },
  awaitingAssignmentContainer: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  awaitingAssignmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FEA04D",
    textAlign: "center",
  },
});
