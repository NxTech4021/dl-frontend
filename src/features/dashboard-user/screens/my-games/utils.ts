import { format } from 'date-fns';
import { StatusInfo } from './types';

export const getStatusColor = (status: string, matchTime?: string, isDisputed?: boolean): StatusInfo => {
  const upperStatus = status.toUpperCase();

  // Handle terminal statuses first (these don't need time-based logic)
  switch (upperStatus) {
    case 'COMPLETED':
    case 'FINISHED':
      return { bg: '#E5E7EB', text: '#374151', label: 'Completed' };
    case 'CANCELLED':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' };
    case 'VOID':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Voided' };
    case 'DRAFT':
      return { bg: '#F3F4F6', text: '#6B7280', label: 'Draft' };
    case 'UNFINISHED':
      return { bg: '#FEF3C7', text: '#92400E', label: 'Unfinished' };
    case 'ONGOING':
      // Check if match is disputed - show "Disputed" instead of "Pending Confirmation"
      if (isDisputed) {
        return { bg: '#FEE2E2', text: '#991B1B', label: 'Disputed' };
      }
      // ONGOING means result submitted, awaiting confirmation
      return { bg: '#FEF3C7', text: '#92400E', label: 'Pending Confirmation' };
  }

  // For scheduled/open matches, calculate time-based status
  if (matchTime) {
    try {
      const matchDate = new Date(matchTime);
      if (!isNaN(matchDate.getTime())) {
        const now = new Date();
        const diffMs = matchDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Match is in the past or currently happening
        if (diffMs <= 0) {
          // Assume match duration is 2 hours
          const matchEndTime = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
          if (now < matchEndTime) {
            return { bg: '#D1FAE5', text: '#065F46', label: 'In Progress' };
          } else {
            return { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Result' };
          }
        }
        // Match starts within 1 hour
        else if (diffHours <= 1) {
          return { bg: '#FEF3C7', text: '#D97706', label: 'Starting Soon' };
        }
        // Match is scheduled for future
        else {
          return { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' };
        }
      }
    } catch (error) {
      console.error('Error calculating status:', error);
    }
  }

  // Fallback based on DB status
  switch (upperStatus) {
    case 'IN_PROGRESS':
      return { bg: '#D1FAE5', text: '#065F46', label: 'In Progress' };
    case 'SCHEDULED':
      return { bg: '#E0E7FF', text: '#4338CA', label: 'Scheduled' };
    default:
      return { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' };
  }
};

export const formatMatchDate = (dateString?: string): string => {
  if (!dateString) {
    return 'TBD';
  }
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error, { dateString });
    return 'TBD';
  }
};

export const formatMatchTime = (dateString?: string): string => {
  if (!dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error, { dateString });
    return '';
  }
};

export const formatTimeRange = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const startDate = new Date(dateString);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const startTime = format(startDate, 'h:mma').toLowerCase();
    const endTime = format(endDate, 'h:mma').toLowerCase();
    const dayDate = format(startDate, 'EEE d MMMM yyyy');
    return `${startTime} - ${endTime}, ${dayDate}`;
  } catch {
    return '';
  }
};

export const formatTimeRangeWithDuration = (dateString?: string, duration?: number): string => {
  if (!dateString) return '';
  try {
    const startDate = new Date(dateString);
    const durationHours = duration || 2;
    const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
    const startTime = format(startDate, 'h:mma').toLowerCase();
    const endTime = format(endDate, 'h:mma').toLowerCase();
    const dayDate = format(startDate, 'EEE d MMMM');
    return `${dayDate}, ${startTime} - ${endTime}`;
  } catch {
    return '';
  }
};

export const getMatchTime = (match: { matchDate?: string; scheduledStartTime?: string; scheduledTime?: string }): string | undefined => {
  return match.matchDate || match.scheduledStartTime || match.scheduledTime;
};
