import { useState, useEffect, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';

interface PlayerInfo {
  id: string;
  name: string;
  username: string;
  displayUsername: string | null;
  image: string | null;
}

interface SeasonInfo {
  id: string;
  name: string;
}

export interface PairRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  seasonId: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DENIED' | 'EXPIRED' | 'CANCELLED' | 'AUTO_DENIED';
  createdAt: string;
  expiresAt: string;
  requester: PlayerInfo;
  season: SeasonInfo;
}

interface UseIncomingPairRequestsReturn {
  requests: PairRequest[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch incoming (received) pair requests for a specific season
 * Used by ManagePartnershipScreen to show requests to INCOMPLETE partnership captains
 *
 * @param seasonId - The season ID to filter requests for (only fetches if provided)
 * @returns Object containing requests array, loading state, error, and refresh function
 */
export const useIncomingPairRequests = (
  seasonId: string | null
): UseIncomingPairRequestsReturn => {
  const [requests, setRequests] = useState<PairRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!seasonId) {
      console.log('[useIncomingPairRequests] No seasonId provided');
      setLoading(false);
      setRequests([]);
      return;
    }

    try {
      console.log('[useIncomingPairRequests] Fetching requests for seasonId:', seasonId);
      setLoading(true);
      setError(null);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/requests`, {
        method: 'GET',
      });

      const data = (response as any)?.data?.data || (response as any)?.data;
      console.log('[useIncomingPairRequests] All pair requests:', data);

      // Filter to only PENDING requests for this specific season
      const receivedForSeason = (data?.received || []).filter(
        (req: PairRequest) => req.seasonId === seasonId && req.status === 'PENDING'
      );

      console.log('[useIncomingPairRequests] Filtered requests for season:', receivedForSeason.length);
      setRequests(receivedForSeason);
    } catch (err) {
      console.error('[useIncomingPairRequests] Error fetching requests:', err);
      setError(err as Error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    refresh: fetchRequests,
  };
};
