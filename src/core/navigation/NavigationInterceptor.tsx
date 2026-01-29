import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSegments, Href } from 'expo-router';
import { BackHandler } from 'react-native';
import { useSession, signOut } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
import { AuthStorage, OnboardingStorage } from '@/src/core/storage';
import { getIsLogoutInProgress } from '@core/navigation/navigationUtils';

// Only block these specific auth pages after login - NOT the home page
const BLOCKED_AUTH_PAGES = ['/login', '/register', '/resetPassword', '/verifyEmail'];

const isBlockedAuthPage = (route: string): boolean => {
  return BLOCKED_AUTH_PAGES.some(authPage => route.startsWith(authPage));
};

// Map onboarding step to the CURRENT route where the user should be
// The step indicates the CURRENT step the user is on (not completed yet)
const STEP_TO_CURRENT_ROUTE: Record<string, string> = {
  'PERSONAL_INFO': '/onboarding/personal-info',
  'LOCATION': '/onboarding/location',
  'GAME_SELECT': '/onboarding/game-select',
  'SKILL_ASSESSMENT': '/onboarding/skill-assessment',
  'ASSESSMENT_RESULTS': '/onboarding/assessment-results',
  'PROFILE_PICTURE': '/onboarding/profile-picture',
};

// Get the current route for a user based on their onboarding step
// The step indicates where the user currently IS in the onboarding flow
// For GAME_SELECT and SKILL_ASSESSMENT steps, we need to determine which sport to resume with
const getCurrentOnboardingRoute = (
  step: string | null | undefined,
  selectedSports?: string[],
  completedSports?: string[]
): Href => {
  if (!step) return '/onboarding/personal-info';

  // Special handling for steps that involve sport selection
  // SKILL_ASSESSMENT: User is currently doing questionnaires - find which sport to resume
  if (step === 'SKILL_ASSESSMENT' && selectedSports && selectedSports.length > 0) {
    // Find the first sport that hasn't been completed yet
    const nextSportIndex = selectedSports.findIndex(
      sport => !completedSports?.includes(sport)
    );

    if (nextSportIndex >= 0) {
      // Found an incomplete sport - go to its questionnaire introduction
      const nextSport = selectedSports[nextSportIndex];
      console.log(`NavigationInterceptor: Resuming at sport ${nextSport} (index ${nextSportIndex})`);
      return `/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${nextSportIndex}` as Href;
    } else {
      // All sports completed - this shouldn't happen if step is SKILL_ASSESSMENT
      // but fallback to assessment results for the last sport
      const lastSport = selectedSports[selectedSports.length - 1];
      const lastIndex = selectedSports.length - 1;
      console.log(`NavigationInterceptor: All sports completed, going to assessment results`);
      return `/onboarding/assessment-results?sport=${lastSport}&sportIndex=${lastIndex}` as Href;
    }
  }

  // For ASSESSMENT_RESULTS step, find which sport just completed and show its results
  // OR redirect to next incomplete sport's questionnaire
  if (step === 'ASSESSMENT_RESULTS' && selectedSports && selectedSports.length > 0) {
    // Find the first sport that hasn't been completed yet
    const nextIncompleteIndex = selectedSports.findIndex(
      sport => !completedSports?.includes(sport)
    );

    if (nextIncompleteIndex >= 0) {
      // There are still incomplete sports - redirect to the next one's questionnaire
      const nextSport = selectedSports[nextIncompleteIndex];
      console.log(`NavigationInterceptor: ASSESSMENT_RESULTS - next incomplete sport is ${nextSport} (index ${nextIncompleteIndex})`);
      return `/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${nextIncompleteIndex}` as Href;
    } else {
      // All sports completed - show results for the last completed sport
      const lastCompletedSport = completedSports && completedSports.length > 0
        ? completedSports[completedSports.length - 1]
        : selectedSports[selectedSports.length - 1];
      const lastIndex = selectedSports.indexOf(lastCompletedSport);
      console.log(`NavigationInterceptor: ASSESSMENT_RESULTS - all sports done, showing results for ${lastCompletedSport}`);
      return `/onboarding/assessment-results?sport=${lastCompletedSport}&sportIndex=${lastIndex}` as Href;
    }
  }

  // Use the step-to-route mapping for the current step
  return (STEP_TO_CURRENT_ROUTE[step] || '/onboarding/personal-info') as Href;
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
    onboardingStep?: string | null; // Tracks which step the user completed
    selectedSports?: string[]; // Sports the user selected
    completedSports?: string[]; // Sports with completed questionnaires
    timestamp?: number;
    backendError?: boolean; // True when backend is unavailable (not 404)
  } | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [hasEverLoggedIn, setHasEverLoggedIn] = useState<boolean | null>(null); // null = checking, true/false = result

  // Check onboarding completion status from backend (using existing APIs)
  const checkOnboardingStatus = async (userId: string, forceRefresh: boolean = false) => {
    if (isCheckingOnboarding) return; // Prevent multiple concurrent checks

    console.log('NavigationInterceptor: Checking onboarding status for user:', userId, forceRefresh ? '(force refresh)' : '');
    setIsCheckingOnboarding(true);
    try {
      console.log('NavigationInterceptor: Fetching onboarding status from API');

      // Use axiosInstance to get onboarding status with authentication handled automatically
      // Add cache-busting to ensure we get fresh data
      const onboardingResponse = await axiosInstance.get(`/api/onboarding/status/${userId}?t=${Date.now()}`);

      console.log('NavigationInterceptor: Onboarding response status:', onboardingResponse.status);

      // Success response (2xx) - process the data
      const onboardingData = onboardingResponse.data;
      console.log('NavigationInterceptor: Onboarding data received:', onboardingData);

      if (onboardingData?.completedOnboarding) {
        // If user has completed onboarding, they have made a decision about assessment
        // (either completed it or chose to skip it), so consider assessment as "completed"
        const finalStatus = {
          completedOnboarding: true,
          hasCompletedAssessment: true, // Always true if onboarding is completed
          onboardingStep: onboardingData.onboardingStep || 'PROFILE_PICTURE',
          selectedSports: onboardingData.selectedSports || [],
          completedSports: onboardingData.completedSports || [],
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
          // Retry with axiosInstance (it handles authentication automatically)
          console.log('NavigationInterceptor: Retrying with axiosInstance...');

          const retryResponse = await axiosInstance.get(`/api/onboarding/status/${userId}?t=${Date.now()}`);

          if (retryResponse.status === 200) {
            const retryData = retryResponse.data;
            console.log('NavigationInterceptor: Retry data received:', retryData);

            if (retryData?.completedOnboarding) {
              const finalStatus = {
                completedOnboarding: true,
                hasCompletedAssessment: true,
                onboardingStep: retryData.onboardingStep || 'PROFILE_PICTURE',
                selectedSports: retryData.selectedSports || [],
                completedSports: retryData.completedSports || [],
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

        // Save the step and sport info from original response for resume functionality
        const finalStatus = {
          completedOnboarding: false,
          hasCompletedAssessment: false,
          onboardingStep: onboardingData.onboardingStep || null,
          selectedSports: onboardingData.selectedSports || [],
          completedSports: onboardingData.completedSports || [],
          timestamp: Date.now()
        };
        console.log('NavigationInterceptor: Final status (onboarding not completed after retry):', finalStatus);
        console.log('NavigationInterceptor: Setting onboarding status to:', finalStatus);
        setOnboardingStatus(finalStatus);
      }
    } catch (error: any) {
      // Axios throws errors for non-2xx responses, so we need to check error.response.status
      const status = error?.response?.status;
      console.warn('NavigationInterceptor: Onboarding check error:', status || error.message);

      if (status === 404) {
        // User not found in backend - their account was likely deleted
        // Sign them out and clear onboarding data, but KEEP hasEverLoggedIn
        // so they go to login screen instead of landing page
        console.log('User not found in backend (404) - account may have been deleted, signing out');
        try {
          // Clear onboarding data but NOT auth storage (hasEverLoggedIn persists)
          await Promise.all([
            OnboardingStorage.clearData(),
            OnboardingStorage.clearProgress(),
          ]);
          // Sign out the user
          await signOut();
          console.log('User signed out and onboarding data cleared - will redirect to login');
        } catch (signOutError) {
          console.error('Error during sign out cleanup:', signOutError);
        }
        // Set status to trigger redirect - the signOut will cause session to become null
        // which will reset onboardingStatus via the useEffect
        setOnboardingStatus(null);
        return;
      }

      if (status === 401) {
        // Session expired or invalid - the user needs to re-authenticate
        // Don't sign out here - let the session state handle it naturally
        // Just log and set backendError so user can retry
        console.warn('Session expired or invalid (401) - user may need to re-login');
        // DON'T call signOut() here - it causes the logout loop!
        // The session will be refreshed naturally by better-auth if needed
        setOnboardingStatus({
          completedOnboarding: false,
          hasCompletedAssessment: false,
          timestamp: Date.now(),
          backendError: true
        });
        return;
      }

      // Network error or backend unavailable (5xx, timeout, etc.)
      // Don't redirect to onboarding, keep user where they are
      console.warn('Backend unavailable or network error, not redirecting');
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

  // Check if user has ever logged in on app start
  useEffect(() => {
    const checkEverLoggedIn = async () => {
      const loggedIn = await AuthStorage.hasEverLoggedIn();
      console.log('NavigationInterceptor: Has ever logged in:', loggedIn);
      setHasEverLoggedIn(loggedIn);
    };
    checkEverLoggedIn();
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

    if (hasEverLoggedIn === null) {
      console.log('NavigationInterceptor: Checking if user has ever logged in...');
      return;
    }

    const currentRoute = '/' + segments.join('/');
    const lastRoute = navigationStack.current[navigationStack.current.length - 1];

    // Handle landing page routing
    if (currentRoute === '/') {
      // Check if user is NOT authenticated
      if (!session?.user) {
        // User has logged in before → go to Login screen (returning user)
        if (hasEverLoggedIn) {
          console.log('NavigationInterceptor: Returning user (logged out), redirecting to login');
          setTimeout(() => router.replace('/login'), 100);
          return;
        }
        // First-time user → stay on landing page
        console.log('NavigationInterceptor: First-time user on landing page, staying here');
        return;
      }

      // Authenticated users - check onboarding status
      if (isCheckingOnboarding || !onboardingStatus) {
        // Still checking onboarding status, don't redirect yet
        console.log('NavigationInterceptor: Checking onboarding status...');
        return;
      }

      // Auto-redirect users to their correct onboarding step or dashboard
      if (!onboardingStatus.completedOnboarding) {
        // Don't redirect to onboarding if backend is unavailable - stay on landing page
        if (onboardingStatus.backendError) {
          console.warn('NavigationInterceptor: Backend unavailable, staying on landing page');
          return; // Stay on landing page - user can retry when backend is available
        }

        // User hasn't completed onboarding - redirect to the correct step based on their progress
        const nextRoute = getCurrentOnboardingRoute(
          onboardingStatus.onboardingStep,
          onboardingStatus.selectedSports,
          onboardingStatus.completedSports
        );
        console.log('NavigationInterceptor: User needs to continue onboarding, auto-redirecting to:', nextRoute);
        console.log('NavigationInterceptor: Current onboarding step:', onboardingStatus.onboardingStep);
        console.log('NavigationInterceptor: Selected sports:', onboardingStatus.selectedSports);
        console.log('NavigationInterceptor: Completed sports:', onboardingStatus.completedSports);
        setTimeout(() => router.replace(nextRoute), 100);
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

    // Handle unauthenticated users OR logout-in-progress accessing protected routes
    // Check logout flag first since useSession() may lag behind signOut()
    if (isProtectedRoute && (getIsLogoutInProgress() || !session?.user)) {
      console.warn('NavigationInterceptor: Unauthenticated/logging-out user accessing protected route, redirecting to login:', currentRoute);
      navigationStack.current = ['/login'];
      router.replace('/login');
      return;
    }

    if (session?.user && isProtectedRoute) {
      console.log('NavigationInterceptor: Checking protected route access for:', currentRoute);
      console.log('NavigationInterceptor: Current onboarding status:', onboardingStatus);
      
      // For protected routes, refresh the onboarding status if stale
      // Increased timeout from 10s to 60s to reduce API calls and prevent potential logout loops
      // from hitting rate limits or backend issues during rapid navigation
      const STALE_THRESHOLD_MS = 60 * 1000; // 60 seconds
      const isStale = !onboardingStatus?.timestamp || (Date.now() - onboardingStatus.timestamp > STALE_THRESHOLD_MS);
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
        // Use step-based routing for resume functionality
        const nextRoute = getCurrentOnboardingRoute(
          onboardingStatus.onboardingStep,
          onboardingStatus.selectedSports,
          onboardingStatus.completedSports
        );
        console.warn('Access to protected route blocked - onboarding incomplete:', currentRoute);
        console.warn('NavigationInterceptor: Current onboarding step:', onboardingStatus.onboardingStep);
        console.warn('NavigationInterceptor: Selected sports:', onboardingStatus.selectedSports);
        console.warn('NavigationInterceptor: Completed sports:', onboardingStatus.completedSports);
        console.warn('NavigationInterceptor: Redirecting to:', nextRoute);
        setTimeout(() => router.replace(nextRoute), 100);
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
  }, [segments, router, session, onboardingStatus, isCheckingOnboarding, isPending, hasEverLoggedIn]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      const currentRoute = '/' + segments.join('/');

      // Prevent back from certain pages and exit app
      // /login is in NO_BACK_PAGES - returning false lets the system handle back:
      //   After logout: stack is [login] only → exits app (dismissAll cleared it)
      //   From landing: stack is [index, login] → goes back to landing naturally
      if (isNoBackPage(currentRoute)) {
        return false; // Let system handle (exits app or goes to previous public screen)
      }

      // Block ALL back navigation while logout is in progress
      // This prevents the brief "glimpse" of protected routes during session teardown
      if (getIsLogoutInProgress()) {
        console.warn('Back navigation blocked - logout in progress');
        return true;
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

      // No navigation history - handle gracefully instead of exiting app
      // This can happen when app is restored from background with lost state
      // For authenticated users on non-exit pages, navigate to dashboard
      if (session?.user && !isNoBackPage(currentRoute)) {
        console.log('NavigationInterceptor: No navigation history, redirecting to dashboard');
        router.replace('/user-dashboard');
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