import { useSession } from '@/lib/auth-client'; // Assuming this is where you get the session
import { socketService } from '@/lib/socket-service';
import { notificationService } from '@/src/services/notificationService';
import {
    Notification,
    NotificationFilter
} from '@/src/shared/types/notification';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isConnected: boolean;
}

export function useNotifications(
  initialFilter: NotificationFilter = {}
): UseNotificationsReturn {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const filterRef = useRef(initialFilter);
  const notificationsRef = useRef<Notification[]>([]);

  // Keep ref in sync with state for socket handlers
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!userId) return;

    try {
      if (page === 1) setLoading(true);
      setError(null);

      const result = await notificationService.getUserNotifications({
        ...filterRef.current,
        page,
        limit: 20,
      }, userId);

      if (append) {
        setNotifications(prev => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }

      setHasMore(result.pagination.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [userId]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    if (!userId) return;

    try {
      await notificationService.markAsRead(id, userId);
      
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, [userId]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await notificationService.markAllAsRead(userId);
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
      throw err;
    }
  }, [userId]);

  
  const deleteNotification = useCallback(async (id: string) => {
    if (!userId) return;

    try {
      await notificationService.deleteNotification(id, userId);

      setNotifications(prev => prev.filter(n => n.id !== id));

      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error archiving notification:', err);
      throw err;
    }
  }, [notifications, userId]);

  // Refresh notifications
  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([
      fetchNotifications(1, false),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchUnreadCount, userId]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchNotifications(currentPage + 1, true);
    }
  }, [loading, hasMore, currentPage, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    fetchNotifications(1, false);
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, userId]);

  // Socket.IO real-time notification listener
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !userId) return;

    console.log('🎧 Setting up notification socket listeners for user:', userId);

    // Handle new notification
    const handleNewNotification = (notification: Notification) => {
      console.log('🔔 Received new notification:', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      // Increment unread count
      setUnreadCount(prev => prev + 1);
    };

    // Handle notification marked as read
    const handleNotificationRead = (data: { notificationId: string }) => {
      console.log('👁️ Notification marked as read:', data.notificationId);

      // Check if notification exists and is currently unread before decrementing
      const notification = notificationsRef.current.find(n => n.id === data.notificationId);
      const wasUnread = notification && !notification.read;

      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notificationId
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );

      // Only decrement if the notification was actually unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    // Handle notification deleted
    const handleNotificationDeleted = (data: { notificationId: string }) => {
      console.log('🗑️ Notification deleted:', data.notificationId);

      const notification = notificationsRef.current.find(n => n.id === data.notificationId);

      setNotifications(prev => prev.filter(n => n.id !== data.notificationId));

      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    // Register socket listeners
    socketService.on('new_notification', handleNewNotification);
    socketService.on('notification_read', handleNotificationRead);
    socketService.on('notification_deleted', handleNotificationDeleted);

    setIsConnected(true);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up notification socket listeners');
      socketService.off('new_notification', handleNewNotification);
      socketService.off('notification_read', handleNotificationRead);
      socketService.off('notification_deleted', handleNotificationDeleted);
      setIsConnected(false);
    };
  }, [userId]); // Removed notifications dependency - using notificationsRef instead

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    refreshUnreadCount: fetchUnreadCount,
    loadMore,
    hasMore,
    isConnected,
  };
}
