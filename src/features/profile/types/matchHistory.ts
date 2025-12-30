// Match History Types

export type SportType = 'TENNIS' | 'PADEL' | 'PICKLEBALL';

export interface MatchParticipant {
  id: string;
  name: string;
  image?: string;
}

export interface SetScore {
  setNumber: number;
  userGames: number;
  opponentGames: number;
  hasTiebreak: boolean;
  userTiebreak?: number;
  opponentTiebreak?: number;
}

export interface MatchHistoryItem {
  id: string;
  matchType: 'SINGLES' | 'DOUBLES';
  matchDate: string;
  status: 'COMPLETED';

  // Participants
  userTeam: {
    player: MatchParticipant;
    partner?: MatchParticipant; // For doubles
  };
  opponentTeam: {
    player: MatchParticipant;
    partner?: MatchParticipant; // For doubles
  };

  // Result
  outcome: 'WIN' | 'LOSS' | 'DRAW';

  // Scores
  setScores: SetScore[];

  // Context
  division?: { id: string; name: string };
  season?: { id: string; name: string };
  league?: { id: string; name: string };

  // Additional metadata
  isWalkover?: boolean;
  walkoverReason?: string;
  isFriendly?: boolean;
  sportType?: SportType;

  // Rating change from this match
  ratingChange?: {
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
  } | null;
}

export interface MatchHistoryFilters {
  seasonId?: string;
  divisionId?: string;
  matchType?: 'SINGLES' | 'DOUBLES';
  outcome?: 'win' | 'loss' | 'all';
  sportType?: SportType | 'all';
}

export interface MatchHistoryResponse {
  success: boolean;
  data: {
    matches: MatchHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
  message?: string;
}

export interface FilterOption {
  id: string;
  name: string;
}
