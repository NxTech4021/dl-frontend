import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';

interface WithdrawalRequest {
  id: string;
  userId: string;
  seasonId: string;
  partnershipId: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  partnership?: {
    id: string;
    season: { id: string; name: string };
  };
}

interface UseWithdrawalRequestMonitorOptions {
  userId: string | null;
  enabled?: boolean;
  pollingInterval?: number; // default 60000 (60 seconds)
}

export const useWithdrawalRequestMonitor = ({
  userId,
  enabled = true,
  pollingInterval = 60000,
}: UseWithdrawalRequestMonitorOptions) => {
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchWithdrawalRequests = async () => {
    if (!userId) return;

    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/player/withdrawal-requests`,
        { method: 'GET' }
      );

      const requests = (response as any)?.data || [];
      setPendingRequests(requests);

      // Check for status changes
      requests.forEach((request: WithdrawalRequest) => {
        const previousStatus = previousStatusRef.current.get(request.id);

        // If status changed from PENDING to APPROVED/REJECTED
        if (previousStatus === 'PENDING' && request.status !== 'PENDING') {
          if (request.status === 'APPROVED') {
            toast.success('Partner Change Approved', {
              description: 'Your partner change request has been approved. Find a new partner to continue.',
              duration: 7000,
            });

            // Navigate to find partner page
            if (request.partnership?.season.id) {
              setTimeout(() => {
                router.push(`/pairing/find-partner/${request.partnership!.season.id}`);
              }, 2000);
            }
          } else if (request.status === 'REJECTED') {
            toast.error('Partner Change Denied', {
              description: 'Your partner change request has been denied by admin. Please contact support if you have questions.',
              duration: 7000,
            });
          }
        }

        // Update previous status
        previousStatusRef.current.set(request.id, request.status);
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && userId) {
      // Initial fetch
      fetchWithdrawalRequests();

      // Set up polling
      intervalRef.current = setInterval(() => {
        console.log('[WithdrawalRequestMonitor] Polling withdrawal request status...');
        fetchWithdrawalRequests();
      }, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        console.log('[WithdrawalRequestMonitor] Stopping monitoring');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, userId, pollingInterval]);

  return {
    pendingRequests,
    loading,
    refresh: fetchWithdrawalRequests,
    isMonitoring: enabled && !!userId && !!intervalRef.current,
  };
};
