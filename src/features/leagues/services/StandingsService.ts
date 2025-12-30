import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';

export interface StandingEntry {
  id: string;
  odlayerId: string;
  odlayerName: string;
  odlayerImage: string | null;
  rank: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  matchesRemaining: number;
  totalPoints: number;
  winPoints: number;
  setPoints: number;
  completionBonus: number;
  setsWon: number;
  setsLost: number;
  setDifferential: number;
  previousRank: number;
  rankChange: number;
  userId?: string;
  user?: {
    id: string;
    name: string;
    username?: string;
    image?: string;
  };
}

export interface Division {
  id: string;
  name: string;
  level: number;
  seasonId: string;
  leagueId?: string;
  gameType: 'SINGLES' | 'DOUBLES';
  genderCategory?: string;
  currentSinglesCount?: number;
  currentDoublesCount?: number;
  maxSinglesPlayers?: number;
  maxDoublesTeams?: number;
  season?: {
    id: string;
    name: string;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
  };
  league?: {
    id: string;
    name: string;
    sportType: 'TENNIS' | 'PADEL' | 'PICKLEBALL';
  };
}

export interface DivisionWithStandings {
  division: Division;
  standings: StandingEntry[];
  userStanding?: StandingEntry;
}

export class StandingsService {
  /**
   * Get standings for a specific division
   */
  static async getDivisionStandings(divisionId: string): Promise<StandingEntry[]> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('🔍 Fetching standings for division:', divisionId);
      console.log('🔍 Backend URL:', `${backendUrl}/api/standings/division/${divisionId}`);
      
      const response = await fetch(`${backendUrl}/api/standings/division/${divisionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('🔍 Standings API response:', JSON.stringify(data, null, 2));

      if (data && data.success && data.data) {
        console.log('✅ Found', data.data.length, 'standings for division', divisionId);
        return data.data;
      }

      // Try with auth client as fallback
      const authResponse = await authClient.$fetch(`${backendUrl}/api/standings/division/${divisionId}`, {
        method: 'GET',
      });

      if (authResponse && (authResponse as any).data) {
        return (authResponse as any).data.data || (authResponse as any).data;
      }

      return [];
    } catch (error) {
      console.error('Error fetching division standings:', error);
      return [];
    }
  }

  /**
   * Get all divisions for a season with their standings
   */
  static async getSeasonDivisionsWithStandings(seasonId: string, userId?: string): Promise<DivisionWithStandings[]> {
    try {
      const backendUrl = getBackendBaseURL();
      
      console.log('🔍 Fetching divisions for season:', seasonId);
      
      // First fetch all divisions for this season
      const divisionsResponse = await fetch(`${backendUrl}/api/division/season/${seasonId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const divisionsData = await divisionsResponse.json();
      console.log('🔍 Divisions API response:', JSON.stringify(divisionsData, null, 2));
      
      if (!divisionsData || !divisionsData.success || !divisionsData.data) {
        console.log('❌ No divisions found for season:', seasonId);
        return [];
      }

      const divisions: Division[] = divisionsData.data;
      console.log('✅ Found', divisions.length, 'divisions for season', seasonId);
      
      // Fetch standings for each division
      const divisionsWithStandings: DivisionWithStandings[] = await Promise.all(
        divisions.map(async (division) => {
          const standings = await this.getDivisionStandings(division.id);
          
          // Find user's standing if userId provided
          const userStanding = userId 
            ? standings.find(s => s.userId === userId || s.odlayerId === userId || s.user?.id === userId)
            : undefined;

          return {
            division,
            standings,
            userStanding,
          };
        })
      );

      // Sort divisions by level
      return divisionsWithStandings.sort((a, b) => a.division.level - b.division.level);
    } catch (error) {
      console.error('Error fetching season divisions with standings:', error);
      return [];
    }
  }

  /**
   * Get user's standings across all their divisions
   */
  static async getUserStandings(userId: string): Promise<DivisionWithStandings[]> {
    try {
      const backendUrl = getBackendBaseURL();

      // Fetch user's division assignments
      const assignmentsResponse = await authClient.$fetch(`${backendUrl}/api/division/users/${userId}`, {
        method: 'GET',
      });

      // authClient.$fetch wraps response in { data: { success, data } }
      const responseWrapper = assignmentsResponse as any;
      const assignmentsData = responseWrapper?.data || responseWrapper;

      console.log('📊 StandingsService: Raw response:', JSON.stringify(responseWrapper, null, 2).substring(0, 500));
      console.log('📊 StandingsService: Assignments data:', JSON.stringify(assignmentsData, null, 2).substring(0, 500));

      // Handle nested data structure from authClient
      let assignments: any[] = [];
      if (assignmentsData?.success && assignmentsData?.data) {
        assignments = assignmentsData.data;
      } else if (Array.isArray(assignmentsData?.data)) {
        assignments = assignmentsData.data;
      } else if (Array.isArray(assignmentsData)) {
        assignments = assignmentsData;
      }

      if (assignments.length === 0) {
        console.log('📊 StandingsService: No division assignments found for user:', userId);
        return [];
      }

      console.log('📊 StandingsService: Found', assignments.length, 'assignments for user:', userId);
      
      // Fetch standings for each assigned division
      const divisionsWithStandings: DivisionWithStandings[] = await Promise.all(
        assignments.map(async (assignment: any) => {
          const division = assignment.division;
          const standings = await this.getDivisionStandings(division.id);
          
          // Find user's standing
          const userStanding = standings.find(s => 
            s.userId === userId || s.odlayerId === userId || s.user?.id === userId
          );

          return {
            division,
            standings,
            userStanding,
          };
        })
      );

      // Sort by division level
      return divisionsWithStandings.sort((a, b) => a.division.level - b.division.level);
    } catch (error) {
      console.error('Error fetching user standings:', error);
      return [];
    }
  }

  /**
   * Get player's standing in a specific division
   */
  static async getPlayerStanding(userId: string, divisionId: string): Promise<StandingEntry | null> {
    try {
      const backendUrl = getBackendBaseURL();
      const response = await fetch(`${backendUrl}/api/standings/${userId}/division/${divisionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data && data.success && data.data) {
        return data.data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching player standing:', error);
      return null;
    }
  }
}
