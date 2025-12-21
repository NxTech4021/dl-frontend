export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  username?: string;
  email?: string;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  replyTo?: string;
  type?: 'text' | 'match'; // Add message type
  matchData?: { // Add match-specific data
    matchId?: string; // Match ID for API calls
    matchType?: 'SINGLES' | 'DOUBLES'; // Match type from backend
    date: string;
    time: string;
    duration: number;
    numberOfPlayers: string;
    location: string;
    fee: 'FREE' | 'SPLIT' | 'FIXED';
    feeAmount?: string; // Fee amount as string (e.g., "40.00")
    description: string;
    sportType: 'PICKLEBALL' | 'TENNIS' | 'PADEL';
    leagueName: string;
    courtBooked?: boolean;
    notes?: string; // Optional notes
    participants?: Array<{ // Match participants
      userId: string;
      role?: string;
      team?: string;
      invitationStatus?: string;
    }>;
    // Friendly match request fields
    isFriendly?: boolean;
    isFriendlyRequest?: boolean;
    requestExpiresAt?: string;
    requestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    requestRecipientId?: string;
  };
  metadata?: {
    isEdited?: boolean;
    isDeleted?: boolean;
    sender?: any;
    readBy?: any[];
    updatedAt?: string;
    [key: string]: any;
  };
}

export interface Thread {
  id: string;
  name?: string;
  type: 'direct' | 'group' | 'division';
  sportType?: 'PICKLEBALL' | 'TENNIS' | 'PADEL' | null;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  recentSportContext?: {
    sportType: 'PICKLEBALL' | 'TENNIS' | 'PADEL' | null;
    lastInteractionAt: Date | null;
    isValid: boolean;
  } | null;
  division?: {
    id: string;
    name: string;
    gameType?: string;
    genderCategory?: string;
    league?: {
      id: string;
      name: string;
      sportType: string;
    };
    season?: {
      id: string;
      name: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    };
  };
  metadata?: {
    avatarUrl?: string;
    divisionId?: string;
    seasonId?: string;
    leagueId?: string;
    leagueName?: string;
    seasonName?: string;
    divisionName?: string;
    gameType?: string;
    genderCategory?: string;
    isGroup?: boolean;
    messageCount?: number;
    [key: string]: any;
  };
}

export interface ChatState {
  threads: Thread[];
  currentThread: Thread | null;
  messages: Record<string, Message[]>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  replyingTo: Message | null;
}