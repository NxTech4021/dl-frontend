/**
 * Deuce League Theme Configuration
 * Based on Figma Design System
 */

export const theme = {
  // Brand Colors
  colors: {
    primary: '#FE9F4D',  // Main orange color for buttons and branding
    
    // Sport-specific colors
    sports: {
      pickleball: {
        primary: '#602E98',
        secondary: '#A04DFE',
      },
      tennis: {
        primary: '#374F35',
        secondary: '#5D825A',
      },
      padel: {
        primary: '#7D3C03',
        secondary: '#A15009',
      },
    },
    
    // Neutral colors
    neutral: {
      white: '#FFFFFF',
      black: '#000000',
      gray: {
        50: '#F4F4F4',
        100: '#EDF1F3',
        200: '#E4E5E7',
        300: '#ACB5BB',
        400: '#6C7278',
        500: '#6E6E6E',
        600: '#444444',
        700: '#1A1C1E',
        800: '#121416',
        900: '#0A0B0C',
      },
    },
    
    // Semantic colors
    semantic: {
      success: '#34C759',
      error: '#FF3B30',
      warning: '#FFB678',
      info: '#007AFF',
    },
    
    // Background colors
    background: {
      primary: '#FFFFFF',
      secondary: '#F4ECDC',
      gradient: 'linear-gradient(180deg, #FFB678 0%, #FFFFFF 78.82%)',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      primary: 'Inter',
      secondary: 'Plus Jakarta Sans',
      logo: 'IBM Plex Sans',
      system: 'SF Pro',
    },
    
    fontSize: {
      xs: 11,
      sm: 12,
      base: 14,
      lg: 17,
      xl: 20,
      '2xl': 24,
      '3xl': 32,
    },
    
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
    },
    
    lineHeight: {
      tight: 14,
      normal: 20,
      relaxed: 24,
      loose: 40,
    },
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 36,
    '2xl': 37,
    '3xl': 71,
  },
  
  // Border Radius
  borderRadius: {
    none: 0,
    sm: 5,
    base: 8,
    md: 10,
    lg: 32,
    xl: 40,
    full: 100,
  },
  
  // Border Width
  borderWidth: {
    none: 0,
    thin: 1,
    base: 1.5,
    thick: 2,
  },
  
  // Button Styles (from Figma)
  buttons: {
    primary: {
      height: 40,
      paddingHorizontal: 36,
      paddingVertical: 4,
      backgroundColor: '#FE9F4D',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    secondary: {
      height: 40,
      paddingHorizontal: 36,
      paddingVertical: 4,
      backgroundColor: '#6E6E6E',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    sport: {
      width: 328,
      height: 100,
      paddingHorizontal: 36,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 2,
      gap: 4,
    },
  },
  
  // Input Styles (from Figma)
  inputs: {
    default: {
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#EDF1F3',
      paddingHorizontal: 14,
      fontSize: 14,
      backgroundColor: '#FFFFFF',
      shadowColor: '#E4E5E7',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.24,
      shadowRadius: 2,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: '#6C7278',
      marginBottom: 8,
      letterSpacing: -0.02,
    },
  },
  
  // Shadow Styles
  shadows: {
    sm: {
      shadowColor: '#E4E5E7',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.24,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
  
  // Component Dimensions (from Figma)
  dimensions: {
    logoHeight: 14,
    statusBarHeight: 60,
    homeBarHeight: 34,
    dynamicIslandWidth: 122,
    dynamicIslandHeight: 36,
    screenPadding: 37,
    buttonMinWidth: 258,
    iconSize: {
      sm: 16,
      md: 24,
      lg: 64,
      xl: 200,
    },
  },
};

// Type-safe theme access
export type Theme = typeof theme;

// Helper function to get sport colors
export const getSportColors = (sport: 'pickleball' | 'tennis' | 'padel') => {
  return theme.colors.sports[sport];
};

// Helper function to get button styles
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'sport') => {
  return theme.buttons[variant];
};