import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { BackHandler } from 'react-native';
import { useSession } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';
import { LandingStorage } from '@/src/core/storage';

// Only block these specific auth pages after login - NOT the home page
const BLOCKED_AUTH_PAGES = ['/login', '/register', '/resetPassword', '/verifyEmail'];

const isBlockedAuthPage = (route: string): boolean => {
  return BLOCKED_AUTH_PAGES.some(authPage => route.startsWith(authPage));
};

// Pages where back navigation should be prevented (exit app instead)
const NO_BACK_PAGES = ['/user-dashboard', '/login', '/register', '/'];

const isNoBackPage = (route: string): boolean => {
  return NO_BACK_PAGES.some(page => route === page);
};

interface NavigationInterceptorProps {
  children: React.ReactNode;
}

// Navigation interceptor component that prevents duplicate pages while preserving swipe-back gesture functionality
export const NavigationInterceptor: React.FC<NavigationInterceptorProps> = ({ children }) => {
  const router = useRouter();
  const segments = useSegments();
  const { data: session, isPending } = useSession();
  const navigationStack = useRef<string[]>([]);
  const isNavigating = useRef(false);
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completedOnboarding: boolean;
    hasCompletedAssessment: boolean;
    timestamp?: number;
    backendError?: boolean; // True when backend is unavailable (not 404)
  } | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [hasSeenLanding, setHasSeenLanding] = useState<boolean | null>(null); // null = checking, true/false = result

  // Check onboarding completion status from backend (using existing APIs)
  const checkOnboardingStatus = async (userId: string, forceRefresh: boolean = false) => {
    if (isCheckingOnboarding) return; // Prevent multiple concurrent checks

    console.log('NavigationInterceptor: Checking onboarding status for user:', userId, forceRefresh ? '(force refresh)' : '');
    setIsCheckingOnboarding(true);
    try {
      const baseUrl = getBackendBaseURL();
      console.log('NavigationInterceptor: Fetching onboarding status from:', `${baseUrl}/api/onboarding/status/${userId}`);

      // Use the same API endpoint that login page uses
      // Add cache-busting to ensure we get fresh data
      const onboardingResponse = await fetch(`${baseUrl}/api/onboarding/status/${userId}?t=${Date.now()}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      console.log('NavigationInterceptor: Onboarding response status:', onboardingResponse.status);

      if (!onboardingResponse.ok) {
        if (onboardingResponse.status === 404) {
          // User genuinely not found - they need to complete onboarding
          console.log('User not found in onboarding system, needs to complete onboarding');
          setOnboardingStatus({ completedOnboarding: false, hasCompletedAssessment: false, timestamp: Date.now() });
        } else {
          // Backend error (5xx, etc.) - don't assume user needs onboarding
          // Keep user on landing page instead of redirecting to onboarding
          console.warn(`Onboarding API error (${onboardingResponse.status}), backend unavailable`);
          setOnboardingStatus({
            completedOnboarding: false,
            hasCompletedAssessment: false,
            timestamp: Date.now(),
            backendError: true
          });
        }
        return;
      }

      const onboardingData = await onboardingResponse.json();
      console.log('NavigationInterceptor: Onboarding data received:', onboardingData);

      if (onboardingData?.completedOnboarding) {
        // If user has completed onboarding, they have made a decision about assessment
        // (either completed it or chose to skip it), so consider assessment as "completed"
        const finalStatus = {
          completedOnboarding: true,
          hasCompletedAssessment: true, // Always true if onboarding is completed
          timestamp: Date.now()
        };
        console.log('NavigationInterceptor: Final status (onboarding completed, assessment considered complete):', finalStatus);
        console.log('NavigationInterceptor: Setting onboarding status to:', finalStatus);
        setOnboardingStatus(finalStatus);
      } else {
        // If onboarding is not completed, wait a bit and retry once more
        // This handles race conditions where the completion API just finished
        console.log('NavigationInterceptor: Onboarding not completed, waiting and retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const retryResponse = await fetch(`${baseUrl}/api/onboarding/status/${userId}?t=${Date.now()}`, {
            method: 'GET',
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log('NavigationInterceptor: Retry data received:', retryData);
            
            if (retryData?.completedOnboarding) {
              const finalStatus = {
                completedOnboarding: true,
                hasCompletedAssessment: true,
                timestamp: Date.now()
              };
              console.log('NavigationInterceptor: Retry successful - onboarding completed:', finalStatus);
              setOnboardingStatus(finalStatus);
              return;
            }
          }
        } catch (retryError) {
          console.warn('NavigationInterceptor: Retry failed:', retryError);
        }
        
        const finalStatus = { 
          completedOnboarding: false, 
          hasCompletedAssessment: false,
          timestamp: Date.now()
        };
        console.log('NavigationInterceptor: Final status (onboarding not completed after retry):', finalStatus);
        console.log('NavigationInterceptor: Setting onboarding status to:', finalStatus);
        setOnboardingStatus(finalStatus);
      }
    } catch (error) {
      // Network error or backend unavailable - don't redirect to onboarding
      // Keep user on landing page so they can retry when backend is available
      console.warn('Onboarding check failed (network/backend error), staying on landing page:', error);
      setOnboardingStatus({
        completedOnboarding: false,
        hasCompletedAssessment: false,
        timestamp: Date.now(),
        backendError: true
      });
    } finally {
      setIsCheckingOnboarding(false);
    }
  };

  // Function to refresh onboarding status (can be called after completing steps)
  const refreshOnboardingStatus = () => {
    if (session?.user?.id) {
      setOnboardingStatus(null); // Clear cache
      checkOnboardingStatus(session.user.id);
    }
  };

  // Check if user has seen the landing page on app start
  useEffect(() => {
    const checkLandingSeen = async () => {
      const seen = await LandingStorage.hasSeenLanding();
      console.log('NavigationInterceptor: Has seen landing:', seen);
      setHasSeenLanding(seen);
    };
    checkLandingSeen();
  }, []);

  // Check onboarding status when user session changes
  useEffect(() => {
    if (session?.user?.id && !onboardingStatus) {
      checkOnboardingStatus(session.user.id);
    } else if (!session?.user) {
      // Reset onboarding status when user logs out
      setOnboardingStatus(null);
    }
  }, [session?.user?.id]);

  // Track navigation stack and block auth pages for authenticated users
  useEffect(() => {
    // Don't do anything while auth is loading or checking landing status
    if (isPending) {
      console.log('NavigationInterceptor: Auth pending, waiting...');
      return;
    }

    if (hasSeenLanding === null) {
      console.log('NavigationInterceptor: Checking if user has seen landing...');
      return;
    }

    const currentRoute = '/' + segments.join('/');
    const lastRoute = navigationStack.current[navigationStack.current.length - 1];

    // Handle landing page routing
    if (currentRoute === '/') {
      // Let unauthenticated users stay on landing page - they can navigate manually
      if (!session?.user) {
        console.log('NavigationInterceptor: Unauthenticated user on landing page, staying here');
        return;
      }

      // IMPORTANT: If user hasn't seen the landing page yet, let them see it first
      // This ensures first-time TestFlight users see "Ready? Start Now" before any redirects
      if (!hasSeenLanding) {
        console.log('NavigationInterceptor: User has not seen landing page yet, staying here');
        return;
      }

      // Authenticated users who have seen landing - check onboarding status
      if (isCheckingOnboarding || !onboardingStatus) {
        // Still checking onboarding status, don't redirect yet
        console.log('NavigationInterceptor: Checking onboarding status...');
        return;
      }

      // IMPORTANT: For users who haven't completed onboarding, let them stay on landing page
      // They can click "Get Started" to proceed to onboarding when ready
      // Only redirect users who HAVE completed onboarding to the dashboard
      if (!onboardingStatus.completedOnboarding) {
        // Don't redirect to onboarding - let user stay on landing page and click "Get Started"
        console.log('NavigationInterceptor: User needs onboarding, staying on landing page (user will click Get Started)');
        return;
      }

      if (!onboardingStatus.hasCompletedAssessment) {
        console.log('NavigationInterceptor: User needs assessment, redirecting to game-select');
        setTimeout(() => router.replace('/onboarding/game-select'), 100);
        return;
      }

      console.log('NavigationInterceptor: User completed onboarding, redirecting to dashboard');
      setTimeout(() => router.replace('/user-dashboard'), 100);
      return;
    }

    // Block access to protected routes if onboarding is incomplete
    const protectedRoutes = ['/user-dashboard', '/profile', '/edit-profile', '/settings', '/match-history'];
    const isProtectedRoute = protectedRoutes.some(route => currentRoute.startsWith(route));

    // Handle unauthenticated users accessing protected routes
    if (!session?.user && isProtectedRoute) {
      console.warn('NavigationInterceptor: Unauthenticated user accessing protected route, redirecting to login:', currentRoute);
      // Clear navigation stack to prevent back navigation to protected routes
      navigationStack.current = ['/login'];
      setTimeout(() => router.replace('/login'), 100);
      return;
    }

    if (session?.user && isProtectedRoute) {
      console.log('NavigationInterceptor: Checking protected route access for:', currentRoute);
      console.log('NavigationInterceptor: Current onboarding status:', onboardingStatus);
      
      // For protected routes, always refresh the onboarding status to ensure we have the latest data
      // Check if status is stale (older than 10 seconds) or if onboarding is incomplete
      const isStale = !onboardingStatus?.timestamp || (Date.now() - onboardingStatus.timestamp > 10000);
      const needsRefresh = !onboardingStatus || (!onboardingStatus.completedOnboarding && !isCheckingOnboarding) || isStale;
      
      if (needsRefresh) {
        console.log('NavigationInterceptor: Refreshing onboarding status for protected route...', 
          isStale ? '(stale data)' : '(incomplete onboarding)');
        checkOnboardingStatus(session.user.id, true); // Force refresh
        return; // Wait for the refresh to complete
      }
      
      if (!onboardingStatus.completedOnboarding) {
        // Don't redirect to onboarding if backend is unavailable - redirect to landing page instead
        if (onboardingStatus.backendError) {
          console.warn('Access to protected route blocked - backend unavailable, redirecting to landing page');
          setTimeout(() => router.replace('/'), 100);
          return;
        }
        console.warn('Access to protected route blocked - onboarding incomplete:', currentRoute);
        console.warn('NavigationInterceptor: Redirecting to personal-info');
        setTimeout(() => router.replace('/onboarding/personal-info'), 100);
        return;
      }

      if (!onboardingStatus.hasCompletedAssessment) {
        console.warn('Access to protected route blocked - assessment incomplete:', currentRoute);
        console.warn('NavigationInterceptor: Redirecting to game-select');
        setTimeout(() => router.replace('/onboarding/game-select'), 100);
        return;
      }
      
      console.log('NavigationInterceptor: Access to protected route allowed:', currentRoute);
    }

    // Block authenticated users from auth pages and redirect based on onboarding status
    // BUT allow access to auth pages when backend is unavailable (so they can re-login)
    if (session?.user && isBlockedAuthPage(currentRoute)) {
      // If backend is unavailable, allow access to auth pages - user may need to re-authenticate
      if (onboardingStatus?.backendError) {
        console.log('NavigationInterceptor: Backend unavailable, allowing access to auth page:', currentRoute);
        return;
      }

      console.warn('Navigation to auth page blocked for authenticated user:', currentRoute);

      if (!onboardingStatus) {
        // Still checking status, don't redirect yet
        return;
      }

      // Redirect based on onboarding status
      if (onboardingStatus.completedOnboarding && onboardingStatus.hasCompletedAssessment) {
        setTimeout(() => router.replace('/user-dashboard'), 100);
      } else if (onboardingStatus.completedOnboarding) {
        setTimeout(() => router.replace('/onboarding/game-select'), 100);
      } else if (onboardingStatus.backendError) {
        // Backend unavailable - redirect to landing page instead of onboarding
        setTimeout(() => router.replace('/'), 100);
      } else {
        setTimeout(() => router.replace('/onboarding/personal-info'), 100);
      }
      return;
    }
    
    if (currentRoute !== lastRoute && !isNavigating.current) {
      // Add new route to stack
      navigationStack.current.push(currentRoute);

      // Keep only last 5 routes to prevent memory issues
      if (navigationStack.current.length > 5) {
        navigationStack.current = navigationStack.current.slice(-5);
      }

      // Only refresh status when completing onboarding (going from onboarding to dashboard)
      const shouldRefreshStatus = (
        lastRoute?.includes('/onboarding/') && currentRoute === '/user-dashboard'
      );

      if (shouldRefreshStatus && session?.user?.id) {
        console.log('Refreshing onboarding status due to onboarding completion');
        refreshOnboardingStatus();
      }
    }
  }, [segments, router, session, onboardingStatus, isCheckingOnboarding, isPending, hasSeenLanding]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      const currentRoute = '/' + segments.join('/');

      // Prevent back from certain pages and exit app
      if (isNoBackPage(currentRoute)) {
        // Exit app when pressing back on these pages (landing, login, register, dashboard)
        return false; // This will minimize/exit the app
      }

      // Prevent back navigation from login page when unauthenticated
      // This prevents users from accessing protected routes after logout
      if (currentRoute === '/login' && !session?.user) {
        console.warn('Back navigation from login page blocked for unauthenticated user');
        // Exit app or stay on login page
        return true; // Prevent back navigation
      }

      // For onboarding pages, use router.back() for natural navigation
      if (currentRoute.includes('/onboarding/')) {
        router.back();
        return true;
      }

      // Check if we can go back
      if (navigationStack.current.length > 1) {
        const previousRoute = navigationStack.current[navigationStack.current.length - 2];

        // Prevent back navigation to blocked auth pages for authenticated users
        if (session?.user && isBlockedAuthPage(previousRoute)) {
          console.warn('Back navigation to auth page blocked for authenticated user');
          // Stay on current page instead of forcing navigation
          return true;
        }

        // Prevent back navigation to protected routes for unauthenticated users
        const protectedRoutes = ['/user-dashboard', '/profile', '/edit-profile', '/settings', '/match-history'];
        if (!session?.user && protectedRoutes.some(route => previousRoute.startsWith(route))) {
          console.warn('Back navigation to protected route blocked for unauthenticated user');
          // Stay on current page instead of forcing navigation
          return true;
        }

        // Use router.back() for natural navigation instead of replace
        router.back();
        // Remove current route from stack after navigation
        setTimeout(() => {
          navigationStack.current.pop();
        }, 100);

        return true;
      }

      // No navigation history, let Android handle back (usually exits app)
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [router, session, segments]);

  return <>{children}</>;
};
