import React from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';

const { width } = Dimensions.get('window');

const CURVE_CONFIG = {
  HEIGHT: 200,
  DEPTH: 0,
  START_Y: 130,
} as const;

const generateCurvePath = (width: number): string => {
  const { HEIGHT, DEPTH, START_Y } = CURVE_CONFIG;

  // Safety check for width to prevent NaN issues
  const safeWidth = !isNaN(width) && width > 0 ? width : 300; // Default fallback width

  return `M0,${HEIGHT} L0,${START_Y} Q${safeWidth/2},${DEPTH} ${safeWidth},${START_Y} L${safeWidth},${START_Y} L${safeWidth},${HEIGHT} Z`;
};

interface ProfileHeaderWithCurveProps {
  onBack: () => void;
  onSettings?: () => void;
  showSettings?: boolean;
}

export const ProfileHeaderWithCurve: React.FC<ProfileHeaderWithCurveProps> = ({
  onBack,
  onSettings,
  showSettings = true,
}) => {
  return (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[theme.colors.primary, '#FFA366']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.orangeHeader}
      >
        {/* SVG FIRST - renders behind buttons */}
        <Svg
          height={CURVE_CONFIG.HEIGHT}
          width={width}
          viewBox={`0 0 ${width} ${CURVE_CONFIG.HEIGHT}`}
          style={styles.concaveCurve}
        >
          <Path
            d={generateCurvePath(width)}
            fill="#f0f0f0"
          />
        </Svg>

        {/* SafeAreaView SECOND with zIndex - renders on top of SVG */}
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onBack();
              }}
              accessible={true}
              accessibilityLabel="Back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            {showSettings && onSettings && (
              <Pressable
                style={styles.settingsIcon}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSettings();
                }}
                accessible={true}
                accessibilityLabel="Settings"
                accessibilityRole="button"
              >
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </Pressable>
            )}
            {!showSettings && <View style={styles.settingsIcon} />}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 290,
    position: 'relative',
  },
  orangeHeader: {
    height: 290,
    position: 'relative',
  },
  safeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: theme.spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    padding: theme.spacing.sm,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  concaveCurve: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
});
