import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL, logNetworkConfig } from '@/src/config/network';

export interface League {
  id: string;
  name: string;
  location?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UPCOMING' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
  sportType: 'PADDLE' | 'PICKLEBALL' | 'TENNIS';
  joinType?: 'OPEN' | 'INVITE_ONLY' | 'MANUAL';
  gameType: 'SINGLES' | 'DOUBLES';
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  seasonCount?: number;
  categoryCount?: number;
}

export interface LeagueResponse {
  success: boolean;
  statusCode: number;
  data: {
    leagues: League[];
  };
  message: string;
}

export class LeagueService {
  // Fetch all leagues from the backend
  static async fetchAllLeagues(): Promise<League[]> {
    try {
      // Log network configuration for debugging
      logNetworkConfig();
      
      const backendUrl = getBackendBaseURL();
      console.log('🔍 LeagueService: Starting fetchAllLeagues');
      console.log('🔍 LeagueService: Backend URL:', backendUrl);
      console.log('🔍 LeagueService: Full API URL:', `${backendUrl}/api/league`);

      // Try with regular fetch first to debug
      console.log('🔍 LeagueService: Testing with regular fetch...');
      const regularFetchResponse = await fetch(`${backendUrl}/api/league`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔍 LeagueService: Regular fetch response status:', regularFetchResponse.status);
      console.log('🔍 LeagueService: Regular fetch response headers:', Object.fromEntries(regularFetchResponse.headers.entries()));
      
      const regularFetchData = await regularFetchResponse.json();
      console.log('🔍 LeagueService: Regular fetch data:', regularFetchData);

      // Use regular fetch data since it works
      if (regularFetchData && regularFetchData.success && regularFetchData.data && regularFetchData.data.leagues) {
        console.log('✅ LeagueService: Successfully found leagues via regular fetch:', regularFetchData.data.leagues.length);
        console.log('✅ LeagueService: Leagues data:', regularFetchData.data.leagues);
        return regularFetchData.data.leagues;
      }

      // Check auth client cookies
      const authCookies = authClient.getCookie();
      console.log('🔍 LeagueService: Auth client cookies:', authCookies);

      const response = await authClient.$fetch(`${backendUrl}/api/league`, {
        method: 'GET',
      });

      console.log('🔍 LeagueService: Raw API response:', response);
      console.log('🔍 LeagueService: Response type:', typeof response);
      console.log('🔍 LeagueService: Response keys:', response ? Object.keys(response) : 'null');

      // Handle the ApiResponse structure from backend
      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        console.log('🔍 LeagueService: API Response structure:', {
          success: apiResponse.success,
          status: apiResponse.status,
          hasData: !!apiResponse.data,
          dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : 'no data',
          message: apiResponse.message
        });

        if (apiResponse.success && apiResponse.data && apiResponse.data.leagues) {
          console.log('✅ LeagueService: Successfully found leagues:', apiResponse.data.leagues.length);
          console.log('✅ LeagueService: Leagues data:', apiResponse.data.leagues);
          return apiResponse.data.leagues;
        } else {
          console.log('❌ LeagueService: Response structure issue:', {
            success: apiResponse.success,
            hasData: !!apiResponse.data,
            hasLeagues: !!(apiResponse.data && apiResponse.data.leagues),
            dataContent: apiResponse.data
          });
        }
      } else {
        console.log('❌ LeagueService: Response is not an object or is null');
      }
      
      console.error('❌ LeagueService: No leagues data received from API');
      return [];
    } catch (error) {
      console.error('❌ LeagueService: Error fetching leagues:', error);
      console.error('❌ LeagueService: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      return [];
    }
  }

  /**
   * Fetch leagues filtered by sport type
   */
  static async fetchLeaguesBySport(sportType: 'PADDLE' | 'PICKLEBALL' | 'TENNIS'): Promise<League[]> {
    try {
      const allLeagues = await this.fetchAllLeagues();
      return allLeagues.filter(league => league.sportType === sportType);
    } catch (error) {
      console.error('LeagueService: Error fetching leagues by sport:', error);
      return [];
    }
  }

  /**
   * Fetch a specific league by ID
   */
  static async fetchLeagueById(leagueId: string): Promise<League | null> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('LeagueService: Fetching league by ID from:', `${backendUrl}/api/league/${leagueId}`);

      const response = await authClient.$fetch(`${backendUrl}/api/league/${leagueId}`, {
        method: 'GET',
      });

      console.log('LeagueService: League by ID API response:', response);

      // Handle the ApiResponse structure from backend
      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        if (apiResponse.success && apiResponse.data && apiResponse.data.league) {
          console.log('LeagueService: Setting league data:', apiResponse.data.league);
          return apiResponse.data.league as League;
        }
      }
      
      console.error('LeagueService: No league data received from API');
      return null;
    } catch (error) {
      console.error('LeagueService: Error fetching league by ID:', error);
      return null;
    }
  }

  /**
   * Join a league
   */
  static async joinLeague(leagueId: string, userId: string): Promise<boolean> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('LeagueService: Joining league at:', `${backendUrl}/api/league/join`);

      const response = await authClient.$fetch(`${backendUrl}/api/league/join`, {
        method: 'POST',
        body: {
          leagueId: leagueId,
          userId: userId
        }
      });

      console.log('LeagueService: Join league API response:', response);

      // Handle the ApiResponse structure from backend
      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        if (apiResponse.success || apiResponse.message?.includes('Successfully joined')) {
          console.log('LeagueService: Successfully joined league');
          return true;
        }
      }
      
      console.error('LeagueService: Failed to join league');
      return false;
    } catch (error) {
      console.error('LeagueService: Error joining league:', error);
      return false;
    }
  }
}
