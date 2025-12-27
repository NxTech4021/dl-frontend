import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL, logNetworkConfig } from '@/src/config/network';

export interface League {
  id: string;
  name: string;
  location?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'UPCOMING' | 'ONGOING' | 'FINISHED' | 'CANCELLED';
  sportType: 'PADEL' | 'PICKLEBALL' | 'TENNIS';
  joinType?: 'OPEN' | 'INVITE_ONLY' | 'MANUAL';
  gameType: 'SINGLES' | 'DOUBLES';
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  seasonCount?: number;
  categoryCount?: number;
  totalSeasonMemberships?: number;
  categories?: Array<{
    id: string;
    name: string;
    genderRestriction?: string;
    game_type?: string;
    gender_category?: string;
  }>;
  seasons?: Array<{
    id: string;
    name: string;
    status?: string;
  }>;
  memberships?: Array<{
    id: string;
    userId: string;
    seasonId: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
  _count?: {
    memberships: number;
    seasons: number;
  };
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
  // fetch all leagues from the backend
  static async fetchAllLeagues(): Promise<League[]> {
    try {
      // Log network configuration for debugging
      logNetworkConfig();
      
      const backendUrl = getBackendBaseURL();

      // try with regular fetch first to debug
      const regularFetchResponse = await fetch(`${backendUrl}/api/league`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const regularFetchData = await regularFetchResponse.json();

      // use regular fetch data since it works
      if (regularFetchData && regularFetchData.success && regularFetchData.data && regularFetchData.data.leagues) {
         console.log('✅ LeagueService: Leagues data fetched');
        // console.log('✅ LeagueService: Successfully found leagues via regular fetch:', regularFetchData.data.leagues.length);
        // console.log('✅ LeagueService: Leagues data:', regularFetchData.data.leagues);
        return regularFetchData.data.leagues;
      }

      // Check auth client cookies (getCookie comes from expoClient plugin)
      const authCookies = (authClient as any).getCookie?.();
      // console.log('🔍 LeagueService: Auth client cookies:', authCookies);

      const response = await authClient.$fetch(`${backendUrl}/api/league`, {
        method: 'GET',
      });

      // console.log('🔍 LeagueService: Raw API response:', response);
      // console.log('🔍 LeagueService: Response type:', typeof response);
      // console.log('🔍 LeagueService: Response keys:', response ? Object.keys(response) : 'null');

      // handle the ApiResponse structure from backend
      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        console.log('🔍 LeagueService: API Response structure:', {
          success: apiResponse.success,
          status: apiResponse.status,
          hasData: !!apiResponse.data,
          dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : 'no data',
          message: apiResponse.message
        });

        if (apiResponse.data && apiResponse.data.success && apiResponse.data.data && apiResponse.data.data.leagues) {
            console.log('✅ LeagueService: Leagues API');
          // console.log('✅ LeagueService: Successfully found leagues (authClient wrapped):', apiResponse.data.data.leagues.length);
          // console.log('✅ LeagueService: Leagues data:', apiResponse.data.data.leagues);
          return apiResponse.data.data.leagues;
        }

        if (apiResponse.success && apiResponse.data && apiResponse.data.leagues) {
          console.log('✅ LeagueService: Successfully found leagues:', apiResponse.data.leagues.length);
          // console.log('✅ LeagueService: Leagues data:', apiResponse.data.leagues);
          return apiResponse.data.leagues;
        } else {
          console.log('❌ LeagueService: Response structure issue:', {
            success: apiResponse.success,
            hasData: !!apiResponse.data,
            hasLeagues: !!(apiResponse.data && apiResponse.data.leagues),
            hasWrappedData: !!(apiResponse.data && apiResponse.data.data && apiResponse.data.data.leagues),
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

  // fetch leagues filtered by sport type
  static async fetchLeaguesBySport(sportType: 'PADEL' | 'PICKLEBALL' | 'TENNIS'): Promise<League[]> {
    try {
      const allLeagues = await this.fetchAllLeagues();
      return allLeagues.filter(league => league.sportType === sportType);
    } catch (error) {
      console.error('LeagueService: Error fetching leagues by sport:', error);
      return [];
    }
  }

  // fetch a specific league by ID
  static async fetchLeagueById(leagueId: string): Promise<League | null> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('LeagueService: Fetching league by ID from:', `${backendUrl}/api/league/${leagueId}`);

      const response = await authClient.$fetch(`${backendUrl}/api/league/${leagueId}`, {
        method: 'GET',
      });

      console.log('LeagueService: League by ID API response:', response);

      // handle the apiResponse structure from backend
      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        
        // Handle authClient.$fetch wrapped response structure
        if (apiResponse.data && apiResponse.data.success && apiResponse.data.data && apiResponse.data.data.league) {
          const league = apiResponse.data.data.league as League;
          // console.log('LeagueService: Setting league data (wrapped):', apiResponse.data.data.league);
          // console.log('✅ LeagueService: Fetched league:', {
          //   id: league.id,
          //   name: league.name,
          //   seasons: league.seasonCount || league._count?.seasons || 0,
          //   memberships: league._count?.memberships || 0,
          // });
          return league;
        }
        
        // Handle direct API response structure
        if (apiResponse.success && apiResponse.data && apiResponse.data.league) {
          console.log('✅ LeagueService: Setting league data (direct):', apiResponse.data.league);
          return apiResponse.data.league as League;
        }
        
        console.log('❌ LeagueService: No league data found in response');
      }
      
      console.error('LeagueService: No league data received from API');
      return null;
    } catch (error) {
      console.error('LeagueService: Error fetching league by ID:', error);
      return null;
    }
  }

  // Note: League membership has been removed from the backend architecture.
  // Users now join seasons directly, not leagues.
  // To join a league, navigate to the league details page and select a season to join.
  
  static async joinLeague(leagueId: string, userId: string): Promise<boolean> {
    console.warn('LeagueService: joinLeague is deprecated. League membership model has been removed.');
    console.warn('LeagueService: Users should join seasons directly instead.');
    console.warn('LeagueService: Please navigate to league details and join a specific season.');
    return false;
  }

  // Fetch user's active leagues (leagues where user has season memberships)
  static async fetchUserActiveLeagues(userId: string): Promise<UserActiveLeague[]> {
    try {
      const backendUrl = getBackendBaseURL();

      const response = await authClient.$fetch(`${backendUrl}/api/player/${userId}/seasons`, {
        method: 'GET',
      });

      if (response && typeof response === 'object') {
        const apiResponse = response as any;

        // Handle authClient wrapped response
        let seasons: any[] = [];
        if (apiResponse.data?.data?.seasons) {
          seasons = apiResponse.data.data.seasons;
        } else if (apiResponse.data?.seasons) {
          seasons = apiResponse.data.seasons;
        } else if (apiResponse.seasons) {
          seasons = apiResponse.seasons;
        }

        // Extract unique leagues from seasons where user has active membership
        const leaguesMap = new Map<string, UserActiveLeague>();

        for (const season of seasons) {
          // Only include ACTIVE seasons
          if (season.status !== 'ACTIVE') continue;

          // Each season can have multiple leagues (many-to-many)
          const leaguesList = season.leagues || [];
          for (const league of leaguesList) {
            if (!leaguesMap.has(league.id)) {
              leaguesMap.set(league.id, {
                id: league.id,
                name: league.name,
                sportType: league.sportType,
                location: league.location,
                status: league.status,
                season: {
                  id: season.id,
                  name: season.name,
                  status: season.status,
                },
                membership: season.membership,
                totalSeasonMemberships: season._count?.memberships || season.registeredUserCount || 0,
                memberships: season.memberships,
              });
            }
          }
        }

        return Array.from(leaguesMap.values());
      }

      return [];
    } catch (error) {
      console.error('LeagueService: Error fetching user active leagues:', error);
      return [];
    }
  }
}

// Type for user's active league with season info
export interface UserActiveLeague {
  id: string;
  name: string;
  sportType: string;
  location?: string;
  status: string;
  season: {
    id: string;
    name: string;
    status: string;
  };
  membership?: {
    id: string;
    joinedAt: string;
    status: string;
    paymentStatus: string;
    division?: {
      id: string;
      name: string;
    };
  };
  totalSeasonMemberships?: number;
  memberships?: Array<{
    id: string;
    userId: string;
    user?: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
}
