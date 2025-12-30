import { SportType } from '@/constants/SportsColor';

// ============================================
// Player & Team Types (for Standings Table)
// ============================================

export interface StandingsPlayer {
  rank: number;
  playerId: string;
  name: string;
  image?: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

export interface StandingsTeam {
  rank: number;
  players: StandingsPlayer[];
  played: number;
  wins: number;
  losses: number;
  points: number;
}

// ============================================
// Match Result Types (for Results Section)
// ============================================

export interface MatchPlayer {
  id: string;
  name: string;
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

export interface MatchResultComment {
  id: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
}

export interface MatchResult {
  id: string;
  matchType: string;
  matchDate: string;
  team1Score: number;
  team2Score: number;
  outcome: string;
  setScores: SetScore[];
  gameScores?: GameScore[];
  team1Players: MatchPlayer[];
  team2Players: MatchPlayer[];
  isWalkover: boolean;
  resultComment?: string;
  comments?: MatchResultComment[];
  venue?: string;
}

// ============================================
// Division Types (for Division Card)
// ============================================

export interface DivisionData {
  id: string;
  name: string;
  gameType: string;
  genderCategory?: string;
}

export interface DivisionCardData {
  division: DivisionData;
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  results: MatchResult[];
  resultsLoading: boolean;
  showResults: boolean;
  scrollProgress?: number;
  scrollViewWidth?: number;
  contentWidth?: number;
}

// ============================================
// Sport Colors Type (from SportsColor)
// ============================================

export interface SportColors {
  background: string;
  buttonColor: string;
  badgeColor: string;
  label?: string;
}

// ============================================
// Component Props Types
// ============================================

export interface PlayerAvatarProps {
  image?: string | null;
  name: string;
  size?: number;
  showBorder?: boolean;
  borderColor?: string;
}

export interface TeamAvatarsProps {
  players: Array<{ name: string; image?: string | null }>;
  size?: number;
  overlap?: number;
}

export interface ScrollProgressBarProps {
  progress: number;
  viewWidth: number;
  contentWidth: number;
  accentColor: string;
}

export interface StandingsRowProps {
  player?: StandingsPlayer;
  team?: StandingsTeam;
  rank: number;
  isDoubles?: boolean;
  isHighlighted?: boolean;
  onPress?: (playerId: string) => void;
}

export interface StandingsTableProps {
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  isDoubles?: boolean;
  currentUserId?: string;
  isUserDivision?: boolean;
  onPlayerPress?: (playerId: string) => void;
}

export interface MatchResultCardProps {
  match: MatchResult;
  index: number;
  totalResults: number;
  sportColors: SportColors;
  isPickleball: boolean;
  cardWidth: number;
  cardGap: number;
  expandedComments: Set<string>;
  onToggleComments: (matchId: string) => void;
}

export interface ResultsSectionProps {
  results: MatchResult[];
  isLoading: boolean;
  sportColors: SportColors;
  isPickleball: boolean;
  expandedComments: Set<string>;
  onToggleComments: (matchId: string) => void;
  onScrollUpdate?: (progress: number, viewWidth: number, contentWidth: number) => void;
}

export interface DivisionCardProps {
  division: DivisionData;
  standings: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  results: MatchResult[];
  resultsLoading: boolean;
  showResults: boolean;
  scrollProgress?: number;
  scrollViewWidth?: number;
  contentWidth?: number;
  sportColors: SportColors;
  isPickleball: boolean;
  isUserDivision: boolean;
  currentUserId?: string;
  showViewMatchesButton?: boolean;
  onToggleResults: () => void;
  onViewMatches?: () => void;
  onScrollUpdate?: (progress: number, viewWidth: number, contentWidth: number) => void;
}
