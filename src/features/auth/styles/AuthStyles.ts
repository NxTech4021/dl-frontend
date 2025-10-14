import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Design System Colors
export const AuthColors = {
  primary: '#FEA04D',
  primaryDark: '#FF7903',
  primaryLight: '#FFB678',
  secondary: '#444444',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F4F4F4',
    100: '#EDF1F3',
    200: '#E4E5E7',
    300: '#ACB5BB',
    400: '#6C7278',
    500: '#6E6E6E',
    600: '#404040',
    700: '#1A1C1E',
  },
  success: '#34C759',
  facebook: '#0088FF',
  google: {
    blue: '#4285F4',
    green: '#34A853',
    yellow: '#FBBC05',
    red: '#EA4335',
  },
  border: 'rgba(108, 114, 120, 0.3)', // Grey border for default state
  borderActive: '#FEA04D', // Orange border for active/focused state
  shadow: 'rgba(228, 229, 231, 0.24)',
};

// Typography
export const AuthTypography = {
  fontFamily: {
    primary: Platform.select({
      ios: 'SF Pro',
      android: 'Roboto',
      default: 'System',
    }),
    secondary: 'Inter',
    logo: 'IBM Plex Sans',
    plusJakarta: 'Plus Jakarta Sans',
  },
  fontSize: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 22,
    '3xl': 30,
    '4xl': 32,
    '5xl': 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '600' as const,
    heavy: '700' as const,
  },
};

// Common Authentication Styles
export const AuthStyles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: AuthColors.white,
  },

  // Screen Container
  screenContainer: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: AuthColors.white,
    borderRadius: 40,
  },

  // Loading Screen Background
  loadingContainer: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: AuthColors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gradient Background (will use LinearGradient component)
  gradientBackground: {
    position: 'absolute',
    width: screenWidth * 2,
    height: screenHeight * 0.4,
    left: -screenWidth * 0.5,
    top: -screenHeight * 0.13,
  },

  // Logo Container
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    position: 'absolute',
    top: screenHeight * 0.15,
    alignSelf: 'center',
  },

  // Logo Text
  logoText: {
    fontFamily: AuthTypography.fontFamily.logo,
    fontStyle: 'italic',
    fontWeight: AuthTypography.fontWeight.heavy,
    fontSize: AuthTypography.fontSize['3xl'],
    letterSpacing: 1.5,
    color: AuthColors.primary,
  },

  // Large Logo (Loading Screen)
  largeLogoText: {
    fontFamily: AuthTypography.fontFamily.logo,
    fontStyle: 'italic',
    fontWeight: AuthTypography.fontWeight.heavy,
    fontSize: AuthTypography.fontSize['5xl'],
    letterSpacing: 3.5,
    color: AuthColors.primary,
    position: 'absolute',
    left: 35,
    top: 222,
  },

  // Tagline
  taglineText: {
    position: 'absolute',
    width: 296,
    height: 58,
    left: 29,
    top: 605,
    fontFamily: 'Poppins',
    fontStyle: 'italic',
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize['2xl'],
    lineHeight: 29,
    letterSpacing: -0.01,
    color: '#C7C7C7',
  },

  // Bottom Container (White Area)
  bottomContainer: {
    position: 'absolute',
    width: screenWidth,
    height: 159,
    bottom: 0,
    backgroundColor: AuthColors.white,
    shadowColor: AuthColors.black,
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.25,
    shadowRadius: 80,
    elevation: 20,
  },

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: screenWidth,
    height: 60,
    paddingHorizontal: 28,
  },

  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  statusBarTime: {
    fontFamily: AuthTypography.fontFamily.primary,
    fontSize: AuthTypography.fontSize.lg + 1,
    fontWeight: AuthTypography.fontWeight.semibold,
    letterSpacing: -0.5,
    color: AuthColors.black,
  },

  statusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Dynamic Island
  dynamicIsland: {
    width: 122,
    height: 36,
    backgroundColor: AuthColors.black,
    borderRadius: 32,
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
  },

  // Home Indicator
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 120,
    height: 5,
    backgroundColor: AuthColors.black,
    borderRadius: 5,
  },

  // Headers
  headerTitle: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.heavy,
    fontSize: AuthTypography.fontSize['4xl'],
    lineHeight: 40,
    color: AuthColors.black,
    position: 'absolute',
    width: 308,
    left: 37,
  },

  loginHeader: {
    top: 147,
  },

  signupHeader: {
    top: 122,
  },

  verificationHeader: {
    top: 162,
  },

  // Input Section
  inputSection: {
    position: 'absolute',
    width: 327,
    left: 37,
    gap: 16,
  },

  loginInputSection: {
    top: 235,
    height: 154,
  },

  signupInputSection: {
    top: 215,
    height: 324,
  },

  // Input Field Container
  inputFieldContainer: {
    width: '100%',
    minHeight: 69,
    gap: 2,
  },

  // Input Label
  inputLabel: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.md, 
    lineHeight: 22,
    letterSpacing: -0.02,
    color: AuthColors.gray[400],
    marginBottom: 2,
  },

  // Input Area
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: AuthColors.white,
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: 10,
    shadowColor: AuthColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 2,
  },

  inputAreaActive: {
    borderColor: AuthColors.borderActive,
  },

  inputIcon: {
    marginRight: 12,
  },

  inputText: {
    flex: 1,
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.md,
    lineHeight: Platform.OS === 'android' ? 20 : 18,
    letterSpacing: -0.01,
    color: AuthColors.gray[700],
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
  },

  eyeIcon: {
    padding: 4,
  },

  // Button with Arrow
  buttonWithArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    width: 327,
    height: 42,
    left: 37,
  },

  loginButtonContainer: {
    top: 430,
  },

  signupButtonContainer: {
    top: 581,
  },

  buttonText: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.bold,
    fontSize: AuthTypography.fontSize.xl,
    lineHeight: 25,
    letterSpacing: -0.01,
    color: AuthColors.black,
  },

  // Circle Button
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AuthColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AuthColors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.48,
    shadowRadius: 2,
    elevation: 3,
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 36,
    height: 36,
    backgroundColor: AuthColors.primary,
    borderRadius: 20,
    shadowColor: AuthColors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  primaryButtonText: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.bold,
    fontSize: AuthTypography.fontSize.lg,
    lineHeight: 24,
    color: AuthColors.white,
  },

  // Social Login Container
  socialContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 156,
    height: 48,
  },

  socialContainerLogin: {
    left: 123,
    top: 559,
  },

  socialContainerSignup: {
    left: 123,
    top: 693,
  },

  // Social Button
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  facebookButton: {
    backgroundColor: AuthColors.facebook,
  },

  googleButton: {
    backgroundColor: AuthColors.white,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    shadowColor: '#121212',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 35,
    elevation: 5,
  },

  // Links
  linkContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    width: 327,
    left: 37,
  },

  linkText: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.base,
    lineHeight: 17,
    letterSpacing: -0.01,
    color: AuthColors.gray[400],
  },

  linkTextBold: {
    fontWeight: AuthTypography.fontWeight.bold,
    color: AuthColors.primary,
    textDecorationLine: 'underline',
  },

  // Forgot Password
  forgotPassword: {
    position: 'absolute',
    right: 37,
    top: 397,
  },

  forgotPasswordText: {
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.xs,
    lineHeight: 14,
    letterSpacing: -0.01,
    color: AuthColors.primary,
  },

  // Divider Text
  dividerText: {
    position: 'absolute',
    width: 327,
    left: 37,
    textAlign: 'center',
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.base,
    lineHeight: 17,
    letterSpacing: -0.01,
    color: AuthColors.gray[600],
  },

  // Terms Text
  termsText: {
    position: 'absolute',
    width: 327,
    left: 37,
    top: 546,
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.xs,
    lineHeight: 14,
    letterSpacing: -0.01,
    color: AuthColors.gray[400],
  },

  // Back Button
  backButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    left: 29,
    top: 93,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Verification Code
  verificationContainer: {
    position: 'absolute',
    width: 320,
    left: 37,
    top: 256,
  },

  verificationDescription: {
    fontFamily: AuthTypography.fontFamily.plusJakarta,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.base,
    lineHeight: 19,
    letterSpacing: -0.02,
    color: AuthColors.gray[400],
    marginBottom: 10,
  },

  verificationLabel: {
    fontFamily: AuthTypography.fontFamily.plusJakarta,
    fontWeight: AuthTypography.fontWeight.heavy,
    fontSize: AuthTypography.fontSize.base,
    lineHeight: 19,
    letterSpacing: -0.02,
    color: AuthColors.gray[400],
    marginTop: 61,
    marginBottom: 19,
  },

  codeInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },

  codeInput: {
    width: 45,
    height: 45,
    backgroundColor: AuthColors.white,
    borderWidth: 1,
    borderColor: AuthColors.borderActive,
    borderRadius: 10,
    textAlign: 'center',
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.bold,
    fontSize: AuthTypography.fontSize.xl,
    color: AuthColors.gray[700],
  },

  confirmButton: {
    width: 310,
    marginTop: 32,
  },

  // Phone Input
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: AuthColors.white,
    borderWidth: 1,
    borderColor: AuthColors.border,
    borderRadius: 10,
  },

  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 7,
    height: 48,
    borderRightWidth: 1,
    borderRightColor: AuthColors.gray[100],
  },

  countryFlag: {
    width: 18,
    height: 18,
  },

  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontFamily: AuthTypography.fontFamily.secondary,
    fontWeight: AuthTypography.fontWeight.medium,
    fontSize: AuthTypography.fontSize.md,
    color: AuthColors.gray[700],
  },
});