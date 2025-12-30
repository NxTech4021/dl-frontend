import {
  responsivePadding,
  responsiveMargin,
  responsiveWidth,
  responsiveHeight,
  scale,
  verticalScale,
  getResponsiveValue
} from '../utils/responsive';

// Base spacing scale - these are responsive
export const spacing = {
  xs: responsivePadding.xs,     // 4 (scaled)
  sm: responsivePadding.sm,     // 8 (scaled)
  md: responsivePadding.md,     // 16 (scaled)
  lg: responsivePadding.lg,     // 24 (scaled)
  xl: responsivePadding.xl,     // 32 (scaled)
  xxl: responsivePadding.xxl,   // 48 (scaled)
} as const;

// Margin scale (same as spacing but explicit)
export const margin = responsiveMargin;

// Padding scale (same as spacing but explicit)
export const padding = responsivePadding;

// Container spacing helpers
export const containerSpacing = {
  // Horizontal padding for main containers
  horizontal: getResponsiveValue({
    smallPhone: scale(16),
    phone: scale(20),
    largePhone: scale(24),
    tablet: scale(32),
    default: scale(24),
  }),

  // Vertical padding for sections
  vertical: getResponsiveValue({
    smallPhone: verticalScale(16),
    phone: verticalScale(20),
    largePhone: verticalScale(24),
    tablet: verticalScale(32),
    default: verticalScale(24),
  }),

  // Top padding (accounting for status bar)
  top: getResponsiveValue({
    smallPhone: verticalScale(16),
    phone: verticalScale(20),
    largePhone: verticalScale(20),
    tablet: verticalScale(24),
    default: verticalScale(20),
  }),

  // Bottom padding (accounting for navigation)
  bottom: getResponsiveValue({
    smallPhone: verticalScale(100),
    phone: verticalScale(110),
    largePhone: verticalScale(120),
    tablet: verticalScale(130),
    default: verticalScale(120),
  }),
};

// Card spacing
export const cardSpacing = {
  padding: getResponsiveValue({
    smallPhone: scale(16),
    phone: scale(18),
    largePhone: scale(20),
    tablet: scale(24),
    default: scale(20),
  }),

  margin: getResponsiveValue({
    smallPhone: scale(12),
    phone: scale(14),
    largePhone: scale(16),
    tablet: scale(20),
    default: scale(16),
  }),

  gap: getResponsiveValue({
    smallPhone: scale(12),
    phone: scale(14),
    largePhone: scale(16),
    tablet: scale(20),
    default: scale(16),
  }),
};

// Header spacing
export const headerSpacing = {
  horizontal: containerSpacing.horizontal,
  vertical: getResponsiveValue({
    smallPhone: verticalScale(16),
    phone: verticalScale(20),
    largePhone: verticalScale(24),
    tablet: verticalScale(28),
    default: verticalScale(24),
  }),

  top: containerSpacing.top,
  bottom: getResponsiveValue({
    smallPhone: verticalScale(20),
    phone: verticalScale(24),
    largePhone: verticalScale(30),
    tablet: verticalScale(36),
    default: verticalScale(30),
  }),
};

// Button spacing
export const buttonSpacing = {
  padding: {
    horizontal: getResponsiveValue({
      smallPhone: scale(16),
      phone: scale(18),
      largePhone: scale(20),
      tablet: scale(24),
      default: scale(20),
    }),
    vertical: getResponsiveValue({
      smallPhone: verticalScale(12),
      phone: verticalScale(14),
      largePhone: verticalScale(14),
      tablet: verticalScale(16),
      default: verticalScale(14),
    }),
  },

  margin: {
    horizontal: scale(8),
    vertical: verticalScale(8),
  },

  gap: getResponsiveValue({
    smallPhone: scale(8),
    phone: scale(10),
    largePhone: scale(12),
    tablet: scale(16),
    default: scale(12),
  }),
};

// List/Grid spacing
export const listSpacing = {
  itemGap: getResponsiveValue({
    smallPhone: scale(12),
    phone: scale(14),
    largePhone: scale(16),
    tablet: scale(20),
    default: scale(16),
  }),

  sectionGap: getResponsiveValue({
    smallPhone: scale(20),
    phone: scale(24),
    largePhone: scale(28),
    tablet: scale(36),
    default: scale(28),
  }),

  padding: {
    horizontal: containerSpacing.horizontal,
    vertical: containerSpacing.vertical,
  },
};

// Navigation spacing
export const navigationSpacing = {
  tabPadding: {
    horizontal: getResponsiveValue({
      smallPhone: scale(8),
      phone: scale(10),
      largePhone: scale(12),
      tablet: scale(16),
      default: scale(12),
    }),
    vertical: getResponsiveValue({
      smallPhone: verticalScale(8),
      phone: verticalScale(10),
      largePhone: verticalScale(11),
      tablet: verticalScale(14),
      default: verticalScale(11),
    }),
  },

  iconMargin: getResponsiveValue({
    smallPhone: verticalScale(1),
    phone: verticalScale(2),
    largePhone: verticalScale(2),
    tablet: verticalScale(3),
    default: verticalScale(2),
  }),
};

// Form spacing
export const formSpacing = {
  fieldGap: getResponsiveValue({
    smallPhone: verticalScale(16),
    phone: verticalScale(18),
    largePhone: verticalScale(20),
    tablet: verticalScale(24),
    default: verticalScale(20),
  }),

  labelMargin: getResponsiveValue({
    smallPhone: verticalScale(6),
    phone: verticalScale(8),
    largePhone: verticalScale(8),
    tablet: verticalScale(10),
    default: verticalScale(8),
  }),

  inputPadding: {
    horizontal: getResponsiveValue({
      smallPhone: scale(14),
      phone: scale(16),
      largePhone: scale(16),
      tablet: scale(20),
      default: scale(16),
    }),
    vertical: getResponsiveValue({
      smallPhone: verticalScale(12),
      phone: verticalScale(14),
      largePhone: verticalScale(16),
      tablet: verticalScale(18),
      default: verticalScale(16),
    }),
  },
};

// Dashboard-specific spacing
export const dashboardSpacing = {
  // Header section
  header: {
    padding: {
      horizontal: headerSpacing.horizontal,
      top: headerSpacing.top,
      bottom: headerSpacing.bottom,
    },
  },

  // Sport cards
  sportCard: {
    padding: cardSpacing.padding,
    margin: cardSpacing.margin,
    gap: cardSpacing.gap,

    iconMargin: getResponsiveValue({
      smallPhone: scale(12),
      phone: scale(14),
      largePhone: scale(16),
      tablet: scale(20),
      default: scale(16),
    }),

    buttonMargin: getResponsiveValue({
      smallPhone: verticalScale(12),
      phone: verticalScale(14),
      largePhone: verticalScale(16),
      tablet: verticalScale(20),
      default: verticalScale(16),
    }),
  },

  // News cards
  newsCard: {
    padding: cardSpacing.padding,
    margin: cardSpacing.margin,

    headerMargin: getResponsiveValue({
      smallPhone: verticalScale(12),
      phone: verticalScale(14),
      largePhone: verticalScale(16),
      tablet: verticalScale(20),
      default: verticalScale(16),
    }),

    iconMargin: getResponsiveValue({
      smallPhone: scale(12),
      phone: scale(14),
      largePhone: scale(16),
      tablet: scale(20),
      default: scale(16),
    }),
  },

  // Scroll content
  scrollContent: {
    paddingHorizontal: containerSpacing.horizontal,
    paddingBottom: containerSpacing.bottom,
  },

  // Section spacing
  section: {
    marginBottom: listSpacing.sectionGap,
  },
};

// Percentage-based responsive helpers
export const percentageSpacing = {
  // Screen percentage padding
  screenPadding: {
    xs: responsiveWidth(2),      // 2% of screen width
    sm: responsiveWidth(4),      // 4% of screen width
    md: responsiveWidth(6),      // 6% of screen width
    lg: responsiveWidth(8),      // 8% of screen width
    xl: responsiveWidth(10),     // 10% of screen width
  },

  // Container max widths
  containerWidth: {
    full: responsiveWidth(100),   // Full width
    wide: responsiveWidth(90),    // 90% width
    normal: responsiveWidth(85),  // 85% width
    narrow: responsiveWidth(75),  // 75% width
  },

  // Vertical spacing based on screen height
  verticalSpacing: {
    xs: responsiveHeight(1),      // 1% of screen height
    sm: responsiveHeight(2),      // 2% of screen height
    md: responsiveHeight(3),      // 3% of screen height
    lg: responsiveHeight(4),      // 4% of screen height
    xl: responsiveHeight(5),      // 5% of screen height
  },
};

// Safe spacing (accounting for safe areas)
export const safeSpacing = {
  top: getResponsiveValue({
    smallPhone: verticalScale(20),
    phone: verticalScale(24),
    largePhone: verticalScale(28),
    tablet: verticalScale(32),
    default: verticalScale(28),
  }),

  bottom: getResponsiveValue({
    smallPhone: verticalScale(16),
    phone: verticalScale(20),
    largePhone: verticalScale(24),
    tablet: verticalScale(28),
    default: verticalScale(24),
  }),

  horizontal: containerSpacing.horizontal,
};

