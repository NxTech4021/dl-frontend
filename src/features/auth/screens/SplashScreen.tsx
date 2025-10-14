import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, G } from 'react-native-svg';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 1500);

    return () => clearTimeout(fadeTimer);
  }, [onComplete, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      
      {/* DL Logo SVG */}
      <View style={styles.logoContainer}>
        <Svg
          width={screenWidth * 0.4}
          height={screenWidth * 0.4 * (154.58 / 146.46)}
          viewBox="0 0 146.46 154.58"
        >
          {/* Main logo paths */}
          <Path
            fill="#44a7de"
            d="m146.45,76.67c-.04,1.52-.19,3.06-.46,4.6-4.06,23.39-34.72,48.43-102.74,73.18-1.72.62-3.28-.94-2.88-2.72,10.78-48.65,9.38-119.74-.72-148.91-.58-1.65,1.11-3.24,2.79-2.71,62.42,19.74,104.79,46.66,104.01,76.56Z"
          />
          <Path
            fill="none"
            stroke="#ed2124"
            strokeMiterlimit={10}
            d="m45.08,76.67v4.6h1.11v-4.6h-1.11Z"
          />
          <Path
            fill="#195e9a"
            d="m48.94,17.75c-1.51-.71-3.04-1.41-4.6-2.1C31.91,10.08,17.98,4.89,2.87.11,1.2-.42-.39,1.13.08,2.82c14.06,50.94,15.69,100.47.72,148.91-.54,1.74,1.17,3.34,2.88,2.72,15.43-5.62,28.95-11.25,40.66-16.88,1.57-.74,3.1-1.5,4.6-2.25,36.77-18.4,54.47-36.68,57.49-54.05.27-1.54.42-3.08.46-4.6.57-21.76-21.71-41.94-57.95-58.92Zm0,84.23c-.89.37-1.81.73-2.75,1.1v-21.81h-1.11v-4.6h1.11v-22.5c.94.45,1.85.9,2.75,1.35,13.99,6.99,23.28,14.03,25.46,21.15.47,1.53.62,3.06.4,4.6-.94,6.82-8.85,13.73-25.86,20.71Z"
          />
          
          {/* White overlay paths */}
          <G>
            <Path
              fill="#fff"
              d="m74.4,76.67c.47,1.53.62,3.06.4,4.6h-29.72v-4.6h29.32Z"
            />
            <Path
              fill="#fff"
              d="m146.45,76.67c-.04,1.52-.19,3.06-.46,4.6h-39.56c.27-1.54.42-3.08.46-4.6h39.56Z"
            />
            <Path
              fill="#fff"
              d="m48.94,17.75v117.57c-1.5.75-3.03,1.51-4.6,2.25V15.65c1.56.69,3.09,1.39,4.6,2.1Z"
            />
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
