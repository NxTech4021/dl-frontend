import { useState, useCallback } from 'react';
import { useSession } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
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

      const response = await axiosInstance.get('/api/pairing/season/invitations');

      if (response.data) {
        const invitationsData = response.data.data || response.data;
        setSeasonInvitations(invitationsData);
      }
    } catch (error) {
      console.error('Error fetching season invitations:', error);
    }
  }, [session?.user?.id]);

  const acceptSeasonInvitation = useCallback(async (invitationId: string, onSuccess?: (partnershipData?: any) => void) => {
    try {
      setActionLoading(invitationId);

      const response = await axiosInstance.post(
        `/api/pairing/season/invitation/${invitationId}/accept`
      );

      if (response.data?.message) {
        // Don't show toast here - socket event 'partnership_created' will handle it
        // This prevents duplicate toasts when user is on DoublesTeamPairingScreen
        await fetchSeasonInvitations();
        // Pass partnership data to onSuccess callback
        onSuccess?.(response.data.data);
      }
    } catch (error: any) {
      console.error('Error accepting season invitation:', error?.response?.data || error);
      const message = error?.response?.data?.message || 'Failed to accept invitation';
      toast.error('Error', { description: message });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSeasonInvitations]);

  const denySeasonInvitation = useCallback(async (invitationId: string) => {
    try {
      setActionLoading(invitationId);

      const response = await axiosInstance.post(
        `/api/pairing/season/invitation/${invitationId}/deny`
      );

      if (response.data?.message) {
        toast.success('Invitation denied');
        await fetchSeasonInvitations();
      }
    } catch (error: any) {
      console.error('Error denying season invitation:', error?.response?.data || error);
      const message = error?.response?.data?.message || 'Failed to deny invitation';
      toast.error('Error', { description: message });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSeasonInvitations]);

  const cancelSeasonInvitation = useCallback(async (invitationId: string) => {
    try {
      setActionLoading(invitationId);

      const response = await axiosInstance.delete(
        `/api/pairing/season/invitation/${invitationId}`
      );

      if (response.data?.message) {
        toast.success('Invitation cancelled');
        await fetchSeasonInvitations();
      }
    } catch (error: any) {
      console.error('Error cancelling season invitation:', error?.response?.data || error);
      const message = error?.response?.data?.message || 'Failed to cancel invitation';
      toast.error('Error', { description: message });
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
