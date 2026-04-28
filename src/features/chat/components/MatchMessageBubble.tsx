/* eslint-disable react-hooks/rules-of-hooks */
// Note: This component has conditional hooks due to early return patterns.
// TODO: Refactor to move all hooks before any conditional returns.
import { getSportColors, type SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import { toast } from 'sonner-native';
import { Message } from '../types';
import { MatchInfoModal } from './MatchInfoModal';
import { useChatStore } from '../stores/ChatStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { EditMatchSheet } from '@/src/features/match/components/EditMatchSheet';
import { CancelMatchSheet } from '@/src/features/match/components/CancelMatchSheet';
import axiosInstance, { endpoints } from '@/lib/endpoints';

// Smooth layout transition for when messages are added/removed
const layoutTransition = Layout.duration(150);

// Match participant type
interface MatchParticipant {
  id?: string;
  userId?: string;
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  team?: string;
}

interface MatchMessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isGroupChat?: boolean;
}

export const MatchMessageBubble: React.FC<MatchMessageBubbleProps> = ({
  message,
  isCurrentUser,
  isGroupChat = false,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { updateMessage, messages } = useChatStore();
  

  // Get the latest message from store to ensure we have the most up-to-date data
  const currentThreadId = message.threadId;
  const latestMessage = messages[currentThreadId]?.find(m => m.id === message.id) || message;
  const matchData = latestMessage.matchData || message.matchData;

  const senderName = latestMessage.metadata?.sender?.name ||
                    latestMessage.metadata?.sender?.username ||
                    message.metadata?.sender?.name ||
                    message.metadata?.sender?.username ||
                    'Unknown';
  const senderImage = latestMessage.metadata?.sender?.image || message.metadata?.sender?.image || null;
  const senderId = latestMessage.senderId || message.senderId;

  // Get first name only for display
  const firstName = senderName.split(' ')[0];

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isFetchingPartner, setIsFetchingPartner] = useState(false);
  const [hasAlreadyPlayed, setHasAlreadyPlayed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [enrichedMatchData, setEnrichedMatchData] = useState<any>(null);
  const [isFetchingMatchDetails, setIsFetchingMatchDetails] = useState(false);
  const [isCancelled, setIsCancelled] = useState((matchData as any).status === 'CANCELLED');
  const [hasOpponentJoinedLive, setHasOpponentJoinedLive] = useState<boolean | null>(null);
  const [isOpeningCancel, setIsOpeningCancel] = useState(false);

  const editSheetRef = useRef<BottomSheetModal>(null);
  const cancelSheetRef = useRef<BottomSheetModal>(null);
  // Get the most up-to-date request status from multiple sources
  const getLatestRequestStatus = useCallback(() => {
    // Priority: latestMessage from store > message prop matchData
    const storeStatus = latestMessage.matchData?.requestStatus;
    const propsStatus = message.matchData?.requestStatus;
    return (storeStatus || propsStatus) as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | undefined;
  }, [latestMessage.matchData?.requestStatus, message.matchData?.requestStatus]);

  const [requestStatus, setRequestStatus] = useState<'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | undefined>(
    getLatestRequestStatus()
  );

  // Sync requestStatus state with message prop changes and store updates
  useEffect(() => {
    const status = getLatestRequestStatus();
    // Always update if we have a definitive status (not undefined/PENDING)
    // This ensures declined/accepted/expired status is properly reflected
    if (status && status !== requestStatus) {
      setRequestStatus(status);
    }
  }, [matchData?.requestStatus, latestMessage.matchData?.requestStatus, message.matchData?.requestStatus, getLatestRequestStatus, requestStatus]);

  // Sync isCancelled when store delivers fresh matchData (e.g. after loadMessages on chat reload)
  useEffect(() => {
    if ((matchData as any).status === 'CANCELLED' && !isCancelled) {
      setIsCancelled(true);
    }
  }, [(matchData as any).status]);

  // Also sync hasJoined state if user is in participants
  useEffect(() => {
    if (currentUserId && matchData?.participants) {
      const userParticipant = (matchData.participants as MatchParticipant[]).find((p: MatchParticipant) =>
        (p.userId === currentUserId || p.id === currentUserId) &&
        (p.invitationStatus === 'ACCEPTED' || !p.invitationStatus)
      );
      if (userParticipant && !hasJoined) {
        setHasJoined(true);
      }
    }
  }, [matchData?.participants, currentUserId, hasJoined]);

  // Early return after all hooks
  if (!matchData) {
   console.log('No matchData found for match message:', message.id);
    return null;
  }

  // Check if this is a friendly match (either a request or regular friendly match)
  const isFriendlyRequest = matchData.isFriendlyRequest === true;
  const matchDataAny = matchData as any;
  const isFriendly = matchDataAny.isFriendly === true || matchData.isFriendlyRequest === true;
  const requestStatusFromData = matchData.requestStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | undefined;
  const requestExpiresAt = matchData.requestExpiresAt;
  const isRequestRecipient = currentUserId === matchData.requestRecipientId;
  
  // Use state for requestStatus if available, otherwise fall back to data
  const currentRequestStatus = requestStatus !== undefined ? requestStatus : requestStatusFromData;

  // Calculate time remaining for expiration timer
  useEffect(() => {
    if (!isFriendlyRequest || !requestExpiresAt || currentRequestStatus !== 'PENDING') {
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(requestExpiresAt);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`Expires in ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeRemaining(`Expires in ${minutes}m`);
      } else {
        setTimeRemaining('Expires soon');
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isFriendlyRequest, requestExpiresAt, currentRequestStatus]);

  // Check if expired on mount
  useEffect(() => {
    if (isFriendlyRequest && requestExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(requestExpiresAt);
      if (expiresAt < now) {
        setIsExpired(true);
      }
    }
  }, [isFriendlyRequest, requestExpiresAt]);

  // Helper functions for time formatting
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Extract start time from range (e.g., "2:00 PM - 4:00 PM" -> "2:00 PM")
  const extractStartTime = (timeRange: string): string => {
    if (!timeRange) return '12:00 PM';
    if (timeRange.includes(' - ')) {
      return timeRange.split(' - ')[0].trim();
    }
    return timeRange.trim();
  };

  // Format time to remove seconds if present
  const formatTime = (timeString: string) => {
    // Handle both "8:00 PM" and "20:00:00" formats
    if (timeString.includes('M')) return timeString;
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationHours: number) => {
    // Extract just the start time if it's a range
    const actualStartTime = extractStartTime(startTime);
    const [time, modifier] = actualStartTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let startHour = modifier === 'PM' && hours !== 12 ? hours + 12 : hours;
    if (modifier === 'AM' && hours === 12) startHour = 0;
    
    const totalMinutes = startHour * 60 + minutes + (durationHours * 60);
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    
    const displayEndHour = endHour % 12 || 12;
    const endModifier = endHour >= 12 ? 'PM' : 'AM';
    return `${displayEndHour}:${String(endMinutes).padStart(2, '0')} ${endModifier}`;
  };

  chatLogger.debug('Match participants for message:', message.id, {
    participantCount: matchData.participants?.length || 0,
  });

  // Check if current user is the one who posted the match
  const isMatchPoster = currentUserId === senderId;

  // Compute whether any non-creator participant has joined (ACCEPTED or PENDING)
  const hasOpponentJoined = React.useMemo(() => {
    if (!matchData.participants || matchData.participants.length === 0) return false;
    const creatorId = senderId;
    return (matchData.participants as MatchParticipant[]).some(
      (p) =>
        p.userId !== creatorId &&
        p.id !== creatorId &&
        (p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING' || !p.invitationStatus)
    );
  }, [matchData.participants, senderId]);

  // Open cancel sheet — fetch live participant data first so hasOpponentJoined is accurate
  const handleOpenCancelSheet = async () => {
    const effectiveMatchId = matchData.matchId || (matchData as any).id;
    if (!effectiveMatchId) return;

    setIsOpeningCancel(true);
    try {
      const response = await authenticatedFetch(`/api/match/${effectiveMatchId}`);
      if (response.ok) {
        const result = await response.json();
        const match = result.match || result.data || result;
        const participants: MatchParticipant[] = match.participants || [];
        const creatorId = senderId;
        const opponentJoined = participants.some(
          (p) =>
            p.userId !== creatorId &&
            p.id !== creatorId &&
            (p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING' || !p.invitationStatus)
        );
        setHasOpponentJoinedLive(opponentJoined);
      } else {
        // Fallback to stale data
        setHasOpponentJoinedLive(hasOpponentJoined);
      }
    } catch {
      setHasOpponentJoinedLive(hasOpponentJoined);
    } finally {
      setIsOpeningCancel(false);
      cancelSheetRef.current?.present();
    }
  };

  // Handle cancel match from the bubble
  const handleCancelFromBubble = async (data: { reason: string; comment?: string }) => {
    const effectiveMatchId = matchData.matchId || (matchData as any).id;
    if (!effectiveMatchId) {
      toast.error('Unable to cancel match');
      return;
    }
    try {
      await axiosInstance.post(endpoints.match.cancel(effectiveMatchId), {
        reason: data.reason,
        comment: data.comment,
      });
      toast.success('Match cancelled');
      setIsCancelled(true);
      cancelSheetRef.current?.dismiss();
      // Update the message in the store to reflect cancellation
      const updatedMatchData = { ...matchData, status: 'CANCELLED' } as Message['matchData'];
      updateMessage(latestMessage.id, { matchData: updatedMatchData });
      // Refresh thread list so ChatScreen shows updated state
      if (currentUserId) {
        useChatStore.getState().loadThreads(currentUserId);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to cancel match';
      toast.error(msg);
      throw error;
    }
  };

  // Handle match edited from the bubble
  const handleMatchEditedFromBubble = async () => {
    editSheetRef.current?.dismiss();
    // Refetch the updated match data and update the message in the store
    const effectiveMatchId = matchData.matchId || (matchData as any).id;
    if (!effectiveMatchId) return;
    try {
      const response = await authenticatedFetch(`/api/match/${effectiveMatchId}`);
      if (response.ok) {
        const result = await response.json();
        const match = result.match || result.data || result;
        // Update the message matchData with the new values
        const updatedMatchData = {
          ...matchData,
          date: match.matchDate || matchData.date,
          time: match.time || matchData.time,
          location: match.location || matchData.location,
          courtBooked: match.courtBooked ?? matchData.courtBooked,
          fee: match.fee || matchData.fee,
          feeAmount: match.feeAmount ?? (matchData as any).feeAmount,
          duration: match.duration || matchData.duration,
          notes: match.notes || (matchData as any).notes,
        } as Message['matchData'];
        updateMessage(latestMessage.id, { matchData: updatedMatchData });
        setEnrichedMatchData(match);
      }
    } catch (err) {
      chatLogger.error('Error refreshing match after edit:', err);
    }
  };

  // Handle decline request
  const handleDeclineRequest = async () => {
    const effectiveMatchId = matchData.matchId || (matchData as any).id;
    if (!effectiveMatchId || !currentUserId) {
      toast.error('Unable to decline request');
      return;
    }

    if (!isRequestRecipient) {
      toast.error('You are not the recipient of this request');
      return;
    }

    setIsDeclining(true);
    try {
      const response = await authenticatedFetch(`/api/friendly/${effectiveMatchId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to decline request');
      }

      toast.success('Request declined');
      // Update local state to reflect declined status
      setRequestStatus('DECLINED');

      // Update message in chat store so UI reflects the change
      if (matchData) {
        const updatedMatchData = {
          ...matchData,
          requestStatus: 'DECLINED',
        };

        updateMessage(latestMessage.id, {
          matchData: updatedMatchData as Message['matchData'],
        });
      }
    } catch (error) {
      chatLogger.error('Error declining request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to decline request');
    } finally {
      setIsDeclining(false);
    }
  };
  
  // Check if current user is already in the match
  const isUserInMatch = React.useMemo(() => {
    if (!currentUserId) return false;
    if (isMatchPoster) return true; // Match creator is always in the match
    if (hasJoined) return true; // User just joined
    // For friendly requests, if status is ACCEPTED, user has joined
    if (isFriendlyRequest && currentRequestStatus === 'ACCEPTED') return true;
    
    // Check if user is in participants array
    if (matchData.participants && matchData.participants.length > 0) {
      return (matchData.participants as MatchParticipant[]).some((p: MatchParticipant) =>
        (p.userId === currentUserId || p.id === currentUserId) &&
        (p.invitationStatus === 'ACCEPTED' || !p.invitationStatus)
      );
    }
    
    return false;
  }, [currentUserId, isMatchPoster, hasJoined, matchData.participants, isFriendlyRequest, currentRequestStatus]);

  // Check if match is already completed (has result)
  const isMatchCompleted = React.useMemo(() => {
    const status = (matchData as any).status?.toUpperCase();
    return status === 'COMPLETED' || status === 'FINISHED' || status === 'WALKOVER_PENDING';
  }, [(matchData as any).status]);

  // Check if match is full (all slots taken) — uses live enrichedMatchData when available so
  // the bubble reflects the server state without a user action.
  const isMatchFull = React.useMemo(() => {
    const maxSlots = matchData.matchType === 'DOUBLES' || matchData.numberOfPlayers === '4' ? 4 : 2;
    const rawParticipants = (enrichedMatchData?.participants || matchData.participants) as MatchParticipant[] || [];
    const acceptedParticipants = rawParticipants.filter(
      (p) => p.invitationStatus === 'ACCEPTED' || !p.invitationStatus
    );
    return acceptedParticipants.length >= maxSlots;
  }, [matchData.matchType, matchData.numberOfPlayers, matchData.participants, enrichedMatchData]);

  // On mount: fetch live match details once to hydrate enrichedMatchData (gives fresh
  // participant list for isMatchFull) and to check already-played status.
  useEffect(() => {
    const effectiveMatchId = matchData.matchId || (matchData as any).id;
    if (!currentUserId || !effectiveMatchId) return;

    const runMountChecks = async () => {
      try {
        const matchResponse = await authenticatedFetch(`/api/match/${effectiveMatchId}`);
        if (!matchResponse.ok) return;

        const matchResult = await matchResponse.json();
        const match = matchResult.match || matchResult.data || matchResult;

        // Hydrate enrichedMatchData so isMatchFull uses live participant count
        setEnrichedMatchData(match);

        // Already-played check only relevant for non-poster, non-participant viewers
        if (isMatchPoster || isUserInMatch) return;

        const divisionId = match.divisionId || match.division?.id;
        const creatorId = match.createdById;
        if (!divisionId || !creatorId) return;

        // Fetch completed matches in this division for the current user
        const historyResponse = await authenticatedFetch(
          `/api/match?divisionId=${divisionId}&userId=${currentUserId}&status=COMPLETED`
        );
        if (!historyResponse.ok) return;

        const historyResult = await historyResponse.json();
        const rawMatches = historyResult.matches ?? historyResult.data ?? [];
        const matches = Array.isArray(rawMatches) ? rawMatches : [];

        interface MatchHistory {
          participants?: MatchParticipant[];
        }
        const hasPlayed = (matches as MatchHistory[]).some((m: MatchHistory) => {
          const participants = m.participants || [];
          const currentUserP = participants.find((p: MatchParticipant) => p.userId === currentUserId);
          const creatorP = participants.find((p: MatchParticipant) => p.userId === creatorId);
          if (!currentUserP || !creatorP) return false;
          // Singles: teams are null — presence in opposite roles means they played.
          // Doubles: teams must be different strings.
          if (currentUserP.team && creatorP.team) {
            return currentUserP.team !== creatorP.team;
          }
          // If team info is absent, being in the same completed match means they played.
          return true;
        });

        setHasAlreadyPlayed(hasPlayed);
      } catch (error) {
        chatLogger.error('Error during mount match checks:', error);
      }
    };

    runMountChecks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, matchData.matchId, (matchData as any).id]);
  
  // Display name logic - always show first name
  const displayName = firstName;

  // Calculate formatted start and end times
  // Use matchData.date (ISO string) as primary source, fall back to matchData.time
  const formattedStartTime = useMemo(() => {
    if (matchData.date) {
      try { return format(new Date(matchData.date), 'h:mm a'); } catch { /* fall through */ }
    }
    if (matchData.time) return formatTime(extractStartTime(matchData.time));
    return '12:00 PM';
  }, [matchData.date, matchData.time]);

  const formattedEndTime = useMemo(() => {
    const duration = matchData.duration || 2;
    if (matchData.date) {
      try {
        const start = new Date(matchData.date);
        const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
        return format(end, 'h:mm a');
      } catch { /* fall through */ }
    }
    const startTime = matchData.time ? extractStartTime(matchData.time) : '12:00 PM';
    return calculateEndTime(startTime, duration);
  }, [matchData.date, matchData.time, matchData.duration]);

  // Fetch partner info when join modal is about to open for doubles matches
  // Navigate to join match page
  const handleOpenJoinMatch = async () => {
    // Resolve match ID - backend may send it as 'id' or 'matchId'
    const effectiveMatchId = matchData.matchId || (matchData as any).id;

    if (!effectiveMatchId || !currentUserId) {
      toast.error('Unable to join match');
      console.warn('[JOIN_DEBUG] Early exit: missing effectiveMatchId or currentUserId', {
        effectiveMatchId,
        currentUserId,
      });
      return;
    }

    // If this is a friendly request, join directly via API
    if (isFriendlyRequest) {
      setIsFetchingPartner(true);
      try {
          const response = await authenticatedFetch(`/api/friendly/${effectiveMatchId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Unable to join match. Please try again.');
        }

        const result = await response.json();
        toast.success('Match request accepted!');
        setHasJoined(true);
        setRequestStatus('ACCEPTED');
        
        // Update message in chat store so UI reflects the change
        if (matchData) {
          const updatedMatchData = {
            ...matchData,
            requestStatus: 'ACCEPTED',
            isFriendlyRequest: false,
            participants: result.participants || matchData.participants || [],
          };

          updateMessage(latestMessage.id, {
            matchData: updatedMatchData as Message['matchData'],
          });
        }
      } catch (error: any) {
        chatLogger.error('Error joining friendly match:', error);
        
        const errorMsg = error?.message?.toLowerCase() || '';
        
        if (errorMsg.includes('already a participant') || errorMsg.includes('already in match')) {
          toast.info('You are already in this match');
          setHasJoined(true);
          return;
        }
        if (errorMsg.includes('already played')) {
          const opponentMatch = errorMsg.match(/against\s+(.+?)(?:in|for)/i);
          const opponentName = opponentMatch ? opponentMatch[1] : 'the opponent';
          toast.error('Already played this season', {
            description: `You've already played against ${opponentName}. Each team can only play once per season.`,
          });
          return;
        }
        if (errorMsg.includes('not an active member')) {
          toast.error('Cannot join match', {
            description: 'You must be a member of this division to join matches.',
          });
          return;
        }
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
          toast.error('Unable to connect', {
            description: 'Please check your internet connection and try again.',
          });
          return;
        }
        if (errorMsg.includes('timeout')) {
          toast.error('Request timed out', {
            description: 'The server took too long to respond. Please try again.',
          });
          return;
        }
        if (errorMsg.includes('match') && errorMsg.includes('not found')) {
          toast.error('Match not found', {
            description: 'This match may have been cancelled or removed.',
          });
          return;
        }
        
        toast.error(error instanceof Error ? error.message : 'Unable to join match. Please try again.');
      } finally {
        setIsFetchingPartner(false);
      }
      return;
    }

    // Check if this is a doubles league match where user needs to accept an invite
    // Redirect to My Games > Invites tab instead of match-details
    const isDoublesMatch = matchData.matchType === 'DOUBLES' || matchData.numberOfPlayers === '4';
    const isLeagueMatch = !isFriendly;

    // Check if current user has a pending invitation
    const userHasPendingInvite = matchData.participants?.some(
      (p) =>
        (p.userId === currentUserId) &&
        p.invitationStatus === 'PENDING'
    );
    // Redirect doubles league match invitees to My Games > Invites tab
    if (isDoublesMatch && isLeagueMatch && userHasPendingInvite) {
      console.log('[JOIN_DEBUG] Redirecting to My Games Invites tab (user has PENDING invite)');  
      router.push({
        pathname: '/user-dashboard',
        params: {
          view: 'myGames',
          sport: (matchData.sportType || 'PICKLEBALL').toLowerCase(),
          tab: 'INVITES',
        },
      });
      return;
    }

    setIsFetchingPartner(true);

    try {
      // Fetch match details to get divisionId and seasonId
      console.log('[JOIN_DEBUG] Falling through to match-details navigation. Fetching match info', {
        effectiveMatchId,
        reason: isDoublesMatch ? 'doubles but no pending invite or not league' : 'singles match',
      });
      const matchResponse = await authenticatedFetch(`/api/match/${effectiveMatchId}`);
      
      let divisionId = '';
      let seasonId = '';
      
      if (matchResponse.ok) {
        const matchResult = await matchResponse.json();
        const match = matchResult.data || matchResult;
        divisionId = match.divisionId || match.division?.id || '';
        seasonId = match.division?.seasonId || match.division?.season?.id || '';
        console.log('[JOIN_DEBUG] Match API response', {
          httpStatus: matchResponse.status,
          divisionId,
          seasonId,
          matchType: match.matchType,
          matchStatus: match.status,
          participantsInApiResponse: match.participants?.length,
        });
      } else {
        console.warn('[JOIN_DEBUG] Match API fetch failed', { status: matchResponse.status });
      }
      
      // Navigate to join match page with all the match data
      // Pass messageId and threadId so match-details can update the chat store after joining
      console.log('[JOIN_DEBUG] Navigating to match-details', {
        effectiveMatchId,
        matchType: matchData.matchType || (matchData.numberOfPlayers === '4' ? 'DOUBLES' : 'SINGLES'),
        divisionId,
        seasonId,
      });
      router.push({
        pathname: '/match/match-details',
        params: {
          matchId: effectiveMatchId,
          matchType: matchData.matchType || (matchData.numberOfPlayers === '4' ? 'DOUBLES' : 'SINGLES'),
          isFriendly: isFriendly ? 'true' : 'false',
          date: formatDisplayDate(matchData.date),
          time: `${formattedStartTime} – ${formattedEndTime}`,
          location: matchData.location || 'TBD',
          sportType: matchData.sportType || 'PICKLEBALL',
          leagueName: matchData.leagueName || 'League Match',
          season: 'Season 1',
          division: 'Division 1',
          courtBooked: matchData.courtBooked ? 'true' : 'false',
          fee: matchData.fee || 'FREE',
          feeAmount: (matchData as any).feeAmount || '0.00',
          description: (matchData as any).notes || matchData.description || '',
          duration: String(matchData.duration || 2),
          divisionId,
          seasonId,
          participants: JSON.stringify(matchData.participants || []),
          messageId: latestMessage.id,
          threadId: currentThreadId,
        },
      });
    } catch (error) {
      chatLogger.error('Error navigating to join match:', error);
      toast.error('Failed to open match details');
    } finally {
      setIsFetchingPartner(false);
    }
  };

  const sportColors = useMemo(() => getSportColors(matchData.sportType as SportType), [matchData.sportType]);

  // Memoized modal handlers
  const handleOpenInfoModal = useCallback(async () => {
    setShowInfoModal(true);

    // Resolve match ID - backend may send it as 'id' or 'matchId'
    const effectiveMatchId = matchData.matchId || (matchData as any).id;

    // Fetch full match details if we have a matchId and haven't fetched yet
    if (effectiveMatchId && !enrichedMatchData && currentUserId) {
      setIsFetchingMatchDetails(true);
      try {
        const response = await authenticatedFetch(`/api/match/${effectiveMatchId}`);

        if (response.ok) {
          const result = await response.json();
          const match = result.match || result.data || result;
          setEnrichedMatchData(match);
        }
      } catch (error) {
        chatLogger.error('Error fetching match details:', error);
      } finally {
        setIsFetchingMatchDetails(false);
      }
    }
  }, [matchData.matchId, enrichedMatchData, currentUserId]);

  const handleCloseInfoModal = useCallback(() => {
    setShowInfoModal(false);
  }, []);

  return (
    <Animated.View style={styles.container}>
      {/* Header with sender name and timestamp - outside card */}
      <View style={styles.headerRow}>
        <View style={styles.senderRow}>
          {senderImage ? (
            <Image source={{ uri: senderImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.senderName}>
            {isFriendly && isMatchPoster ? (
              <>
                <Text style={styles.senderNameBold}>You</Text>
                {' sent a friendly match request'}
              </>
            ) : (
              <>
                <Text style={styles.senderNameBold}>{displayName}</Text>
                {isFriendly 
                  ? ' sent you a friendly match request'
                  : ' posted a league match'}
              </>
            )}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {format(new Date(latestMessage.timestamp || message.timestamp), 'HH:mm')}
        </Text>
      </View>

      <View style={styles.matchCard}>
        {/* Match Title Row with Sport Badge */}
        <View style={styles.titleRow}>
          <Text style={styles.matchTitle}>
            {matchData.matchType === 'SINGLES' ? 'Singles' : matchData.matchType === 'DOUBLES' ? 'Doubles' : matchData.numberOfPlayers === '2' ? 'Singles' : 'Doubles'} {isFriendly ? 'Friendly Match' : 'League Match'}
          </Text>
          <View style={[styles.sportBadge, { borderColor: sportColors.badgeColor }]}>
            <Text style={[styles.sportBadgeText, { color: sportColors.badgeColor }]}>
              {sportColors.label}
            </Text>
          </View>
        </View>

        {/* Main Content Row */}
        <View style={styles.contentRow}>
          {/* Left Column - Info */}
          <View style={styles.leftColumn}>
            {/* Location */}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="location-outline" size={14} color="#86868B" />
              </View>
              <Text style={styles.infoText} numberOfLines={1}>{matchData.location || 'TBD'}</Text>
            </View>

            {/* Date */}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar-outline" size={14} color="#86868B" />
              </View>
              <Text style={styles.infoText}>{formatDisplayDate(matchData.date)}</Text>
            </View>

            {/* Time Range */}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Ionicons name="time-outline" size={14} color="#86868B" />
              </View>
              <Text style={styles.infoText}>
                {formattedStartTime} – {formattedEndTime}
              </Text>
            </View>

            {/* Cost */}
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Text style={styles.costIcon}>$</Text>
              </View>
              <Text style={styles.infoText}>
                {(() => {
                  const fee = matchData.fee as 'FREE' | 'SPLIT' | 'FIXED' | undefined;
                  const feeAmount = (matchData as any).feeAmount as string | undefined;
                  
                  if (fee === 'FREE' || !fee) {
                    return 'Free';
                  } else if (fee === 'SPLIT' && feeAmount) {
                    const totalAmount = parseFloat(feeAmount);
                    const numPlayers = parseInt(matchData.numberOfPlayers || '2', 10);
                    const perPlayer = numPlayers > 0 ? (totalAmount / numPlayers).toFixed(2) : '0.00';
                    return `RM${perPlayer}/player`;
                  } else if (fee === 'FIXED' && feeAmount) {
                    return `RM${parseFloat(feeAmount).toFixed(2)}/player`;
                  }
                  return 'Free';
                })()}
              </Text>
            </View>
          </View>

          {/* Right Column - Status Badges */}
          <View style={styles.rightColumn}>
            {/* Expiration Timer for Friendly Requests */}
            {isFriendlyRequest && currentRequestStatus === 'PENDING' && timeRemaining && !isExpired && (
              <View style={[
                styles.expirationBadge,
                timeRemaining.includes('soon') && styles.expirationBadgeWarning
              ]}>
                <Ionicons 
                  name="hourglass-outline" 
                  size={11} 
                  color={timeRemaining.includes('soon') ? '#DC2626' : '#F59E0B'} 
                />
                <Text style={[
                  styles.expirationText,
                  timeRemaining.includes('soon') && styles.expirationTextWarning
                ]} numberOfLines={1}>
                  {timeRemaining}
                </Text>
              </View>
            )}
            {/* Status Badge for Declined/Expired Requests */}
            {isFriendlyRequest && (currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED' || isExpired) && (
              <View style={styles.statusBadge}>
                <Ionicons 
                  name={currentRequestStatus === 'DECLINED' ? "close-circle" : "time-outline"} 
                  size={11} 
                  color="#DC2626" 
                />
                <Text style={styles.statusBadgeText}>
                  {currentRequestStatus === 'DECLINED' ? 'Declined' : 'Expired'}
                </Text>
              </View>
            )}
            {/* Court Booked Badge */}
            <View style={[
              styles.courtBadge,
              matchData.courtBooked ? styles.courtBadgeBooked : styles.courtBadgeNotBooked
            ]}>
              <Text style={[
                styles.courtBadgeText,
                matchData.courtBooked ? styles.courtBadgeTextBooked : styles.courtBadgeTextNotBooked
              ]}>
                {matchData.courtBooked ? 'Court booked' : 'No court'}
              </Text>
              <Ionicons
                name={matchData.courtBooked ? "checkmark-circle" : "close-circle"}
                size={12}
                color={matchData.courtBooked ? "#16A34A" : "#DC2626"}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons - Full width row at bottom */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.infoButton}
            activeOpacity={0.7}
            onPress={handleOpenInfoModal}
          >
            <Text style={styles.infoButtonText}>Info</Text>
          </TouchableOpacity>

          {/* Match poster: show Edit + Cancel buttons, Cancelled badge, or nothing based on status */}
          {isMatchPoster && (isCancelled || (matchData as any).status === 'CANCELLED') ? (
            // Match was cancelled — show a disabled grey badge so poster knows
            <View style={styles.cancelledBadge}>
              <Ionicons name="close-circle" size={13} color="#6B7280" />
              <Text style={styles.cancelledBadgeText}>Cancelled</Text>
            </View>
          ) : isMatchPoster && !isMatchCompleted ? (
            <>
              <TouchableOpacity
                style={styles.editButton}
                activeOpacity={0.7}
                onPress={() => editSheetRef.current?.present()}
              >
                <Ionicons name="create-outline" size={14} color="#6366F1" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBubbleButton}
                activeOpacity={0.7}
                disabled={isOpeningCancel}
                onPress={handleOpenCancelSheet}
              >
                <Text style={styles.cancelBubbleButtonText}>
                  {isOpeningCancel ? '...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </>
          ) : isFriendlyRequest && isRequestRecipient && currentRequestStatus === 'PENDING' && !isExpired && !hasJoined && !isUserInMatch ? (
            // Friendly request: Show Decline and Join buttons (only if not joined yet)
            <>
              <TouchableOpacity
                style={styles.declineButton}
                activeOpacity={0.8}
                disabled={isDeclining}
                onPress={handleDeclineRequest}
              >
                <Text style={styles.declineButtonText}>
                  {isDeclining ? 'Declining...' : 'Decline'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.joinButton,
                  { backgroundColor: sportColors.buttonColor }
                ]}
                activeOpacity={0.8}
                disabled={isFetchingPartner}
                onPress={handleOpenJoinMatch}
              >
                <Text style={styles.joinButtonText}>
                  {isFetchingPartner ? 'Loading...' : 'Join match'}
                </Text>
              </TouchableOpacity>
            </>
          ) : hasAlreadyPlayed ? (
            // Show disabled grey button when teams have already played this season
            <View style={styles.alreadyPlayedButton}>
              <Ionicons name="checkmark-circle" size={13} color="#9CA3AF" />
              <Text style={styles.alreadyPlayedButtonText}>Already Played</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.joinButton,
                {
                  backgroundColor: (isUserInMatch || isMatchCompleted || isMatchFull || isCancelled || (matchData as any).status === 'CANCELLED' || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED')))
                    ? '#9CA3AF'
                    : sportColors.buttonColor
                }
              ]}
              activeOpacity={(isUserInMatch || isMatchCompleted || isMatchFull || isCancelled || (matchData as any).status === 'CANCELLED' || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))) ? 1 : 0.8}
              disabled={isUserInMatch || isFetchingPartner || isMatchCompleted || isMatchFull || isCancelled || (matchData as any).status === 'CANCELLED' || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))}
              onPress={handleOpenJoinMatch}
            >
              <Text style={styles.joinButtonText}>
                {isFetchingPartner ? 'Loading...'
                  : isMatchCompleted ? 'Completed'
                  : (isCancelled || (matchData as any).status === 'CANCELLED') ? 'Cancelled'
                  : isUserInMatch ? 'Joined'
                  : isMatchFull ? 'Match Full'
                  : (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))
                    ? (currentRequestStatus === 'DECLINED' ? 'Declined' : 'Expired')
                    : 'Join match'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Match Info Modal */}
      <MatchInfoModal
        visible={showInfoModal}
        onClose={handleCloseInfoModal}
        matchData={{
          ...matchData,
          // Use enriched participants if available (has full user info)
          participants: enrichedMatchData?.participants || matchData.participants,
          matchType: enrichedMatchData?.matchType || matchData.matchType,
        }}
        creatorName={senderName}
        creatorImage={senderImage}
        creatorId={senderId}
        formattedDate={formatDisplayDate(matchData.date)}
        formattedTime={formattedStartTime}
        formattedEndTime={formattedEndTime}
        isLoading={isFetchingMatchDetails}
      />

      {/* Edit Match Sheet */}
      <BottomSheetModal
        ref={editSheetRef}
        snapPoints={['90%']}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        <EditMatchSheet
          matchId={(matchData.matchId || (matchData as any).id) ?? ''}
          initialDate={formatDisplayDate(matchData.date)}
          initialTime={formattedStartTime}
          initialLocation={matchData.location || ''}
          initialCourtBooked={!!matchData.courtBooked}
          initialFee={(matchData.fee as string) || 'FREE'}
          initialFeeAmount={String((matchData as any).feeAmount || '')}
          initialDuration={String(matchData.duration || '2')}
          initialNotes={(matchData as any).notes || matchData.description || ''}
          onClose={() => editSheetRef.current?.dismiss()}
          onSaved={handleMatchEditedFromBubble}
        />
      </BottomSheetModal>

      {/* Cancel Match Sheet */}
      <BottomSheetModal
        ref={cancelSheetRef}
        snapPoints={['75%', '90%']}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        <CancelMatchSheet
          matchId={(matchData.matchId || (matchData as any).id) ?? ''}
          matchDate={formatDisplayDate(matchData.date)}
          matchTime={formattedStartTime}
          hasOpponentJoined={hasOpponentJoinedLive ?? hasOpponentJoined}
          isFriendly={isFriendly}
          isHost={isMatchPoster}
          onClose={() => cancelSheetRef.current?.dismiss()}
          onCancel={handleCancelFromBubble}
        />
      </BottomSheetModal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  avatarText: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '600',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
    flex: 1,
  },
  senderNameBold: {
    fontWeight: '600',
    color: '#374151',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    marginLeft: 10,
    gap: 6,
  },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#86868B',
    flex: 1,
    lineHeight: 16,
  },
  costIcon: {
    fontSize: 13,
    fontWeight: '600',
    color: '#86868B',
  },
  courtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  courtBadgeBooked: {
    backgroundColor: '#F0FDF4',
  },
  courtBadgeNotBooked: {
    backgroundColor: '#FEF2F2',
  },
  courtBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  courtBadgeTextBooked: {
    color: '#16A34A',
  },
  courtBadgeTextNotBooked: {
    color: '#DC2626',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
  },
  infoButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#602E98',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  cancelBubbleButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  cancelBubbleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 4,
  },
  cancelledBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  joinButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  playedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  alreadyPlayedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 5,
  },
  alreadyPlayedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-end',
    gap: 4,
  },
  expirationBadgeWarning: {
    backgroundColor: '#FEE2E2',
  },
  expirationText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  expirationTextWarning: {
    color: '#DC2626',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignSelf: 'flex-end',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  declineButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  declineButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
