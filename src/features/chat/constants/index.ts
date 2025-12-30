/**
 * Chat module constants
 * Centralized configuration for chat-related values
 */

// Screen breakpoints
export const BREAKPOINTS = {
  SMALL: 375,
  TABLET: 768,
} as const;

// FlatList optimization settings
export const FLATLIST_CONFIG = {
  INITIAL_NUM_TO_RENDER: 15,
  MAX_TO_RENDER_PER_BATCH: 10,
  WINDOW_SIZE: 10,
  UPDATE_CELL_BATCH_SIZE: 10,
  THREAD_ITEM_HEIGHT: 80, // Approximate height for getItemLayout
  MESSAGE_ITEM_HEIGHT: 60, // Approximate height for messages
} as const;

// Pagination
export const PAGINATION = {
  MESSAGES_PER_PAGE: 50,
  THREADS_PER_PAGE: 20,
} as const;

// Socket events
export const SOCKET_EVENTS = {
  // Outgoing
  JOIN_THREAD: 'join_thread',
  LEAVE_THREAD: 'leave_thread',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MARK_READ: 'mark_read',

  // Incoming
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_READ: 'message_read',
  THREAD_CREATED: 'thread_created',
  UNREAD_COUNT_UPDATE: 'unread_count_update',
  THREAD_MARKED_READ: 'thread_marked_read',
  USER_TYPING: 'user_typing',
  MATCH_UPDATED: 'match_updated',
  MATCH_PARTICIPANT_JOINED: 'match_participant_joined',
} as const;

// Sport-specific colors for chat
export const CHAT_SPORT_COLORS = {
  PICKLEBALL: {
    primary: '#A04DFE',
    badge: '#A855F7',
    message: '#DCC6FD',
    label: 'Pickleball',
  },
  TENNIS: {
    primary: '#65B741',
    badge: '#22C55E',
    message: '#BBF7D0',
    label: 'Tennis',
  },
  PADEL: {
    primary: '#3B82F6',
    badge: '#60A5FA',
    message: '#BFDBFE',
    label: 'Padel',
  },
  DEFAULT: {
    primary: '#A04DFE',
    badge: '#A855F7',
    message: '#DCC6FD',
    label: null,
  },
} as const;

// Typing indicator timeout
export const TYPING_TIMEOUT_MS = 1000;

// Swipe threshold for reply
export const SWIPE_THRESHOLD = 60;

// Message limits
export const MESSAGE_MAX_LENGTH = 1000;

// Animation durations
export const ANIMATIONS = {
  SPRING_CONFIG: { damping: 20, stiffness: 300 },
  FADE_DURATION: 200,
  SCROLL_DELAY: 100,
} as const;

// UI dimensions
export const UI_DIMENSIONS = {
  AVATAR_SIZE: {
    SMALL: 32,
    MEDIUM: 40,
    LARGE: 48,
  },
  REPLY_ICON_SIZE: 24,
  SEND_BUTTON_SIZE: 40,
  NAV_BAR_HEIGHT: 83,
} as const;

// Helper function to get sport colors
export const getSportChatColors = (sportType: string | null | undefined) => {
  switch (sportType?.toUpperCase()) {
    case 'PICKLEBALL':
      return CHAT_SPORT_COLORS.PICKLEBALL;
    case 'TENNIS':
      return CHAT_SPORT_COLORS.TENNIS;
    case 'PADEL':
      return CHAT_SPORT_COLORS.PADEL;
    default:
      return CHAT_SPORT_COLORS.DEFAULT;
  }
};

// Type exports
export type SportType = 'PICKLEBALL' | 'TENNIS' | 'PADEL';
export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
