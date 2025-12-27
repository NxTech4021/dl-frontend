import { useSession } from '@/lib/auth-client';
import { pushNotificationService } from '@/src/services/pushNotificationService';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

// Type-safe notification data payload
interface NotificationData {
  matchId?: string;
  threadId?: string;
  seasonId?: string;
  divisionId?: string;
  type?: string;
  category?: string;
  [key: string]: unknown;
}

interface UsePushNotificationsReturn {
  expoPushToken: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: string | null;
  lastNotification: Notifications.Notification | null;
  registerForPushNotifications: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { data: session } = useSession();
  const router = useRouter();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  // Handle notification tap - navigate based on notification data
  // Using router.navigate() for push notifications so they go directly to the target screen
  // without stacking intermediate screens. Back navigation will go to the logical parent.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data);

      // Navigate based on notification metadata (priority order)
      // Priority 1: Match notifications → go to match-details
      if (data?.matchId) {
        router.navigate({
          pathname: '/match/match-details',
          params: { matchId: data.matchId }
        } as any);
        return;
      }

      // Priority 2: Chat/Thread notifications → go directly to thread
      if (data?.threadId) {
        router.navigate(`/chat/${data.threadId}` as any);
        return;
      }

      // Priority 3: Season notifications → go to season details
      if (data?.seasonId) {
        router.navigate({
          pathname: '/user-dashboard/season-details',
          params: { seasonId: data.seasonId }
        } as any);
        return;
      }

      // Priority 4: Division notifications → go to division standings
      if (data?.divisionId) {
        router.navigate({
          pathname: '/match/divisionstandings',
          params: { divisionId: data.divisionId }
        } as any);
        return;
      }

      // Default: go to notifications page
      router.navigate('/notifications' as any);
    },
    [router]
  );

  // Register for push notifications
  const registerForPushNotifications = useCallback(async () => {
    if (!session?.user?.id) {
      console.log('Cannot register for push notifications: No user session');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await pushNotificationService.initialize();

      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);
        console.log('Push notifications registered successfully');
      } else {
        setError('Failed to get push token');
      }
    } catch (err) {
      console.error('Error registering for push notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (session?.user?.id && !isRegistered && !isLoading) {
      registerForPushNotifications();
    }
  }, [session?.user?.id, isRegistered, isLoading, registerForPushNotifications]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current = pushNotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        setLastNotification(notification);
      }
    );

    // Listen for notification taps
    responseListener.current = pushNotificationService.addNotificationResponseListener(
      handleNotificationResponse
    );

    // Check for notification that launched the app
    pushNotificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('App launched from notification:', response);
        handleNotificationResponse(response);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse]);

  return {
    expoPushToken,
    isRegistered,
    isLoading,
    error,
    lastNotification,
    registerForPushNotifications,
  };
}
