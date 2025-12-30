import React, { useState, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useSession } from '@/lib/auth-client';
import { LoadingScreen, SplashScreen } from '@/src/features/auth';
import { Animated } from 'react-native';
import { LandingStorage } from '@/src/core/storage';
import { getBackendBaseURL } from '@/src/config/network';

// Map onboarding step to the NEXT route the user should go to
const STEP_TO_NEXT_ROUTE: Record<string, string> = {
  'PERSONAL_INFO': '/onboarding/location',
  'LOCATION': '/onboarding/game-select',
  'GAME_SELECT': '/onboarding/skill-assessment',
  'SKILL_ASSESSMENT': '/onboarding/assessment-results',
  'ASSESSMENT_RESULTS': '/onboarding/profile-picture',
  'PROFILE_PICTURE': '/user-dashboard',
};

// Get the next route for a user based on their onboarding step
// For GAME_SELECT and SKILL_ASSESSMENT steps, we need to determine which sport to resume with
const getNextOnboardingRoute = (
  step: string | null | undefined,
  selectedSports?: string[],
  completedSports?: string[]
): Href => {
  if (!step) return '/onboarding/personal-info';

  // Special handling for steps that involve sport selection
  // GAME_SELECT: User has selected sports, needs to start questionnaires
  // SKILL_ASSESSMENT: User has completed at least one questionnaire, may need to do more
  if ((step === 'GAME_SELECT' || step === 'SKILL_ASSESSMENT') && selectedSports && selectedSports.length > 0) {
    // Find the first sport that hasn't been completed yet
    const nextSportIndex = selectedSports.findIndex(
      sport => !completedSports?.includes(sport)
    );

    if (nextSportIndex >= 0) {
      // Found an incomplete sport - go to its questionnaire introduction
      const nextSport = selectedSports[nextSportIndex];
      console.log(`HomeRoute: Resuming at sport ${nextSport} (index ${nextSportIndex})`);
      return `/onboarding/skill-assessment?sport=${nextSport}&sportIndex=${nextSportIndex}`;
    } else {
      // All sports completed - move to assessment results for the last sport
      const lastSport = selectedSports[selectedSports.length - 1];
      const lastIndex = selectedSports.length - 1;
      console.log(`HomeRoute: All sports completed, going to assessment results`);
      return `/onboarding/assessment-results?sport=${lastSport}&sportIndex=${lastIndex}`;
    }
  }

  return (STEP_TO_NEXT_ROUTE[step] || '/onboarding/personal-info') as Href;
};

export default function HomeRoute() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleGetStarted = async () => {
    // Mark that user has seen the landing page before navigating
    await LandingStorage.markLandingSeen();

    // If user is already authenticated, check their onboarding step to resume
    if (session?.user) {
      try {
        const baseUrl = getBackendBaseURL();
        const response = await fetch(`${baseUrl}/api/onboarding/status/${session.user.id}`, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('HomeRoute: Onboarding status:', data);

          if (data.completedOnboarding) {
            // Already completed, go to dashboard
            router.push('/user-dashboard');
            return;
          }

          if (data.onboardingStep) {
            // Resume from last completed step, using sport info for GAME_SELECT step
            const nextRoute = getNextOnboardingRoute(
              data.onboardingStep,
              data.selectedSports,
              data.completedSports
            );
            console.log('HomeRoute: Resuming onboarding at:', nextRoute);
            console.log('HomeRoute: Selected sports:', data.selectedSports);
            console.log('HomeRoute: Completed sports:', data.completedSports);
            router.push(nextRoute);
            return;
          }

          // No step saved - start from beginning (legitimate new user)
          router.push('/onboarding/personal-info');
          return;
        }

        // Handle non-OK responses
        if (response.status === 404) {
          // User account deleted - go to register
          console.warn('HomeRoute: User not found (404), redirecting to register');
          router.push('/register');
          return;
        }

        // Backend error (5xx, etc.) - stay on landing page, let user retry
        console.warn(`HomeRoute: Backend error (${response.status}), staying on landing page`);
        // Don't navigate - user will see the landing page and can retry
        return;
      } catch (error) {
        // Network error - stay on landing page, let user retry
        console.error('HomeRoute: Network error fetching onboarding status:', error);
        // Don't navigate - user will see the landing page and can retry
        return;
      }
    } else {
      router.push('/register');
    }
  };

  const handleLogin = async () => {
    // Mark that user has seen the landing page before navigating
    await LandingStorage.markLandingSeen();
    router.push('/login?from=landing');
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Let NavigationInterceptor handle auth redirects - keep this route simple
  console.log('HomeRoute: Showing loading screen, auth status:', { isPending, hasUser: !!session?.user });

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <LoadingScreen
        onGetStarted={handleGetStarted}
        onLogin={handleLogin}
      />
    </Animated.View>
  );
}