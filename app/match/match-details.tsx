import { MatchComment } from "@/app/match/components/types";
import { getSportColors, SportType } from "@/constants/SportsColor";
import { MatchPlayer, MatchResult } from "@/features/standings/types";
import { useSession } from "@/lib/auth-client";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { socketService } from "@/lib/socket-service";
import { useChatStore } from "@/src/features/chat/stores/ChatStore";
import { useMyGamesStore } from "@/src/features/dashboard-user/stores/MyGamesStore";
import { PostMatchShareSheet } from "@/src/features/feed/components";
import { FriendlyBadge } from "@/src/features/friendly/components/FriendlyBadge";
import { CancelMatchSheet } from "@/src/features/match/components/CancelMatchSheet";
import { EditMatchSheet } from "@/src/features/match/components/EditMatchSheet";
import { MatchCommentsSection } from "@/src/features/match/components/MatchCommentsSection";
import { MatchResultSheet } from "@/src/features/match/components/MatchResultSheet";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { styles } from "./match-details.styles";
import { ParticipantWithDetails } from "./match-details.types";
import { formatWalkoverReason, getSportIcon } from "./match-details.utils";

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function JoinMatchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isLoadingMatchDetails, setIsLoadingMatchDetails] = useState(false);
  const [participantsWithDetails, setParticipantsWithDetails] = useState<
    ParticipantWithDetails[]
  >([]);
  const [partnerInfo, setPartnerInfo] = useState<{
    hasPartner: boolean;
    partnerName?: string;
    partnerImage?: string;
    partnerId?: string;
  }>({ hasPartner: false });

  // State for fetched match details (when navigating from notifications with only matchId)
  const [fetchedMatchDetails, setFetchedMatchDetails] = useState<{
    date?: string;
    time?: string;
    location?: string;
    sportType?: string;
    leagueName?: string;
    season?: string;
    division?: string;
    divisionId?: string;
    seasonId?: string;
    courtBooked?: boolean;
    fee?: string;
    feeAmount?: string;
    description?: string;
    duration?: string;
    matchType?: string;
    participants?: any[];
    status?: string;
    isFriendly?: boolean;
  } | null>(null);

  // Match data for result submission logic
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(
    null,
  );

  const [matchData, setMatchData] = useState<{
    createdById: string | null;
    resultSubmittedById: string | null;
    resultSubmittedAt: string | null;
    status: string;
    team1Score: number | null;
    team2Score: number | null;
    isDisputed: boolean;
    matchDate: string | null; // ISO date from database
    genderRestriction?: "MALE" | "FEMALE" | "OPEN" | null;
    skillLevels?: string[];
    isWalkover?: boolean;
    walkoverReason?: string;
    walkover?: {
      defaultingPlayerId: string;
      defaultingPlayer?: { id: string; name: string; image?: string };
      winningPlayerId: string;
      winningPlayer?: { id: string; name: string; image?: string };
      walkoverReasonDetail?: string;
      reportedBy?: string;
      isDisputed?: boolean;
      disputeExpiresAt?: string;
    };
  }>({
    createdById: null,
    resultSubmittedById: null,
    resultSubmittedAt: null,
    status: "SCHEDULED",
    team1Score: null,
    team2Score: null,
    isDisputed: false,
    matchDate: null,
  });

  // Partnership data with captain info
  const [partnershipData, setPartnershipData] = useState<{
    captainId: string | null;
    partnerId: string | null;
  }>({ captainId: null, partnerId: null });

  // Auto-approval countdown state
  const [autoApprovalCountdown, setAutoApprovalCountdown] = useState<{
    hours: number;
    minutes: number;
    expired: boolean;
  } | null>(null);

  // Comments state
  const [comments, setComments] = useState<MatchComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [scorecardScores, setScorecardScores] = useState<{
    setScores: any[];
    gameScores: any[];
  }>({ setScores: [], gameScores: [] });

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const cancelSheetRef = useRef<BottomSheetModal>(null);
  const editMatchSheetRef = useRef<BottomSheetModal>(null);
  const postMatchShareSheetRef = useRef<BottomSheet>(null);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [isShareSheetLoading, setIsShareSheetLoading] = useState(false);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Parse params - use fetched data as fallback when navigating from notifications
  const matchId = params.matchId as string;
  const matchType =
    (params.matchType as string) || fetchedMatchDetails?.matchType || "SINGLES";
  const date = (params.date as string) || fetchedMatchDetails?.date || "";
  const time = (params.time as string) || fetchedMatchDetails?.time || "";
  const location =
    (params.location as string) || fetchedMatchDetails?.location || "";
  const sportType =
    (params.sportType as string) || fetchedMatchDetails?.sportType || "";
  const leagueName =
    (params.leagueName as string) || fetchedMatchDetails?.leagueName || "";
  const season = (params.season as string) || fetchedMatchDetails?.season || "";
  const division =
    (params.division as string) || fetchedMatchDetails?.division || "";
  const courtBooked =
    params.courtBooked === "true" || fetchedMatchDetails?.courtBooked || false;
  const fee = (params.fee as string) || fetchedMatchDetails?.fee || "FREE";
  const feeAmount =
    (params.feeAmount as string) || fetchedMatchDetails?.feeAmount || "0";
  const description =
    (params.description as string) || fetchedMatchDetails?.description || "";
  const duration =
    (params.duration as string) || fetchedMatchDetails?.duration || "2";
  const divisionId =
    (params.divisionId as string) || fetchedMatchDetails?.divisionId || "";
  const seasonId =
    (params.seasonId as string) || fetchedMatchDetails?.seasonId || "";
  const participants = params.participants
    ? JSON.parse(params.participants as string)
    : fetchedMatchDetails?.participants || [];
  const matchStatus =
    (params.status as string) || fetchedMatchDetails?.status || "SCHEDULED";
  const isFriendly =
    params.isFriendly === "true" || fetchedMatchDetails?.isFriendly || false;

  // Helper function to get reliable match status
  const getReliableStatus = (): string => {
    const urlStatus = matchStatus?.toUpperCase();
    const apiStatus = matchData.status?.toUpperCase();

    // Trust URL params for completed states (most up-to-date)
    if (urlStatus === "COMPLETED" || urlStatus === "FINISHED") {
      return urlStatus;
    }

    // Otherwise use API data with URL fallback
    return apiStatus || urlStatus;
  };

  // Share mode - auto-open share sheet when navigating from match history
  const shareMode = params.shareMode === "true";
  // Chat message params - used to update the message bubble after joining
  const chatMessageId = params.messageId as string | undefined;
  const chatThreadId = params.threadId as string | undefined;

  // Fetch full match details when navigating with only matchId (from notifications)
  useEffect(() => {
    const fetchFullMatchDetails = async () => {
      // Only fetch if we have matchId but missing essential display data
      if (!matchId || !session?.user?.id) return;

      // Check if we already have the essential params from URL
      const hasEssentialParams =
        params.date && params.time && params.participants;
      const needsScoreData =
        matchData.team1Score == null && matchData.team2Score == null;
      if (hasEssentialParams && !needsScoreData) return;

      setIsLoadingMatchDetails(true);
      try {
        let data = null;

        // If we know it's a friendly match from params, try that first
        if (params.isFriendly === "true") {
          try {
            const response = await axiosInstance.get(
              endpoints.friendly.getDetails(matchId),
            );
            data = response.data?.data;
          } catch (friendlyError) {
            if (__DEV__)
              console.log("Not a friendly match, trying league endpoint");
          }
        }

        // Try league match endpoint if friendly didn't work or wasn't specified
        if (!data) {
          try {
            const response = await axiosInstance.get(
              endpoints.match.getDetails(matchId),
            );
            data = response.data?.data;
          } catch (leagueError) {
            // If league fails, try friendly as fallback
            try {
              const response = await axiosInstance.get(
                endpoints.friendly.getDetails(matchId),
              );
              data = response.data?.data;
            } catch (friendlyError) {
              // Both failed, throw the original error
              throw leagueError;
            }
          }
        }

        if (data) {
          // Parse scores based on backend data structure:
          // - Pickleball: uses setScores JSON field or pickleballScores relation with team1Points/team2Points
          // - Tennis/Padel: uses scores relation (MatchScore[]) with player1Games/player2Games

          const normalizedSport = (
            data.sportType ||
            sportType ||
            ""
          ).toUpperCase();
          const isPickleballMatch = normalizedSport === "PICKLEBALL";

          if (isPickleballMatch) {
            // For pickleball: try pickleballScores relation first, then setScores JSON
            const pickleballScores =
              data.pickleballScores ||
              (typeof data.setScores === "string"
                ? JSON.parse(data.setScores)
                : data.setScores);
            if (
              pickleballScores &&
              Array.isArray(pickleballScores) &&
              pickleballScores.length > 0
            ) {
              // Map pickleball scores to gameScores format (team1Points/team2Points)
              const gameScores = pickleballScores.map((score: any) => ({
                gameNumber: score.gameNumber || score.setNumber,
                team1Points: score.team1Points ?? score.player1Points ?? 0,
                team2Points: score.team2Points ?? score.player2Points ?? 0,
              }));
              setScorecardScores({ setScores: [], gameScores });
            }
          } else {
            // For tennis/padel: use scores relation (MatchScore[])
            const tennisScores = data.scores;
            if (
              tennisScores &&
              Array.isArray(tennisScores) &&
              tennisScores.length > 0
            ) {
              // Map MatchScore to setScores format (team1Games/team2Games)
              const setScores = tennisScores.map((score: any) => ({
                setNumber: score.setNumber,
                team1Games: score.player1Games ?? 0,
                team2Games: score.player2Games ?? 0,
              }));
              setScorecardScores({ setScores, gameScores: [] });
            }
          }
          setFetchedMatchDetails({
            date: data.date,
            time: data.time,
            location: data.location,
            sportType: data.sportType,
            leagueName: data.leagueName,
            season: data.season,
            division: data.division,
            divisionId: data.divisionId,
            seasonId: data.seasonId,
            courtBooked: data.courtBooked,
            fee: data.fee,
            feeAmount: data.feeAmount,
            description: data.description,
            duration: data.duration?.toString(),
            matchType: data.matchType,
            participants: data.participants,
            status: data.status,
            isFriendly: data.isFriendly,
          });

          // Also set the participants with details since we have user info
          if (data.participants && data.participants.length > 0) {
            setParticipantsWithDetails(
              data.participants.map((p: any) => ({
                userId: p.userId,
                name: p.name,
                image: p.image,
                role: p.role,
                team: p.team,
                invitationStatus: p.invitationStatus,
              })),
            );
          }

          // Set additional match data for result submission logic
          setMatchData((prev) => ({
            ...prev,
            createdById: data.createdById || null,
            resultSubmittedById: data.resultSubmittedById || null,
            resultSubmittedAt: data.resultSubmittedAt || null,
            status: data.status || "SCHEDULED",
            team1Score: data.team1Score ?? null,
            team2Score: data.team2Score ?? null,
            isDisputed: data.isDisputed || false,
            matchDate: data.matchDate || null,
            genderRestriction: data.genderRestriction || null,
            skillLevels: data.skillLevels || [],
            isWalkover: data.isWalkover || false,
            walkoverReason: data.walkoverReason || null,
            walkover: data.walkover || null,
          }));
        }
      } catch (error) {
        if (__DEV__) console.error("Error fetching match details:", error);
        toast.error("Failed to load match details");
      } finally {
        setIsLoadingMatchDetails(false);
      }
    };

    fetchFullMatchDetails();
  }, [
    matchId,
    session?.user?.id,
    params.date,
    params.time,
    params.participants,
    params.isFriendly,
    matchData.team1Score,
    matchData.team2Score,
  ]);

  // Snap points for match result sheet
  const snapPoints = useMemo(() => ["75%", "90%"], []);
  const initialSnapIndex = useMemo(() => 1, []);

  // Handler to expand bottom sheet when friendly match tab is selected
  const handleExpandSheet = useCallback(() => {
    bottomSheetModalRef.current?.snapToIndex(2);
  }, []);

  // Handler to collapse bottom sheet when casual play tab is selected
  const handleCollapseSheet = useCallback(() => {
    bottomSheetModalRef.current?.snapToIndex(1);
  }, []);

  const sportColors = getSportColors(sportType?.toUpperCase() as SportType);
  const themeColor = sportColors.background;
  const isPickleball = sportType?.toUpperCase() === "PICKLEBALL";

  const scorecardMatch = useMemo<MatchResult>(() => {
    const roster =
      participantsWithDetails.length > 0
        ? participantsWithDetails
        : participants;
    const normalizeTeam = (team?: string) => (team || "").toLowerCase();
    const team1Candidates = roster.filter((p: any) => {
      const team = normalizeTeam(p.team);
      return team === "team1" || team === "team_a" || team === "a";
    });
    const team2Candidates = roster.filter((p: any) => {
      const team = normalizeTeam(p.team);
      return team === "team2" || team === "team_b" || team === "b";
    });

    const fallbackTeamSize = matchType === "SINGLES" ? 1 : 2;
    const fallbackTeam1 = roster.slice(0, fallbackTeamSize);
    const fallbackTeam2 = roster.slice(fallbackTeamSize, fallbackTeamSize * 2);

    const toPlayer = (p: any): MatchPlayer => ({
      id: p.userId || p.id || "",
      name: p.name || p.user?.name || null,
      username: p.username || p.user?.username,
      image: p.image || p.user?.image || null,
    });

    const team1Players = (
      team1Candidates.length > 0 ? team1Candidates : fallbackTeam1
    ).map(toPlayer);
    const team2Players = (
      team2Candidates.length > 0 ? team2Candidates : fallbackTeam2
    ).map(toPlayer);

    const team1Score = matchData.team1Score ?? 0;
    const team2Score = matchData.team2Score ?? 0;
    const outcome =
      team1Score === team2Score
        ? ""
        : team1Score > team2Score
          ? "team1"
          : "team2";

    return {
      id: matchId,
      matchType,
      matchDate: matchData.matchDate || new Date().toISOString(),
      sport: sportType,
      team1Score,
      team2Score,
      outcome,
      setScores: scorecardScores.setScores,
      gameScores: scorecardScores.gameScores,
      team1Players,
      team2Players,
      isWalkover: matchData.isWalkover ?? false,
      isFriendly,
      location,
      leagueName,
      seasonName: season,
      divisionName: division,
    };
  }, [
    participantsWithDetails,
    participants,
    matchType,
    matchData,
    matchId,
    sportType,
    isFriendly,
    location,
    leagueName,
    season,
    division,
    scorecardScores,
  ]);

  // Backdrop component for bottom sheet
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const SportIcon = getSportIcon(sportType);

  // Fetch participant details
  useEffect(() => {
    if (participants.length > 0 && participantsWithDetails.length === 0) {
      fetchParticipantDetails();
    }
  }, []);

  // Fetch match data (createdById, resultSubmittedById, status)
  const fetchMatchData = useCallback(async () => {
    if (!matchId || !session?.user?.id) return;

    try {
      const fetchPath = isFriendly
        ? `/api/friendly/${matchId}`
        : `/api/match/${matchId}`;

      const response = await authenticatedFetch(fetchPath, {
        cache: "no-cache",
      });

      if (response.ok) {
        const data = await response.json();
        const unwrapped = data?.data ?? data;
        const match = unwrapped.match || unwrapped;
        // Find this user's pending invitation ID (for direct accept)
        if (match.invitations && session?.user?.id) {
          const myInvite = match.invitations.find(
            (inv: any) =>
              inv.inviteeId === session.user.id && inv.status === "PENDING",
          );
          setPendingInvitationId(myInvite?.id ?? null);
        }
        setMatchData({
          createdById: match.createdById || null,
          resultSubmittedById: match.resultSubmittedById || null,
          resultSubmittedAt: match.resultSubmittedAt || null,
          status: match.status || "SCHEDULED",
          team1Score: match.team1Score ?? match.playerScore ?? null,
          team2Score: match.team2Score ?? match.opponentScore ?? null,
          isDisputed: match.isDisputed || false,
          matchDate: match.matchDate || match.scheduledStartTime || null,
          genderRestriction: match.genderRestriction || null,
          skillLevels: match.skillLevels || [],
          isWalkover: match.isWalkover || false,
          walkoverReason: match.walkoverReason || null,
          walkover: match.walkover || null,
        });
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching match data:", error);
    }
  }, [matchId, session?.user?.id, isFriendly]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  // Fetch partnership info for doubles
  useEffect(() => {
    if (matchType === "DOUBLES" && session?.user?.id && seasonId) {
      fetchPartnershipInfo();
    }
  }, [matchType, session?.user?.id, seasonId]);

  // Listen for real-time match updates
  useEffect(() => {
    const handleMatchUpdate = (data: any) => {
      if (__DEV__) console.log("Match updated in real-time:", data);

      // If this is our match, refresh participant details
      if (data.matchId === matchId) {
        if (data.participants) {
          // Update participants with new data
          fetchParticipantDetails();
          toast.success("Match updated - new player joined!");
        }
      }
    };

    // Subscribe to match update events
    socketService.on("match_participant_joined", handleMatchUpdate);
    socketService.on("match_updated", handleMatchUpdate);

    // Cleanup on unmount
    return () => {
      socketService.off("match_participant_joined", handleMatchUpdate);
      socketService.off("match_updated", handleMatchUpdate);
    };
  }, [matchId]);

  // Fetch comments for the match
  const fetchComments = useCallback(async () => {
    if (!matchId) return;

    setIsLoadingComments(true);
    try {
      const endpoint = isFriendly
        ? endpoints.friendly.getComments(matchId)
        : endpoints.match.getComments(matchId);
      const response = await axiosInstance.get(endpoint);
      const payload = response.data?.data ?? response.data;
      // Normalize to an array for rendering
      setComments(Array.isArray(payload) ? payload : []);
    } catch (error) {
      if (__DEV__) console.error("Failed to fetch comments:", error);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  }, [matchId, isFriendly]);

  // Fetch comments on mount and when match changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Join match room for real-time updates and listen for comment events
  useEffect(() => {
    if (!matchId) return;

    // Join the match room to receive real-time updates
    socketService.joinMatch(matchId);

    const handleCommentAdded = (data: { comment: MatchComment }) => {
      if (__DEV__) console.log("New comment received:", data);
      // Avoid duplicates - check if comment already exists
      setComments((prev) => {
        if (prev.some((c) => c.id === data.comment.id)) {
          return prev;
        }
        return [...prev, data.comment];
      });
    };

    const handleCommentUpdated = (data: { comment: MatchComment }) => {
      if (__DEV__) console.log("Comment updated:", data);
      setComments((prev) =>
        prev.map((c) => (c.id === data.comment.id ? data.comment : c)),
      );
    };

    const handleCommentDeleted = (data: { commentId: string }) => {
      if (__DEV__) console.log("Comment deleted:", data);
      setComments((prev) => prev.filter((c) => c.id !== data.commentId));
    };

    socketService.on("match_comment_added", handleCommentAdded);
    socketService.on("match_comment_updated", handleCommentUpdated);
    socketService.on("match_comment_deleted", handleCommentDeleted);

    return () => {
      // Leave match room and remove listeners on cleanup
      socketService.leaveMatch(matchId);
      socketService.off("match_comment_added", handleCommentAdded);
      socketService.off("match_comment_updated", handleCommentUpdated);
      socketService.off("match_comment_deleted", handleCommentDeleted);
    };
  }, [matchId]);

  // Comment handlers - update local state immediately, socket will sync across devices
  const handleCreateComment = async (text: string) => {
    const endpoint = isFriendly
      ? endpoints.friendly.createComment(matchId)
      : endpoints.match.createComment(matchId);
    const response = await axiosInstance.post(endpoint, { comment: text });
    // Update local state immediately with the response
    const newComment = response.data?.data ?? response.data;
    setComments((prev) => {
      // Avoid duplicates in case socket already added it
      if (prev.some((c) => c.id === newComment.id)) {
        return prev;
      }
      return [...prev, newComment];
    });
  };

  const handleUpdateComment = async (commentId: string, text: string) => {
    const endpoint = isFriendly
      ? endpoints.friendly.updateComment(matchId, commentId)
      : endpoints.match.updateComment(matchId, commentId);
    const response = await axiosInstance.put(endpoint, { comment: text });
    // Update local state immediately with the response
    const updatedComment = response.data?.data ?? response.data;
    setComments((prev) =>
      prev.map((c) => (c.id === updatedComment.id ? updatedComment : c)),
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    const endpoint = isFriendly
      ? endpoints.friendly.deleteComment(matchId, commentId)
      : endpoints.match.deleteComment(matchId, commentId);
    await axiosInstance.delete(endpoint);
    // Update local state immediately
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // Auto-approval countdown timer (24 hours from result submission)
  useEffect(() => {
    // Only show countdown when match is ONGOING (result submitted, awaiting confirmation)
    const status = getReliableStatus();
    if (status !== "ONGOING" || !matchData.resultSubmittedAt) {
      setAutoApprovalCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const submittedAt = new Date(matchData.resultSubmittedAt!).getTime();
      const autoApprovalTime = submittedAt + 24 * 60 * 60 * 1000; // 24 hours in ms
      const now = Date.now();
      const remaining = autoApprovalTime - now;

      if (remaining <= 0) {
        setAutoApprovalCountdown({ hours: 0, minutes: 0, expired: true });
        return;
      }

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      setAutoApprovalCountdown({ hours, minutes, expired: false });
    };

    // Calculate immediately
    calculateCountdown();

    // Update every minute
    const intervalId = setInterval(calculateCountdown, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [matchData.status, matchData.resultSubmittedAt]);

  // Entry animation effect - triggers when participants are loaded
  useEffect(() => {
    if (
      participantsWithDetails.length > 0 &&
      !hasPlayedEntryAnimation.current
    ) {
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
    participantsWithDetails,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  // Auto-open share sheet when navigating with shareMode=true (from match history)
  useEffect(() => {
    if (
      shareMode &&
      participantsWithDetails.length > 0 &&
      !isLoadingMatchDetails
    ) {
      // Small delay to ensure the page is fully rendered
      const timer = setTimeout(() => {
        setIsShareSheetLoading(true);
        setShowSharePrompt(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shareMode, participantsWithDetails, isLoadingMatchDetails]);

  const fetchParticipantDetails = async () => {
    try {
      // Fetch details for each participant.
      // Support two participant shapes:
      //   League:   { userId, role, team, invitationStatus }
      //   Friendly: { user: { id, name, image }, role, team?, invitationStatus }
      const detailsPromises = participants.map(async (p: any) => {
        const userId = p.userId || p.user?.id;
        const existingName = p.name || p.user?.name;
        const existingImage = p.image ?? p.user?.image ?? null;

        // If participant data is already embedded (friendly format), skip API call
        if (existingName) {
          return {
            userId,
            name: existingName,
            image: existingImage,
            role: p.role,
            team: p.team,
            invitationStatus: p.invitationStatus,
          };
        }

        try {
          const response = await authenticatedFetch(`/api/player/${userId}`);

          if (response.ok) {
            const data = await response.json();
            const player = data.data || data;
            return {
              userId,
              name: player.name,
              image: player.image,
              role: p.role,
              team: p.team,
              invitationStatus: p.invitationStatus,
            };
          }
        } catch (error) {}

        return {
          userId,
          name: "Unknown Player",
          image: null,
          role: p.role,
          team: p.team,
          invitationStatus: p.invitationStatus,
        };
      });

      const details = await Promise.all(detailsPromises);
      setParticipantsWithDetails(details);
    } catch (error) {}
  };

  const fetchPartnershipInfo = async () => {
    try {
      const response = await authenticatedFetch(
        `/api/pairing/partnership/active/${seasonId}`,
      );

      if (__DEV__) console.log("Partnership response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        if (__DEV__)
          console.log(
            "Partnership data received:",
            JSON.stringify(data, null, 2),
          );

        // Handle different response structures
        const partnership = data.partnership || data.data || data;

        if (partnership && (partnership.captainId || partnership.captain)) {
          const currentUserId = session?.user?.id;
          const captainId = partnership.captainId || partnership.captain?.id;
          const partnerId = partnership.partnerId || partnership.partner?.id;
          const isUserCaptain = captainId === currentUserId;
          const isUserPartner = partnerId === currentUserId;

          if (__DEV__)
            console.log("[JOIN_DEBUG] Partnership roles computed", {
              captainId,
              partnerId,
              currentUserId,
              isUserCaptain,
              isUserPartner,
            });

          // Save partnership data for result submission logic
          setPartnershipData({
            captainId: captainId || null,
            partnerId: partnerId || null,
          });

          // Any partner can join - invitation will be sent to the other
          if (isUserCaptain || isUserPartner) {
            const otherUser = isUserCaptain
              ? partnership.partner
              : partnership.captain;
            if (__DEV__)
              console.log("[JOIN_DEBUG] Setting hasPartner=true", {
                otherUser,
              });
            setPartnerInfo({
              hasPartner: true,
              partnerName: otherUser?.name || "Partner",
              partnerImage: otherUser?.image,
              partnerId: otherUser?.id,
            });
          } else {
            if (__DEV__)
              console.log(
                "[JOIN_DEBUG] User is neither captain nor partner → hasPartner=false",
              );
            setPartnerInfo({
              hasPartner: false,
            });
          }
        } else {
          if (__DEV__)
            console.log(
              "[JOIN_DEBUG] No valid partnership in response → hasPartner=false",
            );
          setPartnerInfo({
            hasPartner: false,
          });
        }
      } else {
        if (__DEV__)
          console.log("Partnership fetch failed with status:", response.status);
        const errorText = await response.text();
        if (__DEV__) console.log("Error response:", errorText);
      }
    } catch (error) {
      if (__DEV__) console.error("Error fetching partnership:", error);
    }
  };

  // Only count ACCEPTED participants for slot/fullness calculations
  // PENDING participants hold an invitation but haven't confirmed — the slot is still technically open
  const acceptedParticipants = participants.filter(
    (p: any) => p.invitationStatus === "ACCEPTED",
  );
  const pairSlots =
    matchType === "DOUBLES"
      ? 2 - Math.ceil(acceptedParticipants.length / 2)
      : 0;

  // True when at least one non-creator participant has accepted or has a pending invitation
  const hasOpponentJoined = participants.some(
    (p: any) =>
      (p.userId || p.user?.id) !== matchData.createdById &&
      (p.invitationStatus === "ACCEPTED" || p.invitationStatus === "PENDING"),
  );

  // Check if all slots are filled (ACCEPTED only — matches backend BUG 5 guard)
  const requiredParticipants = matchType === "DOUBLES" ? 4 : 2;
  const allSlotsFilled = acceptedParticipants.length >= requiredParticipants;

  // Check if ALL participants have accepted their invitations
  const allParticipantsAccepted =
    participants.length > 0 &&
    participants.every((p: any) => p.invitationStatus === "ACCEPTED");

  // Check if match time has been reached (allows result submission)
  // For SCHEDULED matches: can submit from match start time onwards (no upper limit for overdue)
  const isMatchTimeReached = () => {
    // Try using matchData.matchDate first (ISO format from API - more reliable)
    if (matchData.matchDate) {
      try {
        const matchStartTime = new Date(matchData.matchDate);
        if (!isNaN(matchStartTime.getTime())) {
          const now = new Date();
          // Match time is reached if current time >= match start time
          return now >= matchStartTime;
        }
      } catch (error) {
        if (__DEV__) console.error("Error parsing matchData.matchDate:", error);
      }
    }

    // Fallback to URL params (date and time)
    if (!date || !time) {
      return false;
    }

    try {
      // Parse date using manual parsing for "Dec 04, 2025" format
      const datePartsMatch = date.match(/(\w+)\s+(\d+),\s+(\d+)/);
      if (!datePartsMatch) {
        if (__DEV__) console.error("Invalid date format:", date);
        return false;
      }

      const [, monthStr, day, year] = datePartsMatch;
      const monthMap: { [key: string]: number } = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      const month = monthMap[monthStr];
      if (month === undefined) {
        if (__DEV__) console.error("Invalid month:", monthStr);
        return false;
      }

      // Parse time using manual parsing for "1:30 PM" format
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) {
        if (__DEV__) console.error("Invalid time format:", time);
        return false;
      }

      const [, hourStr, minuteStr, period] = timeMatch;
      let hours = parseInt(hourStr);
      const minutes = parseInt(minuteStr);

      // Convert to 24-hour format
      if (period.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      // Create match start time
      const matchStartTime = new Date(
        parseInt(year),
        month,
        parseInt(day),
        hours,
        minutes,
      );

      // Validate the date
      if (isNaN(matchStartTime.getTime())) {
        if (__DEV__)
          console.error("Invalid date created:", {
            date,
            time,
            matchStartTime,
          });
        return false;
      }

      const now = new Date();

      // Match time is reached if current time >= match start time
      // (No upper limit - overdue matches should still allow result submission)
      return now >= matchStartTime;
    } catch (error) {
      if (__DEV__)
        console.error("Error parsing match date/time:", error, { date, time });
      return false;
    }
  };

  const canStartMatch =
    allSlotsFilled && isMatchTimeReached() && allParticipantsAccepted;

  // Get match status badge with real-time progression
  const getStatusBadge = () => {
    const status = matchStatus.toUpperCase();

    let badgeColor = "#E5E7EB";
    let textColor = "#6B7280";
    let statusText = "Open";

    // Calculate time-based status
    const getTimeBasedStatus = () => {
      if (!date || !time) return null;

      try {
        const datePartsMatch = date.match(/(\w+)\s+(\d+),\s+(\d+)/);
        if (!datePartsMatch) return null;

        const [, monthStr, day, year] = datePartsMatch;
        const monthMap: { [key: string]: number } = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        };
        const month = monthMap[monthStr];
        if (month === undefined) return null;

        const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return null;

        const [, hourStr, minuteStr, period] = timeMatch;
        let hours = parseInt(hourStr);
        const minutes = parseInt(minuteStr);

        if (period.toUpperCase() === "PM" && hours !== 12) {
          hours += 12;
        } else if (period.toUpperCase() === "AM" && hours === 12) {
          hours = 0;
        }

        const matchStartTime = new Date(
          parseInt(year),
          month,
          parseInt(day),
          hours,
          minutes,
        );
        if (isNaN(matchStartTime.getTime())) return null;

        const matchDuration = parseInt(duration || "2");
        const graceHours = 1;
        const matchEndTime = new Date(
          matchStartTime.getTime() +
            (matchDuration + graceHours) * 60 * 60 * 1000,
        );

        const now = new Date();

        // Before match starts
        if (now < matchStartTime) {
          return "scheduled";
        }
        // Match is ongoing (between start and end of duration)
        else if (
          now >= matchStartTime &&
          now <=
            new Date(matchStartTime.getTime() + matchDuration * 60 * 60 * 1000)
        ) {
          return "in_progress";
        }
        // Grace period (duration ended but within grace time)
        else if (
          now >
            new Date(
              matchStartTime.getTime() + matchDuration * 60 * 60 * 1000,
            ) &&
          now <= matchEndTime
        ) {
          return "time_passed";
        }
        // After grace period
        else {
          return "time_passed";
        }
      } catch (error) {
        return null;
      }
    };

    const timeBasedStatus = getTimeBasedStatus();

    // Status priority: DB status > time-based status
    switch (status) {
      case "COMPLETED":
      case "FINISHED":
        if (matchData.isWalkover) {
          badgeColor = "#FEF3C7"; // Amber background
          textColor = "#92400E"; // Amber text
          statusText = "Walkover";
        } else {
          badgeColor = "#D1FAE5";
          textColor = "#000000ff";
          statusText = "Finished";
        }
        break;
      case "WALKOVER_PENDING":
        badgeColor = "#FEF3C7"; // Amber background
        textColor = "#92400E"; // Amber text
        statusText = "Pending Dispute";
        break;
      case "CANCELLED":
        badgeColor = "#FEE2E2";
        textColor = "#991B1B";
        statusText = "Cancelled";
        break;
      case "ONGOING":
      case "IN_PROGRESS":
        // Check if match is disputed
        if (matchData.isDisputed) {
          badgeColor = "#FEE2E2";
          textColor = "#991B1B";
          statusText = "Disputed";
        } else {
          badgeColor = "#D1FAE5";
          textColor = "#065F46";
          statusText = "In Progress";
        }
        break;
      case "DRAFT":
        // Match created but invitations expired/declined
        badgeColor = "#F3F4F6";
        textColor = "#6B7280";
        statusText = "Draft";
        break;
      case "VOID":
        // Match voided by admin
        badgeColor = "#FEE2E2";
        textColor = "#991B1B";
        statusText = "Voided";
        break;
      case "UNFINISHED":
        // Match started but not completed
        badgeColor = "#FEF3C7";
        textColor = "#92400E";
        statusText = "Unfinished";
        break;
      case "OPEN":
      case "SCHEDULED":
      default:
        // Use time-based status for open/scheduled matches
        if (timeBasedStatus === "in_progress") {
          badgeColor = "#D1FAE5";
          textColor = "#065F46";
          statusText = "In Progress";
        } else if (timeBasedStatus === "time_passed") {
          badgeColor = "#FEE2E2";
          textColor = "#991B1B";
          statusText = "Time Passed";
        } else if (allSlotsFilled) {
          badgeColor = "#FEF3C7";
          textColor = "#92400E";
          statusText = "Scheduled";
        } else {
          badgeColor = "#DBEAFE";
          textColor = "#1E40AF";
          statusText = "Open";
        }
    }

    return { badgeColor, textColor, statusText };
  };

  const statusBadge = getStatusBadge();

  const handleJoinMatch = async () => {
    if (!session?.user?.id || !matchId) {
      toast.error("Unable to join match");
      return;
    }

    setLoading(true);
    try {
      const payload: any = { asPartner: false };

      if (matchType === "DOUBLES" && partnerInfo.partnerId) {
        payload.partnerId = partnerInfo.partnerId;
      }

      // Use different endpoint for friendly matches (no division/league/season checks)
      const joinPath = isFriendly
        ? `/api/friendly/${matchId}/join`
        : `/api/match/${matchId}/join`;

      const response = await authenticatedFetch(joinPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // Server returned non-JSON response (e.g. HTML error page)
        }
        if (errorData.error?.includes("already a participant")) {
          toast.info("You are already in this match");
          router.back();
          return;
        }
        throw new Error(errorData.error || "Failed to join match");
      }

      const resultRaw = await response.json();
      const result = resultRaw?.data ?? resultRaw;

      // Update the chat message to reflect joined status
      // This ensures MatchMessageBubble shows "Joined" when navigating back
      if (chatMessageId && chatThreadId) {
        const { updateMessage, messages } = useChatStore.getState();
        const threadMessages = messages[chatThreadId];
        const existingMessage = threadMessages?.find(
          (m) => m.id === chatMessageId,
        );

        if (existingMessage?.matchData) {
          // Create new participant entry for the current user
          const newParticipant = {
            userId: session.user.id,
            invitationStatus: "ACCEPTED",
          };

          // Merge existing participants with new ones from response or add current user
          const updatedParticipants = result.participants || [
            ...(existingMessage.matchData.participants || []),
            newParticipant,
          ];

          updateMessage(chatMessageId, {
            matchData: {
              ...existingMessage.matchData,
              participants: updatedParticipants,
            },
          });
        }
      }

      // Trigger My Games refresh so the joined match is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success("Successfully joined match!");
      if (chatMessageId && chatThreadId) {
        // Came from a chat match bubble — navigate to MyGames instead of back to chat
        const sport = sportType?.toLowerCase() || "pickleball";
        router.push(`/user-dashboard?view=myGames&sport=${sport}`);
      } else {
        router.back();
      }
    } catch (error: any) {
      if (__DEV__) console.error("Error joining match:", error);
      toast.error(error.message || "Failed to join match");
    } finally {
      setLoading(false);
    }
  };

  // For friendly matches, anyone can join doubles without a partnership
  // For league matches, doubles require an active partnership
  const canJoin =
    matchType === "SINGLES" ||
    (matchType === "DOUBLES" && (isFriendly || partnerInfo.hasPartner));

  // Check if current user is a participant
  const isUserParticipant = participants.some(
    (p: any) => p.userId === session?.user?.id,
  );

  // Check current user's invitation status
  const currentUserParticipant = participants.find(
    (p: any) => p.userId === session?.user?.id,
  );
  const isUserPendingInvite =
    currentUserParticipant?.invitationStatus === "PENDING";

  // Handler to navigate to My Games Invites tab
  const handleGoToInvites = () => {
    router.push("/user-dashboard?view=myGames&tab=INVITES");
  };

  // Accept the pending invitation directly from match-details
  const handleAcceptInvite = async () => {
    if (!pendingInvitationId) {
      // Fallback: navigate to Invites tab if we don't have the ID
      handleGoToInvites();
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.post(
        endpoints.match.respondToInvitation(pendingInvitationId),
        { accept: true },
      );
      toast.success("Invitation accepted!");
      useMyGamesStore.getState().triggerRefresh();
      router.back();
    } catch (error: any) {
      if (__DEV__) console.error("Error accepting invitation:", error);
      toast.error(
        error?.response?.data?.error || "Failed to accept invitation",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handler for submitting match result
  const handleSubmitResult = async (data: {
    setScores?: any[];
    gameScores?: any[];
    comment?: string;
    isUnfinished?: boolean;
    isCasualPlay?: boolean;
    isCancelled?: boolean;
    teamAssignments?: { team1: string[]; team2: string[] };
  }) => {
    try {
      if (__DEV__) {
        console.log("Submitting to backend:", JSON.stringify(data, null, 2));
        console.log(
          "Participants with teams:",
          participantsWithDetails.map((p) => ({
            name: p.name,
            team: p.team,
            mappedTeam:
              p.team === "team1"
                ? "TEAM_A"
                : p.team === "team2"
                  ? "TEAM_B"
                  : "TEAM_A",
          })),
        );
      }

      // Handle friendly match cancellation
      if (isFriendly && data.isCancelled) {
        await axiosInstance.post(endpoints.friendly.cancel(matchId), {
          comment: data.comment,
        });
        // Trigger My Games refresh so the cancelled match is updated
        useMyGamesStore.getState().triggerRefresh();
        toast.success("Match cancelled");
        bottomSheetModalRef.current?.dismiss();
        router.back();
        return;
      }

      // Use different endpoint for friendly matches (no rating calculation)
      const endpoint = isFriendly
        ? endpoints.friendly.submitResult(matchId)
        : endpoints.match.submitResult(matchId);
      const response = await axiosInstance.post(endpoint, data);

      // Determine success message based on mode
      let successMessage = "Match result submitted successfully!";
      if (data.isCasualPlay) {
        successMessage = "Casual play recorded!";
      } else if (data.isUnfinished) {
        successMessage = "Match marked as incomplete!";
      }
      // Trigger My Games refresh so the updated match status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success(successMessage);
      bottomSheetModalRef.current?.dismiss();

      // Update matchData with new status and submitter info to keep UI in sync
      const lastSet =
        data.setScores && data.setScores.length > 0
          ? data.setScores[data.setScores.length - 1]
          : null;
      setMatchData((prev) => ({
        ...prev,
        status: "ONGOING",
        resultSubmittedById: session?.user?.id || null,
        ...(lastSet && {
          team1Score: lastSet.team1Games ?? lastSet.team1Points ?? 0,
          team2Score: lastSet.team2Games ?? lastSet.team2Points ?? 0,
        }),
      }));

      // Don't show share prompt after submission - only show after opponent confirms
      // This prevents sharing unverified/disputed scores
      router.back();
    } catch (error: any) {
      if (__DEV__) {
        console.error("Error submitting result:", error);
        console.error("Error response:", error.response?.data);
        console.error("Error message:", error.message);
      }

      // Handle "already completed" error gracefully
      if (error.response?.data?.message?.includes("already been completed")) {
        // Update status to COMPLETED and refresh match data
        setMatchData((prev) => ({
          ...prev,
          status: "COMPLETED",
        }));

        // Refresh the full match details to get the latest state
        // Re-run the fetchMatchData function to update status
        if (matchId && session?.user?.id) {
          // Re-fetch match data directly using the same logic
          const fetchLatestMatchData = async () => {
            try {
              const refreshPath = isFriendly
                ? `/api/friendly/${matchId}`
                : `/api/match/${matchId}`;

              const response = await authenticatedFetch(refreshPath, {
                cache: "no-cache",
              });

              if (response.ok) {
                const data = await response.json();
                const match = data.match || data;
                setMatchData({
                  createdById: match.createdById || null,
                  resultSubmittedById: match.resultSubmittedById || null,
                  resultSubmittedAt: match.resultSubmittedAt || null,
                  status: match.status || "SCHEDULED",
                  team1Score: match.team1Score ?? match.playerScore ?? null,
                  team2Score: match.team2Score ?? match.opponentScore ?? null,
                  isDisputed: match.isDisputed || false,
                  matchDate:
                    match.matchDate || match.scheduledStartTime || null,
                  genderRestriction: match.genderRestriction || null,
                  skillLevels: match.skillLevels || [],
                  isWalkover: match.isWalkover || false,
                  walkoverReason: match.walkoverReason || null,
                  walkover: match.walkover || null,
                });
              }
            } catch (error) {
              if (__DEV__) console.error("Error refreshing match data:", error);
            }
          };

          fetchLatestMatchData();
        }

        toast.error("This match has already been completed");
        bottomSheetModalRef.current?.dismiss();
        return;
      }

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to submit result";

      toast.error(errorMessage);
      throw error;
    }
  };

  // Handler for confirming/approving match result (opponent captain)
  const handleConfirmResult = async () => {
    try {
      // Use different endpoint for friendly matches (no rating calculation)
      const endpoint = isFriendly
        ? endpoints.friendly.confirmResult(matchId)
        : endpoints.match.confirmResult(matchId);
      const response = await axiosInstance.post(endpoint, { confirmed: true });

      // Update local matchData state to COMPLETED to prevent race conditions
      // This ensures the UI immediately shows view mode and prevents double-confirmation
      setMatchData((prev) => ({
        ...prev,
        status: "COMPLETED",
        isDisputed: false,
      }));

      // Trigger My Games refresh so the confirmed match status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success("Match result confirmed!");
      bottomSheetModalRef.current?.dismiss();

      // Show share prompt after confirmation
      setIsShareSheetLoading(true);
      setShowSharePrompt(true);
    } catch (error: any) {
      if (__DEV__) console.error("Error confirming result:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to confirm result";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Handler to submit walkover (match didn't play)
  const handleWalkover = async (data: {
    defaultingUserId: string;
    reason: string;
    reasonDetail?: string;
  }) => {
    try {
      const response = await axiosInstance.post(
        endpoints.match.submitWalkover(matchId),
        {
          defaultingUserId: data.defaultingUserId,
          reason: data.reason,
          reasonDetail: data.reasonDetail,
        },
      );

      // Trigger My Games refresh so the walkover status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success("Walkover recorded successfully");
      bottomSheetModalRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      if (__DEV__) console.error("Error submitting walkover:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to submit walkover";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Handlers for post-match share prompt
  const handleSharePost = async (caption: string) => {
    try {
      // Create post via API (axiosInstance already has baseURL configured)
      const response = await axiosInstance.post("/api/feed/posts", {
        matchId,
        caption: caption || undefined,
      });

      const data = response.data?.data || response.data;

      // Check if this post already existed
      if (data?.alreadyExists) {
        toast.info("You have already posted this match to your feed");
      } else {
        toast.success("Posted to Activity Feed!");
      }

      postMatchShareSheetRef.current?.close();
      setShowSharePrompt(false);
      // Don't navigate back - user can stay on match details or manually navigate
    } catch (error: any) {
      if (__DEV__) console.error("Error creating post:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to create post. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleSkipShare = () => {
    postMatchShareSheetRef.current?.close();
    setShowSharePrompt(false);
    // Only navigate back if this was shown automatically after confirmation
    // Don't navigate if user manually opened share sheet from completed match
    if (getReliableStatus() !== "COMPLETED") {
      router.back();
    }
  };

  // Handler when share sheet is closed by swiping down (not Skip button)
  const handleCloseShareSheet = () => {
    setShowSharePrompt(false);
    setIsShareSheetLoading(false);
    // Don't navigate - just reset state so user can open again
  };

  // Handler for manually opening share sheet from completed match
  const handleOpenShareSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsShareSheetLoading(true);
    setShowSharePrompt(true);
  };

  // External share handlers are now handled internally by PostMatchShareSheet using useSharePost hook

  // Handler to open dispute page (opponent captain)
  const handleOpenDisputeSheet = async () => {
    bottomSheetModalRef.current?.dismiss();

    // Navigate to dispute page with all required data
    setTimeout(() => {
      router.push({
        pathname: "/match/dispute-score",
        params: {
          matchId,
          matchType,
          sportType,
          players: JSON.stringify(
            participantsWithDetails.map((p) => ({
              id: p.userId,
              name: p.name || "Unknown",
              image: p.image,
              team:
                p.team === "team1"
                  ? "TEAM_A"
                  : p.team === "team2"
                    ? "TEAM_B"
                    : undefined,
            })),
          ),
          submittedScore:
            matchData.team1Score !== null
              ? JSON.stringify({
                  team1Score: matchData.team1Score,
                  team2Score: matchData.team2Score ?? 0,
                })
              : undefined,
        },
      });
    }, 300);
  };

  // Handler for cancelling match
  const handleCancelMatch = async (data: {
    reason: string;
    comment?: string;
  }) => {
    try {
      const response = await axiosInstance.post(
        endpoints.match.cancel(matchId),
        {
          reason: data.reason,
          comment: data.comment,
        },
      );

      // Trigger My Games refresh so the cancelled match is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success("Match cancelled successfully");
      cancelSheetRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      if (__DEV__) console.error("Error cancelling match:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to cancel match";
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleLeaveMatch = () => {
    Alert.alert(
      "Leave Match",
      "Are you sure you want to leave this match?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await axiosInstance.post(endpoints.friendly.leave(matchId));
              useMyGamesStore.getState().triggerRefresh();
              toast.success("You have left the match");
              router.back();
            } catch (error: any) {
              if (__DEV__) console.error("Error leaving match:", error);
              const errorMessage =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                "Failed to leave match";
              toast.error(errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleMatchEdited = () => {
    editMatchSheetRef.current?.dismiss();
    setFetchedMatchDetails(null); // triggers a re-fetch of match details
  };

  // Check if match can be cancelled (only SCHEDULED matches)
  const canCancelMatch = () => {
    const status = getReliableStatus();
    // Can only cancel SCHEDULED matches
    if (status !== "SCHEDULED") return false;

    const isCreator = matchData.createdById === session?.user?.id;

    // Special case: Allow creator to cancel orphaned matches (time passed but no opponent joined)
    // This prevents matches from being stuck forever when no one joins
    if (isMatchTimeReached() && !allSlotsFilled && isCreator) {
      return true;
    }

    // Normal case: Don't allow cancellation if match has already started (time reached AND all slots filled)
    if (isMatchTimeReached() && allSlotsFilled) return false;

    // For friendly matches, only the HOST (creator) can cancel
    if (isFriendly) return isCreator;

    // For league matches, any participant or the creator can cancel
    return isUserParticipant || isCreator;
  };

  // Non-host friendly match participants can leave (not cancel)
  const canLeaveMatch = () => {
    if (!isFriendly) return false;
    if (getReliableStatus() !== "SCHEDULED") return false;
    if (isMatchTimeReached()) return false;
    const isCreator = matchData.createdById === session?.user?.id;
    return isUserParticipant && !isCreator;
  };

  // Determine if current user is the one who SUBMITTED the result
  // This is used to show "Awaiting Approval" to the submitter
  const isResultSubmitter = (() => {
    if (!matchData.resultSubmittedById) return false;

    if (matchType === "SINGLES" || isFriendly) {
      // For singles or friendly doubles, check directly if current user submitted
      return matchData.resultSubmittedById === session?.user?.id;
    }
    // For doubles, check if the submitter is on the user's team (same partnership)
    // If user is captain and submitter is on their team, OR user is partner and submitter is on their team
    const currentUserId = session?.user?.id;
    const submitterId = matchData.resultSubmittedById;

    // Check if submitter is on the same team as current user
    // The submitter is on the user's team if:
    // - submitter is the captain of user's partnership, OR
    // - submitter is the partner of user's partnership
    return (
      submitterId === partnershipData.captainId ||
      submitterId === partnershipData.partnerId
    );
  })();

  // Determine if current user can REVIEW/APPROVE/DISPUTE the result
  // This is the opponent of whoever submitted - they get to approve or dispute
  const canReviewResult = (() => {
    if (!isUserParticipant) return false;
    if (!matchData.resultSubmittedById) return false;

    if (matchType === "SINGLES" || isFriendly) {
      // For singles or friendly doubles, any participant who didn't submit can review
      return matchData.resultSubmittedById !== session?.user?.id;
    }
    // For doubles, user can review if they are NOT on the submitter's team
    // and they are a captain (only captains can approve)
    const isCaptain = partnershipData.captainId === session?.user?.id;
    // User is NOT the submitter's team if they're not the result submitter team
    return isCaptain && !isResultSubmitter;
  })();

  // Keep legacy variables for backwards compatibility with submit flow (before result is submitted)
  const isCreatorTeamCaptain = (() => {
    if (matchType === "SINGLES") {
      return matchData.createdById === session?.user?.id;
    }
    return partnershipData.captainId === matchData.createdById;
  })();

  // Determine result sheet mode based on match status and user role
  const getResultSheetMode = (): "submit" | "view" | "review" | "disputed" => {
    const status = getReliableStatus();

    // If match is ONGOING and DISPUTED - show view-only mode with dispute banner
    if (status === "ONGOING" && matchData.isDisputed) {
      return "disputed";
    }

    // If match is UNFINISHED, any participant can continue submitting
    if (status === "UNFINISHED" && isUserParticipant) {
      return "submit";
    }

    // If match is ONGOING (result submitted), the OPPONENT (non-submitter) can review/approve/dispute
    // The submitter should see 'view' mode with "awaiting confirmation" message
    if (status === "ONGOING") {
      if (canReviewResult) {
        return "review";
      }
      // Submitter or their teammate sees view mode
      return "view";
    }

    // If match is COMPLETED or WALKOVER_PENDING, everyone sees view mode
    if (
      status === "COMPLETED" ||
      status === "FINISHED" ||
      status === "WALKOVER_PENDING"
    ) {
      return "view";
    }

    // If match is CANCELLED, the non-cancelling participant can claim a walkover
    if (status === "CANCELLED" && isUserParticipant) {
      return "submit";
    }

    // If match is SCHEDULED and time has passed, any participant can submit
    // (For overdue matches, both creator and opponent should be able to submit)
    if (status === "SCHEDULED" && canStartMatch && isUserParticipant) {
      return "submit";
    }

    // Default to view for everyone else
    return "view";
  };

  const resultSheetMode = getResultSheetMode();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={themeColor} />

      {/* Custom Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: themeColor,
            paddingTop: insets.top,
            opacity: headerEntryOpacity,
            transform: [{ translateY: headerEntryTranslateY }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerMatchType}>
            {matchType === "DOUBLES" ? "Doubles" : "Singles"}{" "}
            {isFriendly ? "Friendly" : "League"} Match
          </Text>
          {isFriendly ? (
            <FriendlyBadge />
          ) : (
            <View style={styles.leagueBadge}>
              <Text style={styles.leagueBadgeText}>LEAGUE</Text>
            </View>
          )}
        </View>

        <View style={styles.headerContent}>
          {isFriendly ? (
            <Text style={styles.headerLeagueName}>Friendly Match</Text>
          ) : (
            <>
              <Text style={styles.headerLeagueName}>
                {leagueName || "League Match"}
              </Text>
              <Text style={styles.headerSeason}>
                {season || "Season 1"} - {division || "Division 1"}
              </Text>
            </>
          )}
        </View>

        <View style={styles.headerIcon}>
          <SportIcon width={80} height={80} fill="#FFFFFF" />
        </View>
      </Animated.View>

      <KeyboardAwareScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={16}
      >
        <Animated.View
          style={{
            opacity: contentEntryOpacity,
            transform: [{ translateY: contentEntryTranslateY }],
          }}
        >
          {/* Loading indicator when fetching match details from notifications */}
          {isLoadingMatchDetails && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColor} />
              <Text style={styles.loadingText}>Loading match details...</Text>
            </View>
          )}

          {/* Participants Section */}
          {(() => {
            // Only use team-based layout when both sides are populated.
            // Friendly-doubles joiners get team=null until scores are submitted,
            // so fall back to positional order whenever team data is incomplete.
            const hasTeamData =
              participantsWithDetails.some((p) => p.team === "team1") &&
              participantsWithDetails.some((p) => p.team === "team2");

            const team1Players = hasTeamData
              ? participantsWithDetails.filter((p) => p.team === "team1")
              : participantsWithDetails.slice(0, 2);
            const team2Players = hasTeamData
              ? participantsWithDetails.filter((p) => p.team === "team2")
              : participantsWithDetails.slice(2, 4);

            // If the partner hasn't joined yet, create a placeholder so the slot shows
            // the partner's name/avatar with a "Pending" badge instead of "Open slot"
            const currentUserInTeam1 = team1Players.some(
              (p) => p.userId === session?.user?.id,
            );
            const currentUserInTeam2 = team2Players.some(
              (p) => p.userId === session?.user?.id,
            );
            const partnerAlreadyInList = partnerInfo.partnerId
              ? participantsWithDetails.some(
                  (p) => p.userId === partnerInfo.partnerId,
                )
              : false;

            const partnerPlaceholder =
              partnerInfo.hasPartner &&
              partnerInfo.partnerId &&
              !partnerAlreadyInList
                ? {
                    userId: partnerInfo.partnerId,
                    name: partnerInfo.partnerName || "Partner",
                    image: partnerInfo.partnerImage || null,
                    role: "PLAYER" as const,
                    team: currentUserInTeam1 ? "team1" : "team2",
                    invitationStatus: "PENDING",
                  }
                : null;

            // Pad arrays to ensure 2 slots per team (null = empty slot)
            const team1Raw: ((typeof participantsWithDetails)[0] | null)[] = [
              ...team1Players,
              null,
              null,
            ].slice(0, 2);
            const team2Raw: ((typeof participantsWithDetails)[0] | null)[] = [
              ...team2Players,
              null,
              null,
            ].slice(0, 2);

            if (partnerPlaceholder && currentUserInTeam1 && !team1Raw[1]) {
              (team1Raw as any[])[1] = partnerPlaceholder;
            }
            if (partnerPlaceholder && currentUserInTeam2 && !team2Raw[1]) {
              (team2Raw as any[])[1] = partnerPlaceholder;
            }

            const team1Slots = team1Raw;
            const team2Slots = team2Raw;

            return (
              <View style={styles.participantsSection}>
                <View style={styles.playersRow}>
                  {matchType === "DOUBLES" ? (
                    <>
                      {/* Team 1 - Left Side */}
                      <View style={styles.teamSection}>
                        <View style={styles.teamPlayers}>
                          <View style={styles.doublesPlayerContainer}>
                            <View style={styles.playerAvatarWrapper}>
                              <View style={styles.playerAvatar}>
                                {team1Slots[0] ? (
                                  team1Slots[0].image ? (
                                    <Image
                                      source={{ uri: team1Slots[0].image }}
                                      style={styles.avatarImage}
                                    />
                                  ) : (
                                    <View style={styles.defaultAvatar}>
                                      <Text style={styles.defaultAvatarText}>
                                        {team1Slots[0].name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "?"}
                                      </Text>
                                    </View>
                                  )
                                ) : (
                                  <View style={styles.emptySlot}>
                                    <Ionicons
                                      name="person-outline"
                                      size={24}
                                      color="#9CA3AF"
                                    />
                                  </View>
                                )}
                              </View>
                              {team1Slots[0]?.invitationStatus ===
                                "PENDING" && (
                                <View style={styles.pendingBadge}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                </View>
                              )}
                              {team1Slots[0]?.invitationStatus ===
                                "ACCEPTED" && (
                                <View style={styles.acceptedBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color="#22C55E"
                                  />
                                </View>
                              )}
                            </View>
                            <Text style={styles.playerName} numberOfLines={1}>
                              {team1Slots[0]?.name || "Open slot"}
                            </Text>
                          </View>
                          <View style={styles.doublesPlayerContainer}>
                            <View style={styles.playerAvatarWrapper}>
                              <View style={styles.playerAvatar}>
                                {team1Slots[1] ? (
                                  team1Slots[1].image ? (
                                    <Image
                                      source={{ uri: team1Slots[1].image }}
                                      style={styles.avatarImage}
                                    />
                                  ) : (
                                    <View style={styles.defaultAvatar}>
                                      <Text style={styles.defaultAvatarText}>
                                        {team1Slots[1].name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "?"}
                                      </Text>
                                    </View>
                                  )
                                ) : (
                                  <View style={styles.emptySlot}>
                                    <Ionicons
                                      name="person-outline"
                                      size={24}
                                      color="#9CA3AF"
                                    />
                                  </View>
                                )}
                              </View>
                              {team1Slots[1]?.invitationStatus ===
                                "PENDING" && (
                                <View style={styles.pendingBadge}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                </View>
                              )}
                              {team1Slots[1]?.invitationStatus ===
                                "ACCEPTED" && (
                                <View style={styles.acceptedBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color="#22C55E"
                                  />
                                </View>
                              )}
                            </View>
                            <Text style={styles.playerName} numberOfLines={1}>
                              {team1Slots[1]?.name || "Open slot"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Vertical Divider */}
                      <View style={styles.verticalDivider} />

                      {/* Team 2 - Right Side */}
                      <View style={styles.teamSection}>
                        <View style={styles.teamPlayers}>
                          <View style={styles.doublesPlayerContainer}>
                            <View style={styles.playerAvatarWrapper}>
                              <View style={styles.playerAvatar}>
                                {team2Slots[0] ? (
                                  team2Slots[0].image ? (
                                    <Image
                                      source={{ uri: team2Slots[0].image }}
                                      style={styles.avatarImage}
                                    />
                                  ) : (
                                    <View style={styles.defaultAvatar}>
                                      <Text style={styles.defaultAvatarText}>
                                        {team2Slots[0].name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "?"}
                                      </Text>
                                    </View>
                                  )
                                ) : (
                                  <View style={styles.emptySlot}>
                                    <Ionicons
                                      name="person-outline"
                                      size={24}
                                      color="#9CA3AF"
                                    />
                                  </View>
                                )}
                              </View>
                              {team2Slots[0]?.invitationStatus ===
                                "PENDING" && (
                                <View style={styles.pendingBadge}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                </View>
                              )}
                              {team2Slots[0]?.invitationStatus ===
                                "ACCEPTED" && (
                                <View style={styles.acceptedBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color="#22C55E"
                                  />
                                </View>
                              )}
                            </View>
                            <Text style={styles.playerName} numberOfLines={1}>
                              {team2Slots[0]?.name || "Open slot"}
                            </Text>
                          </View>
                          <View style={styles.doublesPlayerContainer}>
                            <View style={styles.playerAvatarWrapper}>
                              <View style={styles.playerAvatar}>
                                {team2Slots[1] ? (
                                  team2Slots[1].image ? (
                                    <Image
                                      source={{ uri: team2Slots[1].image }}
                                      style={styles.avatarImage}
                                    />
                                  ) : (
                                    <View style={styles.defaultAvatar}>
                                      <Text style={styles.defaultAvatarText}>
                                        {team2Slots[1].name
                                          ?.charAt(0)
                                          ?.toUpperCase() || "?"}
                                      </Text>
                                    </View>
                                  )
                                ) : (
                                  <View style={styles.emptySlot}>
                                    <Ionicons
                                      name="person-outline"
                                      size={24}
                                      color="#9CA3AF"
                                    />
                                  </View>
                                )}
                              </View>
                              {team2Slots[1]?.invitationStatus ===
                                "PENDING" && (
                                <View style={styles.pendingBadge}>
                                  <Ionicons
                                    name="time-outline"
                                    size={14}
                                    color="#F59E0B"
                                  />
                                </View>
                              )}
                              {team2Slots[1]?.invitationStatus ===
                                "ACCEPTED" && (
                                <View style={styles.acceptedBadge}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={16}
                                    color="#22C55E"
                                  />
                                </View>
                              )}
                            </View>
                            <Text style={styles.playerName} numberOfLines={1}>
                              {team2Slots[1]?.name || "Open slot"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      {/* Singles - Player 1 */}
                      <View style={styles.playerSection}>
                        <View style={styles.playerAvatarWrapper}>
                          <View style={styles.playerAvatar}>
                            {participantsWithDetails[0] ? (
                              participantsWithDetails[0].image ? (
                                <Image
                                  source={{
                                    uri: participantsWithDetails[0].image,
                                  }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <View style={styles.defaultAvatar}>
                                  <Text style={styles.defaultAvatarText}>
                                    {participantsWithDetails[0].name
                                      ?.charAt(0)
                                      ?.toUpperCase() || "?"}
                                  </Text>
                                </View>
                              )
                            ) : (
                              <View style={styles.emptySlot}>
                                <Ionicons
                                  name="person-outline"
                                  size={24}
                                  color="#9CA3AF"
                                />
                              </View>
                            )}
                          </View>
                          {participantsWithDetails[0]?.invitationStatus ===
                            "PENDING" && (
                            <View style={styles.pendingBadge}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color="#F59E0B"
                              />
                            </View>
                          )}
                          {participantsWithDetails[0]?.invitationStatus ===
                            "ACCEPTED" && (
                            <View style={styles.acceptedBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#22C55E"
                              />
                            </View>
                          )}
                        </View>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {participantsWithDetails[0]?.name || "Open slot"}
                        </Text>
                      </View>

                      {/* Vertical Divider */}

                      <View style={styles.verticalDivider} />

                      {/* Singles - Player 2 */}
                      <View style={styles.playerSection}>
                        <View style={styles.playerAvatarWrapper}>
                          <View style={styles.playerAvatar}>
                            {participantsWithDetails[1] ? (
                              participantsWithDetails[1].image ? (
                                <Image
                                  source={{
                                    uri: participantsWithDetails[1].image,
                                  }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <View style={styles.defaultAvatar}>
                                  <Text style={styles.defaultAvatarText}>
                                    {participantsWithDetails[1].name
                                      ?.charAt(0)
                                      ?.toUpperCase() || "?"}
                                  </Text>
                                </View>
                              )
                            ) : (
                              <View style={styles.emptySlot}>
                                <Ionicons
                                  name="person-outline"
                                  size={24}
                                  color="#9CA3AF"
                                />
                              </View>
                            )}
                          </View>
                          {participantsWithDetails[1]?.invitationStatus ===
                            "PENDING" && (
                            <View style={styles.pendingBadge}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color="#F59E0B"
                              />
                            </View>
                          )}
                          {participantsWithDetails[1]?.invitationStatus ===
                            "ACCEPTED" && (
                            <View style={styles.acceptedBadge}>
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color="#22C55E"
                              />
                            </View>
                          )}
                        </View>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {participantsWithDetails[1]?.name || "Open slot"}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })()}

          <View style={styles.divider} />

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="calendar-outline" size={24} color={themeColor} />
            </View>
            <View style={styles.detailContent}>
              <View style={styles.dateTimeHeader}>
                <Text style={[styles.detailTitle, styles.dateTimeTitle]}>
                  {date} at {time}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusBadge.badgeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: statusBadge.textColor },
                    ]}
                  >
                    {statusBadge.statusText}
                  </Text>
                </View>
              </View>
              <Text style={styles.detailSubtitle}>{duration || 2} hour(s)</Text>
              {/* Inline auto-approval countdown */}
              {autoApprovalCountdown && (
                <View style={styles.autoApprovalInline}>
                  <Ionicons
                    name={
                      autoApprovalCountdown.expired
                        ? "checkmark-circle"
                        : "time-outline"
                    }
                    size={12}
                    color={
                      autoApprovalCountdown.expired ? "#22C55E" : "#F59E0B"
                    }
                  />
                  <Text style={styles.autoApprovalInlineText}>
                    {autoApprovalCountdown.expired
                      ? "Auto-approved"
                      : `Awaiting confirmation · ${autoApprovalCountdown.hours}h ${autoApprovalCountdown.minutes}m`}
                  </Text>
                </View>
              )}
              {/* Walkover info banner */}
              {matchData.isWalkover && (
                <View style={styles.walkoverInfoBanner}>
                  <Ionicons name="flag-outline" size={16} color="#92400E" />
                  <View style={styles.walkoverInfoContent}>
                    <Text style={styles.walkoverInfoText}>
                      {matchData.walkover?.defaultingPlayer?.name || "Opponent"}{" "}
                      forfeited
                    </Text>
                    <Text style={styles.walkoverReasonText}>
                      Reason: {formatWalkoverReason(matchData.walkoverReason)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="location-outline" size={24} color={themeColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{location || "TBD"}</Text>
              {/* <Text style={styles.detailAddress}>
              Lot 15, Carpark behind BP Healthcare, Lot 3470, Jalan SS 23/15, Taman Sea, 47300 Petaling Jaya, Selangor
            </Text> */}
              <View style={styles.courtStatusContainer}>
                {courtBooked ? (
                  <View style={styles.courtBadge}>
                    <Text style={styles.courtBadgeText}>Court booked</Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#22C55E"
                    />
                  </View>
                ) : (
                  <View
                    style={[styles.courtBadge, { backgroundColor: "#FEF2F2" }]}
                  >
                    <Text style={[styles.courtBadgeText, { color: "#EF4444" }]}>
                      Court not booked
                    </Text>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Fee */}
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="cash-outline" size={24} color={themeColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>
                {(() => {
                  if (fee === "FREE") return "Free";
                  const totalAmount = Number(feeAmount || 0);
                  if (fee === "SPLIT") {
                    const numPlayers = matchType === "DOUBLES" ? 4 : 2;
                    const perPlayer = (totalAmount / numPlayers).toFixed(2);
                    return `Split - Estimated RM${perPlayer} per player`;
                  }
                  return `Fixed - RM${totalAmount.toFixed(2)} per player`;
                })()}
              </Text>
              {fee === "SPLIT" && (
                <Text style={styles.detailSubtitle}>
                  The per-player fee is estimated. The final amount depends on
                  how many players join this match.
                </Text>
              )}
            </View>
          </View>

          {/* Open to Section - Only for friendly matches */}
          {isFriendly &&
            (matchData.genderRestriction ||
              (matchData.skillLevels && matchData.skillLevels.length > 0)) && (
              <View style={styles.detailRow}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="people-outline"
                    size={24}
                    color={themeColor}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailTitle}>Open to</Text>

                  {/* Gender Restriction */}
                  {matchData.genderRestriction && (
                    <View style={styles.openToRow}>
                      <Text style={styles.openToLabel}>Gender</Text>
                      <View style={styles.genderRestrictionChip}>
                        <Text style={styles.genderRestrictionChipText}>
                          {matchData.genderRestriction === "MALE"
                            ? "Male"
                            : matchData.genderRestriction === "FEMALE"
                              ? "Female"
                              : "All"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Skill Level Restrictions */}
                  {matchData.skillLevels &&
                    matchData.skillLevels.length > 0 && (
                      <View style={styles.openToRow}>
                        <Text style={styles.openToLabel}>Skill</Text>
                        <View style={styles.restrictionChipsContainer}>
                          {matchData.skillLevels.map((level, index) => {
                            const skillMap: Record<string, string> = {
                              BEGINNER: "Beginner",
                              IMPROVER: "Improver",
                              INTERMEDIATE: "Intermediate",
                              UPPER_INTERMEDIATE: "Upper Intermediate",
                              EXPERT: "Expert",
                              ADVANCED: "Advanced",
                            };
                            return (
                              <View
                                key={index}
                                style={styles.skillRestrictionChip}
                              >
                                <Text style={styles.skillRestrictionChipText}>
                                  {skillMap[level] ||
                                    level.charAt(0) +
                                      level
                                        .slice(1)
                                        .toLowerCase()
                                        .replace(/_/g, " ")}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                </View>
              </View>
            )}

          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>Description</Text>
            <Text
              style={[
                styles.descriptionText,
                !description && styles.noDescriptionText,
              ]}
            >
              {description || "No description"}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* DRAFT Status Banner - Match invitations expired/declined */}
          {getReliableStatus() === "DRAFT" && (
            <View style={styles.draftStatusBanner}>
              <Ionicons name="document-outline" size={24} color="#6B7280" />
              <View style={styles.draftStatusContent}>
                <Text style={styles.draftStatusTitle}>Match is in Draft</Text>
                <Text style={styles.draftStatusText}>
                  All invitations have expired or been declined. This match
                  needs to be rescheduled or cancelled.
                </Text>
                {matchData.createdById === session?.user?.id && (
                  <Text style={styles.draftStatusHint}>
                    As the match creator, you can delete this match and create a
                    new one.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* VOID Status Banner - Match voided by admin */}
          {getReliableStatus() === "VOID" && (
            <View style={styles.voidStatusBanner}>
              <Ionicons name="ban-outline" size={24} color="#DC2626" />
              <View style={styles.voidStatusContent}>
                <Text style={styles.voidStatusTitle}>Match Voided</Text>
                <Text style={styles.voidStatusText}>
                  This match has been voided by an administrator. No points or
                  statistics were recorded.
                </Text>
              </View>
            </View>
          )}

          {/* UNFINISHED Status Banner - Match started but not completed */}
          {getReliableStatus() === "UNFINISHED" && (
            <View style={styles.unfinishedStatusBanner}>
              <Ionicons name="pause-circle-outline" size={24} color="#D97706" />
              <View style={styles.unfinishedStatusContent}>
                <Text style={styles.unfinishedStatusTitle}>
                  Match Unfinished
                </Text>
                <Text style={styles.unfinishedStatusText}>
                  This match was started but not completed. Tap "Continue Match"
                  below to finish entering scores.
                </Text>
              </View>
            </View>
          )}

          {/* Partnership Status for Doubles - Only show for league matches (not friendly) if match not full */}
          {matchType === "DOUBLES" &&
            !isFriendly &&
            !allSlotsFilled &&
            getReliableStatus() === "SCHEDULED" && (
              <View style={styles.partnershipStatus}>
                {partnerInfo.hasPartner ? (
                  <View style={styles.successBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#22C55E"
                    />
                    <Text style={styles.successBannerText}>
                      An invitation will be sent to {partnerInfo.partnerName} to
                      join this match
                    </Text>
                  </View>
                ) : (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorBannerText}>
                      You need an active partnership to join doubles matches
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Comments Section */}
          <MatchCommentsSection
            matchId={matchId}
            isFriendly={isFriendly}
            comments={comments}
            isUserParticipant={isUserParticipant}
            canComment={[
              "ONGOING",
              "COMPLETED",
              "UNFINISHED",
              "FINISHED",
              "WALKOVER_PENDING",
            ].includes(getReliableStatus().toUpperCase())}
            currentUserId={session?.user?.id}
            onCreateComment={handleCreateComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            isLoading={isLoadingComments}
          />

          {/* Report Section – opens walkover claim form */}
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => bottomSheetModalRef.current?.present()}
          >
            <Text style={styles.reportButtonText}>Report a problem</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Footer with Action Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {isUserParticipant ? (
          <View style={styles.buttonGroup}>
            {/* Dynamic button based on user role and match status */}
            {(() => {
              // Smart status priority: Trust URL params for completed states, otherwise use API data
              const urlStatus = matchStatus?.toUpperCase();
              const apiStatus = matchData.status?.toUpperCase();

              const status =
                urlStatus === "COMPLETED" || urlStatus === "FINISHED"
                  ? urlStatus // Trust URL param for completed states
                  : apiStatus || urlStatus;

              // Priority 1: User has pending invite - show Accept Invite button
              if (isUserPendingInvite) {
                return (
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      { backgroundColor: sportColors.background },
                    ]}
                    onPress={handleAcceptInvite}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={styles.joinButtonText}>
                      {loading ? "Accepting..." : "Accept Invite"}
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Match UNFINISHED - Show "Continue Match" to any participant
              if (status === "UNFINISHED") {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#F59E0B" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={styles.joinButtonText}>Continue Match</Text>
                  </TouchableOpacity>
                );
              }

              // Match COMPLETED or WALKOVER_PENDING - Show "View Scores" and "Share to Feed" buttons
              if (
                status === "COMPLETED" ||
                status === "FINISHED" ||
                status === "WALKOVER_PENDING"
              ) {
                return (
                  <View style={styles.completedMatchButtons}>
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        styles.completedButton,
                        { backgroundColor: "#FEA04D" },
                      ]}
                      onPress={() => bottomSheetModalRef.current?.present()}
                    >
                      <Text style={styles.joinButtonText}>View Scores</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        styles.completedButton,
                        styles.shareButton,
                      ]}
                      onPress={handleOpenShareSheet}
                      disabled={isShareSheetLoading}
                    >
                      {isShareSheetLoading ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                      ) : (
                        <Ionicons
                          name="share-social-outline"
                          size={18}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                      )}
                      <Text style={styles.joinButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              // Match ONGOING but DISPUTED - Allow viewing scores with "Under Review" indicator
              if (status === "ONGOING" && matchData.isDisputed) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#DC2626" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      View Scores (Disputed)
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Match ONGOING (result submitted) - Opponent (non-submitter) sees "View Scores" to approve/deny
              if (status === "ONGOING" && canReviewResult) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#F59E0B" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={styles.joinButtonText}>View Score</Text>
                  </TouchableOpacity>
                );
              }

              // Match ONGOING - the submitter (or their teammate) sees "View Score" with ability to view awaiting status
              if (status === "ONGOING" && isResultSubmitter) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#6B7280" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      View Score
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Match SCHEDULED and time reached AND all slots filled AND all accepted - Any participant can submit result
              if (status === "SCHEDULED" && canStartMatch) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#F59E0B" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={styles.joinButtonText}>Add Result</Text>
                  </TouchableOpacity>
                );
              }

              // Show edit + cancel buttons if user can cancel (host for friendly, any participant for league)
              if (canCancelMatch()) {
                const isCreatorLocal =
                  matchData.createdById === session?.user?.id;
                if (isCreatorLocal && !isMatchTimeReached()) {
                  return (
                    <View style={styles.editCancelRow}>
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          { backgroundColor: "#6366F1", flex: 1 },
                        ]}
                        onPress={() => editMatchSheetRef.current?.present()}
                      >
                        <Text
                          style={[styles.joinButtonText, { color: "#FFFFFF" }]}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.joinButton,
                          { backgroundColor: "#EF4444", flex: 1 },
                        ]}
                        onPress={() => cancelSheetRef.current?.present()}
                      >
                        <Text
                          style={[styles.joinButtonText, { color: "#FFFFFF" }]}
                        >
                          Cancel Match
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#EF4444" }]}
                    onPress={() => cancelSheetRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      Cancel Match
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Non-host friendly participant can leave the match
              if (canLeaveMatch()) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#EF4444" }]}
                    onPress={handleLeaveMatch}
                    disabled={loading}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      {loading ? "Leaving..." : "Leave Match"}
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Waiting for confirmations - all slots filled but not all accepted
              if (
                status === "SCHEDULED" &&
                allSlotsFilled &&
                !allParticipantsAccepted
              ) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#9CA3AF" }]}
                    disabled={true}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      Waiting for Confirmations
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Waiting for opponent - show a disabled "Waiting" state
              if (
                status === "SCHEDULED" &&
                !allSlotsFilled &&
                !isMatchTimeReached()
              ) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#9CA3AF" }]}
                    disabled={true}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>
                      Waiting for Opponent
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Default fallback
              return null;
            })()}
          </View>
        ) : (
          // Join Match Button (shown to non-participants)
          <View style={styles.buttonGroup}>
            {/* Join Match Button */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor: "#FEA04D" },
                (loading ||
                  !canJoin ||
                  allSlotsFilled ||
                  isMatchTimeReached()) &&
                  styles.joinButtonDisabled,
              ]}
              onPress={handleJoinMatch}
              disabled={
                loading || !canJoin || allSlotsFilled || isMatchTimeReached()
              }
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isMatchTimeReached() && !allSlotsFilled
                    ? "Time Passed"
                    : allSlotsFilled
                      ? "Match Full"
                      : "Join Match"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Match Result Sheet Modal */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        snapPoints={snapPoints}
        index={initialSnapIndex}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <MatchResultSheet
          matchId={matchId}
          matchType={matchType as "SINGLES" | "DOUBLES"}
          players={participantsWithDetails.map((p) => ({
            id: p.userId,
            name: p.name || "Unknown",
            image: p.image,
            team: (p.team === "team1"
              ? "TEAM_A"
              : p.team === "team2"
                ? "TEAM_B"
                : "TEAM_A") as "TEAM_A" | "TEAM_B",
          }))}
          sportType={sportType}
          seasonId={seasonId}
          mode={resultSheetMode}
          matchStatus={getReliableStatus()}
          isFriendlyMatch={isFriendly}
          isWalkover={matchData.isWalkover}
          walkoverInfo={
            matchData.isWalkover
              ? {
                  reason: matchData.walkoverReason || "",
                  defaultingPlayerName:
                    matchData.walkover?.defaultingPlayer?.name || "Opponent",
                  reasonDetail: matchData.walkover?.walkoverReasonDetail,
                  reportedById: matchData.walkover?.reportedBy,
                  isDisputed: matchData.walkover?.isDisputed ?? false,
                  disputeExpiresAt: matchData.walkover?.disputeExpiresAt,
                }
              : undefined
          }
          matchComments={comments}
          currentUserId={session?.user?.id}
          onCreateComment={handleCreateComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          onClose={() => bottomSheetModalRef.current?.dismiss()}
          onSubmit={handleSubmitResult}
          onConfirm={handleConfirmResult}
          onDispute={handleOpenDisputeSheet}
          onWalkover={handleWalkover}
          onDisputeWalkover={async (reason: string) => {
            try {
              await axiosInstance.post(
                endpoints.match.disputeWalkover(matchId),
                { reason },
              );
              toast.success(
                "Walkover disputed. An admin will review this match.",
              );
              fetchMatchData();
            } catch (error: any) {
              toast.error(
                error?.response?.data?.message ||
                  error?.message ||
                  "Failed to dispute walkover",
              );
            }
          }}
          onExpandSheet={handleExpandSheet}
          onCollapseSheet={handleCollapseSheet}
        />
      </BottomSheetModal>

      {/* Cancel Match Sheet Modal */}
      <BottomSheetModal
        ref={cancelSheetRef}
        enableDynamicSizing={true}
        maxDynamicContentSize={SCREEN_HEIGHT * 0.9}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        enableHandlePanningGesture={true}
        enableContentPanningGesture={true}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <CancelMatchSheet
          matchId={matchId}
          matchDate={date}
          matchTime={time}
          hasOpponentJoined={hasOpponentJoined}
          isFriendly={isFriendly}
          isHost={matchData.createdById === session?.user?.id}
          onClose={() => cancelSheetRef.current?.dismiss()}
          onCancel={handleCancelMatch}
        />
      </BottomSheetModal>

      {/* Edit Match Sheet Modal */}
      <BottomSheetModal
        ref={editMatchSheetRef}
        enableDynamicSizing={true}
        maxDynamicContentSize={SCREEN_HEIGHT * 0.9}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <EditMatchSheet
          matchId={matchId}
          initialDate={date}
          initialTime={time}
          initialLocation={location}
          initialCourtBooked={courtBooked}
          initialFee={fee}
          initialFeeAmount={feeAmount}
          initialDuration={duration}
          initialNotes={description}
          onClose={() => editMatchSheetRef.current?.dismiss()}
          onSaved={handleMatchEdited}
        />
      </BottomSheetModal>

      {/* Post-Match Share Prompt - Always mounted, controlled via snapToIndex */}
      <PostMatchShareSheet
        visible={showSharePrompt}
        bottomSheetRef={postMatchShareSheetRef}
        scorecardMatch={scorecardMatch}
        sportColors={sportColors}
        isPickleball={isPickleball}
        onPost={handleSharePost}
        onSkip={handleSkipShare}
        onClose={handleCloseShareSheet}
        onSheetOpen={() => setIsShareSheetLoading(false)}
      />
    </View>
  );
}
