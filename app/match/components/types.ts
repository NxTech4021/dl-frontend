export interface Match {
  id: string;
  matchType: 'SINGLES' | 'DOUBLES';
  status: string;
  scheduledTime?: string;
  matchDate?: string;
  location?: string;
  venue?: string;
  courtBooked?: boolean;
  fee?: 'FREE' | 'SPLIT' | 'FIXED';
  feeAmount?: number | string;
  duration?: number;
  description?: string;
  createdBy?: {
    id: string;
    name: string;
    image?: string;
  };
  participants: Array<{
    user: {
      id: string;
      name: string;
      image?: string;
    };
    role: string;
    team?: string;
    invitationStatus?: string;
  }>;
  division?: {
    id: string;
    name: string;
    season?: {
      id: string;
      name: string;
      startDate?: string;
      endDate?: string;
    };
  };
}

export interface DivisionData {
  gameType: 'SINGLES' | 'DOUBLES';
  genderCategory: 'MALE' | 'FEMALE' | 'MIXED' | null;
}

export interface MatchComment {
  id: string;
  matchId: string;
  userId: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    image?: string;
  };
}
