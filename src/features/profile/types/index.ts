export interface DropdownModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title?: string;
}

export interface WinRateCircleProps {
  winRate: number;
}

export interface SetDetail {
  setNumber: number;
  userGames: number;
  opponentGames: number;
  userWonSet: boolean;
  hasTiebreak?: boolean;
  userTiebreak?: number | null;
  opponentTiebreak?: number | null;
}

export interface GameData {
  date: string;
  time: string;
  rating: number;
  ratingBefore: number;
  rdBefore?: number;
  rdAfter?: number;
  opponent: string;
  opponentImage?: string;
  result: 'W' | 'L';
  score: string;
  ratingChange: number;
  league: string;
  player1: string;
  player2: string;
  matchId?: string;
  scores: {
    set1: { player1: number | null; player2: number | null };
    set2: { player1: number | null; player2: number | null };
    set3: { player1: number | null; player2: number | null };
  };
  setDetails?: SetDetail[];
  status: 'completed' | 'ongoing' | 'upcoming';
}

export interface MatchDetailsModalProps {
  match: GameData | null;
  onClose: () => void;
}

export interface EloProgressGraphProps {
  data: GameData[];
  onPointPress: (game: GameData, index: number) => void;
  selectedIndex?: number | null;
}

export interface LeagueStatsProps {
  skillLevel: string;
  selectedGameType: string;
  eloData: GameData[];
  winRate: number;
  onEloDropdownPress: () => void;
  onLeagueDropdownPress: () => void;
  onGamePointPress: (game: GameData) => void;
}

export interface SkillRating {
  rating?: number; 
  singles?: number;
  doubles?: number;
}


export interface UserData {
  leagueStats: any;
  name: string;
  username: string;
  bio: string;
  image?: string | null;
  location: string;
  gender: string;
  skillRatings?: Record<string, SkillRating>; 
  skillLevel: string;
  sports: string[];
  activeSports: string[];
  achievements: Array<{
    id: string;
    title: string;
    icon: string;
    year?: string;
  }>;
}