import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  Dimensions,
} from 'react-native';
import SportIcon from '@/components/SportIcon';
import type { SkillLevel, SportType } from '../types';
import { SKILL_LEVEL_LABELS } from '../types';

// Re-export SportType for backwards compatibility
export type { SportType };

/**
 * Props for the SportButton component
 */
interface SportButtonProps {
  /** The sport type to display */
  sport: SportType;
  /** Whether this sport is currently selected */
  isSelected?: boolean;
  /** Optional order number for multi-selection (1, 2, 3) */
  orderNumber?: number | null;
  /** Callback function when button is pressed */
  onPress: () => void;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Optional skill level to display as a badge */
  skillLevel?: SkillLevel | null;
}

const SportButton: React.FC<SportButtonProps> = ({
  sport,
  isSelected = false,
  orderNumber = null,
  onPress,
  disabled = false,
  skillLevel = null,
}) => {
  const displayName = sport.charAt(0) + sport.slice(1);
  const sportColor = SPORT_COLORS[sport];

  const buttonStyle: ViewStyle[] = [
    styles.button,
    ...(isSelected
      ? [{ backgroundColor: sportColor.tint, borderColor: sportColor.border }]
      : []),
    ...(disabled ? [styles.buttonDisabled] : []),
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    { color: sportColor.bg },
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {orderNumber && (
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{orderNumber}</Text>
        </View>
      )}
      <View style={styles.iconContainer}>
        <SportIcon sport={sport} size={iconSize} />
      </View>
      <Text style={textStyle}>{displayName}</Text>
      {/* {skillLevel && (
        <View style={[styles.skillLevelBadge, { backgroundColor: sportColor.bg }]}>
          <Text style={styles.skillLevelText}>
            {SKILL_LEVEL_LABELS[skillLevel]}
          </Text>
        </View>
      )} */}
    </TouchableOpacity>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive calculations
const isSmallDevice = screenHeight < 700;
const horizontalPadding = Math.max(screenWidth * 0.08, 20);
const cardGap = 10;
const cardWidth = (screenWidth - horizontalPadding * 2 - cardGap) / 2;
const cardHeight = Math.floor(cardWidth * 1.1);
const iconSize = Math.floor(cardWidth * 0.46);

// Sport-specific selected colors
const SPORT_COLORS: Record<SportType, { bg: string; border: string; tint: string }> = {
  pickleball: { bg: '#A04DFE', border: '#A04DFE', tint: '#F5EEFF' },
  tennis:     { bg: '#9BD940', border: '#9BD940', tint: '#F2FAE6' },
  padel:      { bg: '#4DABFE', border: '#4DABFE', tint: '#EBF5FF' },
};

const styles = StyleSheet.create({
  button: {
    width: cardWidth,
    height: cardHeight,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BABABA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: iconSize,
    height: iconSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 20,
    color: '#555555',
    marginTop: 6,
  },

  textcolor:{

  },
  orderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FE9F4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  skillLevelBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  skillLevelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default SportButton;
