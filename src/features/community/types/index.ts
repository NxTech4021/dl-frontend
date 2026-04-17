export type ViewMode = 'players' | 'friends';

export interface Friend {
  friendshipId: string;
  friend: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
    status?: string;
  };
  friendsSince: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  createdAt: string;
  respondedAt: string | null;
  requester?: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
  recipient?: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
}

export interface FriendRequestsData {
  sent: FriendRequest[];
  received: FriendRequest[];
}

export interface Player {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string;
  image: string | null;
  sports: string[];
  skillRatings?: any;
  bio?: string | null;
  area?: string | null;
  gender?: string | null;
}

export interface SeasonInvitation {
  id: string;
  senderId: string;
  recipientId: string;
  seasonId: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  sender?: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
  recipient?: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
  season: {
    id: string;
    name: string;
  };
}

export interface SeasonInvitationsData {
  sent: SeasonInvitation[];
  received: SeasonInvitation[];
}
