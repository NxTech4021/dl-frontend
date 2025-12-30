import { useEffect, useRef, useState, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';

interface PartnershipStatusData {
  hasMyPendingRequest: boolean;
  hasPartnerPendingRequest: boolean;
  partnerHasLeft: boolean;
  myRequestedAt: string | null;
  partnerRequestedAt: string | null;
}

interface UsePartnershipStatusOptions {
  partnershipId: string | null;
  enabled?: boolean;
  pollingInterval?: number; // default 30000 (30 seconds)
}

interface UsePartnershipStatusResult {
  hasMyPendingRequest: boolean;
  hasPartnerPendingRequest: boolean;
  partnerHasLeft: boolean;
  myRequestedAt: string | null;
  partnerRequestedAt: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const usePartnershipStatus = ({
  partnershipId,
  enabled = true,
  pollingInterval = 30000,
}: UsePartnershipStatusOptions): UsePartnershipStatusResult => {
  const [status, setStatus] = useState<PartnershipStatusData>({
    hasMyPendingRequest: false,
    hasPartnerPendingRequest: false,
    partnerHasLeft: false,
    myRequestedAt: null,
    partnerRequestedAt: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!partnershipId) {
      setIsLoading(false);
      return;
    }

    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/partnership/${partnershipId}/status`,
        { method: 'GET' }
      );

      const responseData = (response as any)?.data;
      if (responseData?.success && responseData?.data) {
        setStatus({
          hasMyPendingRequest: responseData.data.hasMyPendingRequest || false,
          hasPartnerPendingRequest: responseData.data.hasPartnerPendingRequest || false,
          partnerHasLeft: responseData.data.partnerHasLeft || false,
          myRequestedAt: responseData.data.myRequestedAt || null,
          partnerRequestedAt: responseData.data.partnerRequestedAt || null,
        });
        setError(null);
      } else {
        setError(responseData?.message || 'Failed to fetch partnership status');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching partnership status:', err);
      setError('Failed to fetch partnership status');
      setIsLoading(false);
    }
  }, [partnershipId]);

  useEffect(() => {
    if (enabled && partnershipId) {
      // Initial fetch
      fetchStatus();

      // Set up polling
      intervalRef.current = setInterval(() => {
        console.log('[PartnershipStatusMonitor] Polling partnership status...');
        fetchStatus();
      }, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        console.log('[PartnershipStatusMonitor] Stopping monitoring');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, partnershipId, pollingInterval, fetchStatus]);

  return {
    ...status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
};
