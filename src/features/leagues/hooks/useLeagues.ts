import { useSession } from '@/lib/auth-client';
import { useCallback, useEffect, useState } from 'react';
import { League, LeagueService } from '../services/LeagueService';

export interface UseLeaguesOptions {
  sportType?: 'PADEL' | 'PICKLEBALL' | 'TENNIS';
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
  const [isLoading, setIsLoading] = useState(autoFetch); // Start loading if autoFetch is enabled
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchLeagues = useCallback(async (showSkeleton = false) => {
    const startTime = Date.now();
    const minDelay = showSkeleton ? 800 : 0; // Minimum 800ms for skeleton visibility on initial load

    setIsLoading(true);
    setError(null);

    try {
      let fetchedLeagues: League[];

      if (sportType) {
        fetchedLeagues = await LeagueService.fetchLeaguesBySport(sportType);
      } else {
        fetchedLeagues = await LeagueService.fetchAllLeagues();
      }

      setLeagues(fetchedLeagues);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leagues';
      console.error('❌ useLeagues: Error fetching leagues:', err);
      setError(errorMessage);
    } finally {
      // Ensure minimum delay for skeleton visibility on initial load
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, minDelay - elapsed);

      setTimeout(() => {
        setIsLoading(false);
        if (showSkeleton) {
          setIsInitialLoad(false);
        }
      }, remainingDelay);
    }
  }, [sportType]);

  const joinLeague = useCallback(async (leagueId: string): Promise<boolean> => {
    console.warn('useLeagues: joinLeague is deprecated. League membership model has been removed.');
    console.warn('useLeagues: Users should navigate to league details and join specific seasons instead.');
    return false;
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchLeagues(true); // Show skeleton on initial load
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
