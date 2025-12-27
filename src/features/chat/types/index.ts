export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  username?: string;
  email?: string;
  lastSeen?: Date;
  role?: string;
}

// Helper to check if a user is an admin (should be hidden from UI)
export const isAdminUser = (user: User): boolean => {
  const role = user.role?.toUpperCase();
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
};

// Filter out admin users from a participants array
export const filterOutAdmins = (participants: User[]): User[] => {
  return participants.filter(p => !isAdminUser(p));
};

// Sender info attached to messages
export interface MessageSender {
  id: string;
  name?: string;
  username?: string;
  image?: string;
  avatar?: string;
}

// Message reaction (emoji reaction from a user)
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName?: string;
  timestamp: Date;
}

// Read receipt for messages
export interface ReadReceipt {
  id: string;
  userId: string;
  messageId: string;
  readAt: string;
  user?: {
    id: string;
    name?: string;
  };
}

// Backend thread member structure
export interface BackendThreadMember {
  userId: string;
  user: BackendUser;
  role?: string;
  joinedAt?: string;
}

// Backend user structure (from API responses)
export interface BackendUser {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
}

// Backend message structure (from API responses)
export interface BackendMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  timestamp?: string;
  readBy?: ReadReceipt[];
  repliesToId?: string;
  messageType?: 'TEXT' | 'MATCH';
  matchData?: unknown;
  isEdited?: boolean;
  isDeleted?: boolean;
  sender?: MessageSender;
  updatedAt?: string;
}

// Backend thread structure (from API responses)
export interface BackendThread {
  id: string;
  name?: string;
  isGroup: boolean;
  createdAt: string;
  updatedAt: string;
  sportType?: string;
  avatarUrl?: string;
  divisionId?: string;
  unreadCount?: number;
  members?: BackendThreadMember[];
  messages?: BackendMessage[];
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
  recentSportContext?: {
    sportType: string;
    lastInteractionAt?: string;
    isValid?: boolean;
  };
  _count?: {
    messages?: number;
  };
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
    sender?: MessageSender;
    readBy?: ReadReceipt[];
    updatedAt?: string;
  };
  reactions?: MessageReaction[];
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