import type { GameData, UserData, SetDetail } from '../types';
import { getPrimarySkillLevel } from '../utils/skillLevelUtils';

// Preferred order for sports tabs display
const SPORT_ORDER = ['Pickleball', 'Tennis', 'Padel'];

// API response type for rating history
interface RatingHistoryApiEntry {
  id: string;
  matchId: string | null;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  rdBefore: number | null;
  rdAfter: number | null;
  reason: string;
  notes: string | null;
  createdAt: string;
  matchDate: string | null;
  adversary: string | null;
  adversaryImage: string | null;
  result: 'W' | 'L' | null;
  setScores: Array<{
    setNumber: number;
    userGames: number;
    opponentGames: number;
    userWonSet: boolean;
    hasTiebreak: boolean;
    userTiebreak: number | null;
    opponentTiebreak: number | null;
  }>;
}

// ProfileDataTransformer - Handles data transformation logic

export class ProfileDataTransformer {
  /**
   * Transform API profile data to UI-compatible userData format
   * Preserves exact conditional logic and fallback patterns from original
   */
  static transformProfileToUserData(
    profileData: any,
    achievements: any[]
  ): UserData {
    // console.log('Transforming profile data:', profileData); // commented out for readability in the logs
    // console.log('Skill ratings:', profileData?.skillRatings);

    const userData = profileData ? {
      name: profileData.name || 'No name available',
      username: profileData.username || profileData.displayUsername || 'No username',
      bio: profileData.bio || 'No bio added yet.',
      location: profileData.area || 'Location not set',
      gender: profileData.gender || 'Gender not set',
      skillLevel: getPrimarySkillLevel(profileData.skillRatings), // Calculate from actual skill ratings
      skillRatings: profileData.skillRatings || {}, // Pass through the actual skill ratings for DMR section
      sports: profileData.sports && profileData.sports.length > 0
        ? profileData.sports
            .map((sport: string) => sport.charAt(0).toUpperCase() + sport.slice(1))
            .sort((a: string, b: string) => {
              const indexA = SPORT_ORDER.indexOf(a);
              const indexB = SPORT_ORDER.indexOf(b);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            })
        : ['No sports yet'],
      activeSports: profileData.sports && profileData.sports.length > 0
        ? profileData.sports
            .map((sport: string) => sport.charAt(0).toUpperCase() + sport.slice(1))
            .sort((a: string, b: string) => {
              const indexA = SPORT_ORDER.indexOf(a);
              const indexB = SPORT_ORDER.indexOf(b);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            })
        : [],
      profileImage: profileData.image || profileData.profileImage || undefined,
      achievements: achievements || [],
      leagueStats: profileData.leagueStats || null,
    } : {
      name: 'Loading...',
      username: 'loading',
      bio: 'Loading...',
      location: 'Loading...',
      gender: 'Loading...',
      skillLevel: 'Loading...',
      skillRatings: {},
      sports: [],
      activeSports: [],
      profileImage: undefined,
      achievements: [],
      leagueStats: null,
    };
    return userData;
  }

  /**
   * Get rating value for specific sport and type (singles/doubles)
   * Preserves exact rating calculation logic from original
   */
  static getRatingForType(
    userData: UserData,
    sport: string,
    type: 'singles' | 'doubles'
  ): number {
    if (userData?.skillRatings && userData.skillRatings[sport.toLowerCase()]) {
      const rating = userData.skillRatings[sport.toLowerCase()];

      // Check for specific singles/doubles rating first
      if (type === 'singles' && rating.singles) {
        return Math.round(rating.singles * 1000);
      } else if (type === 'doubles' && rating.doubles) {
        return Math.round(rating.doubles * 1000);
      } else if (rating.rating) {
        // Fallback to general rating if specific type not available
        return Math.round(rating.rating * 1000);
      }
    }
    return 0; // Default to 0 if no rating available
  }

  static calculateWinRate(userData: UserData, profileData: any): number {
    if (userData.name === 'Loading...') return 0; // Still loading

    // Check if user has match data
    const hasMatches = profileData?.totalMatches && profileData.totalMatches > 0;
    if (hasMatches) {
      // TODO: Calculate actual win rate from match history when matches exist
      return 0; // For now, return 0 until we have match data
    }
    return 0; // No matches yet
  }

  /**
   * Generate mock ELO data for graph display
   * Preserves exact mock data structure from original
   */
  static generateMockEloData(userData: UserData): GameData[] {
    return [
      {
        date: 'No matches yet',
        time: '',
        rating: 1400,
        ratingBefore: 1400,
        opponent: 'No data available',
        result: 'W' as const,
        score: '-',
        ratingChange: 0,
        league: 'Play your first match to see data here!',
        player1: userData.name || 'You',
        player2: 'No opponent',
        scores: {
          set1: { player1: null, player2: null },
          set2: { player1: null, player2: null },
          set3: { player1: null, player2: null }
        },
        status: 'completed' as const,
      }
    ];
  }

  /**
   * Transform rating history API response to GameData format
   */
  static transformRatingHistoryToGameData(
    entries: RatingHistoryApiEntry[],
    userName: string
  ): GameData[] {
    return entries
      .filter(entry => entry.matchId !== null) // Only include entries with matches
      .map(entry => {
        // Format date
        const matchDate = entry.matchDate ? new Date(entry.matchDate) : new Date(entry.createdAt);
        const formattedDate = matchDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const formattedTime = matchDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // Build score string from set scores
        const scoreString = entry.setScores
          .map(s => `${s.userGames}-${s.opponentGames}`)
          .join(', ');

        // Transform set scores to the legacy format for backward compatibility
        const scores = {
          set1: entry.setScores[0]
            ? { player1: entry.setScores[0].userGames, player2: entry.setScores[0].opponentGames }
            : { player1: null, player2: null },
          set2: entry.setScores[1]
            ? { player1: entry.setScores[1].userGames, player2: entry.setScores[1].opponentGames }
            : { player1: null, player2: null },
          set3: entry.setScores[2]
            ? { player1: entry.setScores[2].userGames, player2: entry.setScores[2].opponentGames }
            : { player1: null, player2: null },
        };

        // Transform setScores to SetDetail format
        const setDetails: SetDetail[] = entry.setScores.map(s => ({
          setNumber: s.setNumber,
          userGames: s.userGames,
          opponentGames: s.opponentGames,
          userWonSet: s.userWonSet,
          hasTiebreak: s.hasTiebreak,
          userTiebreak: s.userTiebreak,
          opponentTiebreak: s.opponentTiebreak,
        }));

        return {
          date: formattedDate,
          time: formattedTime,
          rating: entry.ratingAfter,
          ratingBefore: entry.ratingBefore,
          rdBefore: entry.rdBefore ?? undefined,
          rdAfter: entry.rdAfter ?? undefined,
          opponent: entry.adversary || 'Unknown',
          opponentImage: entry.adversaryImage ?? undefined,
          result: entry.result || (entry.delta > 0 ? 'W' : 'L'),
          score: scoreString || '-',
          ratingChange: entry.delta,
          league: '',
          player1: userName,
          player2: entry.adversary || 'Unknown',
          matchId: entry.matchId ?? undefined,
          scores,
          setDetails,
          status: 'completed' as const,
        };
      });
  }

  /**
   * Get game type options
   * Static options from original implementation
   */
  static getGameTypeOptions(): string[] {
    return ['Singles', 'Doubles'];
  }

  /**
   * Check if user should have active tab updated
   * Preserves exact logic from original useEffect
   */
  static shouldUpdateActiveTab(userData: UserData): string | null {
    if (userData?.sports && userData.sports.length > 0 && userData.sports[0] !== 'No sports yet') {
      return userData.sports[0];
    }
    return null;
  }
}