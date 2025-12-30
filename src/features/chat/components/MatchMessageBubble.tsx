/* eslint-disable react-hooks/rules-of-hooks */
// Note: This component has conditional hooks due to early return patterns.
// TODO: Refactor to move all hooks before any conditional returns.
import { getSportColors, type SportType } from '@/constants/SportsColor';
import { useSession } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Layout } from 'react-native-reanimated';
import { toast } from 'sonner-native';
import { Message } from '../types';
import { MatchInfoModal } from './MatchInfoModal';
import { useChatStore } from '../stores/ChatStore';

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
    chatLogger.debug('No matchData found for match message:', message.id);
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

  // Handle decline request
  const handleDeclineRequest = async () => {
    if (!matchData.matchId || !currentUserId) {
      toast.error('Unable to decline request');
      return;
    }

    if (!isRequestRecipient) {
      toast.error('You are not the recipient of this request');
      return;
    }

    setIsDeclining(true);
    try {
      const backendUrl = getBackendBaseURL();
      const response = await fetch(`${backendUrl}/api/friendly/${matchData.matchId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
        },
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
    return status === 'COMPLETED' || status === 'FINISHED';
  }, [(matchData as any).status]);

  // Check if user has already played against the match creator in this division
  useEffect(() => {
    const checkAlreadyPlayed = async () => {
      // Skip if user is the match poster, already in match, or no matchId
      if (!currentUserId || !matchData.matchId || isMatchPoster || isUserInMatch) {
        return;
      }

      try {
        const backendUrl = getBackendBaseURL();
        
        // First fetch match details to get divisionId and creatorId
        const matchResponse = await fetch(`${backendUrl}/api/match/${matchData.matchId}`, {
          headers: {
            'x-user-id': currentUserId,
          },
        });

        if (!matchResponse.ok) return;

        const matchResult = await matchResponse.json();
        const match = matchResult.match || matchResult.data || matchResult;
        const divisionId = match.divisionId || match.division?.id;
        const creatorId = match.createdById;

        if (!divisionId || !creatorId) return;

        // Check if user has played against creator in this division
        // We check completed matches where both users participated on opposite teams
        const historyResponse = await fetch(
          `${backendUrl}/api/match?divisionId=${divisionId}&userId=${currentUserId}&status=COMPLETED`,
          {
            headers: {
              'x-user-id': currentUserId,
            },
          }
        );

        if (!historyResponse.ok) return;

        const historyResult = await historyResponse.json();
        const matches = historyResult.matches || historyResult.data || historyResult || [];

        // Check if any completed match has both current user and creator on opposite teams
        interface MatchHistory {
          participants?: MatchParticipant[];
        }
        const hasPlayed = (matches as MatchHistory[]).some((m: MatchHistory) => {
          const participants = m.participants || [];
          const currentUserParticipant = participants.find((p: MatchParticipant) => p.userId === currentUserId);
          const creatorParticipant = participants.find((p: MatchParticipant) => p.userId === creatorId);

          // Both must be in the match and on different teams
          return currentUserParticipant && creatorParticipant &&
                 currentUserParticipant.team !== creatorParticipant.team;
        });

        setHasAlreadyPlayed(hasPlayed);
      } catch (error) {
        chatLogger.error('Error checking if already played:', error);
      }
    };

    checkAlreadyPlayed();
  }, [currentUserId, matchData.matchId, isMatchPoster, isUserInMatch]);
  
  // Display name logic - always show first name
  const displayName = firstName;

  // Calculate formatted start and end times
  const startTime = matchData.time ? extractStartTime(matchData.time) : '12:00 PM';
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = calculateEndTime(startTime, matchData.duration || 2);

  // Fetch partner info when join modal is about to open for doubles matches
  // Navigate to join match page
  const handleOpenJoinMatch = async () => {
    if (!matchData.matchId || !currentUserId) {
      toast.error('Unable to join match');
      return;
    }

    // If this is a friendly request, join directly via API
    if (isFriendlyRequest) {
      setIsFetchingPartner(true);
      try {
        const backendUrl = getBackendBaseURL();
        const response = await fetch(`${backendUrl}/api/friendly/${matchData.matchId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUserId,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to join match');
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
      } catch (error) {
        chatLogger.error('Error joining friendly match:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to join match');
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
      const backendUrl = getBackendBaseURL();

      // Fetch match details to get divisionId and seasonId
      const matchResponse = await fetch(`${backendUrl}/api/match/${matchData.matchId}`, {
        headers: {
          'x-user-id': currentUserId,
        },
      });
      
      let divisionId = '';
      let seasonId = '';
      
      if (matchResponse.ok) {
        const matchResult = await matchResponse.json();
        const match = matchResult.data || matchResult;
        divisionId = match.divisionId || match.division?.id || '';
        seasonId = match.division?.seasonId || match.division?.season?.id || '';
      }
      
      // Navigate to join match page with all the match data
      // Pass messageId and threadId so match-details can update the chat store after joining
      router.push({
        pathname: '/match/match-details',
        params: {
          matchId: matchData.matchId,
          matchType: matchData.matchType || (matchData.numberOfPlayers === '4' ? 'DOUBLES' : 'SINGLES'),
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

    // Fetch full match details if we have a matchId and haven't fetched yet
    if (matchData.matchId && !enrichedMatchData && currentUserId) {
      setIsFetchingMatchDetails(true);
      try {
        const backendUrl = getBackendBaseURL();
        const response = await fetch(`${backendUrl}/api/match/${matchData.matchId}`, {
          headers: {
            'x-user-id': currentUserId,
          },
        });

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
    <Animated.View layout={layoutTransition} style={styles.container}>
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
          {isFriendlyRequest && isRequestRecipient && currentRequestStatus === 'PENDING' && !isExpired && !hasJoined && !isUserInMatch ? (
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
            // Show "Played" badge when teams have already played this season
            <View style={styles.playedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#059669" />
              <Text style={styles.playedBadgeText}>Played</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.joinButton,
                { 
                  backgroundColor: (isUserInMatch || isMatchCompleted || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))) 
                    ? '#9CA3AF' 
                    : sportColors.buttonColor 
                }
              ]}
              activeOpacity={(isUserInMatch || isMatchCompleted || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))) ? 1 : 0.8}
              disabled={isUserInMatch || isFetchingPartner || isMatchCompleted || (isFriendlyRequest && (isExpired || currentRequestStatus === 'DECLINED' || currentRequestStatus === 'EXPIRED'))}
              onPress={handleOpenJoinMatch}
            >
              <Text style={styles.joinButtonText}>
                {isFetchingPartner ? 'Loading...' 
                  : isMatchCompleted ? 'Completed' 
                  : isUserInMatch ? 'Joined' 
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
        formattedDate={formatDisplayDate(matchData.date)}
        formattedTime={formattedStartTime}
        formattedEndTime={formattedEndTime}
        isLoading={isFetchingMatchDetails}
      />
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
