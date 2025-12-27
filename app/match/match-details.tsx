import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';
import { getBackendBaseURL } from '@/config/network';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import axiosInstance, { endpoints } from '@/lib/endpoints';
import { socketService } from '@/lib/socket-service';
import { CancelMatchSheet } from '@/src/features/match/components/CancelMatchSheet';
import { MatchCommentsSection } from '@/src/features/match/components/MatchCommentsSection';
import { MatchResultSheet } from '@/src/features/match/components/MatchResultSheet';
import { MatchComment } from '@/app/match/components/types';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { FriendlyBadge } from '@/src/features/friendly/components/FriendlyBadge';
import { useChatStore } from '@/src/features/chat/stores/ChatStore';
import { useMyGamesStore } from '@/src/features/dashboard-user/stores/MyGamesStore';

interface ParticipantWithDetails {
  userId: string;
  name?: string;
  image?: string;
  role?: string;
  team?: string;
  invitationStatus?: string;
}

export default function JoinMatchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [isLoadingMatchDetails, setIsLoadingMatchDetails] = useState(false);
  const [participantsWithDetails, setParticipantsWithDetails] = useState<ParticipantWithDetails[]>([]);
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
  const [matchData, setMatchData] = useState<{
    createdById: string | null;
    resultSubmittedById: string | null;
    resultSubmittedAt: string | null;
    status: string;
    team1Score: number | null;
    team2Score: number | null;
    isDisputed: boolean;
    matchDate: string | null;  // ISO date from database
    genderRestriction?: 'MALE' | 'FEMALE' | 'OPEN' | null;
    skillLevels?: string[];
  }>({ createdById: null, resultSubmittedById: null, resultSubmittedAt: null, status: 'SCHEDULED', team1Score: null, team2Score: null, isDisputed: false, matchDate: null });
  
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
  
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const cancelSheetRef = useRef<BottomSheetModal>(null);

  // Parse params - use fetched data as fallback when navigating from notifications
  const matchId = params.matchId as string;
  const matchType = (params.matchType as string) || fetchedMatchDetails?.matchType || 'SINGLES';
  const date = (params.date as string) || fetchedMatchDetails?.date || '';
  const time = (params.time as string) || fetchedMatchDetails?.time || '';
  const location = (params.location as string) || fetchedMatchDetails?.location || '';
  const sportType = (params.sportType as string) || fetchedMatchDetails?.sportType || '';
  const leagueName = (params.leagueName as string) || fetchedMatchDetails?.leagueName || '';
  const season = (params.season as string) || fetchedMatchDetails?.season || '';
  const division = (params.division as string) || fetchedMatchDetails?.division || '';
  const courtBooked = params.courtBooked === 'true' || fetchedMatchDetails?.courtBooked || false;
  const fee = (params.fee as string) || fetchedMatchDetails?.fee || 'FREE';
  const feeAmount = (params.feeAmount as string) || fetchedMatchDetails?.feeAmount || '0';
  const description = (params.description as string) || fetchedMatchDetails?.description || '';
  const duration = (params.duration as string) || fetchedMatchDetails?.duration || '2';
  const divisionId = (params.divisionId as string) || fetchedMatchDetails?.divisionId || '';
  const seasonId = (params.seasonId as string) || fetchedMatchDetails?.seasonId || '';
  const participants = params.participants
    ? JSON.parse(params.participants as string)
    : (fetchedMatchDetails?.participants || []);
  const matchStatus = (params.status as string) || fetchedMatchDetails?.status || 'SCHEDULED';
  const isFriendly = params.isFriendly === 'true' || fetchedMatchDetails?.isFriendly || false;
  // Chat message params - used to update the message bubble after joining
  const chatMessageId = params.messageId as string | undefined;
  const chatThreadId = params.threadId as string | undefined;

  // Fetch full match details when navigating with only matchId (from notifications)
  useEffect(() => {
    const fetchFullMatchDetails = async () => {
      // Only fetch if we have matchId but missing essential display data
      if (!matchId || !session?.user?.id) return;

      // Check if we already have the essential params from URL
      const hasEssentialParams = params.date && params.time && params.participants;
      if (hasEssentialParams) return;

      setIsLoadingMatchDetails(true);
      try {
        let data = null;

        // If we know it's a friendly match from params, try that first
        if (params.isFriendly === 'true') {
          try {
            const response = await axiosInstance.get(endpoints.friendly.getDetails(matchId));
            data = response.data?.data;
          } catch (friendlyError) {
            console.log('Not a friendly match, trying league endpoint');
          }
        }

        // Try league match endpoint if friendly didn't work or wasn't specified
        if (!data) {
          try {
            const response = await axiosInstance.get(endpoints.match.getDetails(matchId));
            data = response.data?.data;
          } catch (leagueError) {
            // If league fails, try friendly as fallback
            try {
              const response = await axiosInstance.get(endpoints.friendly.getDetails(matchId));
              data = response.data?.data;
            } catch (friendlyError) {
              // Both failed, throw the original error
              throw leagueError;
            }
          }
        }

        if (data) {
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
            setParticipantsWithDetails(data.participants.map((p: any) => ({
              userId: p.userId,
              name: p.name,
              image: p.image,
              role: p.role,
              team: p.team,
              invitationStatus: p.invitationStatus,
            })));
          }

          // Set additional match data for result submission logic
          setMatchData(prev => ({
            ...prev,
            createdById: data.createdById || null,
            resultSubmittedById: data.resultSubmittedById || null,
            resultSubmittedAt: data.resultSubmittedAt || null,
            status: data.status || 'SCHEDULED',
            team1Score: data.team1Score ?? null,
            team2Score: data.team2Score ?? null,
            isDisputed: data.isDisputed || false,
            matchDate: data.matchDate || null,
            genderRestriction: data.genderRestriction || null,
            skillLevels: data.skillLevels || [],
          }));
        }
      } catch (error) {
        console.error('Error fetching match details:', error);
        toast.error('Failed to load match details');
      } finally {
        setIsLoadingMatchDetails(false);
      }
    };

    fetchFullMatchDetails();
  }, [matchId, session?.user?.id, params.date, params.time, params.participants, params.isFriendly]);

  // Snap points for match result sheet
  const snapPoints = useMemo(() => ['75%', '90%'], []);
  const initialSnapIndex = useMemo(() => 1, []); 
  const cancelSnapPoints = useMemo(() => ['75%', '90%'], []);

  // Handler to expand bottom sheet when friendly match tab is selected
  const handleExpandSheet = useCallback(() => {
    bottomSheetModalRef.current?.snapToIndex(2); 
  }, []);

  // Handler to collapse bottom sheet when casual play tab is selected
  const handleCollapseSheet = useCallback(() => {
    bottomSheetModalRef.current?.snapToIndex(1); 
  }, []);

  // Debug log only once - remove later
  // console.log('🔍 MATCH DETAILS DEBUG:', { matchId, matchStatus });

  const sportColors = getSportColors(sportType?.toUpperCase() as SportType);
  const themeColor = sportColors.background;

  // Backdrop component for bottom sheet
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  // Get sport-specific icon
  const getSportIcon = () => {
    const sport = sportType?.toUpperCase();
    if (sport?.includes('TENNIS')) return TennisIcon;
    if (sport?.includes('PADEL')) return PadelIcon; 
    if (sport?.includes('PICKLEBALL')) return PickleballIcon;
    return TennisIcon;
  };

  const SportIcon = getSportIcon();

  // Fetch participant details
  useEffect(() => {
    if (participants.length > 0 && participantsWithDetails.length === 0) {
      fetchParticipantDetails();
    }
  }, []);

  // Fetch match data (createdById, resultSubmittedById, status)
  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId || !session?.user?.id) return;
      
      try {
        const backendUrl = getBackendBaseURL();
        // Use different endpoint for friendly matches
        const endpoint = isFriendly 
          ? `${backendUrl}/api/friendly/${matchId}`
          : `${backendUrl}/api/match/${matchId}`;
        
        const response = await fetch(endpoint, {
          headers: {
            'x-user-id': session.user.id,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const match = data.match || data;
          setMatchData({
            createdById: match.createdById || null,
            resultSubmittedById: match.resultSubmittedById || null,
            resultSubmittedAt: match.resultSubmittedAt || null,
            status: match.status || 'SCHEDULED',
            team1Score: match.team1Score ?? match.playerScore ?? null,
            team2Score: match.team2Score ?? match.opponentScore ?? null,
            isDisputed: match.isDisputed || false,
            matchDate: match.matchDate || match.scheduledStartTime || null,
            genderRestriction: match.genderRestriction || null,
            skillLevels: match.skillLevels || [],
          });
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
      }
    };
    
    fetchMatchData();
  }, [matchId, session?.user?.id, isFriendly]);

  // Fetch partnership info for doubles
  useEffect(() => {
    if (matchType === 'DOUBLES' && session?.user?.id && seasonId) {
      fetchPartnershipInfo();
    }
  }, [matchType, session?.user?.id, seasonId]);

  // Listen for real-time match updates
  useEffect(() => {
    const handleMatchUpdate = (data: any) => {
      console.log('🔄 Match updated in real-time:', data);
      
      // If this is our match, refresh participant details
      if (data.matchId === matchId) {
        if (data.participants) {
          // Update participants with new data
          fetchParticipantDetails();
          toast.success('Match updated - new player joined!');
        }
      }
    };

    // Subscribe to match update events
    socketService.on('match_participant_joined', handleMatchUpdate);
    socketService.on('match_updated', handleMatchUpdate);

    // Cleanup on unmount
    return () => {
      socketService.off('match_participant_joined', handleMatchUpdate);
      socketService.off('match_updated', handleMatchUpdate);
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
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
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
      console.log('💬 New comment received:', data);
      // Avoid duplicates - check if comment already exists
      setComments((prev) => {
        if (prev.some((c) => c.id === data.comment.id)) {
          return prev;
        }
        return [...prev, data.comment];
      });
    };

    const handleCommentUpdated = (data: { comment: MatchComment }) => {
      console.log('✏️ Comment updated:', data);
      setComments((prev) =>
        prev.map((c) => (c.id === data.comment.id ? data.comment : c))
      );
    };

    const handleCommentDeleted = (data: { commentId: string }) => {
      console.log('🗑️ Comment deleted:', data);
      setComments((prev) => prev.filter((c) => c.id !== data.commentId));
    };

    socketService.on('match_comment_added', handleCommentAdded);
    socketService.on('match_comment_updated', handleCommentUpdated);
    socketService.on('match_comment_deleted', handleCommentDeleted);

    return () => {
      // Leave match room and remove listeners on cleanup
      socketService.leaveMatch(matchId);
      socketService.off('match_comment_added', handleCommentAdded);
      socketService.off('match_comment_updated', handleCommentUpdated);
      socketService.off('match_comment_deleted', handleCommentDeleted);
    };
  }, [matchId]);

  // Comment handlers - update local state immediately, socket will sync across devices
  const handleCreateComment = async (text: string) => {
    const endpoint = isFriendly
      ? endpoints.friendly.createComment(matchId)
      : endpoints.match.createComment(matchId);
    const response = await axiosInstance.post(endpoint, { comment: text });
    // Update local state immediately with the response
    const newComment = response.data;
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
    const updatedComment = response.data;
    setComments((prev) =>
      prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
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
    const status = matchData.status?.toUpperCase();
    if (status !== 'ONGOING' || !matchData.resultSubmittedAt) {
      setAutoApprovalCountdown(null);
      return;
    }

    const calculateCountdown = () => {
      const submittedAt = new Date(matchData.resultSubmittedAt!).getTime();
      const autoApprovalTime = submittedAt + (24 * 60 * 60 * 1000); // 24 hours in ms
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

  const fetchParticipantDetails = async () => {
    try {
      const backendUrl = getBackendBaseURL();
      
      // Fetch details for each participant
      const detailsPromises = participants.map(async (p: any) => {
        try {
          const response = await fetch(`${backendUrl}/api/player/${p.userId}`, {
            headers: {
              'x-user-id': session?.user?.id || '',
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const player = data.data || data;
            return {
              userId: p.userId,
              name: player.name,
              image: player.image,
              role: p.role,
              team: p.team,
              invitationStatus: p.invitationStatus,
            };
          }
        } catch (error) {
        }
        
        return {
          userId: p.userId,
          name: 'Unknown Player',
          image: null,
          role: p.role,
          team: p.team,
          invitationStatus: p.invitationStatus,
        };
      });
      
      const details = await Promise.all(detailsPromises);
      setParticipantsWithDetails(details);
    } catch (error) {
    }
  };

  const fetchPartnershipInfo = async () => {
    try {
      const backendUrl = getBackendBaseURL();
      const response = await fetch(
        `${backendUrl}/api/pairing/partnership/active/${seasonId}`,
        {
          headers: {
            'x-user-id': session?.user?.id || '',
          },
        }
      );

      console.log('Partnership response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Partnership data received:', JSON.stringify(data, null, 2));
        
        // Handle different response structures
        const partnership = data.partnership || data.data || data;
        
        if (partnership && (partnership.captainId || partnership.captain)) {
          const currentUserId = session?.user?.id;
          const captainId = partnership.captainId || partnership.captain?.id;
          const partnerId = partnership.partnerId || partnership.partner?.id;
          const isUserCaptain = captainId === currentUserId;
          const isUserPartner = partnerId === currentUserId;

          // Save partnership data for result submission logic
          setPartnershipData({
            captainId: captainId || null,
            partnerId: partnerId || null,
          });

          // Any partner can join - invitation will be sent to the other
          if (isUserCaptain || isUserPartner) {
            const otherUser = isUserCaptain ? partnership.partner : partnership.captain;
            setPartnerInfo({
              hasPartner: true,
              partnerName: otherUser?.name || 'Partner',
              partnerImage: otherUser?.image,
              partnerId: otherUser?.id,
            });
          } else {
            console.log('User is neither captain nor partner');
            setPartnerInfo({
              hasPartner: false,
            });
          }
        } else {
          console.log('No valid partnership data found in response');
          setPartnerInfo({
            hasPartner: false,
          });
        }
      } else {
        console.log('Partnership fetch failed with status:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching partnership:', error);
    }
  };

  const pairSlots = matchType === 'DOUBLES' ? 2 - Math.ceil(participants.length / 2) : 0;

  // Check if all slots are filled
  const requiredParticipants = matchType === 'DOUBLES' ? 4 : 2;
  const allSlotsFilled = participants.length >= requiredParticipants;

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
        console.error('❌ Error parsing matchData.matchDate:', error);
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
        console.error('❌ Invalid date format:', date);
        return false;
      }

      const [, monthStr, day, year] = datePartsMatch;
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const month = monthMap[monthStr];
      if (month === undefined) {
        console.error('❌ Invalid month:', monthStr);
        return false;
      }

      // Parse time using manual parsing for "1:30 PM" format
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) {
        console.error('❌ Invalid time format:', time);
        return false;
      }

      const [, hourStr, minuteStr, period] = timeMatch;
      let hours = parseInt(hourStr);
      const minutes = parseInt(minuteStr);

      // Convert to 24-hour format
      if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }

      // Create match start time
      const matchStartTime = new Date(parseInt(year), month, parseInt(day), hours, minutes);

      // Validate the date
      if (isNaN(matchStartTime.getTime())) {
        console.error('❌ Invalid date created:', { date, time, matchStartTime });
        return false;
      }

      const now = new Date();

      // Match time is reached if current time >= match start time
      // (No upper limit - overdue matches should still allow result submission)
      return now >= matchStartTime;
    } catch (error) {
      console.error('❌ Error parsing match date/time:', error, { date, time });
      return false;
    }
  };

  const canStartMatch = allSlotsFilled && isMatchTimeReached();

  // Get match status badge with real-time progression
  const getStatusBadge = () => {
    const status = matchStatus.toUpperCase();
    
    let badgeColor = '#E5E7EB';
    let textColor = '#6B7280';
    let statusText = 'Open';
    
    // Calculate time-based status
    const getTimeBasedStatus = () => {
      if (!date || !time) return null;
      
      try {
        const datePartsMatch = date.match(/(\w+)\s+(\d+),\s+(\d+)/);
        if (!datePartsMatch) return null;

        const [, monthStr, day, year] = datePartsMatch;
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[monthStr];
        if (month === undefined) return null;

        const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return null;

        const [, hourStr, minuteStr, period] = timeMatch;
        let hours = parseInt(hourStr);
        const minutes = parseInt(minuteStr);
        
        if (period.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }

        const matchStartTime = new Date(parseInt(year), month, parseInt(day), hours, minutes);
        if (isNaN(matchStartTime.getTime())) return null;

        const matchDuration = parseInt(duration || '2');
        const graceHours = 1;
        const matchEndTime = new Date(matchStartTime.getTime() + (matchDuration + graceHours) * 60 * 60 * 1000);
        
        const now = new Date();
        
        // Before match starts
        if (now < matchStartTime) {
          return 'scheduled';
        }
        // Match is ongoing (between start and end of duration)
        else if (now >= matchStartTime && now <= new Date(matchStartTime.getTime() + matchDuration * 60 * 60 * 1000)) {
          return 'in_progress';
        }
        // Grace period (duration ended but within grace time)
        else if (now > new Date(matchStartTime.getTime() + matchDuration * 60 * 60 * 1000) && now <= matchEndTime) {
          return 'time_passed';
        }
        // After grace period
        else {
          return 'time_passed';
        }
      } catch (error) {
        return null;
      }
    };
    
    const timeBasedStatus = getTimeBasedStatus();
    
    // Status priority: DB status > time-based status
    switch (status) {
      case 'COMPLETED':
      case 'FINISHED':
        badgeColor = '#D1FAE5';
        textColor = '#000000ff';
        statusText = 'Finished';
        break;
      case 'CANCELLED':
        badgeColor = '#FEE2E2';
        textColor = '#991B1B';
        statusText = 'Cancelled';
        break;
      case 'ONGOING':
      case 'IN_PROGRESS':
        // Check if match is disputed
        if (matchData.isDisputed) {
          badgeColor = '#FEE2E2';
          textColor = '#991B1B';
          statusText = 'Disputed';
        } else {
          badgeColor = '#D1FAE5';
          textColor = '#065F46';
          statusText = 'In Progress';
        }
        break;
      case 'DRAFT':
        // Match created but invitations expired/declined
        badgeColor = '#F3F4F6';
        textColor = '#6B7280';
        statusText = 'Draft';
        break;
      case 'VOID':
        // Match voided by admin
        badgeColor = '#FEE2E2';
        textColor = '#991B1B';
        statusText = 'Voided';
        break;
      case 'UNFINISHED':
        // Match started but not completed
        badgeColor = '#FEF3C7';
        textColor = '#92400E';
        statusText = 'Unfinished';
        break;
      case 'OPEN':
      case 'SCHEDULED':
      default:
        // Use time-based status for open/scheduled matches
        if (timeBasedStatus === 'in_progress') {
          badgeColor = '#D1FAE5';
          textColor = '#065F46';
          statusText = 'In Progress';
        } else if (timeBasedStatus === 'time_passed') {
          badgeColor = '#FEE2E2';
          textColor = '#991B1B';
          statusText = 'Time Passed';
        } else if (allSlotsFilled) {
          badgeColor = '#FEF3C7';
          textColor = '#92400E';
          statusText = 'Scheduled';
        } else {
          badgeColor = '#DBEAFE';
          textColor = '#1E40AF';
          statusText = 'Open';
        }
    }
    
    return { badgeColor, textColor, statusText };
  };

  const statusBadge = getStatusBadge();

  const handleJoinMatch = async () => {
    if (!session?.user?.id || !matchId) {
      toast.error('Unable to join match');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = getBackendBaseURL();
      const payload: any = { asPartner: false };

      if (matchType === 'DOUBLES' && partnerInfo.partnerId) {
        payload.partnerId = partnerInfo.partnerId;
      }

      // Use different endpoint for friendly matches (no division/league/season checks)
      const endpoint = isFriendly 
        ? `${backendUrl}/api/friendly/${matchId}/join`
        : `${backendUrl}/api/match/${matchId}/join`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.user.id,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.includes('already a participant')) {
          toast.info('You are already in this match');
          router.back();
          return;
        }
        throw new Error(errorData.error || 'Failed to join match');
      }

      const result = await response.json();

      // Update the chat message to reflect joined status
      // This ensures MatchMessageBubble shows "Joined" when navigating back
      if (chatMessageId && chatThreadId) {
        const { updateMessage, messages } = useChatStore.getState();
        const threadMessages = messages[chatThreadId];
        const existingMessage = threadMessages?.find(m => m.id === chatMessageId);

        if (existingMessage?.matchData) {
          // Create new participant entry for the current user
          const newParticipant = {
            userId: session.user.id,
            invitationStatus: 'ACCEPTED',
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
      toast.success('Successfully joined match!');
      router.back();
    } catch (error: any) {
      console.error('Error joining match:', error);
      toast.error(error.message || 'Failed to join match');
    } finally {
      setLoading(false);
    }
  };

  // For friendly matches, anyone can join doubles without a partnership
  // For league matches, doubles require an active partnership
  const canJoin = matchType === 'SINGLES' ||
                  (matchType === 'DOUBLES' && (isFriendly || partnerInfo.hasPartner));

  // Check if current user is a participant
  const isUserParticipant = participants.some((p: any) => p.userId === session?.user?.id);

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
      console.log('📤 Submitting to backend:', JSON.stringify(data, null, 2));
      console.log('👥 Participants with teams:', participantsWithDetails.map(p => ({
        name: p.name,
        team: p.team,
        mappedTeam: p.team === 'team1' ? 'TEAM_A' : p.team === 'team2' ? 'TEAM_B' : 'TEAM_A'
      })));

      // Handle friendly match cancellation
      if (isFriendly && data.isCancelled) {
        await axiosInstance.post(
          endpoints.friendly.cancel(matchId),
          { comment: data.comment }
        );
        // Trigger My Games refresh so the cancelled match is updated
        useMyGamesStore.getState().triggerRefresh();
        toast.success('Match cancelled');
        bottomSheetModalRef.current?.dismiss();
        router.back();
        return;
      }

      // Use different endpoint for friendly matches (no rating calculation)
      const endpoint = isFriendly
        ? endpoints.friendly.submitResult(matchId)
        : endpoints.match.submitResult(matchId);
      const response = await axiosInstance.post(
        endpoint,
        data
      );

      // Determine success message based on mode
      let successMessage = 'Match result submitted successfully!';
      if (data.isCasualPlay) {
        successMessage = 'Casual play recorded!';
      } else if (data.isUnfinished) {
        successMessage = 'Match marked as incomplete!';
      }
      // Trigger My Games refresh so the updated match status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success(successMessage);
      bottomSheetModalRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      console.error('❌ Error submitting result:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error message:', error.message);

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to submit result';

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
      const response = await axiosInstance.post(
        endpoint,
        { confirmed: true }
      );

      // Trigger My Games refresh so the confirmed match status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success('Match result confirmed!');
      bottomSheetModalRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      console.error('❌ Error confirming result:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to confirm result';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Handler to submit walkover (match didn't play)
  const handleWalkover = async (data: { defaultingUserId: string; reason: string; reasonDetail?: string }) => {
    try {
      const response = await axiosInstance.post(
        endpoints.match.submitWalkover(matchId),
        {
          defaultingUserId: data.defaultingUserId,
          reason: data.reason,
          reasonDetail: data.reasonDetail,
        }
      );

      // Trigger My Games refresh so the walkover status is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success('Walkover recorded successfully');
      bottomSheetModalRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      console.error('❌ Error submitting walkover:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to submit walkover';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Handler to open dispute page (opponent captain)
  const handleOpenDisputeSheet = async () => {
    bottomSheetModalRef.current?.dismiss();

    // Navigate to dispute page with all required data
    setTimeout(() => {
      router.push({
        pathname: '/match/dispute-score',
        params: {
          matchId,
          matchType,
          sportType,
          players: JSON.stringify(participantsWithDetails.map(p => ({
            id: p.userId,
            name: p.name || 'Unknown',
            image: p.image,
            team: p.team === 'team1' ? 'TEAM_A' : p.team === 'team2' ? 'TEAM_B' : undefined,
          }))),
          submittedScore: matchData.team1Score !== null ? JSON.stringify({
            team1Score: matchData.team1Score,
            team2Score: matchData.team2Score ?? 0,
          }) : undefined,
        },
      });
    }, 300);
  };

  // Handler for cancelling match
  const handleCancelMatch = async (data: { reason: string; comment?: string }) => {
    try {
      const response = await axiosInstance.post(
        endpoints.match.cancel(matchId),
        {
          reason: data.reason,
          comment: data.comment,
        }
      );

      // Trigger My Games refresh so the cancelled match is shown
      useMyGamesStore.getState().triggerRefresh();
      toast.success('Match cancelled successfully');
      cancelSheetRef.current?.dismiss();
      router.back();
    } catch (error: any) {
      console.error('❌ Error cancelling match:', error);
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to cancel match';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Check if match can be cancelled (only SCHEDULED matches)
  const canCancelMatch = () => {
    const status = matchData.status?.toUpperCase() || matchStatus.toUpperCase();
    // Can only cancel SCHEDULED matches
    if (status !== 'SCHEDULED') return false;

    const isCreator = matchData.createdById === session?.user?.id;

    // Special case: Allow creator to cancel orphaned matches (time passed but no opponent joined)
    // This prevents matches from being stuck forever when no one joins
    if (isMatchTimeReached() && !allSlotsFilled && isCreator) {
      return true;
    }

    // Normal case: Don't allow cancellation if match has already started (time reached AND all slots filled)
    if (isMatchTimeReached() && allSlotsFilled) return false;

    // Allow if user is a participant OR if user is the creator (can cancel their own match)
    return isUserParticipant || isCreator;
  };

  // Determine if current user is the one who SUBMITTED the result
  // This is used to show "Awaiting Approval" to the submitter
  const isResultSubmitter = (() => {
    if (!matchData.resultSubmittedById) return false;
    
    if (matchType === 'SINGLES') {
      // For singles, check if current user submitted the result
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
    return submitterId === partnershipData.captainId || submitterId === partnershipData.partnerId;
  })();

  // Determine if current user can REVIEW/APPROVE/DISPUTE the result
  // This is the opponent of whoever submitted - they get to approve or dispute
  const canReviewResult = (() => {
    if (!isUserParticipant) return false;
    if (!matchData.resultSubmittedById) return false;
    
    if (matchType === 'SINGLES') {
      // For singles, opponent is anyone who is a participant but NOT the submitter
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
    if (matchType === 'SINGLES') {
      return matchData.createdById === session?.user?.id;
    }
    return partnershipData.captainId === matchData.createdById;
  })();

  // Determine result sheet mode based on match status and user role
  const getResultSheetMode = (): 'submit' | 'view' | 'review' | 'disputed' => {
    const status = matchData.status?.toUpperCase() || matchStatus.toUpperCase();

    // If match is ONGOING and DISPUTED - show view-only mode with dispute banner
    if (status === 'ONGOING' && matchData.isDisputed) {
      return 'disputed';
    }

    // If match is ONGOING (result submitted), the OPPONENT (non-submitter) can review/approve/dispute
    // The submitter should see 'view' mode with "awaiting confirmation" message
    if (status === 'ONGOING') {
      if (canReviewResult) {
        return 'review';
      }
      // Submitter or their teammate sees view mode
      return 'view';
    }

    // If match is COMPLETED, everyone sees view mode
    if (status === 'COMPLETED' || status === 'FINISHED') {
      return 'view';
    }

    // If match is SCHEDULED and time has passed, any participant can submit
    // (For overdue matches, both creator and opponent should be able to submit)
    if (status === 'SCHEDULED' && canStartMatch && isUserParticipant) {
      return 'submit';
    }

    // Default to view for everyone else
    return 'view';
  };

  const resultSheetMode = getResultSheetMode();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={themeColor} />

      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: themeColor, paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerMatchType}>
            {matchType === 'DOUBLES' ? 'Doubles' : 'Singles'} {isFriendly ? 'Friendly' : 'League'} Match
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
              <Text style={styles.headerLeagueName}>{leagueName || 'League Match'}</Text>
              <Text style={styles.headerSeason}>{season || 'Season 1'} - {division || 'Division 1'}</Text>
            </>
          )}
        </View>

        <View style={styles.headerIcon}>
          <SportIcon width={80} height={80} fill="#FFFFFF" />
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={16}
      >
        {/* Loading indicator when fetching match details from notifications */}
        {isLoadingMatchDetails && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColor} />
            <Text style={styles.loadingText}>Loading match details...</Text>
          </View>
        )}

        {/* Participants Section */}
        <View style={styles.participantsSection}>
          <View style={styles.playersRow}>
            {matchType === 'DOUBLES' ? (
              <>
                {/* Team 1 - Left Side */}
                <View style={styles.teamSection}>
                  <View style={styles.teamPlayers}>
                    <View style={styles.doublesPlayerContainer}>
                      <View style={styles.playerAvatarWrapper}>
                        <View style={styles.playerAvatar}>
                          {participantsWithDetails[0] ? (
                            participantsWithDetails[0].image ? (
                              <Image source={{ uri: participantsWithDetails[0].image }} style={styles.avatarImage} />
                            ) : (
                              <View style={styles.defaultAvatar}>
                                <Text style={styles.defaultAvatarText}>
                                  {participantsWithDetails[0].name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )
                          ) : (
                            <View style={styles.emptySlot}>
                              <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </View>
                        {participantsWithDetails[0]?.invitationStatus === 'PENDING' && (
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          </View>
                        )}
                        {participantsWithDetails[0]?.invitationStatus === 'ACCEPTED' && (
                          <View style={styles.acceptedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {participantsWithDetails[0]?.name || 'Open slot'}
                      </Text>
                    </View>
                    <View style={styles.doublesPlayerContainer}>
                      <View style={styles.playerAvatarWrapper}>
                        <View style={styles.playerAvatar}>
                          {participantsWithDetails[1] ? (
                            participantsWithDetails[1].image ? (
                              <Image source={{ uri: participantsWithDetails[1].image }} style={styles.avatarImage} />
                            ) : (
                              <View style={styles.defaultAvatar}>
                                <Text style={styles.defaultAvatarText}>
                                  {participantsWithDetails[1].name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )
                          ) : (
                            <View style={styles.emptySlot}>
                              <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </View>
                        {participantsWithDetails[1]?.invitationStatus === 'PENDING' && (
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          </View>
                        )}
                        {participantsWithDetails[1]?.invitationStatus === 'ACCEPTED' && (
                          <View style={styles.acceptedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {participantsWithDetails[1]?.name || 'Open slot'}
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
                          {participantsWithDetails[2] ? (
                            participantsWithDetails[2].image ? (
                              <Image source={{ uri: participantsWithDetails[2].image }} style={styles.avatarImage} />
                            ) : (
                              <View style={styles.defaultAvatar}>
                                <Text style={styles.defaultAvatarText}>
                                  {participantsWithDetails[2].name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )
                          ) : (
                            <View style={styles.emptySlot}>
                              <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </View>
                        {participantsWithDetails[2]?.invitationStatus === 'PENDING' && (
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          </View>
                        )}
                        {participantsWithDetails[2]?.invitationStatus === 'ACCEPTED' && (
                          <View style={styles.acceptedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {participantsWithDetails[2]?.name || 'Open slot'}
                      </Text>
                    </View>
                    <View style={styles.doublesPlayerContainer}>
                      <View style={styles.playerAvatarWrapper}>
                        <View style={styles.playerAvatar}>
                          {participantsWithDetails[3] ? (
                            participantsWithDetails[3].image ? (
                              <Image source={{ uri: participantsWithDetails[3].image }} style={styles.avatarImage} />
                            ) : (
                              <View style={styles.defaultAvatar}>
                                <Text style={styles.defaultAvatarText}>
                                  {participantsWithDetails[3].name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                              </View>
                            )
                          ) : (
                            <View style={styles.emptySlot}>
                              <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                        </View>
                        {participantsWithDetails[3]?.invitationStatus === 'PENDING' && (
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          </View>
                        )}
                        {participantsWithDetails[3]?.invitationStatus === 'ACCEPTED' && (
                          <View style={styles.acceptedBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {participantsWithDetails[3]?.name || 'Open slot'}
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
                          <Image source={{ uri: participantsWithDetails[0].image }} style={styles.avatarImage} />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <Text style={styles.defaultAvatarText}>
                              {participantsWithDetails[0].name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                        )
                      ) : (
                        <View style={styles.emptySlot}>
                          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    {participantsWithDetails[0]?.invitationStatus === 'PENDING' && (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={14} color="#F59E0B" />
                      </View>
                    )}
                    {participantsWithDetails[0]?.invitationStatus === 'ACCEPTED' && (
                      <View style={styles.acceptedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {participantsWithDetails[0]?.name || 'Open slot'}
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
                          <Image source={{ uri: participantsWithDetails[1].image }} style={styles.avatarImage} />
                        ) : (
                          <View style={styles.defaultAvatar}>
                            <Text style={styles.defaultAvatarText}>
                              {participantsWithDetails[1].name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                        )
                      ) : (
                        <View style={styles.emptySlot}>
                          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    {participantsWithDetails[1]?.invitationStatus === 'PENDING' && (
                      <View style={styles.pendingBadge}>
                        <Ionicons name="time-outline" size={14} color="#F59E0B" />
                      </View>
                    )}
                    {participantsWithDetails[1]?.invitationStatus === 'ACCEPTED' && (
                      <View style={styles.acceptedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {participantsWithDetails[1]?.name || 'Open slot'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Date & Time */}
        <View style={styles.detailRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={24} color={themeColor} />
          </View>
          <View style={styles.detailContent}>
            <View style={styles.dateTimeHeader}>
              <Text style={styles.detailTitle}>{date} at {time}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.badgeColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusBadge.textColor }]}>
                  {statusBadge.statusText}
                </Text>
              </View>
            </View>
            <Text style={styles.detailSubtitle}>{duration || 2} hour(s)</Text>
            {/* Inline auto-approval countdown */}
            {autoApprovalCountdown && (
              <View style={styles.autoApprovalInline}>
                <Ionicons
                  name={autoApprovalCountdown.expired ? "checkmark-circle" : "time-outline"}
                  size={12}
                  color={autoApprovalCountdown.expired ? "#22C55E" : "#F59E0B"}
                />
                <Text style={styles.autoApprovalInlineText}>
                  {autoApprovalCountdown.expired
                    ? 'Auto-approved'
                    : `Awaiting confirmation · ${autoApprovalCountdown.hours}h ${autoApprovalCountdown.minutes}m`}
                </Text>
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
            <Text style={styles.detailTitle}>{location || 'TBD'}</Text>
            {/* <Text style={styles.detailAddress}>
              Lot 15, Carpark behind BP Healthcare, Lot 3470, Jalan SS 23/15, Taman Sea, 47300 Petaling Jaya, Selangor
            </Text> */}
            <View style={styles.courtStatusContainer}>
              {courtBooked ? (
                <View style={styles.courtBadge}>
                  <Text style={styles.courtBadgeText}>Court booked</Text>
                  <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                </View>
              ) : (
                <View style={[styles.courtBadge, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={[styles.courtBadgeText, { color: '#EF4444' }]}>Court not booked</Text>
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
                if (fee === 'FREE') return 'Free';
                const totalAmount = Number(feeAmount || 0);
                if (fee === 'SPLIT') {
                  const numPlayers = matchType === 'DOUBLES' ? 4 : 2;
                  const perPlayer = (totalAmount / numPlayers).toFixed(2);
                  return `Split - Estimated RM${perPlayer} per player`;
                }
                return `Fixed - RM${totalAmount.toFixed(2)} per player`;
              })()}
            </Text>
            {fee === 'SPLIT' && (
              <Text style={styles.detailSubtitle}>
                The per-player fee is estimated. The final amount depends on how many players join this match.
              </Text>
            )}
          </View>
        </View>

        {/* Open to Section - Only for friendly matches */}
        {isFriendly && (matchData.genderRestriction || (matchData.skillLevels && matchData.skillLevels.length > 0)) && (
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="people-outline" size={24} color={themeColor} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>Open to</Text>
              
              {/* Gender Restriction */}
              {matchData.genderRestriction && (
                <View style={styles.openToRow}>
                  <Text style={styles.openToLabel}>Gender</Text>
                  <View style={styles.genderRestrictionChip}>
                    <Text style={styles.genderRestrictionChipText}>
                      {matchData.genderRestriction === 'MALE' ? 'Male' : 
                       matchData.genderRestriction === 'FEMALE' ? 'Female' : 'All'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Skill Level Restrictions */}
              {matchData.skillLevels && matchData.skillLevels.length > 0 && (
                <View style={styles.openToRow}>
                  <Text style={styles.openToLabel}>Skill</Text>
                  <View style={styles.restrictionChipsContainer}>
                    {matchData.skillLevels.map((level, index) => {
                      const skillMap: Record<string, string> = {
                        'BEGINNER': 'Beginner',
                        'IMPROVER': 'Improver',
                        'INTERMEDIATE': 'Intermediate',
                        'UPPER_INTERMEDIATE': 'Upper Intermediate',
                        'EXPERT': 'Expert',
                      };
                      return (
                        <View key={index} style={styles.skillRestrictionChip}>
                          <Text style={styles.skillRestrictionChipText}>
                            {skillMap[level] || level}
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
          <Text style={[
            styles.descriptionText,
            !description && styles.noDescriptionText
          ]}>
            {description || 'No description'}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* DRAFT Status Banner - Match invitations expired/declined */}
        {matchData.status?.toUpperCase() === 'DRAFT' && (
          <View style={styles.draftStatusBanner}>
            <Ionicons name="document-outline" size={24} color="#6B7280" />
            <View style={styles.draftStatusContent}>
              <Text style={styles.draftStatusTitle}>Match is in Draft</Text>
              <Text style={styles.draftStatusText}>
                All invitations have expired or been declined. This match needs to be rescheduled or cancelled.
              </Text>
              {matchData.createdById === session?.user?.id && (
                <Text style={styles.draftStatusHint}>
                  As the match creator, you can delete this match and create a new one.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* VOID Status Banner - Match voided by admin */}
        {matchData.status?.toUpperCase() === 'VOID' && (
          <View style={styles.voidStatusBanner}>
            <Ionicons name="ban-outline" size={24} color="#DC2626" />
            <View style={styles.voidStatusContent}>
              <Text style={styles.voidStatusTitle}>Match Voided</Text>
              <Text style={styles.voidStatusText}>
                This match has been voided by an administrator. No points or statistics were recorded.
              </Text>
            </View>
          </View>
        )}

        {/* UNFINISHED Status Banner - Match started but not completed */}
        {matchData.status?.toUpperCase() === 'UNFINISHED' && (
          <View style={styles.unfinishedStatusBanner}>
            <Ionicons name="pause-circle-outline" size={24} color="#D97706" />
            <View style={styles.unfinishedStatusContent}>
              <Text style={styles.unfinishedStatusTitle}>Match Unfinished</Text>
              <Text style={styles.unfinishedStatusText}>
                This match was started but not completed. Please contact the league admin for assistance.
              </Text>
            </View>
          </View>
        )}

        {/* Partnership Status for Doubles - Only show for league matches (not friendly) if match not full */}
        {matchType === 'DOUBLES' && !isFriendly && !allSlotsFilled && matchData.status?.toUpperCase() === 'SCHEDULED' && (
          <View style={styles.partnershipStatus}>
            {partnerInfo.hasPartner ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                <Text style={styles.successBannerText}>
                  An invitation will be sent to {partnerInfo.partnerName} to join this match
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
          canComment={['ONGOING', 'COMPLETED', 'UNFINISHED', 'FINISHED'].includes(
            (matchData.status || matchStatus).toUpperCase()
          )}
          currentUserId={session?.user?.id}
          onCreateComment={handleCreateComment}
          onUpdateComment={handleUpdateComment}
          onDeleteComment={handleDeleteComment}
          isLoading={isLoadingComments}
        />

        {/* Report Section  - Waiting on updates from clients */}
        <TouchableOpacity style={styles.reportButton}>
          <Text style={styles.reportButtonText}>Report a problem</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Footer with Action Buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {isUserParticipant ? (
          <View style={styles.buttonGroup}>
            {/* Dynamic button based on user role and match status */}
            {(() => {
              const status = matchData.status?.toUpperCase() || matchStatus.toUpperCase();

              // Match COMPLETED - Show "View Scores" to everyone
              if (status === 'COMPLETED' || status === 'FINISHED') {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#F59E0B" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={styles.joinButtonText}>View Scores</Text>
                  </TouchableOpacity>
                );
              }

              // Match ONGOING but DISPUTED - Allow viewing scores with "Under Review" indicator
              if (status === 'ONGOING' && matchData.isDisputed) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#DC2626" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>View Scores (Disputed)</Text>
                  </TouchableOpacity>
                );
              }

              // Match ONGOING (result submitted) - Opponent (non-submitter) sees "View Scores" to approve/deny
              if (status === 'ONGOING' && canReviewResult) {
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
              if (status === 'ONGOING' && isResultSubmitter) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#6B7280" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>View Score</Text>
                  </TouchableOpacity>
                );
              }

              // Match SCHEDULED and time reached AND all slots filled - Any participant can submit result
              // (For overdue matches, both creator and opponent should be able to submit)
              if (status === 'SCHEDULED' && canStartMatch) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#F59E0B" }]}
                    onPress={() => bottomSheetModalRef.current?.present()}
                  >
                    <Text style={styles.joinButtonText}>Add Result</Text>
                  </TouchableOpacity>
                );
              }

              // Show the button if user can cancel
              // This handles: partially-filled matches, before time, AND orphaned expired matches
              if (canCancelMatch()) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#EF4444" }]}
                    onPress={() => cancelSheetRef.current?.present()}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>Cancel Match</Text>
                  </TouchableOpacity>
                );
              }

              // Waiting for opponent - show a disabled "Waiting" state
              if (status === 'SCHEDULED' && !allSlotsFilled && !isMatchTimeReached()) {
                return (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: "#9CA3AF" }]}
                    disabled={true}
                  >
                    <Text style={[styles.joinButtonText, { color: "#FFFFFF" }]}>Waiting for Opponent</Text>
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
            {/* ⚠️ TEST BUTTON - BYPASSES TIME VALIDATION - REMOVE BEFORE PRODUCTION ⚠️ */}
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: "#8B5CF6", borderColor: "#7C3AED" }]}
              onPress={handleJoinMatch}
              disabled={loading || !canJoin || allSlotsFilled}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>
                  🧪 Join (No Time Check)
                </Text>
              )}
            </TouchableOpacity>

            {/* Production Join Button - With Time Validation */}
            <TouchableOpacity
              style={[
                styles.joinButton,
                { backgroundColor:"#FEA04D" },
                (loading || !canJoin || allSlotsFilled || isMatchTimeReached()) && styles.joinButtonDisabled
              ]}
              onPress={handleJoinMatch}
              disabled={loading || !canJoin || allSlotsFilled || isMatchTimeReached()}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isMatchTimeReached() && !allSlotsFilled ? 'Time Passed' : allSlotsFilled ? 'Match Full' : 'Join Match'}
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
          matchType={matchType as 'SINGLES' | 'DOUBLES'}
          players={participantsWithDetails.map(p => ({
            id: p.userId,
            name: p.name || 'Unknown',
            image: p.image,
            team: (p.team === 'team1' ? 'TEAM_A' : p.team === 'team2' ? 'TEAM_B' : 'TEAM_A') as 'TEAM_A' | 'TEAM_B',
          }))}
          sportType={sportType}
          seasonId={seasonId}
          mode={resultSheetMode}
          isFriendlyMatch={isFriendly}
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
          onExpandSheet={handleExpandSheet}
          onCollapseSheet={handleCollapseSheet}
        />
      </BottomSheetModal>

      {/* Cancel Match Sheet Modal */}
      <BottomSheetModal
        ref={cancelSheetRef}
        snapPoints={cancelSnapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <CancelMatchSheet
          matchId={matchId}
          matchDate={date}
          matchTime={time}
          onClose={() => cancelSheetRef.current?.dismiss()}
          onCancel={handleCancelMatch}
        />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerMatchType: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leagueBadge: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  leagueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerContent: {
    paddingHorizontal: 24,
    marginTop: 4,
  },
  headerLeagueName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSeason: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  headerIcon: {
    position: 'absolute',
    bottom: -10,
    right: 10,
    opacity: 0.8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  participantsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerSection: {
    alignItems: 'center',
    flex: 1,
  },
  teamSection: {
    alignItems: 'center',
    flex: 1,
  },
  teamPlayers: {
    flexDirection: 'row',
    gap: 12,
  },
  doublesPlayerContainer: {
    alignItems: 'center',
    maxWidth: 60,
  },
  playerAvatarWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  pendingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  acceptedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySlot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 24,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 16,
  },
  vsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  verticalDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#E2E2E2',
    marginHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginHorizontal: 24,
  },
  detailRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  openToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  openToLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
    minWidth: 60,
  },
  restrictionChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  genderRestrictionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  genderRestrictionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  skillRestrictionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  skillRestrictionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  detailAddress: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  courtStatusContainer: {
    flexDirection: 'row',
  },
  courtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  courtBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  descriptionSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 12,
  },
  descriptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  noDescriptionText: {
    fontStyle: 'italic',
    color: '#9CA3AF',
  },
  partnershipStatus: {
    marginHorizontal: 24,
    marginTop: 20,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  autoApprovalInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  autoApprovalInlineText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  draftStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  draftStatusContent: {
    flex: 1,
  },
  draftStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  draftStatusText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  draftStatusHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 8,
  },
  voidStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  voidStatusContent: {
    flex: 1,
  },
  voidStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  voidStatusText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  unfinishedStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  unfinishedStatusContent: {
    flex: 1,
  },
  unfinishedStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 4,
  },
  unfinishedStatusText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  reportButton: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  reportButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  buttonGroup: {
    gap: 12,
  },
  testButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  joinButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  joinButtonWithIcon: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2929',
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});
