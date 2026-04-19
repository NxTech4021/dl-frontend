// Notification types matching backend schema
export type NotificationCategory = 
  | 'DIVISION'
  | 'LEAGUE'
  | 'CHAT'
  | 'MATCH'
  | 'SEASON'
  | 'PAYMENT'
  | 'ADMIN'
  | 'GENERAL';

export type NotificationType =
  // Legacy types
  | 'SEASON_REGISTRATION_OPEN'
  | 'SEASON_STARTING_SOON'
  | 'SEASON_STARTED'
  | 'SEASON_ENDING_SOON'
  | 'SEASON_ENDED'
  | 'DIVISION_ASSIGNMENT'
  | 'DIVISION_PROMOTION'
  | 'DIVISION_DEMOTION'
  | 'MATCH_SCHEDULED'
  | 'MATCH_REMINDER'
  | 'MATCH_RESULT_SUBMITTED'
  | 'MATCH_RESULT_DISPUTED'
  | 'MATCH_RESULT_APPROVED'
  | 'PAIR_REQUEST_RECEIVED'
  | 'PAIR_REQUEST_ACCEPTED'
  | 'PAIR_REQUEST_DECLINED'
  | 'PARTNER_ASSIGNED'
  | 'NEW_MESSAGE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REMINDER'
  | 'ADMIN_ANNOUNCEMENT'
  | 'TEST_NOTIFICATION'
  | 'SYSTEM_MAINTENANCE'
  | 'MAINTENANCE_SCHEDULED'
  | 'MAINTENANCE_IN_PROGRESS'
  | 'MAINTENANCE_COMPLETE'
  | 'MAINTENANCE_CANCELLED'
  // Division
  | 'DIVISION_REBALANCED'
  | 'DIVISION_UPDATE_NEW_PLAYER'
  | 'DIVISION_TRANSFERRED'
  // Doubles League - Match Invitation
  | 'DOUBLES_PARTNER_POSTED_MATCH'
  | 'DOUBLES_PARTNER_CONFIRMED_POSTED_MATCH'
  | 'DOUBLES_PARTNER_DECLINED_POSTED_MATCH'
  | 'DOUBLES_PARTNER_JOINED_MATCH'
  | 'DOUBLES_PARTNER_CONFIRMED_JOINED_MATCH'
  | 'DOUBLES_PARTNER_DECLINED_JOINED_MATCH'
  | 'DOUBLES_MATCH_CANCELLED_PARTNER_DECLINED'
  // Match Management
  | 'MATCH_WALKOVER_WON'
  | 'MATCH_WALKOVER_LOST'
  | 'NO_SHOW_STRIKE_WARNING'
  | 'OPPONENT_CLAIMS_NO_SHOW'
  | 'HEAD_TO_HEAD_HISTORY'
  | 'SCORE_SUBMISSION_REMINDER'
  | 'SCORE_DISPUTE_ALERT'
  | 'OPPONENT_SUBMITTED_SCORE'
  | 'PENDING_SCORE_SUBMISSION'
  | 'PENDING_SCORE_CONFIRMATION'
  | 'SCORE_AUTO_CONFIRMED'
  | 'SCORE_CONFIRMED'
  | 'FORFEIT_DISCIPLINARY'
  | 'MATCH_RESCHEDULE_REQUEST'
  | 'MATCH_RESCHEDULE_ACCEPTED'
  | 'MATCH_RESCHEDULE_DECLINED'
  | 'OPPONENT_POSTED_LEAGUE_MATCH'
  | 'LEAGUE_MATCH_CONFIRMED_YOU_JOINED'
  | 'LEAGUE_MATCH_CONFIRMED_OPPONENT_JOINED'
  | 'LEAGUE_MATCH_CANCELLED_BY_OPPONENT'
  | 'FRIENDLY_MATCH_POSTED'
  | 'FRIENDLY_MATCH_JOIN_REQUEST'
  | 'FRIENDLY_MATCH_PLAYER_JOINED'
  | 'FRIENDLY_MATCH_REQUEST_ACCEPTED'
  | 'FRIENDLY_MATCH_REQUEST_DECLINED'
  | 'FRIENDLY_MATCH_CANCELLED'
  | 'FRIENDLY_MATCH_DETAILS_CHANGED'
  | 'PLAYER_LEFT_FRIENDLY_MATCH'
  | 'SCHEDULING_CONFLICT_DETECTED'
  | 'OPPONENT_CHANGED'
  | 'PARTNER_CHANGED'
  // Rating & Ranking
  | 'MOVED_UP_IN_STANDINGS'
  | 'ENTERED_TOP_10'
  | 'ENTERED_TOP_3'
  | 'LEAGUE_LEADER'
  | 'WEEKLY_RANKING_UPDATE'
  | 'DMR_INCREASED'
  | 'DMR_DECREASED'
  | 'MONTHLY_DMR_RECAP'
  | 'PERSONAL_BEST_RATING'
  | 'RATING_MILESTONE'
  // Social & Community
  | 'FRIEND_ACTIVITY_SCORECARD'
  | 'FRIEND_ACTIVITY_POST'
  | 'SHARE_SCORECARD_PROMPT'
  | 'FRIEND_REQUEST'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  // Promotional
  | 'INACTIVE_PLAYER_14_DAYS'
  | 'INACTIVE_PLAYER_30_DAYS'
  | 'LEAGUE_BETWEEN_BREAKS'
  | 'INCOMPLETE_REGISTRATION'
  // Special Circumstances
  | 'DISPUTE_SUBMITTED'
  | 'DISPUTE_RESOLUTION_REQUIRED'
  | 'DISPUTE_RESOLVED'
  | 'CODE_OF_CONDUCT_WARNING'
  // League Lifecycle
  | 'NEW_WEEKLY_STREAK'
  | 'STREAK_AT_RISK'
  | 'WINNING_STREAK'
  | 'LEAGUE_WINNER'
  | 'TOP_3_FINISH'
  | 'LEAGUE_COMPLETE_BANNER'
  | 'LEAGUE_PERFORMANCE_SUMMARY'
  | 'SEASON_REGISTRATION_CONFIRMED'
  | 'NEW_SEASON_ANNOUNCEMENT'
  | 'SEASON_CANCELLED'
  // Pairing
  | 'PAIR_REQUEST_REJECTED'
  | 'PARTNERSHIP_DISSOLVED'
  // Misc
  | string;

export interface Notification {
  id: string;
  title?: string;
  message: string;
  category: NotificationCategory;
  type?: NotificationType;
  read: boolean;
  archive: boolean;
  createdAt: string;
  readAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  archived?: boolean;
  category?: NotificationCategory;
  categories?: NotificationCategory[];
  type?: NotificationType;
  types?: NotificationType[];
}

export interface PaginatedNotifications {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  archived: number;
  byCategory: Record<NotificationCategory, number>;
  byType: Record<NotificationType, number>;
}

export interface CategoryConfig {
  value: NotificationCategory;
  label: string;
  icon: string;
  color: string;
}

export const NOTIFICATION_CATEGORIES: CategoryConfig[] = [
  { value: 'DIVISION', label: 'Division', icon: 'people', color: '#3B82F6' },
  { value: 'LEAGUE', label: 'League', icon: 'trophy', color: '#10B981' },
  { value: 'CHAT', label: 'Chat', icon: 'chatbubble', color: '#8B5CF6' },
  { value: 'MATCH', label: 'Match', icon: 'notifications', color: '#F59E0B' },
  { value: 'SEASON', label: 'Season', icon: 'calendar', color: '#6366F1' },
  { value: 'PAYMENT', label: 'Payment', icon: 'card', color: '#EAB308' },
  { value: 'ADMIN', label: 'Admin', icon: 'shield', color: '#EF4444' },
  { value: 'GENERAL', label: 'General', icon: 'notifications-outline', color: '#6B7280' },
];
