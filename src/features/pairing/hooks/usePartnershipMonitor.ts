import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { toast } from 'sonner-native';
import { useActivePartnership } from './useActivePartnership';

interface UsePartnershipMonitorOptions {
  seasonId: string | null;
  enabled?: boolean;
  pollingInterval?: number; // in milliseconds, default 30000 (30 seconds)
  onPartnershipDissolved?: (seasonId: string) => void;
}

/**
 * Hook to monitor partnership status and detect when partner withdraws
 * Automatically redirects to find-partner page when partnership is dissolved
 *
 * @param options - Configuration options
 * @returns The current partnership data and monitoring state
 */
export const usePartnershipMonitor = ({
  seasonId,
  enabled = true,
  pollingInterval = 30000,
  onPartnershipDissolved,
}: UsePartnershipMonitorOptions) => {
  const { partnership, loading, refresh } = useActivePartnership(seasonId);
  const previousPartnershipRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Don't monitor if disabled or no seasonId
    if (!enabled || !seasonId) {
      return;
    }

    // Check for partnership dissolution
    if (previousPartnershipRef.current && !partnership) {
      // Partnership existed but now doesn't - it was dissolved
      console.log('[PartnershipMonitor] Partnership dissolved detected');

      // Show notification
      toast.info('Your partner has left', {
        description: 'Find a new partner to continue',
        duration: 5000,
      });

      // Call custom callback if provided
      if (onPartnershipDissolved) {
        onPartnershipDissolved(seasonId);
      }

      // Auto-redirect to find partner page
      router.push(`/pairing/find-partner/${seasonId}`);
    }

    // Update previous partnership tracking
    previousPartnershipRef.current = partnership?.id || null;
  }, [partnership, seasonId, enabled, onPartnershipDissolved]);

  useEffect(() => {
    // Set up polling for status changes
    if (enabled && seasonId && !loading) {
      console.log(`[PartnershipMonitor] Starting monitoring for season ${seasonId}`);

      intervalRef.current = setInterval(() => {
        console.log('[PartnershipMonitor] Polling partnership status...');
        refresh();
      }, pollingInterval);
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log('[PartnershipMonitor] Stopping monitoring');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, seasonId, loading, pollingInterval, refresh]);

  return {
    partnership,
    loading,
    isMonitoring: enabled && !!seasonId && !!intervalRef.current,
  };
};
