/**
 * ProfileConstants - Configuration constants for profile screen
 *
 * CRITICAL: These constants control the visual layout and are used in
 * complex positioning calculations. DO NOT modify these values without
 * understanding their impact on the entire visual layout.
 */

/**
 * Curve configuration for the orange header background
 * Used in SVG path generation - modifying these will break the header design
 */
export const CURVE_CONFIG = {
  HEIGHT: 200,
  DEPTH: 0,
  START_Y: 130,
} as const;

/**
 * Sport-specific colors used throughout the profile
 * These must match the theme sport colors
 */
export const SPORT_COLORS = {
  Tennis: '#A2E047',
  Pickleball: '#A04DFE',
  Padel: '#4DABFE',
} as const;

/**
 * Generate curved SVG path for header background
 *
 * CRITICAL: This function contains mathematical calculations for the
 * curved header design. Modifying this will break the visual layout.
 *
 * @param width - Screen width for responsive curve generation
 * @returns SVG path string for the curved header
 */
export const generateCurvePath = (width: number): string => {
  const { HEIGHT, DEPTH, START_Y } = CURVE_CONFIG;

  // Safety check for width to prevent NaN issues
  const safeWidth = !isNaN(width) && width > 0 ? width : 300; // Default fallback width

  return `M0,${HEIGHT} L0,${START_Y} Q${safeWidth/2},${DEPTH} ${safeWidth},${START_Y} L${safeWidth},${START_Y} L${safeWidth},${HEIGHT} Z`;
};

/**
 * Game type options for dropdowns
 */
export const GAME_TYPE_OPTIONS = ['Singles', 'Doubles'] as const;

/**
 * Default sport for initialization
 */
export const DEFAULT_SPORT = 'Tennis' as const;

/**
 * Profile section identifiers
 */
export const PROFILE_SECTIONS = {
  HEADER: 'header',
  STATS: 'stats',
  DMR: 'dmr',
  LEAGUE_STATS: 'league_stats',
  ACHIEVEMENTS: 'achievements',
  MATCHES: 'matches',
} as const;

/**
 * Loading states
 */
export const LOADING_STATES = {
  INITIAL: 'initial',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

/**
 * Avatar configuration
 * CRITICAL: These values are used in complex positioning calculations
 */
export const AVATAR_CONFIG = {
  SIZE: 100,
  BORDER_RADIUS: 50,
  MARGIN_TOP: -200, // Critical negative margin for overlay effect
  Z_INDEX: 15,
} as const;

/**
 * Edit icon positioning
 * CRITICAL: These precise pixel values position the edit icon
 */
export const EDIT_ICON_CONFIG = {
  BOTTOM: -9,
  RIGHT: -7,
  PADDING: 4,
} as const;