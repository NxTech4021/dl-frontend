import { useEffect, useState } from 'react';
import { chatLogger } from '@/utils/logger';
import { useChatStore } from '../stores/ChatStore';

/**
 * Custom hook to get real-time total unread message count
 * Updates whenever threads change
 */
export const useUnreadCount = (): number => {
  const { threads, getTotalUnreadCount } = useChatStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const count = getTotalUnreadCount();
    setUnreadCount(count);
    chatLogger.debug('Updated total unread count:', count);
  }, [threads, getTotalUnreadCount]);

  return unreadCount;
};
