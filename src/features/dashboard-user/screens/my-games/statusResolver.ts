import { Match, StatusInfo } from './types';
import { isUnfilledMatch } from './utils';

export interface ResolvedStatus {
  primary: StatusInfo;      // Main badge color and label
  secondary?: string;       // Sub-status text (e.g., "Awaiting responses")
  actionHint?: string;      // What user should do next
  icon?: string;            // Optional icon name (Ionicons)
}

interface StatusContext {
  match: Match;
  matchTime?: string;
  currentUserId?: string;
}

/**
 * Resolves match status into a comprehensive display object
 * Handles both database status and derived sub-states
 */
export function resolveMatchStatus(context: StatusContext): ResolvedStatus {
  const { match, matchTime } = context;
  const upperStatus = match.status.toUpperCase();

  // Unfilled: match passed with only the host's side present — treat before terminal checks
  if (isUnfilledMatch(match)) {
    return {
      primary: { bg: '#F3F4F6', text: '#6B7280', label: 'Unfilled' },
      secondary: 'No one joined',
      icon: 'person-remove-outline',
    };
  }

  // Handle terminal statuses first
  switch (upperStatus) {
    case 'COMPLETED':
    case 'FINISHED':
      return {
        primary: { bg: '#E5E7EB', text: '#374151', label: 'Completed' },
        icon: 'checkmark-circle',
      };

    case 'CANCELLED':
      return {
        primary: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
        icon: 'close-circle',
      };

    case 'VOID':
      return {
        primary: { bg: '#FEE2E2', text: '#991B1B', label: 'Voided' },
        icon: 'ban',
      };

    case 'UNFINISHED':
      return {
        primary: { bg: '#FEF3C7', text: '#92400E', label: 'Unfinished' },
        secondary: 'Match did not complete',
        icon: 'alert-circle',
      };

    case 'ONGOING':
      // Check if match is disputed
      if (match.isDisputed) {
        return {
          primary: { bg: '#FEE2E2', text: '#991B1B', label: 'Disputed' },
          secondary: 'Result under review',
          actionHint: 'Wait for admin resolution',
          icon: 'warning',
        };
      }
      // ONGOING means result submitted, awaiting confirmation
      return {
        primary: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Confirmation' },
        secondary: 'Result submitted',
        actionHint: 'Confirm or dispute result',
        icon: 'time',
      };

    case 'WALKOVER_PENDING':
      return {
        primary: { bg: '#FEF3C7', text: '#92400E', label: 'Walkover Pending' },
        secondary: 'Awaiting dispute window',
        actionHint: 'Opponent may dispute within 24h',
        icon: 'flag',
      };

    case 'DRAFT':
      return resolveDraftStatus(match);

    case 'SCHEDULED':
      return resolveScheduledStatus(match, matchTime);
  }

  // For OPEN or unknown status with time info, calculate time-based status
  if (matchTime) {
    return resolveTimeBasedStatus(match, matchTime);
  }

  // Fallback for IN_PROGRESS from DB
  if (upperStatus === 'IN_PROGRESS') {
    return {
      primary: { bg: '#D1FAE5', text: '#065F46', label: 'In Progress' },
      actionHint: 'Match is being played',
      icon: 'play-circle',
    };
  }

  // Default fallback
  return {
    primary: { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
    secondary: 'Looking for players',
    icon: 'search',
  };
}

/**
 * Resolves DRAFT status with invitation sub-states
 */
function resolveDraftStatus(match: Match): ResolvedStatus {
  const invitationStatus = match.invitationStatus?.toUpperCase();

  switch (invitationStatus) {
    case 'PENDING':
      return {
        primary: { bg: '#FEF3C7', text: '#D97706', label: 'Draft' },
        secondary: 'Awaiting responses',
        actionHint: 'Waiting for players to respond',
        icon: 'hourglass',
      };

    case 'DECLINED':
      return {
        primary: { bg: '#FEE2E2', text: '#991B1B', label: 'Draft' },
        secondary: 'Invitation declined',
        actionHint: 'Invite another player',
        icon: 'close-circle',
      };

    case 'EXPIRED':
      return {
        primary: { bg: '#F3F4F6', text: '#6B7280', label: 'Draft' },
        secondary: 'Invitation expired',
        actionHint: 'Send new invitation',
        icon: 'time-outline',
      };

    case 'ACCEPTED':
      // All accepted but still DRAFT - might be waiting for scheduling
      return {
        primary: { bg: '#D1FAE5', text: '#065F46', label: 'Draft' },
        secondary: 'Players confirmed',
        actionHint: 'Schedule the match',
        icon: 'checkmark-circle',
      };

    default:
      // No invitation status - generic draft
      return {
        primary: { bg: '#F3F4F6', text: '#6B7280', label: 'Draft' },
        secondary: 'Setting up match',
        icon: 'create-outline',
      };
  }
}

/**
 * Resolves SCHEDULED status with time-based sub-states
 */
function resolveScheduledStatus(match: Match, matchTime?: string): ResolvedStatus {
  if (!matchTime) {
    return {
      primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
      icon: 'calendar',
    };
  }

  try {
    const matchDate = new Date(matchTime);
    if (isNaN(matchDate.getTime())) {
      return {
        primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
        icon: 'calendar',
      };
    }

    const now = new Date();
    const diffMs = matchDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Match starts within 1 hour
    if (diffHours > 0 && diffHours <= 1) {
      return {
        primary: { bg: '#FEF3C7', text: '#D97706', label: 'Starting Soon' },
        secondary: `Starts in ${Math.round(diffHours * 60)} minutes`,
        icon: 'alarm',
      };
    }

    // Match is today but more than 1 hour away
    if (diffHours > 1 && diffHours <= 24) {
      return {
        primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
        secondary: 'Today',
        icon: 'calendar',
      };
    }

    // Future match
    return {
      primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
      icon: 'calendar',
    };
  } catch {
    return {
      primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
      icon: 'calendar',
    };
  }
}

/**
 * Resolves status based on match time for OPEN matches
 */
function resolveTimeBasedStatus(match: Match, matchTime: string): ResolvedStatus {
  try {
    const matchDate = new Date(matchTime);
    if (isNaN(matchDate.getTime())) {
      return {
        primary: { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
        icon: 'search',
      };
    }

    const now = new Date();
    const diffMs = matchDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Match is in the past or currently happening
    if (diffMs <= 0) {
      // Assume match duration is 2 hours
      const matchEndTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
      if (now < matchEndTime) {
        return {
          primary: { bg: '#D1FAE5', text: '#065F46', label: 'In Progress' },
          actionHint: 'Match is being played',
          icon: 'play-circle',
        };
      } else {
        return {
          primary: { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Result' },
          secondary: 'Match ended',
          actionHint: 'Submit match result',
          icon: 'create',
        };
      }
    }

    // Match starts within 1 hour
    if (diffHours <= 1) {
      return {
        primary: { bg: '#FEF3C7', text: '#D97706', label: 'Starting Soon' },
        secondary: `Starts in ${Math.round(diffHours * 60)} minutes`,
        icon: 'alarm',
      };
    }

    // Future scheduled match
    return {
      primary: { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' },
      icon: 'calendar',
    };
  } catch {
    return {
      primary: { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
      icon: 'search',
    };
  }
}

// Note: getMatchTime is exported from utils.ts to avoid duplication
