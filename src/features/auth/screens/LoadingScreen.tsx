import React, { useState, useEffect } from 'react';
import { View, Text, Image, Pressable, Dimensions, Platform, StyleSheet, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { SocialButton } from '../components/AuthComponents';
import { AuthStyles, AuthColors } from '../styles/AuthStyles';
import DeuceLogo from '../../onboarding/components/DeuceLogo';

interface LoadingScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onGetStarted, onLogin }) => {
  // Get safe area insets for proper positioning on Android/iOS
  const insets = useSafeAreaInsets();

  // Dynamic dimensions that update on screen change
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  // Force re-render when app comes to foreground to fix Android layout issues
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    // Listen for app state changes (background/foreground)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Force a re-render when app comes to foreground
        forceUpdate(prev => prev + 1);
        // Also update dimensions to ensure they're current
        const { width, height } = Dimensions.get('window');
        setDimensions({ width, height });
      }
    });

    return () => {
      subscription?.remove();
      appStateSubscription?.remove();
    };
  }, []);

  const { width: screenWidth, height: screenHeight } = dimensions;

  // Generate styles dynamically based on current dimensions and insets
  const dynamicStyles = getStyles(screenWidth, screenHeight, insets.bottom);

  return (
    <View style={dynamicStyles.container}>
      {/* Main Loading Page Container - Phone frame */}
      <View style={dynamicStyles.loadingPage}>
        {/* Background Image */}
        <Image
          source={require('@/assets/images/splash.png')}
          style={dynamicStyles.backgroundImage}
        />

        {/* Cross-platform Status Bar */}
        <StatusBar style="light" backgroundColor="transparent" />

        {/* Logo positioned exactly as in Figma */}
        <View style={dynamicStyles.logoContainer}>
          <View style={dynamicStyles.textShadowContainer}>
            <Text style={dynamicStyles.logoText}>DEUCE</Text>
          </View>
          <View style={dynamicStyles.logoShadowContainer}>
            <DeuceLogo width={80} height={80} />
          </View>
        </View>

        {/* Tagline positioned exactly as in Figma */}
        <Text style={dynamicStyles.taglineText}>
          Your ultimate{'\n'}sports flex league platform.
        </Text>

        {/* Bottom Container with white background and shadow */}
        <View style={dynamicStyles.bottomContainer}>
          {/* Top Row: Get Started Button and Social Buttons */}
          <View style={dynamicStyles.topRow}>
            <Pressable
              style={dynamicStyles.getStartedButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onGetStarted();
              }}
            >
              <LinearGradient
                colors={['#FEA04D', '#FF7903']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={dynamicStyles.gradientButton}
              >
                <Text style={dynamicStyles.getStartedButtonText} numberOfLines={1}>Ready? Start now</Text>
              </LinearGradient>
            </Pressable>

            {/* Social Login Buttons */}
            <View style={dynamicStyles.socialContainer}>
              <SocialButton type="facebook" onPress={() => {}} />
              <SocialButton type="apple" onPress={() => {}} />
              <SocialButton type="google" onPress={() => {}} />
            </View>
          </View>

          {/* Login Link */}
          <View style={dynamicStyles.loginLinkContainer}>
            <Text style={dynamicStyles.loginLinkText}>Already have an account? </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onLogin();
              }}
              style={dynamicStyles.loginLinkButton}
            >
              <Text style={dynamicStyles.loginLinkButtonText}>Log in</Text>
            </Pressable>
          </View>
        </View>

        {/* Home Indicator - Hidden to avoid black bar */}
      </View>
    </View>
  );
};

// Dynamic styles function that responds to dimension changes and safe area insets
const getStyles = (screenWidth: number, screenHeight: number, bottomInset: number) => StyleSheet.create({
  container: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#000000',
  },
  loadingPage: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    width: screenWidth,
    height: screenHeight,
    left: 0,
    top: 0,
    resizeMode: 'cover',
  },
  logoContainer: {
    position: 'absolute',
    left: screenWidth * 0.5 - 100, // Center horizontally (assuming logo width ~200px)
    top: screenHeight * 0.15, // Moved higher up from 0.25 to 0.15
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Platform.select({
      ios: 'Helvetica',
      android: 'sans-serif',
    }),
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: 48,
    lineHeight: 60,
    letterSpacing: 3.5,
    color: '#FEA04D',
    textAlign: 'center',
    marginBottom: 40,
  },
  textShadowContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2, // For Android shadow
  },
  logoShadowContainer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4, // For Android shadow
  },
  taglineText: {
    position: 'absolute',
    width: screenWidth * 0.8,
    left: screenWidth * 0.07,
    top: screenHeight * 0.73,
    fontFamily: Platform.select({
      ios: 'Helvetica',
      android: 'sans-serif',
    }),
    fontStyle: 'italic',
    fontWeight: '400',
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.01,
    color: '#E3EEF2',
  },
  bottomContainer: {
    position: 'absolute',
    width: screenWidth,
    minHeight: Platform.OS === 'ios' ? 140 : 120,
    left: 0,
    bottom: 0, // Always stick to the absolute bottom
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.25,
    shadowRadius: 80,
    elevation: 20,
    paddingHorizontal: screenWidth * 0.05,
    paddingTop: Platform.OS === 'ios' ? 20 : 15,
    // Add bottom inset as padding to account for Android navigation bar
    paddingBottom: Math.max(Platform.OS === 'ios' ? 20 : 15, bottomInset),
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 15,
  },
  getStartedButton: {
    flex: 1,
    maxWidth: screenWidth * 0.55,
    height: Platform.OS === 'ios' ? 44 : 40,
    marginRight: 10,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 16,
  },
  getStartedButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
    color: '#FFFFFF',
    textAlign: 'center',
    flexShrink: 1,
  },
  socialContainer: {
    flexDirection: 'row',
    gap: Platform.OS === 'ios' ? 8 : 6,
    alignItems: 'center',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: Platform.OS === 'ios' ? 32 : 24,
  },
  loginLinkText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: Platform.OS === 'ios' ? 18 : 17,
    letterSpacing: -0.01,
    color: '#404040',
  },
  loginLinkButton: {
    paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    paddingHorizontal: Platform.OS === 'ios' ? 4 : 2,
  },
  loginLinkButtonText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: Platform.OS === 'ios' ? 14 : 13,
    lineHeight: Platform.OS === 'ios' ? 18 : 17,
    letterSpacing: -0.01,
    textDecorationLine: 'underline',
    color: '#FEA04D',
  },
});