import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';

export interface SeasonUser {
  id: string;
  name?: string;
  image?: string;
}

export interface SeasonMembership {
  id: string;
  userId: string;
  seasonId: string;
  divisionId?: string;
  status: string;
  joinedAt: Date;
  withdrawalReason?: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  user?: SeasonUser;
}

export interface Season {
  id: string;
  name: string;
  startDate?: string | Date;
  endDate?: string | Date;
  regiDeadline?: string | Date;
  entryFee: number | string;
  description?: string;
  registeredUserCount: number;
  
  // Bools
  status: 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
  isActive: boolean;
  paymentRequired: boolean;
  promoCodeSupported: boolean;
  withdrawalEnabled: boolean;
  
  // Relations
  memberships?: SeasonMembership[];
  categories: Category[];
  leagues: League[];
  waitlistId?: string;
  _count?: {
    memberships: number;
  };
  
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Category {
  id: string;
  name: string;
  leagueId?: string;
  genderRestriction: string;
  matchFormat?: string;
  maxPlayers?: number;
  maxTeams?: number;
  game_type?: string;
  gender_category?: string;
  isActive: boolean;
}

export interface League {
  id: string;
  name: string;
  sportType: string;
  gameType: string;
  status: string;
}

export interface SeasonResponse {
  success: boolean;
  data: Season[];
  message: string;
}

export class SeasonService {
  /**
   * Fetch all seasons
   */
  static async fetchAllSeasons(): Promise<Season[]> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('SeasonService: API URL:', `${backendUrl}/api/season`);

      
      const response = await authClient.$fetch(`${backendUrl}/api/season`, {
        method: 'GET',
      });

      console.log('SeasonService: Raw API response:', response);

      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        
        // console.log('SeasonService: Debug - response structure:', {
        //   hasData: 'data' in apiResponse,
        //   hasError: 'error' in apiResponse,
        //   dataType: typeof apiResponse.data,
        //   dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : 'no data',
        //   isArray: Array.isArray(apiResponse.data),
        //   responseKeys: Object.keys(apiResponse)
        // });
        
        // Handle direct array response (from backend controller)
        if (Array.isArray(apiResponse)) {
          console.log('SeasonService: Successfully fetched seasons (direct array):', apiResponse.length);
          return apiResponse;
        }
        
        // Handle wrapped response structure: { data: [...], error: null }
        if (apiResponse.data && Array.isArray(apiResponse.data)) {
          console.log('SeasonService: Successfully fetched seasons (wrapped):', apiResponse.data.length);
          return apiResponse.data;
        }
        
        // Handle authClient.$fetch wrapped response structure
        if (apiResponse.data && apiResponse.data.success && Array.isArray(apiResponse.data.data)) {
          console.log('SeasonService: Successfully fetched seasons (authClient wrapped):', apiResponse.data.data.length);
          return apiResponse.data.data;
        }
        
        // Handle better-auth response wrapper: { data: [...], error: null }
        if (apiResponse.data && Array.isArray(apiResponse.data) && apiResponse.error === null) {
          console.log('SeasonService: Successfully fetched seasons (better-auth wrapper):', apiResponse.data.length);
          return apiResponse.data;
        }
        
        // Generic fallback: if there's a data property that's an array, use it
        if (apiResponse.data && Array.isArray(apiResponse.data)) {
          console.log('SeasonService: Successfully fetched seasons (generic fallback):', apiResponse.data.length);
          return apiResponse.data;
        }
      }

      console.warn('SeasonService: No seasons found or invalid response');
      console.warn('SeasonService: Full response object:', JSON.stringify(response, null, 2));
      return [];
    } catch (error) {
      console.error('SeasonService: Error fetching seasons:', error);
      return [];
    }
  }

  /**
   * Fetch seasons for a specific category
   */
static async fetchSeasonsByCategory(categoryId: string): Promise<Season[]> {
  try {
    console.log('SeasonService: Fetching seasons for category:', categoryId);
    const allSeasons = await this.fetchAllSeasons();
    console.log('SeasonService: All seasons fetched:', allSeasons.length);

    // Filter seasons that include this category
    const filteredSeasons = allSeasons.filter(season =>
      season.categories?.some(cat => cat.id === categoryId)
    );

    console.log('SeasonService: Filtered seasons for category:', filteredSeasons.length);
    console.log(
      'SeasonService: Category IDs in seasons:',
      allSeasons.map(s => s.categories?.map(c => c.id))
    );

    return filteredSeasons;
  } catch (error) {
    console.error('SeasonService: Error fetching seasons by category:', error);
    return [];
  }
}

  /**
   * Fetch seasons for a specific league
   */
  static async fetchSeasonsByLeague(leagueId: string): Promise<Season[]> {
  try {
    const allSeasons = await this.fetchAllSeasons();

    // ✅ Updated for many-to-many
    const filteredSeasons = allSeasons.filter(season =>
      season.leagues?.some(league => league.id === leagueId)
    );

    return filteredSeasons;
  } catch (error) {
    console.error('SeasonService: Error fetching seasons by league:', error);
    return [];
  }
}

  //Register Player to a season 
static async registerForSeason(seasonId: string, userId?: string, payLater: boolean = false): Promise<boolean> {
  try {
    const backendUrl = getBackendBaseURL();
    console.log('SeasonService: Registering for season:', seasonId, 'payLater:', payLater);


    const body: any = {};
    if (userId) body.userId = userId; // optional if backend reads from auth token
    body.seasonId = seasonId;
    if (payLater) body.payLater = true;

    const response = await authClient.$fetch(`${backendUrl}/api/season/player/register`, {
      method: 'POST',
      body
    });

    
    console.log('SeasonService: Registration response:', JSON.stringify(response, null, 2));

    const apiResponse = response as any;
    
    // Check for singles registration response (has membership)
    let membership = null;
    if (apiResponse?.data?.data?.membership) {
      membership = apiResponse.data.data.membership;
    } else if (apiResponse?.data?.membership) {
      membership = apiResponse.data.membership;
    } else if (apiResponse?.membership) {
      membership = apiResponse.membership;
    }

    // Check for doubles registration response (has partnership and memberships)
    let partnership = null;
    let memberships = null;
    if (apiResponse?.data?.data?.partnership || apiResponse?.data?.data?.memberships) {
      partnership = apiResponse.data.data.partnership;
      memberships = apiResponse.data.data.memberships;
    } else if (apiResponse?.data?.partnership || apiResponse?.data?.memberships) {
      partnership = apiResponse.data.partnership;
      memberships = apiResponse.data.memberships;
    } else if (apiResponse?.partnership || apiResponse?.memberships) {
      partnership = apiResponse.partnership;
      memberships = apiResponse.memberships;
    }

    // Success if we have either membership (singles) or partnership/memberships (doubles)
    if (membership || (partnership && memberships)) {
      console.log('SeasonService: Registration successful for season:', seasonId);
      return true;
    }

    console.warn('SeasonService: Registration response unexpected:', response);
    return false;
  } catch (error) {
    console.error('SeasonService: Error registering for season:', error);
    throw error;
  }
}

  /**
   * Get seasons grouped by status
   */
  static groupSeasonsByStatus(seasons: Season[]): {
    active: Season[];
    upcoming: Season[];
    finished: Season[];
  } {
    const active: Season[] = [];
    const upcoming: Season[] = [];
    const finished: Season[] = [];

    seasons.forEach(season => {
      switch (season.status) {
        case 'ACTIVE':
          active.push(season);
          break;
        case 'UPCOMING':
          upcoming.push(season);
          break;
        case 'FINISHED':
        case 'CANCELLED':
          finished.push(season);
          break;
      }
    });

    return { active, upcoming, finished };
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('SeasonService: Error formatting date:', error);
      return dateString;
    }
  }

  /**
   * Format date range for display
   */
  static formatDateRange(startDate: string, endDate: string): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    return `${start} – ${end}`;
  }

  /**
   * Get button text based on season status
   */
  static getButtonText(status: Season['status']): string {
    switch (status) {
      case 'ACTIVE':
        return 'Register';
      case 'UPCOMING':
        return 'Join Waitlist';
      case 'FINISHED':
      case 'CANCELLED':
        return 'View Standings';
      default:
        return 'View Details';
    }
  }

  /**
   * Get button color based on season status
   */
  static getButtonColor(status: Season['status']): string {
    switch (status) {
      case 'ACTIVE':
        return '#A04DFE';
      case 'UPCOMING':
        return '#000000';
      case 'FINISHED':
      case 'CANCELLED':
        return '#B2B2B2';
      default:
        return '#6B7280';
    }
  }

  /**
   * Get season badge emoji based on status
   */
  static getSeasonBadge(status: Season['status'], seasonName: string): string {
    switch (status) {
      case 'ACTIVE':
        return '🏆';
      case 'UPCOMING':
        return '🌱';
      case 'FINISHED':
        return '🍂';
      case 'CANCELLED':
        return '❌';
      default:
        return '📅';
    }
  }

  /**
   * Check if registration is still open
   */
  static isRegistrationOpen(season: Season): boolean {
    if (season.status !== 'ACTIVE') return false;
    
    if (season.regiDeadline) {
      const deadline = new Date(season.regiDeadline);
      const now = new Date();
      return now <= deadline;
    }
    
    return true;
  }
}
