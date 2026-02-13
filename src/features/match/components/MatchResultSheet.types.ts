import { MatchComment } from '@/app/match/components/types';
export type { MatchComment };

export interface Player {
  id: string;
  name: string;
  image?: string;
  team?: 'TEAM_A' | 'TEAM_B';
}

export interface SetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
  team1Tiebreak?: number;
  team2Tiebreak?: number;
}

export interface Partnership {
  id: string;
  captainId: string;
  partnerId: string;
  captain: { id: string; name: string; image?: string };
  partner: { id: string; name: string; image?: string };
}

// Walkover reasons matching backend enum
export type WalkoverReason = 'NO_SHOW' | 'LATE_CANCELLATION' | 'INJURY' | 'PERSONAL_EMERGENCY' | 'OTHER';

export const WALKOVER_REASONS: { value: WalkoverReason; label: string; icon: string }[] = [
  { value: 'NO_SHOW', label: 'No Show', icon: 'person-remove-outline' },
  { value: 'LATE_CANCELLATION', label: 'Late Cancellation', icon: 'time-outline' },
  { value: 'INJURY', label: 'Injury', icon: 'medkit-outline' },
  { value: 'PERSONAL_EMERGENCY', label: 'Personal Emergency', icon: 'alert-circle-outline' },
  { value: 'OTHER', label: 'Other', icon: 'help-circle-outline' },
];

// Comment from existing players (for Game Summary in casual play mode)
export interface ExistingComment {
  user: { id: string; name: string; image?: string };
  text: string;
  createdAt: string;
}

export interface MatchResultSheetProps {
  matchId: string;
  matchType: 'SINGLES' | 'DOUBLES';
  players: Player[];
  sportType: string; // 'TENNIS', 'PADEL', 'PICKLEBALL'
  seasonId?: string;
  mode?: 'submit' | 'view' | 'review' | 'disputed'; // submit: add result, view: read-only, review: approve/dispute, disputed: view-only with banner
  isFriendlyMatch?: boolean; // Show casual play / friendly match toggle
  isWalkover?: boolean; // Whether this match was a walkover
  walkoverInfo?: {
    reason: string;
    defaultingPlayerName: string;
    reasonDetail?: string;
  };
  existingComments?: ExistingComment[]; // Game summary comments from other players
  // Match comments (for review mode)
  matchComments?: MatchComment[];
  currentUserId?: string;
  onCreateComment?: (text: string) => Promise<void>;
  onUpdateComment?: (commentId: string, text: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onClose: () => void;
  onSubmit: (data: {
    setScores?: SetScore[];
    gameScores?: any[];
    comment?: string;
    isUnfinished?: boolean;
    isCasualPlay?: boolean;
    isCancelled?: boolean;
    teamAssignments?: { team1: string[]; team2: string[] };
  }) => Promise<void>;
  onConfirm?: () => Promise<void>;
  onDispute?: () => Promise<void>;
  onWalkover?: (data: { defaultingUserId: string; reason: WalkoverReason; reasonDetail?: string }) => Promise<void>;
  onExpandSheet?: () => void; // Callback to expand the bottom sheet when friendly match tab is selected
  onCollapseSheet?: () => void; // Callback to collapse the bottom sheet when casual play tab is selected
}
