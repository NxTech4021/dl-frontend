import { StandingsPlayer, StandingsTeam } from './types';

/**
 * Groups players by matching stats for doubles display.
 * Players with identical points, wins, losses, and played counts are grouped as a team.
 * Only pairs (exactly 2 players) are grouped together.
 */
export function groupPlayersByTeam(players: StandingsPlayer[]): StandingsTeam[] {
  if (players.length === 0) return [];

  const groups = new Map<string, StandingsPlayer[]>();

  // Group by stats key (points-wins-losses-played)
  players.forEach((player) => {
    const key = `${player.points}-${player.wins}-${player.losses}-${player.played}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(player);
  });

  // Convert to StandingsTeam array
  const teams: StandingsTeam[] = [];
  groups.forEach((teamPlayers) => {
    // Sort players by rank first
    const sortedPlayers = teamPlayers.sort((a, b) => a.rank - b.rank);

    // Only create pairs (exactly 2 players per team)
    // If there are more than 2 players with same stats, create separate teams
    for (let i = 0; i < sortedPlayers.length; i += 2) {
      const pair = sortedPlayers.slice(i, i + 2);
      teams.push({
        rank: Math.min(...pair.map((p) => p.rank)),
        players: pair,
        played: pair[0].played,
        wins: pair[0].wins,
        losses: pair[0].losses,
        points: pair[0].points,
      });
    }
  });

  // Sort by rank
  return teams.sort((a, b) => a.rank - b.rank);
}

/**
 * Formats a player name, optionally abbreviated.
 * Full: "John Smith"
 * Abbreviated: "John S."
 */
export function formatPlayerName(name: string, abbreviated: boolean = false): string {
  if (!name) return 'Unknown';

  if (!abbreviated) return name;

  const parts = name.split(' ');
  if (parts.length === 1) return name;

  return `${parts[0]} ${parts[1]?.[0] || ''}.`;
}

/**
 * Formats team names for display (comma-separated abbreviated names).
 * Example: "John S., Jane D."
 */
export function formatTeamNames(players: Array<{ name: string }>): string {
  return players
    .map((p) => formatPlayerName(p.name, true))
    .join(', ');
}

/**
 * Formats gender category for display.
 * MALE -> "Men's"
 * FEMALE -> "Women's"
 * MIXED -> "Mixed"
 */
export function formatGenderCategory(gender: string): string {
  const upperGender = gender?.toUpperCase() || '';
  if (upperGender === 'MALE' || upperGender === 'MENS' || upperGender === 'MEN') return "Men's";
  if (upperGender === 'FEMALE' || upperGender === 'WOMENS' || upperGender === 'WOMEN') return "Women's";
  if (upperGender === 'MIXED') return 'Mixed';
  return gender;
}

/**
 * Gets the game type label with gender prefix.
 * Example: "Men's Singles", "Women's Doubles", "Mixed Doubles"
 */
export function getGameTypeLabel(gameType: string, genderCategory?: string): string {
  if (!gameType) return '';

  const gameTypeUpper = gameType?.toUpperCase();
  const genderPrefix = genderCategory ? formatGenderCategory(genderCategory) + ' ' : '';

  if (gameTypeUpper === 'SINGLES') {
    return `${genderPrefix}Singles`;
  } else if (gameTypeUpper === 'DOUBLES') {
    return `${genderPrefix}Doubles`;
  }

  return '';
}

/**
 * Gets the ordinal suffix for a number.
 * 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th"
 */
export function getOrdinalSuffix(num: number): string {
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  return `${num}th`;
}

/**
 * Checks if the current user is in the standings.
 */
export function isUserInStandings(
  standings: StandingsPlayer[],
  groupedStandings: StandingsTeam[] | undefined,
  currentUserId: string | undefined
): boolean {
  if (!currentUserId) return false;

  // Check individual standings
  const inIndividualStandings = standings.some(
    (player) => player.playerId === currentUserId
  );

  // Check grouped standings (for doubles teams)
  const inGroupedStandings = groupedStandings?.some((team) =>
    team.players.some((player) => player.playerId === currentUserId)
  ) || false;

  return inIndividualStandings || inGroupedStandings;
}
