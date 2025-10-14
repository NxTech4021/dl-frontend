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
import Svg, { G, Path } from 'react-native-svg';

/**
 * Available sports in the application
 */
export type SportType = 'pickleball' | 'tennis' | 'padel';

// SVG Icon Components
const PickleballIcon = () => (
  <Svg width={90} height={90} viewBox="0 0 64 64">
    <G fill="#555555">
      <Path d="M6.519 33.26a1.5 1.5 0 0 1-1.461-1.166C.346 11.497 12.714 4.013 13.243 3.704a1.5 1.5 0 0 1 1.516 2.59c-.477.284-10.97 6.8-6.778 25.131A1.5 1.5 0 0 1 6.52 33.26zM17 15.5a1.5 1.5 0 0 1-1.5-1.5c-.001-6.771 5.493-10.146 5.728-10.286a1.5 1.5 0 0 1 1.548 2.57C22.6 6.391 18.5 8.96 18.5 14a1.5 1.5 0 0 1-1.5 1.5z" />
      <Path d="M13.17 26.61a1.5 1.5 0 0 1-1.326-.799c-2.444-4.62-.942-9.194-.876-9.387a1.499 1.499 0 1 1 2.842.962c-.01.029-1.14 3.572.686 7.023a1.5 1.5 0 0 1-1.325 2.201zM28.52 19.21c-.263 0-.529-.07-.771-.214-4.985-2.988-4.674-7.66-2.893-10.754a1.5 1.5 0 0 1 2.6 1.497c-.719 1.248-1.978 4.398 1.836 6.684a1.5 1.5 0 0 1-.772 2.786zM22.768 43.452a1.5 1.5 0 0 1-.197-2.987l3.584-.478a1.5 1.5 0 1 1 .396 2.974l-3.583.478a1.543 1.543 0 0 1-.2.013zM27.482 36.565c-.272 0-.546-.074-.794-.228l-2.996-1.873a1.499 1.499 0 1 1 1.59-2.544l2.996 1.873a1.499 1.499 0 0 1-.796 2.772zM32.259 32.245a1.5 1.5 0 0 1-1.38-.91l-1.15-2.688a1.5 1.5 0 1 1 2.758-1.18l1.15 2.688a1.5 1.5 0 0 1-1.378 2.09z" />
      <Path d="M22.549 54.498c-1.171 0-2.35-.302-3.414-.922-6.609-3.826-10.872-8.09-14.713-14.714-1.536-2.66-1.11-6.016 1.037-8.163l13.29-13.29a6.837 6.837 0 0 1 6.047-1.895l10.48 1.89a1.5 1.5 0 0 1-.533 2.952l-10.48-1.89a3.843 3.843 0 0 0-3.393 1.065L7.58 32.82c-1.187 1.187-1.419 3.054-.561 4.539 3.601 6.212 7.42 10.032 13.622 13.621 1.48.862 3.35.63 4.551-.565l7.456-7.466a1.5 1.5 0 1 1 2.123 2.12l-7.46 7.47a6.75 6.75 0 0 1-4.762 1.958zM40.202 30.5a1.5 1.5 0 0 1-1.474-1.234l-1.084-6.01a1.501 1.501 0 0 1 2.953-.532l1.084 6.01a1.501 1.501 0 0 1-1.479 1.766z" />
      <Path d="M39.116 24.493c-.384 0-.767-.146-1.06-.44l-4.109-4.108a1.5 1.5 0 0 1 0-2.12l11.069-11.07.643-1.715a2.37 2.37 0 0 1 3.897-.844l4.249 4.248c.572.573.812 1.387.641 2.179a2.364 2.364 0 0 1-1.484 1.718l-1.716.644-11.07 11.069c-.292.293-.676.44-1.06.44zm-1.987-5.608 1.987 1.987 10.238-10.238c.152-.152.333-.269.535-.344l1.105-.415-2.868-2.869-.415 1.106a1.5 1.5 0 0 1-.344.534zm9.178-11.3h.01zm2.16-1.492z" />
      <Path d="M43.626 19.984c-.384 0-.768-.146-1.06-.44l-4.11-4.11a1.5 1.5 0 1 1 2.12-2.12l4.11 4.11a1.5 1.5 0 0 1-1.06 2.56zM48.026 15.585c-.383 0-.767-.147-1.06-.44l-4.11-4.11a1.5 1.5 0 1 1 2.12-2.121l4.11 4.11a1.5 1.5 0 0 1-1.06 2.561z" />
    </G>
    <Path fill="#fea04d" d="M46.255 32.01c-7.855 0-14.244 6.39-14.244 14.245S38.4 60.5 46.255 60.5 60.5 54.11 60.5 46.255s-6.39-14.244-14.245-14.244zm-5.409 17.054a2 2 0 1 1-3.912-.831 2 2 0 0 1 3.912.831zm1.066-7.085a2 2 0 1 1-.418-3.978 2 2 0 0 1 .418 3.978zm6.075 13.02a2 2 0 1 1-3.464-2 2 2 0 0 1 3.464 2zm0-7.744a2 2 0 1 1-3.464-2 2 2 0 0 1 3.464 2zm.993-6.452a2 2 0 1 1 3.654-1.627 2 2 0 0 1-3.654 1.627zm5.979 9.332a2 2 0 1 1-2.677-2.973 2 2 0 0 1 2.677 2.973z" />
  </Svg>
);

const TennisIcon = () => (
  <Svg width={90} height={90} viewBox="0 0 64 64">
    <G fill="#555555">
      <Path d="M29.144 41.56c-3.099 0-6.08-.858-8.637-2.546-3.497-2.296-5.92-5.96-6.82-10.316-1.072-5.196.11-10.904 3.244-15.662 2.872-4.368 7.059-7.51 11.788-8.848 4.808-1.362 9.599-.7 13.489 1.86 6.975 4.596 9.202 14.21 5.296 22.86a1.5 1.5 0 1 1-2.734-1.234c3.295-7.3 1.524-15.34-4.212-19.12-3.15-2.074-7.065-2.598-11.022-1.48-4.036 1.142-7.623 3.845-10.1 7.612-2.699 4.098-3.723 8.984-2.81 13.405.737 3.57 2.702 6.56 5.53 8.417 3.425 2.26 7.826 2.673 12.077 1.133a1.5 1.5 0 1 1 1.021 2.822 17.957 17.957 0 0 1-6.11 1.098zM9.936 60.504a5.408 5.408 0 0 1-2.982-.898 5.45 5.45 0 0 1-1.554-7.54l7.046-10.704a1.5 1.5 0 0 1 2.078-.429l6.587 4.336a1.5 1.5 0 0 1 .428 2.078L14.494 58.05a5.41 5.41 0 0 1-3.448 2.34c-.37.075-.741.113-1.11.113zm4.191-16.24-6.22 9.452a2.446 2.446 0 0 0 .696 3.384c.546.36 1.198.484 1.837.352s1.189-.505 1.548-1.05l6.22-9.452-4.08-2.686z" />
      <Path d="M14.52 44.228a1.5 1.5 0 0 1-1.251-2.325c1.594-2.42 2.939-5.687.838-11.566a1.5 1.5 0 0 1 2.826-1.01c1.996 5.59 1.64 9.977-1.158 14.226a1.498 1.498 0 0 1-1.254.675zM19.461 47.48a1.5 1.5 0 0 1-1.251-2.325c2.797-4.249 6.685-6.311 12.608-6.688a1.49 1.49 0 0 1 1.592 1.402 1.5 1.5 0 0 1-1.402 1.593c-6.23.395-8.699 2.922-10.292 5.343a1.498 1.498 0 0 1-1.255.675zM21.327 39.267a1.5 1.5 0 0 1-1.251-2.325L40.129 6.475a1.5 1.5 0 0 1 2.506 1.65L22.58 38.591a1.498 1.498 0 0 1-1.254.675z" />
      <Path d="M33.591 34.947c-.283 0-.57-.08-.823-.247L14.313 22.552a1.5 1.5 0 0 1 1.65-2.505L33.164 31.37l12.207-18.518a1.5 1.5 0 0 1 2.505 1.651l-13.032 19.77a1.5 1.5 0 0 1-1.254.674z" />
      <Path d="M16.084 32.888a1.5 1.5 0 0 1-1.251-2.325L32.197 4.182a1.5 1.5 0 1 1 2.506 1.65L17.338 32.212a1.498 1.498 0 0 1-1.254.675z" />
      <Path d="M40.607 30.124c-.283 0-.569-.08-.823-.247L17.356 15.114a1.5 1.5 0 0 1 1.65-2.506l22.428 14.763a1.5 1.5 0 0 1-.827 2.753zM47.572 25.267c-.283 0-.57-.08-.824-.247L22.984 9.378a1.5 1.5 0 0 1 1.65-2.506l23.764 15.642a1.5 1.5 0 0 1-.826 2.753z" />
    </G>
    <Path fill="#fea04d" d="M50.741 42.44c1.428 2.05 3.701 3.346 6.4 3.646.78.087 1.568.08 2.354-.002-.073-5.98-3.849-11.074-9.137-13.11-1.544 3.136-1.532 6.716.383 9.466zM40.977 57.343c.654-2.635.228-5.216-1.2-7.267-1.429-2.05-3.702-3.346-6.4-3.646a11.043 11.043 0 0 0-2.354.003c.073 5.98 3.85 11.074 9.14 13.11.346-.706.625-1.44.814-2.2z" />
    <Path fill="#fea04d" d="M58.345 49.153a13.92 13.92 0 0 1-1.536-.085c-3.57-.397-6.6-2.143-8.53-4.914-2.443-3.508-2.608-7.998-.865-11.96a14.22 14.22 0 0 0-2.155-.18c-6.876 0-12.629 4.896-13.956 11.385.802-.05 1.606-.04 2.405.05 3.571.396 6.6 2.142 8.53 4.913 1.93 2.77 2.516 6.217 1.65 9.704-.191.774-.46 1.526-.78 2.256.703.108 1.418.18 2.15.18 6.876 0 12.629-4.896 13.957-11.384-.29.018-.58.035-.87.035z" />
  </Svg>
);

const PadelIcon = () => (
  <Svg width={90} height={90} viewBox="0 0 512 512">
    <Path d="m175.127 375.656-38.783-38.783L10 454.86l47.139 47.139z" fill="#fea04d" />
    <Path d="m106.057 365.157 30.287-28.284c59.144-59.144 22.975-199.436 107.622-284.083 59.437-59.438 127.057-59.099 200.7 14.543 73.643 73.642 73.982 141.263 14.544 200.701-84.647 84.646-224.939 48.478-284.083 107.622L57.139 501.999 10 454.86l30.283-28.28" fill="none" stroke="#555555" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M196.359 315.641c25.056-10.075 52.929-15.234 81.16-19.869a208.796 208.796 0 0 1-33.846-27.445 208.846 208.846 0 0 1-27.445-33.847c-4.636 28.231-9.794 56.104-19.869 81.161zM139.285 339.814l32.9 32.9M312.613 72.102l.006.006M280.794 103.922l.005.005M248.974 135.742l.005.005M376.253 72.102l.005.006M344.433 103.922l.005.005M312.613 135.742l.006.005M280.794 167.561l.005.006M248.974 199.381l.005.005M408.072 103.922l.005.005M376.253 135.742l.005.005M344.433 167.561l.005.006M312.613 199.381l.006.005M280.794 231.201l.005.005M439.892 135.742l.005.005M408.072 167.561l.005.006M376.253 199.381l.005.005M344.433 231.201l.005.005M312.613 263.02l.006.005M439.892 199.381l.005.005M408.072 231.201l.005.005M376.253 263.02l.005.005" fill="none" stroke="#555555" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M73.164 395.866h.008" fill="none" stroke="#555555" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Sport configuration with exact Figma colors
const SPORT_CONFIG = {
  pickleball: {
    selectedBg: 'rgba(160, 77, 254, 0.15)',
  },
  tennis: {
    selectedBg: 'rgba(171, 254, 77, 0.2)',
  },
  padel: {
    selectedBg: 'rgba(77, 171, 254, 0.2)',
  },
};

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
}

/**
 * SportButton Component
 *
 * Interactive button for sport selection in the onboarding flow.
 * Displays sport-specific icons and colors with selection states.
 *
 * Features:
 * - Sport-specific styling and icons (pickleball, tennis, padel)
 * - Selection state with visual feedback
 * - Optional order numbering for multi-selection
 * - Disabled state support
 * - Accessible touch targets
 *
 * @component
 * @example
 * ```tsx
 * <SportButton
 *   sport="pickleball"
 *   isSelected={selectedSports.includes('pickleball')}
 *   orderNumber={1}
 *   onPress={() => handleSportSelect('pickleball')}
 * />
 * ```
 */
const SportButton: React.FC<SportButtonProps> = ({
  sport,
  isSelected = false,
  orderNumber = null,
  onPress,
  disabled = false,
}) => {
  const config = SPORT_CONFIG[sport];

  // Get display name with proper capitalization
  const displayName = sport.charAt(0).toUpperCase() + sport.slice(1);

  // Dynamic styles based on state
  const buttonStyle: ViewStyle[] = [
    styles.button,
    ...(isSelected ? [{
      backgroundColor: config.selectedBg,
      borderWidth: 0,
    }] : []),
    ...(disabled ? [styles.buttonDisabled] : []),
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
        {sport === 'pickleball' && <PickleballIcon />}
        {sport === 'tennis' && <TennisIcon />}
        {sport === 'padel' && <PadelIcon />}
      </View>
      <Text style={styles.text}>{displayName}</Text>
    </TouchableOpacity>
  );
};

const { width: screenWidth } = Dimensions.get('window');
const horizontalPadding = Math.max(screenWidth * 0.08, 20); 
const buttonWidth = screenWidth - (horizontalPadding * 2); 

const styles = StyleSheet.create({
  button: {
    width: buttonWidth,
    height: 145,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BABABA',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 90,
    height: 90,
  },
  text: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
  },
  orderBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FE9F4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default SportButton;
