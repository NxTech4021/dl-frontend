import React, { useEffect, useRef } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useSession } from '@/lib/auth-client';
import { LoadingSpinner } from '@shared/components/ui';
import { View, StyleSheet } from 'react-native';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard component handles navigation based on authentication and onboarding status
 *
 * Navigation Flow:
 * 1. Not authenticated → Login/Register screens
 * 2. Authenticated but email not verified → Email verification screen
 * 3. Authenticated, verified, but onboarding incomplete → Onboarding flow
 * 4. Authenticated, verified, onboarding complete → Main app
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { data: session, isPending: isLoading } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const hasInitialized = useRef(false);

  // Derive auth states from session
  const isAuthenticated = !!session?.user;
  const needsEmailVerification = session?.user && !session.user.emailVerified;
  const needsOnboarding = session?.user && !(session.user as any).completedOnboarding;

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to load

    const currentPath = '/' + segments.join('/');

    // Define route groups
    const publicRoutes = ['/', '/login', '/register'];
    const authRoutes = ['/email-verification'];
    const onboardingRoutes = ['/onboarding'];
    const protectedRoutes = [
      '/user-dashboard',
      '/profile',
      '/settings',
      '/edit-profile',
      '/match-history',
      '/dev'
    ];

    const isPublicRoute = publicRoutes.includes(currentPath) || currentPath.startsWith('/auth');
    const isAuthRoute = authRoutes.some(route => currentPath.startsWith(route));
    const isOnboardingRoute = onboardingRoutes.some(route => currentPath.startsWith(route));
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));

    if (__DEV__) {
      console.log('RouteGuard:', {
        currentPath,
        isAuthenticated,
        needsEmailVerification,
        needsOnboarding,
        hasInitialized: hasInitialized.current,
      });
    }

    // Not authenticated - redirect to public routes
    if (!isAuthenticated) {
      hasInitialized.current = true;
      if (!isPublicRoute) {
        router.replace('/');
      }
      return;
    }

    // Authenticated but needs email verification
    if (needsEmailVerification) {
      hasInitialized.current = true;
      if (!isAuthRoute && !isPublicRoute) {
        router.replace('/email-verification' as any);
      }
      return;
    }

    // Authenticated, verified, but needs onboarding
    if (isAuthenticated && !needsEmailVerification && needsOnboarding) {
      hasInitialized.current = true;
      if (!isOnboardingRoute) {
        if (__DEV__) {
          console.log('Redirecting to onboarding from:', currentPath);
        }
        router.replace('/onboarding/personal-info');
      }
      return;
    }

    // Authenticated, verified, and onboarding complete - allow access to protected routes
    if (isAuthenticated && !needsEmailVerification && !needsOnboarding) {
      hasInitialized.current = true;

      // If on public route (except landing), redirect to main app
      if (isPublicRoute && currentPath !== '/') {
        router.replace('/user-dashboard');
      }
      return;
    }
  }, [isLoading, isAuthenticated, needsEmailVerification, needsOnboarding, segments, router]);

  // Show loading screen while determining auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner message="Loading..." />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});