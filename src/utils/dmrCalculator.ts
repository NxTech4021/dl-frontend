/**
 * DMR (Deuce Match Rating) Calculator Utility
 *
 * Provides sport-specific DMR calculations for singles, doubles, and team ratings.
 * Ensures consistency across all screens that display player ratings.
 */

export interface SkillRatings {
  [sport: string]: {
    singles?: number | null;
    doubles?: number | null;
    rating?: number;
    confidence?: string;
    rd?: number;
  };
}

export interface Season {
  id: string;
  name: string;
  categories?: Array<{
    name?: string;
    sport?: string;
    matchFormat?: string;
    game_type?: string;
  }>;
  leagues?: Array<{
    sportType?: string;
  }>;
  sportType?: string;
}

/**
 * Extract sport from season data
 *
 * Attempts to determine sport from:
 * 1. Category name (e.g., "Men's Doubles Pickleball")
 * 2. Category sport field
 * 3. Season sportType
 * 4. Fallback to 'pickleball'
 */
export function getSeasonSport(season: Season | null): string {
  if (!season) {
    return 'pickleball'; // Default fallback
  }

  // Primary: sport stored in league's sportType field
  // This is the authoritative source — category.game_type stores the match format
  // (e.g. 'doubles'), not the sport name
  if (season.leagues && season.leagues.length > 0) {
    const sportType = season.leagues[0]?.sportType?.toLowerCase();
    if (sportType === 'tennis' || sportType === 'padel' || sportType === 'pickleball') {
      return sportType;
    }
  }

  // Fallback: check top-level sportType
  if (season.sportType) {
    const sportType = season.sportType.toLowerCase();
    if (sportType === 'tennis' || sportType === 'padel' || sportType === 'pickleball') {
      return sportType;
    }
  }

  // Fallback: scan category names for sport keyword
  if (season.categories && season.categories.length > 0) {
    for (const category of season.categories) {
      if (category.name) {
        const categoryName = category.name.toLowerCase();
        if (categoryName.includes('tennis')) return 'tennis';
        if (categoryName.includes('padel')) return 'padel';
        if (categoryName.includes('pickleball')) return 'pickleball';
      }
    }
  }

  // Final fallback
  return 'pickleball';
}

/**
 * Get doubles DMR for a specific sport
 *
 * @param skillRatings - Player's skill ratings object from API
 * @param sport - Sport to get rating for (e.g., 'pickleball', 'tennis', 'padel')
 * @returns DMR as string (e.g., '3200') or 'N/A' if not available
 *
 * @example
 * const dmr = getDoublesDMR(player.skillRatings, 'pickleball');
 * // Returns: '3200' or 'N/A'
 */
export function getDoublesDMR(
  skillRatings: SkillRatings | null | undefined,
  sport: string
): string {
  if (!skillRatings) {
    return 'N/A';
  }

  const normalizedSport = sport.toLowerCase();
  const sportRating = skillRatings[normalizedSport];

  if (!sportRating || sportRating.doubles === null || sportRating.doubles === undefined) {
    return 'N/A';
  }

  // skillRatings from API are already transformed (÷ 1000)
  // Multiply by 1000 for display (2.5 → 2500, 3.2 → 3200)
  return Math.round(sportRating.doubles * 1000).toString();
}

/**
 * Get singles DMR for a specific sport
 *
 * @param skillRatings - Player's skill ratings object from API
 * @param sport - Sport to get rating for
 * @returns DMR as string (e.g., '2500') or 'N/A' if not available
 */
export function getSinglesDMR(
  skillRatings: SkillRatings | null | undefined,
  sport: string
): string {
  if (!skillRatings) {
    return 'N/A';
  }

  const normalizedSport = sport.toLowerCase();
  const sportRating = skillRatings[normalizedSport];

  if (!sportRating || sportRating.singles === null || sportRating.singles === undefined) {
    return 'N/A';
  }

  return Math.round(sportRating.singles * 1000).toString();
}

/**
 * Calculate Team DMR (average of captain and partner doubles rating for specific sport)
 *
 * @param captainSkillRatings - Captain's skill ratings
 * @param partnerSkillRatings - Partner's skill ratings
 * @param sport - Sport to calculate for (must match for both players)
 * @returns Team DMR as string or 'N/A' if either player missing rating
 *
 * @example
 * const teamDMR = getTeamDMR(captain.skillRatings, partner.skillRatings, 'pickleball');
 * // If captain has 3200 and partner has 2800:
 * // Returns: '3000' (average)
 */
export function getTeamDMR(
  captainSkillRatings: SkillRatings | null | undefined,
  partnerSkillRatings: SkillRatings | null | undefined,
  sport: string
): string {
  const captainDMR = getDoublesDMR(captainSkillRatings, sport);
  const partnerDMR = getDoublesDMR(partnerSkillRatings, sport);

  if (captainDMR === 'N/A' || partnerDMR === 'N/A') {
    return 'N/A';
  }

  // Calculate average and round
  const teamDMR = Math.round((parseInt(captainDMR) + parseInt(partnerDMR)) / 2);
  return teamDMR.toString();
}

/**
 * Check if player has rating for specific sport and type
 *
 * @param skillRatings - Player's skill ratings
 * @param sport - Sport to check
 * @param type - 'singles' or 'doubles'
 * @returns true if player has rating, false otherwise
 *
 * @example
 * if (!hasRatingForSport(partner.skillRatings, 'pickleball', 'doubles')) {
 *   showError('Partner needs pickleball doubles rating');
 * }
 */
export function hasRatingForSport(
  skillRatings: SkillRatings | null | undefined,
  sport: string,
  type: 'singles' | 'doubles'
): boolean {
  if (!skillRatings) {
    return false;
  }

  const normalizedSport = sport.toLowerCase();
  const sportRating = skillRatings[normalizedSport];

  if (!sportRating) {
    return false;
  }

  const rating = sportRating[type];
  return rating !== null && rating !== undefined;
}

/**
 * Get all sports a player has ratings for
 *
 * @param skillRatings - Player's skill ratings
 * @returns Array of sport names (lowercase)
 */
export function getAvailableSports(
  skillRatings: SkillRatings | null | undefined
): string[] {
  if (!skillRatings) {
    return [];
  }

  return Object.keys(skillRatings);
}

/**
 * Get common sports between two players
 *
 * @param player1SkillRatings - First player's ratings
 * @param player2SkillRatings - Second player's ratings
 * @returns Array of common sports (lowercase)
 */
export function getCommonSports(
  player1SkillRatings: SkillRatings | null | undefined,
  player2SkillRatings: SkillRatings | null | undefined
): string[] {
  const sports1 = getAvailableSports(player1SkillRatings);
  const sports2 = getAvailableSports(player2SkillRatings);

  return sports1.filter(sport => sports2.includes(sport));
}

/**
 * Format DMR for display with proper comma separation
 *
 * @param dmr - DMR value (string or number)
 * @returns Formatted DMR (e.g., '3,200' or 'N/A')
 */
export function formatDMR(dmr: string | number): string {
  if (dmr === 'N/A' || dmr === '-') {
    return dmr as string;
  }

  const numericDMR = typeof dmr === 'string' ? parseInt(dmr) : dmr;

  if (isNaN(numericDMR)) {
    return 'N/A';
  }

  return numericDMR.toLocaleString();
}
