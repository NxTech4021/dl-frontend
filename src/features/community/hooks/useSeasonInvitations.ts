import { useState, useCallback } from 'react';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';
import { SeasonInvitationsData } from '../types';

export const useSeasonInvitations = () => {
  const { data: session } = useSession();
  const [seasonInvitations, setSeasonInvitations] = useState<SeasonInvitationsData>({ sent: [], received: [] });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSeasonInvitations = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        return;
      }

      const backendUrl = getBackendBaseURL();
      const authResponse = await authClient.$fetch(`${backendUrl}/api/pairing/season/invitations`, {
        method: 'GET',
      });

      if (authResponse && (authResponse as any).data) {
        const invitationsData = (authResponse as any).data.data || (authResponse as any).data;
        setSeasonInvitations(invitationsData);
      }
    } catch (error) {
      console.error('Error fetching season invitations:', error);
    }
  }, [session?.user?.id]);

  const acceptSeasonInvitation = useCallback(async (invitationId: string, onSuccess?: (partnershipData?: any) => void) => {
    try {
      setActionLoading(invitationId);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/${invitationId}/accept`,
        {
          method: 'POST',
        }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.message) {
        // Don't show toast here - socket event 'partnership_created' will handle it
        // This prevents duplicate toasts when user is on DoublesTeamPairingScreen
        await fetchSeasonInvitations();
        // Pass partnership data to onSuccess callback
        onSuccess?.(responseData.data);
      }
    } catch (error) {
      console.error('Error accepting season invitation:', error);
      toast.error('Error', {
        description: 'Failed to accept invitation',
      });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSeasonInvitations]);

  const denySeasonInvitation = useCallback(async (invitationId: string) => {
    try {
      setActionLoading(invitationId);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/${invitationId}/deny`,
        {
          method: 'POST',
        }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.message) {
        toast.success('Invitation denied');
        await fetchSeasonInvitations();
      }
    } catch (error) {
      console.error('Error denying season invitation:', error);
      toast.error('Error', {
        description: 'Failed to deny invitation',
      });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSeasonInvitations]);

  const cancelSeasonInvitation = useCallback(async (invitationId: string) => {
    try {
      setActionLoading(invitationId);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/${invitationId}`,
        {
          method: 'DELETE',
        }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.message) {
        toast.success('Invitation cancelled');
        await fetchSeasonInvitations();
      }
    } catch (error) {
      console.error('Error cancelling season invitation:', error);
      toast.error('Error', {
        description: 'Failed to cancel invitation',
      });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSeasonInvitations]);

  return {
    seasonInvitations,
    actionLoading,
    fetchSeasonInvitations,
    acceptSeasonInvitation,
    denySeasonInvitation,
    cancelSeasonInvitation,
  };
};
