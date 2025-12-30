export interface Match {
  id: string;
  matchType: string;
  status: string;
  scheduledTime?: string;
  scheduledStartTime?: string;
  matchDate?: string;
  location?: string;
  sport: string;
  resultSubmittedById?: string;
  resultSubmittedAt?: string;
  createdById?: string;
  team1Score?: number;
  team2Score?: number;
  outcome?: string;
  fee?: 'FREE' | 'SPLIT' | 'FIXED';
  feeAmount?: number | string;
  courtBooked?: boolean;
  description?: string;
  notes?: string;  // Backend returns 'notes' field
  isDisputed?: boolean;  // True if match has an active dispute
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';  // Current user's invitation status for DRAFT matches
  isFriendly?: boolean;  // True if this is a friendly match
  genderRestriction?: 'MALE' | 'FEMALE' | 'OPEN' | null;
  skillLevels?: string[];
  division?: {
    id: string;
    name: string;
    season?: {
      id: string;
      name: string;
    };
    league?: {
      name: string;
      sportType: string;
    };
  };
  participants: Array<{
    userId: string;
    role: string;
    team?: string;
    invitationStatus: string;
    user: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
}

export interface MatchInvitation {
  id: string;
  matchId: string;
  inviteeId: string;
  role: string;
  team?: string;
  status: string;
  sentAt: string;
  expiresAt: string;
  message?: string;
  match: {
    id: string;
    matchType: string;
    format: string;
    sport: string;
    location?: string;
    venue?: string;
    notes?: string;
    matchDate?: string;
    duration?: number;
    fee?: 'FREE' | 'SPLIT' | 'FIXED';
    feeAmount?: number | string;
    courtBooked?: boolean;
    division?: {
      id: string;
      name: string;
      season?: {
        id: string;
        name: string;
      };
    };
    participants: Array<{
      userId: string;
      role: string;
      team?: string;
      invitationStatus: string;
      user: {
        id: string;
        name: string;
        username?: string;
        image?: string;
      };
    }>;
    timeSlots?: Array<{
      id: string;
      proposedTime: string;
      location?: string;
      voteCount: number;
    }>;
  };
  inviter: {
    id: string;
    name: string;
    username?: string;
    image?: string;
  };
  partnerStatus?: {
    team1: Array<{
      userId: string;
      name: string;
      role: string;
      confirmed: boolean;
      status: string;
    }>;
    team2: Array<{
      userId: string;
      name: string;
      role: string;
      confirmed: boolean;
      status: string;
    }>;
  };
}

export interface MyGamesScreenProps {
  sport?: 'pickleball' | 'tennis' | 'padel';
  initialTab?: FilterTab;
}

export type FilterTab = 'ALL' | 'UPCOMING' | 'PAST' | 'INVITES';

export interface StatusInfo {
  bg: string;
  text: string;
  label: string;
}
