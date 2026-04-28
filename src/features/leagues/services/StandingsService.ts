import axiosInstance from '@/lib/endpoints';

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
  partnerId?: string;
  partnerName?: string;
  partnerImage?: string;
  isActive?: boolean;
  disbandedAt?: string | null;
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
      console.log('Fetching standings for division:', divisionId);
      console.log('API URL:', `/api/standings/division/${divisionId}`);

      const response = await axiosInstance.get(`/api/standings/division/${divisionId}`);

      const data = response.data;

      if (data && data.success && data.data) {
        console.log('Found', data.data.length, 'standings for division', divisionId);
        return data.data;
      }

      if (Array.isArray(data)) {
        console.log('Found', data.length, 'standings for division', divisionId);
        return data;
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
      const response = await axiosInstance.get(`/api/division/season/${seasonId}`);

      const divisionsData = response.data;

      let divisions: Division[] = [];
      if (divisionsData?.success && divisionsData?.data) {
        divisions = divisionsData.data;
      } else if (Array.isArray(divisionsData?.data)) {
        divisions = divisionsData.data;
      } else if (Array.isArray(divisionsData)) {
        divisions = divisionsData;
      }

      if (!divisions.length) {
        console.log('No divisions found for season:', seasonId);
        return [];
      }

      console.log('Found', divisions.length, 'divisions for season', seasonId);
      
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
      const response = await axiosInstance.get(`/api/division/users/${userId}`);

      const assignmentsData = response.data;

      let assignments: any[] = [];
      if (assignmentsData?.success && assignmentsData?.data) {
        assignments = assignmentsData.data;
      } else if (Array.isArray(assignmentsData?.data)) {
        assignments = assignmentsData.data;
      } else if (Array.isArray(assignmentsData)) {
        assignments = assignmentsData;
      }

      if (assignments.length === 0) {
        console.log('StandingsService: No division assignments found for user:', userId);
        return [];
      }

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
      const response = await axiosInstance.get(`/api/standings/${userId}/division/${divisionId}`);

      const data = response.data;

      if (data && data.success && data.data) {
        return data.data;
      }

      if (data && !data.success) {
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching player standing:', error);
      return null;
    }
  }
}
