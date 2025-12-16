import React, { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSession } from '@/lib/auth-client';
import { LoadingScreen, SplashScreen } from '@/src/features/auth';
import { Animated } from 'react-native';
import { LandingStorage } from '@/src/core/storage';

export default function HomeRoute() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleGetStarted = async () => {
    // Mark that user has seen the landing page before navigating
    await LandingStorage.markLandingSeen();

    // If user is already authenticated, go to onboarding instead of register
    if (session?.user) {
      router.push('/onboarding/personal-info');
    } else {
      router.push('/register');
    }
  };

  const handleLogin = async () => {
    // Mark that user has seen the landing page before navigating
    await LandingStorage.markLandingSeen();
    router.push('/login');
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