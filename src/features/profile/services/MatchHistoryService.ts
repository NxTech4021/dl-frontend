import axiosInstance, { endpoints } from '@/lib/endpoints';
import {
  MatchHistoryItem,
  MatchHistoryFilters,
  MatchHistoryResponse,
  SetScore,
  MatchParticipant,
  SportType,
} from '../types/matchHistory';

interface BackendSetScore {
  setNumber: number;
  player1Games: number;
  player2Games: number;
  // Backend returns nested tiebreak object, not flat fields
  tiebreak?: {
    player1: number;
    player2: number;
  } | null;
}

interface BackendParticipant {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  profileImage?: string;
}

interface BackendMatch {
  id: string;
  matchType: 'SINGLES' | 'DOUBLES';
  matchDate: string;
  status: string;

  // ACTUAL backend response format from matchHistoryService.ts
  // Opponents is an ARRAY (not a single opponent object)
  opponents?: BackendParticipant[];
  // Partner is the user's partner for doubles
  partner?: BackendParticipant | null;
  // userOutcome is lowercase: 'win' | 'loss' | 'draw' | null
  userOutcome?: 'win' | 'loss' | 'draw' | null;

  // Scores - backend uses 'setScores' key
  setScores?: BackendSetScore[];

  // Context
  division?: { id: string; name: string; season?: string };
  league?: { id: string; name: string };
  season?: { id: string; name: string };

  // Metadata
  isWalkover?: boolean;
  isDisputed?: boolean;
  isFriendly?: boolean;
  sportType?: SportType;

  // Rating change for this match
  ratingChange?: {
    ratingBefore: number;
    ratingAfter: number;
    delta: number;
  } | null;
}

interface BackendResponse {
  success?: boolean;
  data?: {
    matches?: BackendMatch[];
    data?: BackendMatch[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore?: boolean;
    };
    total?: number;
    page?: number;
    limit?: number;
  };
  matches?: BackendMatch[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}

export class MatchHistoryService {
  /**
   * Transform backend participant to frontend format
   */
  private static transformParticipant(participant?: BackendParticipant): MatchParticipant | undefined {
    if (!participant) return undefined;

    const name = participant.name ||
      `${participant.firstName || ''} ${participant.lastName || ''}`.trim() ||
      'Unknown';

    return {
      id: participant.id,
      name,
      image: participant.image || participant.profileImage,
    };
  }

  /**
   * Transform backend set scores to frontend format
   * Backend returns player1/player2 which corresponds to team1/team2
   * For match history, player1 = user's team, player2 = opponent's team
   */
  private static transformSetScores(scores?: BackendSetScore[]): SetScore[] {
    if (!scores || !Array.isArray(scores)) return [];

    return scores.map(score => ({
      setNumber: score.setNumber,
      // player1Games = user's team games, player2Games = opponent's team games
      userGames: score.player1Games,
      opponentGames: score.player2Games,
      // Backend returns nested tiebreak object: { player1: number, player2: number }
      hasTiebreak: !!score.tiebreak,
      userTiebreak: score.tiebreak?.player1,
      opponentTiebreak: score.tiebreak?.player2,
    }));
  }

  /**
   * Transform a backend match to frontend MatchHistoryItem format
   *
   * Backend response format (from matchHistoryService.ts):
   * - opponents: Array of opponent players (for singles: 1 player, for doubles: 2 players)
   * - partner: User's partner for doubles matches (null for singles)
   * - userOutcome: 'win' | 'loss' | 'draw' | null (lowercase!)
   * - setScores: Array with nested tiebreak object
   */
  private static transformMatch(match: BackendMatch): MatchHistoryItem {
    // Backend returns opponents as an array
    const opponents = match.opponents || [];

    // First opponent is the main opponent player
    const opponentPlayer = this.transformParticipant(opponents[0]);
    // For doubles, second opponent is opponent's partner
    const opponentPartner = this.transformParticipant(opponents[1]);

    // User's partner for doubles (directly from match.partner)
    const userPartner = this.transformParticipant(match.partner || undefined);

    // Determine outcome from userOutcome (backend sends lowercase, frontend expects uppercase)
    let outcome: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
    if (match.userOutcome) {
      outcome = match.userOutcome.toUpperCase() as 'WIN' | 'LOSS' | 'DRAW';
    }

    // Transform scores
    const setScores = this.transformSetScores(match.setScores);

    return {
      id: match.id,
      matchType: match.matchType,
      matchDate: match.matchDate,
      status: 'COMPLETED',
      userTeam: {
        // Backend doesn't return the user's own data in match history
        // (it's implicit - the current user is always "player1" / "team1")
        player: { id: '', name: 'You' },
        partner: userPartner,
      },
      opponentTeam: {
        player: opponentPlayer || { id: '', name: 'Unknown' },
        partner: opponentPartner,
      },
      outcome,
      setScores,
      division: match.division,
      season: match.season,
      league: match.league,
      isWalkover: match.isWalkover,
      isFriendly: match.isFriendly,
      sportType: match.sportType,
      ratingChange: match.ratingChange || null,
    };
  }

  /**
   * Fetch match history with pagination and filters
   */
  static async fetchMatchHistory(
    filters: MatchHistoryFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<MatchHistoryResponse> {
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
        status: 'COMPLETED', // Always fetch only completed matches
      };

      // Add optional filters
      if (filters.seasonId) params.seasonId = filters.seasonId;
      if (filters.divisionId) params.divisionId = filters.divisionId;
      if (filters.matchType) params.matchType = filters.matchType;
      if (filters.outcome && filters.outcome !== 'all') params.outcome = filters.outcome;
      if (filters.sportType && filters.sportType !== 'all') params.sportType = filters.sportType;

      const response = await axiosInstance.get<BackendResponse>(endpoints.match.getHistory, {
        params,
      });

      const responseData = response.data;

      // Handle various response formats
      let matches: BackendMatch[] = [];
      let pagination = {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      };

      if (responseData.data?.matches) {
        matches = responseData.data.matches;
        if (responseData.data.pagination) {
          pagination = {
            page: responseData.data.pagination.page,
            limit: responseData.data.pagination.limit,
            total: responseData.data.pagination.total,
            totalPages: responseData.data.pagination.totalPages ||
              Math.ceil(responseData.data.pagination.total / responseData.data.pagination.limit),
            hasMore: responseData.data.pagination.hasMore ??
              (responseData.data.pagination.page < (responseData.data.pagination.totalPages || 1)),
          };
        }
      } else if (responseData.data?.data) {
        matches = responseData.data.data;
        pagination = {
          page: responseData.data.page || page,
          limit: responseData.data.limit || limit,
          total: responseData.data.total || 0,
          totalPages: Math.ceil((responseData.data.total || 0) / limit),
          hasMore: page < Math.ceil((responseData.data.total || 0) / limit),
        };
      } else if (responseData.matches) {
        matches = responseData.matches;
        if (responseData.pagination) {
          pagination = {
            page: responseData.pagination.page,
            limit: responseData.pagination.limit,
            total: responseData.pagination.total,
            totalPages: responseData.pagination.totalPages ||
              Math.ceil(responseData.pagination.total / responseData.pagination.limit),
            hasMore: responseData.pagination.hasMore ??
              (responseData.pagination.page < (responseData.pagination.totalPages || 1)),
          };
        }
      }

      // Transform matches to frontend format
      console.log('[MatchHistoryService] Raw matches from backend:', matches.map(m => ({
        id: m.id,
        ratingChange: m.ratingChange,
      })));
      const transformedMatches = matches.map(match => this.transformMatch(match));
      console.log('[MatchHistoryService] Transformed matches:', transformedMatches.map(m => ({
        id: m.id,
        ratingChange: m.ratingChange,
      })));

      return {
        success: true,
        data: {
          matches: transformedMatches,
          pagination,
        },
      };
    } catch (error) {
      console.error('MatchHistoryService: Error fetching match history:', error);
      return {
        success: false,
        data: {
          matches: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        },
        message: error instanceof Error ? error.message : 'Failed to fetch match history',
      };
    }
  }
}
