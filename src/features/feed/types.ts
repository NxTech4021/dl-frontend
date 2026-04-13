// src/features/feed/types.ts

// ============================================
// Author Types
// ============================================

export interface PostAuthor {
  id: string;
  name: string | null;
  username?: string;
  image?: string | null;
}

// ============================================
// Post Types
// ============================================

export interface FeedPost {
  id: string;
  authorId: string;
  matchId: string;
  caption?: string | null;
  sport: string;
  matchType: string;
  gameType: 'league' | 'friendly';
  winnerIds: string[];
  loserIds: string[];
  matchDate: string;
  leagueId?: string | null;
  divisionId?: string | null;
  likeCount: number;
  commentCount: number;
  isLikedByUser: boolean;
  createdAt: string;
  updatedAt?: string;
  author: PostAuthor;
  match: FeedMatch;
}

export interface FeedMatch {
  id: string;
  matchType: string;
  matchDate: string;
  sport: string;
  team1Score: number;
  team2Score: number;
  outcome: string;
  setScores: SetScore[];
  gameScores?: GameScore[];
  team1Players: MatchPlayer[];
  team2Players: MatchPlayer[];
  isWalkover: boolean;
  isFriendly?: boolean;
  location?: string;
  leagueName?: string;
  seasonName?: string;
  divisionName?: string;
}

export interface MatchPlayer {
  id: string;
  name: string | null;
  username?: string;
  image?: string | null;
}

export interface SetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
  team1Tiebreak?: number | null;
  team2Tiebreak?: number | null;
  hasTiebreak: boolean;
}

export interface GameScore {
  gameNumber: number;
  team1Points: number;
  team2Points: number;
}

// ============================================
// Comment Types
// ============================================

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username?: string;
    image?: string | null;
  };
}

// ============================================
// Liker Types
// ============================================

export interface PostLiker {
  id: string;
  name: string | null;
  username?: string;
  image?: string | null;
}

// ============================================
// API Response Types
// ============================================

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface LikeToggleResponse {
  liked: boolean;
  likeCount: number;
}
