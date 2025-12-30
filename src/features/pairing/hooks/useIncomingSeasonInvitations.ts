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

export interface SeasonInvitation {
  id: string;
  senderId: string;
  recipientId: string;
  seasonId: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  expiresAt: string;
  sender: PlayerInfo;
  season: SeasonInfo;
}

interface UseIncomingSeasonInvitationsReturn {
  invitations: SeasonInvitation[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch incoming (received) season invitations for a specific season
 * Used by ManagePartnershipScreen to show invitations to INCOMPLETE partnership captains
 *
 * @param seasonId - The season ID to filter invitations for (only fetches if provided)
 * @returns Object containing invitations array, loading state, error, and refresh function
 */
export const useIncomingSeasonInvitations = (
  seasonId: string | null
): UseIncomingSeasonInvitationsReturn => {
  const [invitations, setInvitations] = useState<SeasonInvitation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!seasonId) {
      console.log('[useIncomingSeasonInvitations] No seasonId provided');
      setLoading(false);
      setInvitations([]);
      return;
    }

    try {
      console.log('[useIncomingSeasonInvitations] Fetching invitations for seasonId:', seasonId);
      setLoading(true);
      setError(null);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/season/invitations`, {
        method: 'GET',
      });

      const data = (response as any)?.data?.data || (response as any)?.data;
      console.log('[useIncomingSeasonInvitations] All season invitations:', data);

      // Filter to only PENDING invitations received for this specific season
      const receivedForSeason = (data?.received || []).filter(
        (inv: SeasonInvitation) => inv.seasonId === seasonId && inv.status === 'PENDING'
      );

      console.log('[useIncomingSeasonInvitations] Filtered invitations for season:', receivedForSeason.length);
      setInvitations(receivedForSeason);
    } catch (err) {
      console.error('[useIncomingSeasonInvitations] Error fetching invitations:', err);
      setError(err as Error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    refresh: fetchInvitations,
  };
};
