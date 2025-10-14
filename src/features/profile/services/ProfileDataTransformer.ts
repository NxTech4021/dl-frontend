import type { GameData, UserData } from '../types';
import { getPrimarySkillLevel } from '../utils/skillLevelUtils';

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
    console.log('Transforming profile data:', profileData);
    console.log('Skill ratings:', profileData?.skillRatings);

    const userData = profileData ? {
      name: profileData.name || 'No name available',
      username: profileData.username || profileData.displayUsername || 'No username',
      bio: profileData.bio || 'No bio added yet.',
      location: profileData.area || 'Location not set',
      gender: profileData.gender || 'Gender not set',
      skillLevel: getPrimarySkillLevel(profileData.skillRatings), // Calculate from actual skill ratings
      skillRatings: profileData.skillRatings || {}, // Pass through the actual skill ratings for DMR section
      sports: profileData.sports && profileData.sports.length > 0
        ? profileData.sports.map(sport => sport.charAt(0).toUpperCase() + sport.slice(1))
        : ['No sports yet'],
      activeSports: profileData.sports && profileData.sports.length > 0
        ? profileData.sports.map(sport => sport.charAt(0).toUpperCase() + sport.slice(1))
        : [],
      profileImage: profileData.image || profileData.profileImage || undefined,
      achievements: achievements || [],
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
    };

    console.log('Final userData:', userData);
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
        return Math.round(rating.singles * 1000); // Convert to display format
      } else if (type === 'doubles' && rating.doubles) {
        return Math.round(rating.doubles * 1000); // Convert to display format
      } else if (rating.rating) {
        // Fallback to general rating if specific type not available
        return Math.round(rating.rating * 1000);
      }
    }
    return 0; // Default to 0 if no rating available
  }

  /**
   * Calculate win rate from profile and match data
   * Preserves exact calculation logic from original
   */
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