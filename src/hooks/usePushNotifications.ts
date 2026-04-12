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
  achievementId?: string;
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
  cleanup: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { data: session } = useSession();
  const router = useRouter();

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const hasAttemptedRegistration = useRef(false); // Track if we've already tried to register

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);
  const lastHandledResponseId = useRef<string | null>(null); // Track last handled notification to prevent duplicate handling

  // Handle notification tap - navigate based on notification data
  // Using router.navigate() for push notifications so they go directly to the target screen
  // without stacking intermediate screens. Back navigation will go to the logical parent.
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse, isFromLastResponse: boolean = false) => {
      const notificationId = response.notification.request.identifier;

      // Skip if we've already handled this notification (prevents duplicate navigation on app restore)
      if (lastHandledResponseId.current === notificationId) {
        console.log('Notification already handled, skipping:', notificationId);
        return;
      }

      // Mark as handled
      lastHandledResponseId.current = notificationId;

      const data = response.notification.request.content.data as NotificationData;
      console.log('Notification tapped:', data, isFromLastResponse ? '(from last response)' : '');

      // Navigate based on notification metadata (priority order)
      // Priority 1: Match notifications → go to match-details
      if (data?.matchId) {
        const matchParams: Record<string, string> = { matchId: data.matchId };
        if (data.isFriendly !== undefined) matchParams.isFriendly = String(data.isFriendly);
        if (data.matchType) matchParams.matchType = String(data.matchType);
        router.navigate({
          pathname: '/match/match-details',
          params: matchParams,
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

      // Priority 5: Achievement notifications → go to achievements
      if (data?.achievementId) {
        router.navigate('/achievements' as any);
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
      console.log('❌ Cannot register for push notifications: No user session');
      return;
    }

    // Prevent duplicate registration attempts
    if (hasAttemptedRegistration.current) {
      console.log('⏭️ Push notification registration already attempted, skipping');
      return;
    }

    console.log('🔔 Registering push notifications for user:', session.user.id);
    hasAttemptedRegistration.current = true; // Mark as attempted BEFORE async operation
    setIsLoading(true);
    setError(null);

    try {
      const token = await pushNotificationService.initialize();

      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);
        console.log('✅ Push notifications registered successfully:', token);
      } else {
        console.warn('⚠️ Failed to get push token (permission denied or unavailable)');
        setError('Failed to get push token');
        // Don't retry - user denied permission or device doesn't support push
      }
    } catch (err) {
      console.error('❌ Error registering for push notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Don't retry on error - will retry on next app launch
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  // Cleanup push notifications
  const cleanup = useCallback(async () => {
    console.log('🧹 usePushNotifications: Starting cleanup...');
    try {
      await pushNotificationService.cleanup();
      setExpoPushToken(null);
      setIsRegistered(false);
      setError(null);
      hasAttemptedRegistration.current = false; // Reset so next user can register
      lastHandledResponseId.current = null; // Reset so new notifications can be handled
      console.log('✅ usePushNotifications: Cleanup completed');
    } catch (err) {
      console.error('❌ usePushNotifications: Error during cleanup:', err);
      // Still clear local state even on error
      setExpoPushToken(null);
      setIsRegistered(false);
      hasAttemptedRegistration.current = false;
      lastHandledResponseId.current = null;
    }
  }, []);

  // Initialize push notifications when user is authenticated
  // This effect runs when the user logs in or when the component mounts with an authenticated session
  useEffect(() => {
    console.log('🔍 Push notification effect triggered:', {
      hasUserId: !!session?.user?.id,
      isRegistered,
      isLoading
    });

    if (session?.user?.id && !isRegistered && !isLoading) {
      console.log('✨ Triggering push notification registration...');
      registerForPushNotifications();
    }
  }, [session?.user?.id, isRegistered, isLoading, registerForPushNotifications]);

  // Check for notification that launched the app — runs exactly ONCE on mount.
  // Must NOT depend on handleNotificationResponse because that callback recreates
  // every time the router changes (i.e., on every navigation), which would cause
  // this check to re-fire and navigate back to the original notification destination
  // (e.g. a chat thread) even when the user is navigating somewhere else (e.g. settings).
  const hasCheckedLastResponse = useRef(false);
  useEffect(() => {
    if (hasCheckedLastResponse.current) return;
    hasCheckedLastResponse.current = true;

    pushNotificationService.getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('App launched from notification:', response);
        handleNotificationResponse(response, true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — must only run once at mount

  // Set up notification listeners — re-registers when handleNotificationResponse
  // updates so the latest router reference is always used for tap navigation.
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

    // Cleanup listeners on unmount / when effect re-runs
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
    cleanup,
  };
}
