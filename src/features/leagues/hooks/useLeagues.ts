import { useState, useEffect, useCallback } from 'react';
import { League, LeagueService } from '../services/LeagueService';
import { useSession } from '@/lib/auth-client';

export interface UseLeaguesOptions {
  sportType?: 'PADDLE' | 'PICKLEBALL' | 'TENNIS';
  autoFetch?: boolean;
}

export interface UseLeaguesReturn {
  leagues: League[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  joinLeague: (leagueId: string) => Promise<boolean>;
}

export function useLeagues(options: UseLeaguesOptions = {}): UseLeaguesReturn {
  const { sportType, autoFetch = true } = options;
  const { data: session } = useSession();
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = useCallback(async () => {
    console.log('🔍 useLeagues: Starting fetchLeagues');
    console.log('🔍 useLeagues: Sport type filter:', sportType);
    
    setIsLoading(true);
    setError(null);
    
    try {
      let fetchedLeagues: League[];
      
      if (sportType) {
        console.log('🔍 useLeagues: Fetching leagues by sport:', sportType);
        fetchedLeagues = await LeagueService.fetchLeaguesBySport(sportType);
      } else {
        console.log('🔍 useLeagues: Fetching all leagues');
        fetchedLeagues = await LeagueService.fetchAllLeagues();
      }
      
      console.log('🔍 useLeagues: Received leagues:', fetchedLeagues.length);
      console.log('🔍 useLeagues: Leagues data:', fetchedLeagues);
      
      setLeagues(fetchedLeagues);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leagues';
      console.error('❌ useLeagues: Error fetching leagues:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sportType]);

  const joinLeague = useCallback(async (leagueId: string): Promise<boolean> => {
    try {
      if (!session?.user?.id) {
        console.error('useLeagues: No user session available for joining league');
        return false;
      }
      
      const success = await LeagueService.joinLeague(leagueId, session.user.id);
      if (success) {
        // Refresh the leagues list to update member counts
        await fetchLeagues();
      }
      return success;
    } catch (err) {
      console.error('useLeagues: Error joining league:', err);
      return false;
    }
  }, [fetchLeagues, session?.user?.id]);

  useEffect(() => {
    if (autoFetch) {
      fetchLeagues();
    }
  }, [fetchLeagues, autoFetch]);

  return {
    leagues,
    isLoading,
    error,
    refetch: fetchLeagues,
    joinLeague,
  };
}
