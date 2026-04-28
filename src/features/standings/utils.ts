import { StandingsPlayer, StandingsTeam } from './types';

/**
 * Groups players into teams for doubles display using partnership data.
 * Each player's `partnerId` field identifies their doubles partner.
 * Falls back to rank-adjacent pairing when no partnership data is available.
 */
export function groupPlayersByTeam(players: StandingsPlayer[]): StandingsTeam[] {
  if (players.length === 0) return [];

  // When the backend returns partnership-based rows (doubles), each entry already
  // contains both players — captain (playerId/name/image) and partner
  // (partnerId/partnerName/partnerImage). Build one team directly per entry.
  if (players[0].partnerName !== undefined || players[0].partnerImage !== undefined) {
    return players.map((player) => {
      const partnerPlayer: StandingsPlayer | null =
        player.partnerId
          ? {
              playerId: player.partnerId,
              name: player.partnerName || 'Unknown',
              image: player.partnerImage,
              rank: player.rank,
              played: player.played,
              wins: player.wins,
              losses: player.losses,
              points: player.points,
              isActive: player.isActive,
              isDisbanded: player.isDisbanded,
            }
          : null;
      return {
        rank: player.rank,
        players: partnerPlayer ? [player, partnerPlayer] : [player],
        played: player.played,
        wins: player.wins,
        losses: player.losses,
        points: player.points,
        isActive: player.isActive,
        isDisbanded: player.isDisbanded,
      };
    });
  }

  // Fallback: pair by partnerId within the player list (legacy / singles edge-case)
  const paired = new Set<string>();
  const teams: StandingsTeam[] = [];
  const playerMap = new Map<string, StandingsPlayer>();
  players.forEach((p) => playerMap.set(p.playerId, p));

  players.forEach((player) => {
    if (paired.has(player.playerId)) return;

    if (player.partnerId && playerMap.has(player.partnerId)) {
      const partner = playerMap.get(player.partnerId)!;
      paired.add(player.playerId);
      paired.add(partner.playerId);
      const pair = [player, partner].sort((a, b) => a.rank - b.rank);
      teams.push({
        rank: pair[0].rank,
        players: pair,
        played: Math.max(player.played, partner.played),
        wins: Math.max(player.wins, partner.wins),
        losses: Math.max(player.losses, partner.losses),
        points: Math.max(player.points, partner.points),
      });
    } else {
      paired.add(player.playerId);
      teams.push({
        rank: player.rank,
        players: [player],
        played: player.played,
        wins: player.wins,
        losses: player.losses,
        points: player.points,
      });
    }
  });

  return teams.sort((a, b) => a.rank - b.rank);
}

/**
 * Formats a player name, optionally abbreviated.
 * Full: "John Smith"
 * Abbreviated: "John S."
 * Returns "[Deleted User]" for null/undefined names.
 */
export function formatPlayerName(name: string | null | undefined, abbreviated: boolean = false): string {
  if (!name) return '[Deleted User]';

  if (!abbreviated) return name;

  const parts = name.split(' ');
  if (parts.length === 1) return name;

  return `${parts[0]} ${parts[1]?.[0] || ''}.`;
}

/**
 * Formats team names for display (comma-separated abbreviated names).
 * Example: "John S., Jane D."
 */
export function formatTeamNames(players: Array<{ name: string | null }>): string {
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
