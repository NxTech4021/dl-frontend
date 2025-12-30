/**
 * User Name Colors Utility
 *
 * Provides deterministic color assignment for users in group chats.
 * Each user gets a consistent color based on their user ID hash.
 * Admin users receive a special gold/amber color to stand out.
 */

// 50 carefully curated colors with good contrast on light gray backgrounds (#F3F4F6)
// Colors are distributed across the spectrum for visual distinction
const USER_NAME_COLORS = [
  '#C23B22', // Vermilion
  '#B84A32', // Terra cotta
  '#B5651D', // Light brown
  '#A0522D', // Sienna
  '#CC7722', // Ochre
  '#B8860B', // Dark goldenrod
  '#9B870C', // Dark yellow
  '#808000', // Olive
  '#6B8E23', // Olive drab
  '#556B2F', // Dark olive green
  '#228B22', // Forest green
  '#2E8B57', // Sea green
  '#20B2AA', // Light sea green
  '#008B8B', // Dark cyan
  '#008080', // Teal
  '#007B7F', // Skobeloff
  '#0077B6', // Cerulean
  '#006D77', // Dark cyan variant
  '#4682B4', // Steel blue
  '#4169E1', // Royal blue
  '#3B5998', // Facebook blue
  '#483D8B', // Dark slate blue
  '#6A5ACD', // Slate blue
  '#7B68EE', // Medium slate blue
  '#6B5B95', // Purple haze
  '#8A2BE2', // Blue violet
  '#9400D3', // Dark violet
  '#9932CC', // Dark orchid
  '#8B008B', // Dark magenta
  '#A52A6A', // Maroon variant
  '#C71585', // Medium violet red
  '#DB2777', // Pink 600
  '#E91E63', // Material pink
  '#DC143C', // Crimson
  '#B22234', // Cardinal
  '#8B0000', // Dark red
  '#7C3238', // Tuscan red
  '#704214', // Sepia
  '#8B4513', // Saddle brown
  '#A0522D', // Sienna variant
  '#CD853F', // Peru
  '#D2691E', // Chocolate
  '#E07020', // Pumpkin
  '#E65100', // Orange 800
  '#BF360C', // Deep orange 900
  '#5D4037', // Brown 700
  '#455A64', // Blue gray 700
  '#37474F', // Blue gray 800
  '#546E7A', // Blue gray 600
  '#607D8B', // Blue gray 500
];

// Special color for admin users (amber/gold)
const ADMIN_COLOR = '#D97706';

/**
 * Generates a deterministic color for a user based on their ID.
 * Admin users always receive a special gold/amber color.
 *
 * @param userId - The user's unique identifier (falls back to name if ID unavailable)
 * @param isAdmin - Whether the user is an admin (ADMIN, SUPER_ADMIN, SUPERADMIN)
 * @returns A hex color string
 */
export const getUserNameColor = (
  userId: string,
  isAdmin: boolean = false
): string => {
  if (isAdmin) return ADMIN_COLOR;

  // Handle empty or undefined userId
  if (!userId) return USER_NAME_COLORS[0];

  // BKDRHash algorithm - simple and effective for string hashing
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return USER_NAME_COLORS[Math.abs(hash) % USER_NAME_COLORS.length];
};

/**
 * Gets a color from a string (for backward compatibility with GroupAvatarStack).
 * This is an alias for getUserNameColor without admin handling.
 *
 * @param str - Any string to generate a color from (typically user ID or name)
 * @returns A hex color string
 */
export const getColorFromString = (str: string): string => {
  return getUserNameColor(str, false);
};

// Export the admin color for potential use elsewhere
export const ADMIN_NAME_COLOR = ADMIN_COLOR;

// Export the color array for testing or custom implementations
export const NAME_COLOR_PALETTE = USER_NAME_COLORS;
