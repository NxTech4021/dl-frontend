import { getBackendBaseURL } from '@/config/network';
import { useSession } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './MatchResultSheet.styles';
import {
  Player,
  SetScore,
  Partnership,
  WalkoverReason,
  WALKOVER_REASONS,
  MatchResultSheetProps,
  MatchComment,
} from './MatchResultSheet.types';
import { formatRelativeTime } from './MatchResultSheet.utils';

export const MatchResultSheet: React.FC<MatchResultSheetProps> = ({
  matchId,
  matchType,
  players,
  sportType,
  seasonId,
  mode = 'submit',
  isFriendlyMatch = false,
  isWalkover = false,
  walkoverInfo,
  existingComments = [],
  matchComments = [],
  currentUserId,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onClose,
  onSubmit,
  onConfirm,
  onDispute,
  onWalkover,
  onExpandSheet,
  onCollapseSheet,
}) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [partnershipLoading, setPartnershipLoading] = useState(true);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [comment, setComment] = useState('');
  const [matchDetails, setMatchDetails] = useState<any>(null);

  // Comments state for review mode
  const [newMatchComment, setNewMatchComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

  const [setScores, setSetScores] = useState<SetScore[]>([
    { setNumber: 1, team1Games: 0, team2Games: 0 },
    { setNumber: 2, team1Games: 0, team2Games: 0 },
    { setNumber: 3, team1Games: 0, team2Games: 0 },
  ]);
  const [didntPlay, setDidntPlay] = useState(false);
  const [matchIncomplete, setMatchIncomplete] = useState(false); // Marks match as UNFINISHED

  // Casual Play / Friendly Match state (only for friendly matches)
  const [isCasualPlay, setIsCasualPlay] = useState(true); // Defaults to casual play for friendly matches
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = casual play, 1 = friendly match
  const [toggleWidth, setToggleWidth] = useState(0);

  // Animate the toggle slider
  const handleToggleSwitch = (toCasualPlay: boolean) => {
    setIsCasualPlay(toCasualPlay);
    Animated.spring(slideAnim, {
      toValue: toCasualPlay ? 0 : 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
    // Expand/collapse the bottom sheet based on selected tab
    if (!toCasualPlay && onExpandSheet) {
      // Expand when switching to Friendly Match tab (has more UI elements)
      onExpandSheet();
    } else if (toCasualPlay && onCollapseSheet) {
      // Collapse when switching back to Casual Play tab
      onCollapseSheet();
    }
  };
  const [teamAssignments, setTeamAssignments] = useState<{ team1: string[]; team2: string[] }>({
    team1: [],
    team2: [],
  });

  // Dropdown selections for doubles friendly match (4 individual dropdowns)
  const [dropdownSelections, setDropdownSelections] = useState<{
    team1Player1: string | null;
    team1Player2: string | null;
    team2Player1: string | null;
    team2Player2: string | null;
  }>({
    team1Player1: null,
    team1Player2: null,
    team2Player1: null,
    team2Player2: null,
  });

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Walkover state
  const [defaultingTeam, setDefaultingTeam] = useState<'A' | 'B' | null>(null);
  const [walkoverReason, setWalkoverReason] = useState<WalkoverReason | null>(null);
  const [walkoverDetail, setWalkoverDetail] = useState('');

  // Separate players by team
  // First try to filter by team property, then fallback to splitting the array
  const teamAPlayersFiltered = players.filter(p => p.team === 'TEAM_A');
  const teamBPlayersFiltered = players.filter(p => p.team === 'TEAM_B');

  // Fallback: if no team property set, split players array (first half = team A, second half = team B)
  const teamAPlayers = teamAPlayersFiltered.length > 0
    ? teamAPlayersFiltered
    : matchType === 'SINGLES'
      ? players.slice(0, 1)
      : players.slice(0, 2);
  const teamBPlayers = teamBPlayersFiltered.length > 0
    ? teamBPlayersFiltered
    : matchType === 'SINGLES'
      ? players.slice(1, 2)
      : players.slice(2, 4);

  // Debug log removed to prevent spam

  // Normalize sport type for case-insensitive comparison
  const normalizedSportType = sportType?.toUpperCase() || '';
  const isTennisOrPadel = normalizedSportType === 'TENNIS' || normalizedSportType === 'PADEL';
  const isPickleball = normalizedSportType === 'PICKLEBALL';

  // Check if this is a friendly match in view mode with NO scores (casual play only)
  // If the friendly match has scores (from Friendly Match toggle), show the scores
  const hasScores = matchDetails?.setScores || matchDetails?.gameScores ||
    (matchDetails?.scores && matchDetails.scores.length > 0) ||
    (matchDetails?.pickleballScores && matchDetails.pickleballScores.length > 0);
  const isFriendlyViewMode = mode === 'view' &&
    (matchDetails?.isFriendly || matchDetails?.isFriendlyRequest || isFriendlyMatch) &&
    !hasScores;
  // Check if this is a friendly match with scores in view mode (for hiding "awaiting confirmation" banner)
  const isFriendlyWithScoresViewMode = mode === 'view' &&
    (matchDetails?.isFriendly || matchDetails?.isFriendlyRequest || isFriendlyMatch) &&
    hasScores;

  // Fetch match details if in view/review/disputed/submit mode (submit mode for UNFINISHED matches to pre-populate scores)
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (mode === 'view' || mode === 'review' || mode === 'disputed' || mode === 'submit') {
        try {
          const backendUrl = getBackendBaseURL();
          const response = await fetch(`${backendUrl}/api/match/${matchId}`, {
            headers: {
              'x-user-id': session?.user?.id || '',
            },
          });

          if (response.ok) {
            const data = await response.json();
            const match = data.match || data;
            setMatchDetails(match);

            // Parse existing scores - handle both setScores (tennis/padel) and gameScores (pickleball)
            const scoresData = match.setScores || match.gameScores;
            if (scoresData) {
              try {
                const parsedScores = typeof scoresData === 'string' ? JSON.parse(scoresData) : scoresData;
                if (Array.isArray(parsedScores)) {
                  // Map to internal format - handle both naming conventions
                  // Database may store: { gameNumber, team1Points, team2Points } or { setNumber, team1Games, team2Games }
                  const mappedScores = parsedScores.map((score: any, index: number) => ({
                    setNumber: score.setNumber || score.gameNumber || (index + 1),
                    team1Games: score.team1Games ?? score.team1Points ?? 0,
                    team2Games: score.team2Games ?? score.team2Points ?? 0,
                    team1Tiebreak: score.team1Tiebreak,
                    team2Tiebreak: score.team2Tiebreak,
                  }));

                  setSetScores([
                    mappedScores[0] || { setNumber: 1, team1Games: 0, team2Games: 0 },
                    mappedScores[1] || { setNumber: 2, team1Games: 0, team2Games: 0 },
                    mappedScores[2] || { setNumber: 3, team1Games: 0, team2Games: 0 },
                  ]);
                }
              } catch (e) {
                console.error('Error parsing scores:', e);
              }
            }

            // Set comment if exists
            if (match.resultComment) {
              setComment(match.resultComment);
            }
          }
        } catch (error) {
          console.error('Error fetching match details:', error);
        }
      }
    };

    fetchMatchDetails();
  }, [matchId, mode, session?.user?.id]);

  // Fetch partnership info for doubles (still fetch for display purposes)
  useEffect(() => {
    const fetchPartnership = async () => {
      if (matchType !== 'DOUBLES' || !session?.user?.id || !seasonId) {
        setPartnershipLoading(false);
        // For singles or no partnership, use mode to determine submit capability
        setIsCaptain(mode === 'submit');
        return;
      }

      try {
        const backendUrl = getBackendBaseURL();
        const response = await fetch(
          `${backendUrl}/api/pairing/partnership/active/${seasonId}`,
          {
            headers: {
              'x-user-id': session.user.id,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const partnershipData = data.partnership || data.data || data;
          
          if (partnershipData) {
            setPartnership(partnershipData);
            // The mode prop from parent already determines if user can submit
            // If mode is 'submit', user is the creator team captain
            setIsCaptain(mode === 'submit');
          }
        }
      } catch (error) {
        console.error('Error fetching partnership:', error);
      } finally {
        setPartnershipLoading(false);
      }
    };

    fetchPartnership();
  }, [matchType, session?.user?.id, seasonId, mode]);

  const updateScore = (setIndex: number, team: 'A' | 'B', field: 'games' | 'tiebreak', value: string) => {
    const numValue = parseInt(value) || 0;
    const newScores = [...setScores];
    
    if (field === 'games') {
      if (team === 'A') {
        // Pickleball allows higher scores (15+), Tennis/Padel max 7
        const maxScore = isTennisOrPadel ? 7 : 99;
        newScores[setIndex].team1Games = Math.min(numValue, maxScore);
      } else {
        const maxScore = isTennisOrPadel ? 7 : 99;
        newScores[setIndex].team2Games = Math.min(numValue, maxScore);
      }
    } else if (field === 'tiebreak') {
      if (team === 'A') {
        newScores[setIndex].team1Tiebreak = numValue;
      } else {
        newScores[setIndex].team2Tiebreak = numValue;
      }
    }
    
    setSetScores(newScores);
  };

  // Check if a set/game needs tiebreak input
  const needsTiebreak = (setIndex: number): boolean => {
    const set = setScores[setIndex];
    const team1 = set.team1Games;
    const team2 = set.team2Games;

    if (isTennisOrPadel) {
      // Tennis/Padel: Need tiebreak if either team has 7 (meaning 7-6 scenario)
      return team1 === 7 || team2 === 7;
    } else {
      // Pickleball: Check if there's already a clear winner (score >= 15 AND lead by 2+)
      const team1Won = team1 >= 15 && team1 - team2 >= 2;
      const team2Won = team2 >= 15 && team2 - team1 >= 2;

      if (team1Won || team2Won) {
        return false; // Clear winner exists, no tiebreak/extended score needed
      }

      // Only require extended score input when game is still close (deuce scenario)
      // Both at 14+, or one at 15+ but not winning by 2
      return (team1 >= 14 && team2 >= 14) ||
             (team1 >= 15 && team2 >= 14) ||
             (team1 >= 14 && team2 >= 15);
    }
  };

  // Check if a specific set should be disabled
  const isSetDisabled = (setIndex: number): boolean => {
    if (setIndex < 2) return false; // First two sets are always enabled

    // 3rd set is only enabled when the score is 1-1 (each player won one set)
    // Otherwise it stays disabled (either 2-0 win or sets not yet completed)
    let teamAWins = 0;
    let teamBWins = 0;

    for (let i = 0; i < 2; i++) {
      const winner = getSetWinner(i);
      if (winner === 'A') teamAWins++;
      if (winner === 'B') teamBWins++;
    }

    // Only enable 3rd set if it's 1-1
    const isOneOne = teamAWins === 1 && teamBWins === 1;
    return !isOneOne;
  };

  // Get the winner of a set based on games and tiebreak
  const getSetWinner = (setIndex: number): 'A' | 'B' | null => {
    const set = setScores[setIndex];
    const team1 = set.team1Games;
    const team2 = set.team2Games;

    if (team1 === 0 && team2 === 0) return null;

    if (isTennisOrPadel) {
      // Tennis/Padel scoring

      // If games are equal at 6-6, check tiebreak
      if (team1 === 6 && team2 === 6) {
        if ((set.team1Tiebreak || 0) > (set.team2Tiebreak || 0)) return 'A';
        if ((set.team2Tiebreak || 0) > (set.team1Tiebreak || 0)) return 'B';
        return null;
      }

      // For 7-6 or 6-7 scenarios, must have tiebreak scores to determine winner
      if (team1 === 7 && team2 === 6) {
        // Need tiebreak score to confirm winner
        const tb1 = set.team1Tiebreak || 0;
        const tb2 = set.team2Tiebreak || 0;
        if (tb1 > tb2 && tb1 >= 7 && tb1 - tb2 >= 2) return 'A';
        if (tb1 === 0 && tb2 === 0) return null; // Tiebreak not filled in yet
        return tb1 > tb2 ? 'A' : null;
      }
      if (team2 === 7 && team1 === 6) {
        // Need tiebreak score to confirm winner
        const tb1 = set.team1Tiebreak || 0;
        const tb2 = set.team2Tiebreak || 0;
        if (tb2 > tb1 && tb2 >= 7 && tb2 - tb1 >= 2) return 'B';
        if (tb1 === 0 && tb2 === 0) return null; // Tiebreak not filled in yet
        return tb2 > tb1 ? 'B' : null;
      }

      // Normal win (6-4, 6-3, etc.)
      if (team1 >= 6 && team1 - team2 >= 2) return 'A';
      if (team2 >= 6 && team2 - team1 >= 2) return 'B';

      return null;
    } else {
      // Pickleball scoring (first to 15, win by 2)

      // Check if either team has won (15+ points with 2+ lead)
      if (team1 >= 15 && team1 - team2 >= 2) return 'A';
      if (team2 >= 15 && team2 - team1 >= 2) return 'B';

      // For close games (both at 14+), check tiebreak/extended scores
      if (team1 >= 14 && team2 >= 14) {
        const tb1 = set.team1Tiebreak || 0;
        const tb2 = set.team2Tiebreak || 0;

        // If tiebreak scores exist, use them to determine winner
        if (tb1 > 0 || tb2 > 0) {
          if (tb1 > tb2 && tb1 - tb2 >= 2) return 'A';
          if (tb2 > tb1 && tb2 - tb1 >= 2) return 'B';
        }
      }

      return null;
    }
  };

  // Handle team assignment for doubles friendly matches
  const handleTeamAssignment = (playerId: string, team: 'team1' | 'team2') => {
    setTeamAssignments(prev => {
      const currentTeam = prev[team];

      if (currentTeam.includes(playerId)) {
        // Remove from team
        return { ...prev, [team]: currentTeam.filter(id => id !== playerId) };
      } else if (currentTeam.length < 2) {
        // Add to team (max 2)
        return { ...prev, [team]: [...currentTeam, playerId] };
      }
      return prev;
    });
  };

  // Handle dropdown selection for friendly doubles match
  // If the same player is selected again, deselect them (set to null)
  const handleDropdownSelect = (dropdownKey: keyof typeof dropdownSelections, playerId: string) => {
    setDropdownSelections(prev => ({
      ...prev,
      [dropdownKey]: prev[dropdownKey] === playerId ? null : playerId,
    }));
    setOpenDropdown(null);
  };

  // Get all players for a dropdown (returns all players, used to show full list)
  const getAvailablePlayers = (_currentDropdownKey: keyof typeof dropdownSelections) => {
    return players;
  };

  // Check if a player is selected in a different dropdown (not the current one)
  const isPlayerSelectedElsewhere = (playerId: string, currentDropdownKey: keyof typeof dropdownSelections) => {
    return Object.entries(dropdownSelections)
      .filter(([key]) => key !== currentDropdownKey)
      .some(([, value]) => value === playerId);
  };

  // Check if a player is the currently selected one for this dropdown
  const isPlayerSelectedHere = (playerId: string, currentDropdownKey: keyof typeof dropdownSelections) => {
    return dropdownSelections[currentDropdownKey] === playerId;
  };

  // Get player by ID
  const getPlayerById = (playerId: string | null) => {
    if (!playerId) return null;
    return players.find(p => p.id === playerId) || null;
  };

  // Get team players from dropdown selections (for dynamic avatars)
  const getTeam1SelectedPlayers = () => {
    return [
      getPlayerById(dropdownSelections.team1Player1),
      getPlayerById(dropdownSelections.team1Player2),
    ].filter(Boolean) as Player[];
  };

  const getTeam2SelectedPlayers = () => {
    return [
      getPlayerById(dropdownSelections.team2Player1),
      getPlayerById(dropdownSelections.team2Player2),
    ].filter(Boolean) as Player[];
  };

  // Check if all dropdowns are filled
  const allDropdownsFilled = () => {
    return dropdownSelections.team1Player1 !== null &&
           dropdownSelections.team1Player2 !== null &&
           dropdownSelections.team2Player1 !== null &&
           dropdownSelections.team2Player2 !== null;
  };

  // Comment handlers for review mode
  const handleSubmitComment = async () => {
    if (!newMatchComment.trim() || isSubmittingComment || !onCreateComment) return;

    setIsSubmittingComment(true);
    try {
      await onCreateComment(newMatchComment.trim());
      setNewMatchComment('');
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = (commentItem: MatchComment) => {
    setEditingCommentId(commentItem.id);
    setEditCommentText(commentItem.comment);
    setOpenCommentMenuId(null);
  };

  const handleSaveEditComment = async () => {
    if (!editCommentText.trim() || !editingCommentId || !onUpdateComment) return;

    setIsSubmittingComment(true);
    try {
      await onUpdateComment(editingCommentId, editCommentText.trim());
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    setOpenCommentMenuId(null);
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteComment?.(commentId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Check if user is captain (for doubles) - skip for friendly casual play
    if (matchType === 'DOUBLES' && !isCaptain && !(isFriendlyMatch && isCasualPlay)) {
      Alert.alert(
        'Captain Only',
        'Only team captains can submit match results. Your partner will submit their score separately.'
      );
      return;
    }

    // For friendly matches in casual play mode, skip score validation
    if (isFriendlyMatch && isCasualPlay) {
      try {
        setLoading(true);
        await onSubmit({
          comment: comment.trim() || undefined,
          isCasualPlay: true,
        });
        onClose();
      } catch (error) {
        console.error('Error submitting casual play result:', error);
        Alert.alert('Error', 'Failed to submit');
      } finally {
        setLoading(false);
      }
      return;
    }

    // For friendly matches with "didn't play" toggled, set status to CANCELLED
    if (isFriendlyMatch && !isCasualPlay && didntPlay) {
      try {
        setLoading(true);
        await onSubmit({
          comment: comment.trim() || undefined,
          isCancelled: true,
        });
        onClose();
      } catch (error) {
        console.error('Error cancelling friendly match:', error);
        Alert.alert('Error', 'Failed to cancel match');
      } finally {
        setLoading(false);
      }
      return;
    }

    // For friendly match mode (not casual), validate team assignments for doubles
    if (isFriendlyMatch && !isCasualPlay && matchType === 'DOUBLES') {
      if (!allDropdownsFilled()) {
        Alert.alert('Team Assignment Required', 'Please select all 4 players using the dropdowns');
        return;
      }
    }

    // Validate scores - filter out disabled sets (e.g., 3rd set when match won 2-0)
    const playedSets = setScores.filter(
      (set, index) => (set.team1Games > 0 || set.team2Games > 0) && !isSetDisabled(index)
    );

    if (playedSets.length === 0) {
      Alert.alert('Invalid Scores', 'Please enter at least one set/game score');
      return;
    }

    // Skip detailed validation if match is marked incomplete
    // Backend will also skip validation when isUnfinished=true
    if (!matchIncomplete) {
      // Validate tiebreaks for sets/games that need them
      if (isTennisOrPadel) {
        for (let i = 0; i < playedSets.length; i++) {
          if (needsTiebreak(i)) {
            const set = setScores[i];
            if (!set.team1Tiebreak && !set.team2Tiebreak) {
              Alert.alert(
                'Missing Tiebreak',
                `Set ${i + 1} requires a tiebreak score. Please enter the tiebreak points.`
              );
              return;
            }
          }
        }
      } else if (isPickleball) {
        // For Pickleball: If close game (14+ each), require final scores in tiebreak boxes
        for (let i = 0; i < playedSets.length; i++) {
          if (needsTiebreak(i)) {
            const set = setScores[i];
            if (!set.team1Tiebreak && !set.team2Tiebreak) {
              Alert.alert(
                'Missing Final Score',
                `Game ${i + 1} is a close game. Please enter the final winning scores.`
              );
              return;
            }
            // Validate win by 2
            const tb1 = set.team1Tiebreak || 0;
            const tb2 = set.team2Tiebreak || 0;
            const winner = Math.max(tb1, tb2);
            const loser = Math.min(tb1, tb2);
            if (winner < 15) {
              Alert.alert(
                'Invalid Score',
                `Game ${i + 1}: Winner must have at least 15 points.`
              );
              return;
            }
            if (winner - loser < 2) {
              Alert.alert(
                'Invalid Score',
                `Game ${i + 1}: Must win by 2 points. Current: ${tb1}-${tb2}`
              );
              return;
            }
          }
        }
      }
    }

    try {
      setLoading(true);

      let submitData: any = {
        comment: comment.trim() || undefined,
        isUnfinished: matchIncomplete,  // Pass the match incomplete flag
        isCasualPlay: false,  // Friendly match mode (with scores)
      };

      // Include team assignments for doubles friendly matches (from dropdown selections)
      if (isFriendlyMatch && matchType === 'DOUBLES') {
        submitData.teamAssignments = {
          team1: [dropdownSelections.team1Player1, dropdownSelections.team1Player2].filter(Boolean) as string[],
          team2: [dropdownSelections.team2Player1, dropdownSelections.team2Player2].filter(Boolean) as string[],
        };
      }

      // Format data based on sport type
      if (isPickleball) {
        // Pickleball uses gameScores with gameNumber, team1Points, team2Points
        // For close games (14-14 or higher), use tiebreak scores as final scores
        submitData.gameScores = playedSets.map((set) => {
          // If tiebreak scores exist (close game), use them as final scores
          const hasTiebreak = set.team1Tiebreak !== undefined && set.team2Tiebreak !== undefined &&
                              (set.team1Tiebreak > 0 || set.team2Tiebreak > 0);

          return {
            gameNumber: set.setNumber,
            team1Points: hasTiebreak ? set.team1Tiebreak! : set.team1Games,
            team2Points: hasTiebreak ? set.team2Tiebreak! : set.team2Games
          };
        });
      } else {
        // Tennis/Padel uses setScores with setNumber, team1Games, team2Games, tiebreaks
        submitData.setScores = playedSets;
      }
      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error('Error submitting result:', error);
      Alert.alert('Error', 'Failed to submit match result');
    } finally {
      setLoading(false);
    }
  };

  const handleWalkover = async () => {
    if (!defaultingTeam) {
      Alert.alert('Select Team', 'Please select which team did not show up or forfeited.');
      return;
    }
    if (!walkoverReason) {
      Alert.alert('Select Reason', 'Please select a reason for the walkover.');
      return;
    }
    if (walkoverReason === 'OTHER' && !walkoverDetail.trim()) {
      Alert.alert('Provide Details', 'Please provide details for the walkover reason.');
      return;
    }

    // Get the defaulting user ID - for singles, it's the player; for doubles, we pick the first player of that team
    const defaultingPlayers = defaultingTeam === 'A' ? teamAPlayers : teamBPlayers;
    const defaultingUserId = defaultingPlayers[0]?.id;

    if (!defaultingUserId) {
      Alert.alert('Error', 'Could not determine defaulting player.');
      return;
    }

    try {
      setLoading(true);
      await onWalkover?.({
        defaultingUserId,
        reason: walkoverReason,
        reasonDetail: walkoverDetail.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting walkover:', error);
      Alert.alert('Error', 'Failed to submit walkover');
    } finally {
      setLoading(false);
    }
  };

  const renderPlayerAvatar = (player: Player, showIndicator?: boolean) => (
    <View style={styles.playerContainer} key={player.id}>
      <View style={styles.avatar}>
        {player.image ? (
          <Image source={{ uri: player.image }} style={styles.avatarImage} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.defaultAvatarText}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {showIndicator && matchType === 'DOUBLES' && partnership && (
          <View style={styles.captainBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
          </View>
        )}
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {player.name.split(' ')[0]}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {mode === 'disputed' ? 'Disputed Score' : mode === 'view' && isWalkover ? 'Match Walkover' : mode === 'view' ? 'Submitted Scores' : mode === 'review' ? 'Review Match Result' : isFriendlyMatch ? 'Played your game?' : didntPlay ? 'Report Walkover' : 'How did the match go?'}
          </Text>
          {mode === 'submit' && !isFriendlyMatch && (
            <Text style={styles.headerSubtitle}>
              {didntPlay ? 'Select who forfeited and why.' : 'Submit the scores below.'}
            </Text>
          )}
          {mode === 'submit' && isFriendlyMatch && (
            <Text style={styles.headerSubtitle}>
              Toggle Friendly Match to record your scores if any (optional).
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Casual Play / Friendly Match Toggle - Only for friendly matches */}
      {isFriendlyMatch && mode === 'submit' && (
        <View style={styles.casualPlayToggleSection}>
          <View
            style={styles.pillToggleContainer}
            onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width - 8)} // subtract padding
          >
            {/* Animated sliding background */}
            <Animated.View
              style={[
                styles.pillToggleSlider,
                {
                  width: toggleWidth / 2,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, toggleWidth / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <TouchableOpacity
              style={styles.pillToggleButton}
              onPress={() => handleToggleSwitch(true)}
            >
              <Text style={[
                styles.pillToggleText,
                isCasualPlay && styles.pillToggleTextActive,
              ]}>CASUAL PLAY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pillToggleButton}
              onPress={() => handleToggleSwitch(false)}
            >
              <Text style={[
                styles.pillToggleText,
                !isCasualPlay && styles.pillToggleTextActive,
              ]}>FRIENDLY MATCH</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Toggle Switches - hide for all friendly matches (toggles are inside friendly match UI) */}
      {mode === 'submit' && !isFriendlyMatch && (
        <View style={styles.togglesSection}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>Didn't play</Text>
            <Switch
              value={didntPlay}
              onValueChange={(value) => {
                setDidntPlay(value);
                // Reset walkover state when toggling off
                if (!value) {
                  setDefaultingTeam(null);
                  setWalkoverReason(null);
                  setWalkoverDetail('');
                } else {
                  // For singles, auto-set opponent as defaulting team
                  if (matchType === 'SINGLES') {
                    const isUserOnTeamA = teamAPlayers.some(p => p.id === session?.user?.id);
                    setDefaultingTeam(isUserOnTeamA ? 'B' : 'A');
                  }
                  // Reset match incomplete when toggling walkover on
                  setMatchIncomplete(false);
                }
              }}
              trackColor={{ false: '#E5E7EB', true: '#FEA04D' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {/* Hide "Match incomplete" toggle when walkover is selected */}
          {!didntPlay && (
            <View style={styles.toggleItem}>
              <Text style={styles.toggleLabel}>Match incomplete</Text>
              <Switch
                value={matchIncomplete}
                onValueChange={setMatchIncomplete}
                trackColor={{ false: '#E5E7EB', true: '#FEA04D' }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        </View>
      )}

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Walkover View - shown when viewing a walkover match */}
        {mode === 'view' && isWalkover && walkoverInfo ? (
          <View style={styles.walkoverViewContainer}>
            <View style={styles.walkoverViewIconContainer}>
              <Ionicons name="flag-outline" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.walkoverViewTitle}>Match Walkover</Text>
            <Text style={styles.walkoverViewPlayerName}>
              {walkoverInfo.defaultingPlayerName}
            </Text>
            <Text style={styles.walkoverViewDidntPlay}>didn't play</Text>
            <View style={styles.walkoverViewReasonContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.walkoverViewReasonLabel}>
                Reason: {(() => {
                  switch (walkoverInfo.reason) {
                    case 'NO_SHOW': return 'No Show';
                    case 'LATE_CANCELLATION': return 'Late Cancellation';
                    case 'INJURY': return 'Injury';
                    case 'PERSONAL_EMERGENCY': return 'Personal Emergency';
                    case 'OTHER': return 'Other';
                    default: return walkoverInfo.reason || 'Unknown';
                  }
                })()}
              </Text>
            </View>
            {walkoverInfo.reasonDetail && (
              <Text style={styles.walkoverViewReasonDetail}>
                "{walkoverInfo.reasonDetail}"
              </Text>
            )}
          </View>
        ) : isFriendlyMatch && isCasualPlay && mode === 'submit' ? (
          <View style={styles.casualPlayContainer}>
            {/* Game Summary Section - existing comments from other players */}
            {existingComments.length > 0 && (
              <View style={styles.gameSummarySection}>
                <Text style={styles.gameSummaryTitle}>Game Summary</Text>
                {existingComments.map((commentItem, index) => (
                  <View key={index} style={styles.gameSummaryItem}>
                    <Text style={styles.gameSummaryText}>
                      <Text style={styles.gameSummaryName}>{commentItem.user.name.split(' ')[0]}</Text>
                      <Text style={styles.gameSummaryColon}>  :  </Text>
                      <Text>{commentItem.text}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Comment Input */}
            <View style={styles.casualCommentInputContainer}>
              <BottomSheetTextInput
                style={styles.casualCommentInput}
                placeholder="e.g. A great game with Serena, with plenty of good rallies and close points. I really got lucky there in the final set!"
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : isFriendlyMatch && !isCasualPlay && mode === 'submit' ? (
          <View style={styles.friendlyMatchContainer}>
            {/* Header Section */}
            <View style={styles.friendlyMatchHeader}>
              <Text style={styles.friendlyMatchTitle}>Record your scores (if any) below.</Text>
              <Text style={styles.friendlyMatchSubtitle}>Friendly match results will NOT count towards your DMR.</Text>
            </View>

            {/* Toggle Switches Row */}
            <View style={styles.friendlyTogglesRow}>
              <View style={styles.friendlyToggleItem}>
                <Text style={styles.friendlyToggleLabel}>Didn't play</Text>
                <Switch
                  value={didntPlay}
                  onValueChange={(value) => {
                    setDidntPlay(value);
                    if (!value) {
                      setDefaultingTeam(null);
                      setWalkoverReason(null);
                      setWalkoverDetail('');
                    } else {
                      // For singles, auto-set opponent as defaulting team
                      if (matchType === 'SINGLES') {
                        const isUserOnTeamA = teamAPlayers.some(p => p.id === session?.user?.id);
                        setDefaultingTeam(isUserOnTeamA ? 'B' : 'A');
                      }
                      setMatchIncomplete(false);
                    }
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#FEA04D' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.friendlyToggleItem}>
                <Text style={styles.friendlyToggleLabel}>Match Incomplete</Text>
                <Switch
                  value={matchIncomplete}
                  onValueChange={setMatchIncomplete}
                  trackColor={{ false: '#E5E7EB', true: '#FEA04D' }}
                  thumbColor="#FFFFFF"
                  disabled={didntPlay}
                />
              </View>
            </View>

            {/* Score Section with Dropdowns */}
            <View style={[styles.friendlyScoreSection, didntPlay && styles.friendlyScoreSectionDisabled]}>
              {didntPlay && (
                <View style={styles.didntPlayOverlay}>
                  <Text style={styles.didntPlayOverlayText}>Match is not played</Text>
                </View>
              )}
              {matchType === 'DOUBLES' && (
              <>
                {/* Sets/Games Header */}
                <View style={styles.friendlySetsHeader}>
                  <View style={styles.friendlySetsHeaderLabel}>
                    <Text style={styles.friendlySetsHeaderText}>{isTennisOrPadel ? 'SET' : 'GAME'}</Text>
                  </View>
                  <View style={styles.friendlySetsHeaderNumbers}>
                    {[1, 2, 3].map(n => (
                      <Text key={n} style={styles.friendlySetNumberText}>{n}</Text>
                    ))}
                  </View>
                </View>

                {/* Team 1 Row - higher z-index so dropdown shows above Team 2 */}
                <View style={[styles.friendlyTeamRow, { zIndex: 20 }]}>
                  {/* Dynamic Avatars */}
                  <View style={styles.friendlyTeamAvatars}>
                    {getTeam1SelectedPlayers().length > 0 ? (
                      getTeam1SelectedPlayers().map((player, index) => (
                        <View
                          key={player.id}
                          style={[
                            styles.friendlyAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          {player.image ? (
                            <Image source={{ uri: player.image }} style={styles.friendlyAvatarImage} />
                          ) : (
                            <View style={styles.friendlyAvatarDefault}>
                              <Text style={styles.friendlyAvatarText}>
                                {player.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      // Placeholder avatars
                      [0, 1].map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.friendlyAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          <View style={styles.friendlyAvatarPlaceholder}>
                            <Ionicons name="person" size={14} color="#D1D5DB" />
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Dropdowns Column */}
                  <View style={styles.friendlyDropdownsColumn}>
                    {/* Player 1 Dropdown */}
                    <View style={styles.dropdownWrapper}>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setOpenDropdown(openDropdown === 'team1Player1' ? null : 'team1Player1')}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          !dropdownSelections.team1Player1 && styles.dropdownPlaceholderText
                        ]}>
                          {getPlayerById(dropdownSelections.team1Player1)?.name.split(' ')[0] || 'Player 1'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      {openDropdown === 'team1Player1' && (
                        <View style={styles.dropdownMenu}>
                          {getAvailablePlayers('team1Player1').map((player, idx) => {
                            const isSelectedHere = isPlayerSelectedHere(player.id, 'team1Player1');
                            const isSelectedElsewhere = isPlayerSelectedElsewhere(player.id, 'team1Player1');
                            const isDisabled = isSelectedElsewhere;
                            return (
                              <TouchableOpacity
                                key={player.id}
                                style={[
                                  styles.dropdownMenuItem,
                                  idx === getAvailablePlayers('team1Player1').length - 1 && styles.dropdownMenuItemLast,
                                  isDisabled && styles.dropdownMenuItemDisabled,
                                ]}
                                onPress={() => !isDisabled && handleDropdownSelect('team1Player1', player.id)}
                                activeOpacity={isDisabled ? 1 : 0.7}
                              >
                                <View style={[styles.dropdownMenuItemAvatar, isDisabled && styles.dropdownMenuItemAvatarDisabled]}>
                                  {player.image ? (
                                    <Image source={{ uri: player.image }} style={styles.dropdownMenuItemAvatarImage} />
                                  ) : (
                                    <View style={styles.dropdownMenuItemAvatarDefault}>
                                      <Text style={styles.dropdownMenuItemAvatarText}>
                                        {player.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[
                                  styles.dropdownMenuItemText,
                                  isDisabled && styles.dropdownMenuItemTextDisabled
                                ]}>{player.name}</Text>
                                {isSelectedHere && (
                                  <Ionicons name="checkmark-circle" size={20} color="#FEA04D" style={styles.dropdownMenuItemCheck} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                    {/* Player 2 Dropdown */}
                    <View style={styles.dropdownWrapper}>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setOpenDropdown(openDropdown === 'team1Player2' ? null : 'team1Player2')}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          !dropdownSelections.team1Player2 && styles.dropdownPlaceholderText
                        ]}>
                          {getPlayerById(dropdownSelections.team1Player2)?.name.split(' ')[0] || 'Player 2'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      {openDropdown === 'team1Player2' && (
                        <View style={styles.dropdownMenu}>
                          {getAvailablePlayers('team1Player2').map((player, idx) => {
                            const isSelectedHere = isPlayerSelectedHere(player.id, 'team1Player2');
                            const isSelectedElsewhere = isPlayerSelectedElsewhere(player.id, 'team1Player2');
                            const isDisabled = isSelectedElsewhere;
                            return (
                              <TouchableOpacity
                                key={player.id}
                                style={[
                                  styles.dropdownMenuItem,
                                  idx === getAvailablePlayers('team1Player2').length - 1 && styles.dropdownMenuItemLast,
                                  isDisabled && styles.dropdownMenuItemDisabled,
                                ]}
                                onPress={() => !isDisabled && handleDropdownSelect('team1Player2', player.id)}
                                activeOpacity={isDisabled ? 1 : 0.7}
                              >
                                <View style={[styles.dropdownMenuItemAvatar, isDisabled && styles.dropdownMenuItemAvatarDisabled]}>
                                  {player.image ? (
                                    <Image source={{ uri: player.image }} style={styles.dropdownMenuItemAvatarImage} />
                                  ) : (
                                    <View style={styles.dropdownMenuItemAvatarDefault}>
                                      <Text style={styles.dropdownMenuItemAvatarText}>
                                        {player.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[
                                  styles.dropdownMenuItemText,
                                  isDisabled && styles.dropdownMenuItemTextDisabled
                                ]}>{player.name}</Text>
                                {isSelectedHere && (
                                  <Ionicons name="checkmark-circle" size={20} color="#FEA04D" style={styles.dropdownMenuItemCheck} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Score Inputs */}
                  <View style={styles.friendlyScoresColumn}>
                    {[0, 1, 2].map((setIdx) => {
                      const setDisabled = isSetDisabled(setIdx);
                      return (
                        <BottomSheetTextInput
                          key={`T1-${setIdx}`}
                          style={[
                            styles.friendlyScoreInput,
                            setDisabled && styles.friendlyScoreInputDisabled,
                          ]}
                          keyboardType="number-pad"
                          maxLength={isTennisOrPadel ? 1 : 2}
                          value={setScores[setIdx].team1Games ? String(setScores[setIdx].team1Games) : ''}
                          onChangeText={(value) => updateScore(setIdx, 'A', 'games', value)}
                          editable={!setDisabled}
                          placeholder=""
                          placeholderTextColor="#D1D5DB"
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Team 2 Row - lower z-index */}
                <View style={[styles.friendlyTeamRow, { zIndex: 10 }]}>
                  {/* Dynamic Avatars */}
                  <View style={styles.friendlyTeamAvatars}>
                    {getTeam2SelectedPlayers().length > 0 ? (
                      getTeam2SelectedPlayers().map((player, index) => (
                        <View
                          key={player.id}
                          style={[
                            styles.friendlyAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          {player.image ? (
                            <Image source={{ uri: player.image }} style={styles.friendlyAvatarImage} />
                          ) : (
                            <View style={styles.friendlyAvatarDefault}>
                              <Text style={styles.friendlyAvatarText}>
                                {player.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      // Placeholder avatars
                      [0, 1].map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.friendlyAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          <View style={styles.friendlyAvatarPlaceholder}>
                            <Ionicons name="person" size={14} color="#D1D5DB" />
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Dropdowns Column */}
                  <View style={styles.friendlyDropdownsColumn}>
                    {/* Player 3 Dropdown */}
                    <View style={styles.dropdownWrapper}>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setOpenDropdown(openDropdown === 'team2Player1' ? null : 'team2Player1')}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          !dropdownSelections.team2Player1 && styles.dropdownPlaceholderText
                        ]}>
                          {getPlayerById(dropdownSelections.team2Player1)?.name.split(' ')[0] || 'Player 3'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      {openDropdown === 'team2Player1' && (
                        <View style={styles.dropdownMenu}>
                          {getAvailablePlayers('team2Player1').map((player, idx) => {
                            const isSelectedHere = isPlayerSelectedHere(player.id, 'team2Player1');
                            const isSelectedElsewhere = isPlayerSelectedElsewhere(player.id, 'team2Player1');
                            const isDisabled = isSelectedElsewhere;
                            return (
                              <TouchableOpacity
                                key={player.id}
                                style={[
                                  styles.dropdownMenuItem,
                                  idx === getAvailablePlayers('team2Player1').length - 1 && styles.dropdownMenuItemLast,
                                  isDisabled && styles.dropdownMenuItemDisabled,
                                ]}
                                onPress={() => !isDisabled && handleDropdownSelect('team2Player1', player.id)}
                                activeOpacity={isDisabled ? 1 : 0.7}
                              >
                                <View style={[styles.dropdownMenuItemAvatar, isDisabled && styles.dropdownMenuItemAvatarDisabled]}>
                                  {player.image ? (
                                    <Image source={{ uri: player.image }} style={styles.dropdownMenuItemAvatarImage} />
                                  ) : (
                                    <View style={styles.dropdownMenuItemAvatarDefault}>
                                      <Text style={styles.dropdownMenuItemAvatarText}>
                                        {player.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[
                                  styles.dropdownMenuItemText,
                                  isDisabled && styles.dropdownMenuItemTextDisabled
                                ]}>{player.name}</Text>
                                {isSelectedHere && (
                                  <Ionicons name="checkmark-circle" size={20} color="#FEA04D" style={styles.dropdownMenuItemCheck} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                    {/* Player 4 Dropdown */}
                    <View style={styles.dropdownWrapper}>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setOpenDropdown(openDropdown === 'team2Player2' ? null : 'team2Player2')}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          !dropdownSelections.team2Player2 && styles.dropdownPlaceholderText
                        ]}>
                          {getPlayerById(dropdownSelections.team2Player2)?.name.split(' ')[0] || 'Player 4'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                      {openDropdown === 'team2Player2' && (
                        <View style={styles.dropdownMenu}>
                          {getAvailablePlayers('team2Player2').map((player, idx) => {
                            const isSelectedHere = isPlayerSelectedHere(player.id, 'team2Player2');
                            const isSelectedElsewhere = isPlayerSelectedElsewhere(player.id, 'team2Player2');
                            const isDisabled = isSelectedElsewhere;
                            return (
                              <TouchableOpacity
                                key={player.id}
                                style={[
                                  styles.dropdownMenuItem,
                                  idx === getAvailablePlayers('team2Player2').length - 1 && styles.dropdownMenuItemLast,
                                  isDisabled && styles.dropdownMenuItemDisabled,
                                ]}
                                onPress={() => !isDisabled && handleDropdownSelect('team2Player2', player.id)}
                                activeOpacity={isDisabled ? 1 : 0.7}
                              >
                                <View style={[styles.dropdownMenuItemAvatar, isDisabled && styles.dropdownMenuItemAvatarDisabled]}>
                                  {player.image ? (
                                    <Image source={{ uri: player.image }} style={styles.dropdownMenuItemAvatarImage} />
                                  ) : (
                                    <View style={styles.dropdownMenuItemAvatarDefault}>
                                      <Text style={styles.dropdownMenuItemAvatarText}>
                                        {player.name.charAt(0).toUpperCase()}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[
                                  styles.dropdownMenuItemText,
                                  isDisabled && styles.dropdownMenuItemTextDisabled
                                ]}>{player.name}</Text>
                                {isSelectedHere && (
                                  <Ionicons name="checkmark-circle" size={20} color="#FEA04D" style={styles.dropdownMenuItemCheck} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Score Inputs */}
                  <View style={styles.friendlyScoresColumn}>
                    {[0, 1, 2].map((setIdx) => {
                      const setDisabled = isSetDisabled(setIdx);
                      return (
                        <BottomSheetTextInput
                          key={`T2-${setIdx}`}
                          style={[
                            styles.friendlyScoreInput,
                            setDisabled && styles.friendlyScoreInputDisabled,
                          ]}
                          keyboardType="number-pad"
                          maxLength={isTennisOrPadel ? 1 : 2}
                          value={setScores[setIdx].team2Games ? String(setScores[setIdx].team2Games) : ''}
                          onChangeText={(value) => updateScore(setIdx, 'B', 'games', value)}
                          editable={!setDisabled}
                          placeholder=""
                          placeholderTextColor="#D1D5DB"
                        />
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {/* Singles mode - show regular score inputs */}
            {matchType === 'SINGLES' && (
              <>
                {/* Sets/Games Header */}
                <View style={styles.setsHeaderRow}>
                  <View style={styles.setsHeaderLabel}>
                    <Text style={styles.setsHeaderLabelText}>{isTennisOrPadel ? 'SET' : 'GAME'}</Text>
                  </View>
                  <View style={styles.setsHeaderNumbers}>
                    {[1, 2, 3].map(n => (
                      <Text key={n} style={styles.setNumberHeaderText}>{n}</Text>
                    ))}
                  </View>
                </View>

                {/* Team A Row */}
                <View style={styles.teamRow}>
                  <View style={styles.singleAvatarContainer}>
                    {teamAPlayers[0]?.image ? (
                      <Image source={{ uri: teamAPlayers[0].image }} style={styles.singleAvatarImage} />
                    ) : (
                      <View style={styles.singleAvatarDefault}>
                        <Text style={styles.singleAvatarText}>
                          {teamAPlayers[0]?.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stackedNames}>
                    <Text style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                      {teamAPlayers[0]?.name.split(' ')[0]}
                    </Text>
                  </View>
                  <View style={styles.scoresColumn}>
                    {[0, 1, 2].map((setIdx) => {
                      const setDisabled = isSetDisabled(setIdx);
                      return (
                        <View key={`A-${setIdx}`} style={styles.scoreInputWrapper}>
                          <BottomSheetTextInput
                            style={[
                              styles.scoreInput,
                              setDisabled && styles.scoreInputDisabled
                            ]}
                            keyboardType="number-pad"
                            maxLength={isTennisOrPadel ? 1 : 2}
                            value={setScores[setIdx].team1Games ? String(setScores[setIdx].team1Games) : ''}
                            onChangeText={(value) => updateScore(setIdx, 'A', 'games', value)}
                            editable={!setDisabled}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Team B Row */}
                <View style={styles.teamRow}>
                  <View style={styles.singleAvatarContainer}>
                    {teamBPlayers[0]?.image ? (
                      <Image source={{ uri: teamBPlayers[0].image }} style={styles.singleAvatarImage} />
                    ) : (
                      <View style={styles.singleAvatarDefault}>
                        <Text style={styles.singleAvatarText}>
                          {teamBPlayers[0]?.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.stackedNames}>
                    <Text style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                      {teamBPlayers[0]?.name.split(' ')[0]}
                    </Text>
                  </View>
                  <View style={styles.scoresColumn}>
                    {[0, 1, 2].map((setIdx) => {
                      const setDisabled = isSetDisabled(setIdx);
                      return (
                        <View key={`B-${setIdx}`} style={styles.scoreInputWrapper}>
                          <BottomSheetTextInput
                            style={[
                              styles.scoreInput,
                              setDisabled && styles.scoreInputDisabled
                            ]}
                            keyboardType="number-pad"
                            maxLength={isTennisOrPadel ? 1 : 2}
                            value={setScores[setIdx].team2Games ? String(setScores[setIdx].team2Games) : ''}
                            onChangeText={(value) => updateScore(setIdx, 'B', 'games', value)}
                            editable={!setDisabled}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
            </View>

            {/* Divider */}
            <View style={styles.friendlyDivider} />

            {/* Game Summary Section */}
            {existingComments.length > 0 && (
              <View style={styles.gameSummarySection}>
                <Text style={styles.gameSummaryTitle}>Game Summary</Text>
                {existingComments.map((commentItem, index) => (
                  <View key={index} style={styles.gameSummaryItem}>
                    <Text style={styles.gameSummaryText}>
                      <Text style={styles.gameSummaryName}>{commentItem.user.name.split(' ')[0]}</Text>
                      <Text style={styles.gameSummaryColon}>  :  </Text>
                      <Text>{commentItem.text}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Comment Input */}
            <View style={styles.casualCommentInputContainer}>
              <BottomSheetTextInput
                style={styles.casualCommentInput}
                placeholder="e.g. A great game with Serena, with plenty of good rallies and close points. I really got lucky there in the final set!"
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : didntPlay && mode === 'submit' ? (
          <View style={styles.walkoverContainer}>
            {/* Singles: Show compact opponent info indicator */}
            {matchType === 'SINGLES' && (
              <View style={styles.singlesWalkoverIndicator}>
                <View style={styles.singlesWalkoverAvatar}>
                  {(defaultingTeam === 'A' ? teamAPlayers[0] : teamBPlayers[0])?.image ? (
                    <Image
                      source={{ uri: (defaultingTeam === 'A' ? teamAPlayers[0] : teamBPlayers[0])?.image }}
                      style={styles.singlesWalkoverAvatarImage}
                    />
                  ) : (
                    <View style={styles.singlesWalkoverAvatarDefault}>
                      <Text style={styles.singlesWalkoverAvatarText}>
                        {(defaultingTeam === 'A' ? teamAPlayers[0] : teamBPlayers[0])?.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.singlesWalkoverName} numberOfLines={1}>
                  {(defaultingTeam === 'A' ? teamAPlayers[0] : teamBPlayers[0])?.name}
                </Text>
                <Text style={styles.singlesWalkoverLabel}>didn't show up</Text>
              </View>
            )}

            {/* Who Forfeited Section - only show for doubles, singles auto-selects opponent */}
            {matchType === 'DOUBLES' && (
              <View style={styles.walkoverSection}>
                <Text style={styles.walkoverSectionTitle}>Who forfeited?</Text>
                <View style={styles.walkoverTeamSelection}>
                  {/* Team A Option */}
                  <TouchableOpacity
                    style={[
                      styles.walkoverTeamOption,
                      defaultingTeam === 'A' && styles.walkoverTeamOptionSelected,
                    ]}
                    onPress={() => setDefaultingTeam('A')}
                  >
                    <View style={styles.walkoverTeamAvatars}>
                      {teamAPlayers.slice(0, 2).map((player, index) => (
                        <View
                          key={player.id}
                          style={[
                            styles.walkoverAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          {player.image ? (
                            <Image source={{ uri: player.image }} style={styles.walkoverAvatarImage} />
                          ) : (
                            <View style={styles.walkoverAvatarDefault}>
                              <Text style={styles.walkoverAvatarText}>
                                {player.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={styles.walkoverTeamNames}>
                      {teamAPlayers.map(player => (
                        <Text key={player.id} style={styles.walkoverTeamNameText} numberOfLines={1}>
                          {player.name.split(' ')[0]}
                        </Text>
                      ))}
                    </View>
                    {defaultingTeam === 'A' && (
                      <View style={styles.walkoverCheckmark}>
                        <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Team B Option */}
                  <TouchableOpacity
                    style={[
                      styles.walkoverTeamOption,
                      defaultingTeam === 'B' && styles.walkoverTeamOptionSelected,
                    ]}
                    onPress={() => setDefaultingTeam('B')}
                  >
                    <View style={styles.walkoverTeamAvatars}>
                      {teamBPlayers.slice(0, 2).map((player, index) => (
                        <View
                          key={player.id}
                          style={[
                            styles.walkoverAvatar,
                            index > 0 && { marginLeft: -12 },
                          ]}
                        >
                          {player.image ? (
                            <Image source={{ uri: player.image }} style={styles.walkoverAvatarImage} />
                          ) : (
                            <View style={styles.walkoverAvatarDefault}>
                              <Text style={styles.walkoverAvatarText}>
                                {player.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={styles.walkoverTeamNames}>
                      {teamBPlayers.map(player => (
                        <Text key={player.id} style={styles.walkoverTeamNameText} numberOfLines={1}>
                          {player.name.split(' ')[0]}
                        </Text>
                      ))}
                    </View>
                    {defaultingTeam === 'B' && (
                      <View style={styles.walkoverCheckmark}>
                        <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Reason Section */}
            <View style={styles.walkoverSection}>
              <Text style={styles.walkoverSectionTitle}>Reason for walkover</Text>
              <View style={styles.walkoverReasonGrid}>
                {WALKOVER_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={[
                      styles.walkoverReasonOption,
                      walkoverReason === reason.value && styles.walkoverReasonOptionSelected,
                    ]}
                    onPress={() => setWalkoverReason(reason.value)}
                  >
                    <Ionicons
                      name={reason.icon as any}
                      size={20}
                      color={walkoverReason === reason.value ? '#F59E0B' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.walkoverReasonText,
                        walkoverReason === reason.value && styles.walkoverReasonTextSelected,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Additional Details (shown when OTHER is selected or always for context) */}
            <View style={styles.walkoverSection}>
              <Text style={styles.walkoverSectionTitle}>
                Additional details {walkoverReason === 'OTHER' ? '(required)' : '(optional)'}
              </Text>
              <BottomSheetTextInput
                style={styles.walkoverDetailInput}
                multiline
                numberOfLines={3}
                placeholder="Provide more context about what happened..."
                placeholderTextColor="#9CA3AF"
                value={walkoverDetail}
                onChangeText={setWalkoverDetail}
              />
            </View>

            {/* Submit Walkover Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (loading || !defaultingTeam || !walkoverReason) && styles.buttonDisabled,
              ]}
              onPress={handleWalkover}
              disabled={loading || !defaultingTeam || !walkoverReason}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Report Walkover</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Sets/Games Header - Hide for friendly match view mode */}
            {!isFriendlyViewMode && (
            <>
            <View style={styles.setsHeaderRow}>
              <View style={styles.setsHeaderLabel}>
                <Text style={styles.setsHeaderLabelText}>{isTennisOrPadel ? 'SET' : 'GAME'}</Text>
              </View>
              <View style={styles.setsHeaderNumbers}>
                {[1,2,3].map(n => (
                  <Text key={n} style={styles.setNumberHeaderText}>{n}</Text>
                ))}
              </View>
            </View>

        {/* Team A Row */}
        <View style={styles.teamRow}>
          {/* Avatar(s) - Overlapping for doubles, single for singles */}
          {matchType === 'DOUBLES' ? (
            <View style={styles.overlappingAvatars}>
              {teamAPlayers.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.overlappingAvatarContainer,
                    index > 0 && { marginLeft: -16 }
                  ]}
                >
                  {player.image ? (
                    <Image source={{ uri: player.image }} style={styles.overlappingAvatarImage} />
                  ) : (
                    <View style={styles.overlappingAvatarDefault}>
                      <Text style={styles.overlappingAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.singleAvatarContainer}>
              {teamAPlayers[0]?.image ? (
                <Image source={{ uri: teamAPlayers[0].image }} style={styles.singleAvatarImage} />
              ) : (
                <View style={styles.singleAvatarDefault}>
                  <Text style={styles.singleAvatarText}>
                    {teamAPlayers[0]?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Names - Stacked for doubles, single for singles */}
          <View style={styles.stackedNames}>
            {matchType === 'DOUBLES' ? (
              teamAPlayers.map(player => (
                <Text key={player.id} style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                  {player.name.split(' ')[0]}
                </Text>
              ))
            ) : (
              <Text style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                {teamAPlayers[0]?.name.split(' ')[0]}
              </Text>
            )}
          </View>
          {/* Score Inputs */}
          <View style={styles.scoresColumn}>
            {[0,1,2].map((setIdx) => {
              const setDisabled = isSetDisabled(setIdx);
              const showTiebreak = needsTiebreak(setIdx);
              return (
                <View key={`A-${setIdx}`} style={styles.scoreInputWrapper}>
                  <BottomSheetTextInput
                    style={[
                      styles.scoreInput,
                      (!isCaptain || mode !== 'submit' || setDisabled) && styles.scoreInputDisabled
                    ]}
                    keyboardType="number-pad"
                    maxLength={isTennisOrPadel ? 1 : 2}
                    value={setScores[setIdx].team1Games ? String(setScores[setIdx].team1Games) : ''}
                    onChangeText={(value) => updateScore(setIdx, 'A', 'games', value)}
                    editable={isCaptain && mode === 'submit' && !setDisabled}
                    placeholder=""
                    placeholderTextColor="#D1D5DB"
                  />
                  {showTiebreak && (
                    <View style={styles.tiebreakOverlay}>
                      <BottomSheetTextInput
                        style={[
                          styles.tiebreakOverlayInput,
                          (!isCaptain || mode !== 'submit' || setDisabled) && styles.tiebreakInputDisabled
                        ]}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={setScores[setIdx].team1Tiebreak ? String(setScores[setIdx].team1Tiebreak) : ''}
                        onChangeText={(value) => updateScore(setIdx, 'A', 'tiebreak', value)}
                        editable={isCaptain && mode === 'submit' && !setDisabled}
                        placeholder=""
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Team B Row */}
        <View style={styles.teamRow}>
          {/* Avatar(s) - Overlapping for doubles, single for singles */}
          {matchType === 'DOUBLES' ? (
            <View style={styles.overlappingAvatars}>
              {teamBPlayers.map((player, index) => (
                <View
                  key={player.id}
                  style={[
                    styles.overlappingAvatarContainer,
                    index > 0 && { marginLeft: -16 }
                  ]}
                >
                  {player.image ? (
                    <Image source={{ uri: player.image }} style={styles.overlappingAvatarImage} />
                  ) : (
                    <View style={styles.overlappingAvatarDefault}>
                      <Text style={styles.overlappingAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.singleAvatarContainer}>
              {teamBPlayers[0]?.image ? (
                <Image source={{ uri: teamBPlayers[0].image }} style={styles.singleAvatarImage} />
              ) : (
                <View style={styles.singleAvatarDefault}>
                  <Text style={styles.singleAvatarText}>
                    {teamBPlayers[0]?.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          {/* Names - Stacked for doubles, single for singles */}
          <View style={styles.stackedNames}>
            {matchType === 'DOUBLES' ? (
              teamBPlayers.map(player => (
                <Text key={player.id} style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                  {player.name.split(' ')[0]}
                </Text>
              ))
            ) : (
              <Text style={styles.stackedNameText} numberOfLines={1} ellipsizeMode="tail">
                {teamBPlayers[0]?.name.split(' ')[0]}
              </Text>
            )}
          </View>
          {/* Score Inputs */}
          <View style={styles.scoresColumn}>
            {[0,1,2].map((setIdx) => {
              const setDisabled = isSetDisabled(setIdx);
              const showTiebreak = needsTiebreak(setIdx);
              return (
                <View key={`B-${setIdx}`} style={styles.scoreInputWrapper}>
                  <BottomSheetTextInput
                    style={[
                      styles.scoreInput,
                      (!isCaptain || mode !== 'submit' || setDisabled) && styles.scoreInputDisabled
                    ]}
                    keyboardType="number-pad"
                    maxLength={isTennisOrPadel ? 1 : 2}
                    value={setScores[setIdx].team2Games ? String(setScores[setIdx].team2Games) : ''}
                    onChangeText={(value) => updateScore(setIdx, 'B', 'games', value)}
                    editable={isCaptain && mode === 'submit' && !setDisabled}
                    placeholder=""
                    placeholderTextColor="#D1D5DB"
                  />
                  {showTiebreak && (
                    <View style={styles.tiebreakOverlay}>
                      <BottomSheetTextInput
                        style={[
                          styles.tiebreakOverlayInput,
                          (!isCaptain || mode !== 'submit' || setDisabled) && styles.tiebreakInputDisabled
                        ]}
                        keyboardType="number-pad"
                        maxLength={2}
                        value={setScores[setIdx].team2Tiebreak ? String(setScores[setIdx].team2Tiebreak) : ''}
                        onChangeText={(value) => updateScore(setIdx, 'B', 'tiebreak', value)}
                        editable={isCaptain && mode === 'submit' && !setDisabled}
                        placeholder=""
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
            </>
            )}

        {/* Game Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Game Summary</Text>
          {mode === 'submit' ? (
            <BottomSheetTextInput
              style={[styles.summaryInput, (!isCaptain || mode !== 'submit') && styles.scoreInputDisabled]}
              multiline
              numberOfLines={3}
              placeholder="e.g. A great game with Serena, with plenty of good rallies and close points. I really got lucky there in the final set!"
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              editable={isCaptain && mode === 'submit'}
            />
          ) : (
            <>
              {/* Comments List for view/review/disputed modes */}
              {matchComments.length === 0 ? (
                <View style={styles.reviewNoCommentsContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color="#9CA3AF" />
                  <Text style={styles.reviewNoCommentsText}>No comments yet</Text>
                </View>
              ) : (
                <View style={styles.reviewCommentsListContainer}>
                  {(commentsExpanded ? matchComments : matchComments.slice(0, 2)).map((commentItem) => {
                    const isOwner = commentItem.userId === currentUserId;
                    const isEditing = editingCommentId === commentItem.id;
                    const isMenuOpen = openCommentMenuId === commentItem.id;

                    return (
                      <View key={commentItem.id} style={styles.reviewCommentItemContainer}>
                        {commentItem.user.image ? (
                          <Image
                            source={{ uri: commentItem.user.image }}
                            style={styles.reviewCommentAvatar}
                          />
                        ) : (
                          <View style={[styles.reviewCommentAvatar, styles.reviewCommentDefaultAvatar]}>
                            <Text style={styles.reviewCommentDefaultAvatarText}>
                              {commentItem.user.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          </View>
                        )}
                        <View style={styles.reviewCommentContentContainer}>
                          <View style={styles.reviewCommentHeaderRow}>
                            <View style={styles.reviewCommentHeaderInfo}>
                              <Text style={styles.reviewCommentAuthorName} numberOfLines={1}>
                                {commentItem.user.name}
                              </Text>
                              <Text style={styles.reviewCommentTimestamp}>
                                · {formatRelativeTime(commentItem.createdAt)}
                                {commentItem.updatedAt !== commentItem.createdAt && ' · edited'}
                              </Text>
                            </View>
                            {isOwner && !isEditing && (
                              <View style={styles.reviewCommentMenuWrapper}>
                                <TouchableOpacity
                                  style={styles.reviewCommentMenuButton}
                                  onPress={() => setOpenCommentMenuId(isMenuOpen ? null : commentItem.id)}
                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                  <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
                                </TouchableOpacity>

                                {isMenuOpen && (
                                  <View style={styles.reviewCommentDropdownMenu}>
                                    <Pressable
                                      style={styles.reviewCommentDropdownItem}
                                      onPress={() => handleEditComment(commentItem)}
                                    >
                                      <Ionicons name="pencil-outline" size={14} color="#374151" />
                                      <Text style={styles.reviewCommentDropdownItemText}>Edit</Text>
                                    </Pressable>
                                    <View style={styles.reviewCommentDropdownDivider} />
                                    <Pressable
                                      style={styles.reviewCommentDropdownItem}
                                      onPress={() => handleDeleteComment(commentItem.id)}
                                    >
                                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                      <Text style={[styles.reviewCommentDropdownItemText, styles.reviewCommentDeleteText]}>Delete</Text>
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>

                          {isEditing ? (
                            <View style={styles.reviewEditCommentContainer}>
                              <BottomSheetTextInput
                                style={styles.reviewEditCommentInput}
                                value={editCommentText}
                                onChangeText={setEditCommentText}
                                multiline
                                maxLength={1000}
                                placeholder="Edit your comment..."
                                placeholderTextColor="#9CA3AF"
                                autoFocus
                              />
                              <View style={styles.reviewEditCommentActions}>
                                <TouchableOpacity
                                  style={styles.reviewEditCancelButton}
                                  onPress={() => {
                                    setEditingCommentId(null);
                                    setEditCommentText('');
                                  }}
                                >
                                  <Text style={styles.reviewEditCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.reviewEditSaveButton,
                                    (!editCommentText.trim() || isSubmittingComment) && styles.reviewEditSaveButtonDisabled,
                                  ]}
                                  onPress={handleSaveEditComment}
                                  disabled={!editCommentText.trim() || isSubmittingComment}
                                >
                                  {isSubmittingComment ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                  ) : (
                                    <Text style={styles.reviewEditSaveButtonText}>Save</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.reviewCommentTextContent}>{commentItem.comment}</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {matchComments.length > 2 && (
                    <TouchableOpacity
                      style={styles.viewMoreCommentsButton}
                      onPress={() => setCommentsExpanded(!commentsExpanded)}
                    >
                      <Text style={styles.viewMoreCommentsText}>
                        {commentsExpanded ? 'View Less' : `View More (${matchComments.length - 2})`}
                      </Text>
                      <Ionicons
                        name={commentsExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#FEA04D"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Comment Input for review mode */}
              {(mode === 'review' || mode === 'view') && onCreateComment && (
                <View style={styles.reviewCommentInputWrapper}>
                  <View style={styles.reviewCommentInputContainer}>
                    <BottomSheetTextInput
                      style={styles.reviewCommentInput}
                      value={newMatchComment}
                      onChangeText={setNewMatchComment}
                      placeholder="Write a comment..."
                      placeholderTextColor="#9CA3AF"
                      maxLength={1000}
                      editable={!isSubmittingComment}
                    />
                    <TouchableOpacity
                      style={styles.reviewCommentSendButton}
                      onPress={handleSubmitComment}
                      disabled={!newMatchComment.trim() || isSubmittingComment}
                    >
                      {isSubmittingComment ? (
                        <ActivityIndicator size="small" color="#FEA04D" />
                      ) : (
                        <Ionicons
                          name="send"
                          size={20}
                          color={newMatchComment.trim() ? "#FEA04D" : "#D1D5DB"}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Info Message - Hide for friendly matches in view mode (both casual play and with scores) */}
        {mode !== 'submit' && !isFriendlyViewMode && !isFriendlyWithScoresViewMode && (
          mode === 'disputed' ? (
            <View style={styles.disputedBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <View style={styles.disputedBannerContent}>
                <Text style={styles.disputedBannerTitle}>Dispute Under Review</Text>
                <Text style={styles.disputedBannerText}>
                  This match result has been disputed and is awaiting admin review. No actions can be taken until the dispute is resolved.
                </Text>

                {/* Dispute Details - Hidden to prevent opponent from seeing dispute details
                {matchDetails?.dispute && (
                  <View style={styles.disputeDetailsContainer}>
                    <View style={styles.disputeDetailRow}>
                      <Text style={styles.disputeDetailLabel}>Disputed by:</Text>
                      <Text style={styles.disputeDetailValue}>
                        {matchDetails.dispute.raisedByUser?.name || 'Unknown'}
                      </Text>
                    </View>

                    <View style={styles.disputeDetailRow}>
                      <Text style={styles.disputeDetailLabel}>Category:</Text>
                      <Text style={styles.disputeDetailValue}>
                        {matchDetails.dispute.disputeCategory?.replace(/_/g, ' ') || 'N/A'}
                      </Text>
                    </View>

                    {matchDetails.dispute.disputeComment && (
                      <View style={styles.disputeReasonContainer}>
                        <Text style={styles.disputeDetailLabel}>Reason:</Text>
                        <Text style={styles.disputeReasonText}>
                          {`"${matchDetails.dispute.disputeComment}"`}
                        </Text>
                      </View>
                    )}

                    {matchDetails.dispute.disputerScore && (
                      <View style={styles.disputeDetailRow}>
                        <Text style={styles.disputeDetailLabel}>Claimed score:</Text>
                        <Text style={styles.disputeDetailValue}>
                          {(() => {
                            try {
                              const scores = typeof matchDetails.dispute.disputerScore === 'string'
                                ? JSON.parse(matchDetails.dispute.disputerScore)
                                : matchDetails.dispute.disputerScore;
                              if (Array.isArray(scores)) {
                                return scores.map((s: any) =>
                                  `${s.team1Games || s.team1Points || 0}-${s.team2Games || s.team2Points || 0}`
                                ).join(', ');
                              }
                              return 'N/A';
                            } catch {
                              return 'N/A';
                            }
                          })()}
                        </Text>
                      </View>
                    )}

                    {matchDetails.dispute.evidenceUrl && (
                      <View style={styles.disputeDetailRow}>
                        <Text style={styles.disputeDetailLabel}>Evidence:</Text>
                        <Text style={[styles.disputeDetailValue, { color: '#3B82F6' }]}>
                          Attachment provided
                        </Text>
                      </View>
                    )}

                    <View style={styles.disputeDetailRow}>
                      <Text style={styles.disputeDetailLabel}>Status:</Text>
                      <View style={styles.disputeStatusBadge}>
                        <Text style={styles.disputeStatusText}>
                          {matchDetails.dispute.status || 'OPEN'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )} */}
              </View>
            </View>
          ) : (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" />
              <Text style={styles.infoText}>
                {mode === 'view'
                  ? 'These scores have been submitted and are awaiting opponent confirmation.'
                  : 'Please review the submitted scores carefully before approving or disputing.'}
              </Text>
            </View>
          )
        )}

        {/* Action Buttons */}
        {mode === 'submit' ? (
          <TouchableOpacity
            style={[styles.submitButton, (loading || !isCaptain) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || !isCaptain}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isCaptain ? 'Confirm Result' : 'Only Captain Can Confirm'}
              </Text>
            )}
          </TouchableOpacity>
        ) : mode === 'view' ? (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#6B7280' }]}
            onPress={onClose}
          >
            <Text style={styles.submitButtonText}>Close</Text>
          </TouchableOpacity>
        ) : mode === 'disputed' ? (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#DC2626' }]}
            onPress={onClose}
          >
            <Text style={styles.submitButtonText}>Close</Text>
          </TouchableOpacity>
        ) : mode === 'review' ? (
          <View style={styles.reviewActions}>
            {/* Hide dispute button for friendly matches */}
            {!(matchDetails?.isFriendly || matchDetails?.isFriendlyRequest) && (
              <TouchableOpacity
                style={[styles.disputeButtonLarge, loading && styles.buttonDisabled]}
                onPress={async () => {
                  setLoading(true);
                  try {
                    await onDispute?.();
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#DC2626" size="small" />
                ) : (
                  <Text style={styles.disputeButtonLargeText}>Dispute Score</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.approveButtonLarge, loading && styles.buttonDisabled]}
              onPress={async () => {
                setLoading(true);
                try {
                  await onConfirm?.();
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.approveButtonLargeText}>Confirm Result</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
          </>
        )}
      </BottomSheetScrollView>
    </View>
  );
};
