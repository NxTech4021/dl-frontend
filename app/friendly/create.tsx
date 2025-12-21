import { CreateFriendlyMatchScreen, FriendlyMatchFormData } from '@/features/friendly/screens/CreateFriendlyMatchScreen';
import { useLocalSearchParams, router } from 'expo-router';
import React from 'react';
import { getBackendBaseURL } from '@/src/config/network';
import axiosInstance from '@/lib/endpoints';
import { endpoints } from '@/lib/endpoints';
import { toast } from 'sonner-native';
import { useSession } from '@/lib/auth-client';

export default function CreateFriendlyMatchPage() {
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const user = session?.user;
  
  const sport = (params.sportType as 'pickleball' | 'tennis' | 'padel')?.toLowerCase() || 'pickleball';
  const sportType = sport.toUpperCase() as 'PICKLEBALL' | 'TENNIS' | 'PADEL';
  const isRequest = params.isRequest === 'true';
  const recipientId = params.recipientId as string | undefined;
  const threadId = params.threadId as string | undefined;

  const handleClose = () => {
    router.back();
  };

  const handleCreateMatch = async (formData: FriendlyMatchFormData) => {
    if (!user) {
      toast.error('You must be logged in to create a match');
      return;
    }

    try {
      // Parse date and time - same approach as FriendlyScreen
      const extractStartTime = (timeRange: string): string => {
        if (timeRange.includes(' - ')) {
          return timeRange.split(' - ')[0].trim();
        }
        return timeRange.trim();
      };

      const convertTo24Hour = (time12h: string): string => {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') {
          hours = modifier === 'AM' ? '00' : '12';
        } else {
          hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
        }
        
        return `${hours}:${minutes}`;
      };

      const startTime = extractStartTime(formData.time);
      const time24 = convertTo24Hour(startTime);
      const dateTimeString = `${formData.date}T${time24}:00`;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Use sport from formData (user's selection)
      const selectedSportType = formData.sport.toUpperCase() as 'PICKLEBALL' | 'TENNIS' | 'PADEL';

      const payload: any = {
        sport: selectedSportType,
        matchType: formData.numberOfPlayers === 4 ? 'DOUBLES' : 'SINGLES',
        format: 'STANDARD',
        matchDate: dateTimeString,
        deviceTimezone,
        location: formData.location,
        notes: formData.description,
        duration: formData.duration,
        courtBooked: formData.courtBooked,
        fee: formData.fee,
        feeAmount: formData.fee !== 'FREE' ? parseFloat(formData.feeAmount || '0') : undefined,
        genderRestriction: formData.genderRestriction,
        skillLevels: formData.skillLevels,
      };

      // Add request fields if this is a request
      if (isRequest && recipientId) {
        payload.isRequest = true;
        payload.requestRecipientId = recipientId;
      }

      const response = await axiosInstance.post(endpoints.friendly.create, payload);
      const matchResult = response.data;

      // If this is a request sent from chat, create a message in the thread
      if (isRequest && threadId && recipientId) {
        const backendUrl = getBackendBaseURL();
        const senderName = user.name || user.username || 'User';
        const messageContent = `${senderName} sent you a friendly match request`;
        
        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        
        const messagePayload = {
          senderId: user.id,
          content: messageContent,
          messageType: 'MATCH',
          matchId: matchResult.id,
          matchData: {
            matchId: matchResult.id,
            matchType: matchResult.matchType || (formData.numberOfPlayers === 4 ? 'DOUBLES' : 'SINGLES'),
            date: formData.date,
            time: formData.time,
            duration: formData.duration,
            numberOfPlayers: String(formData.numberOfPlayers),
            location: formData.location,
            fee: formData.fee,
            feeAmount: formData.feeAmount || '0.00',
            description: formData.description,
            sportType: selectedSportType,
            leagueName: 'Friendly Match',
            courtBooked: formData.courtBooked,
            status: 'SCHEDULED',
            participants: matchResult.participants || [],
            isFriendly: true,
            isFriendlyRequest: true,
            requestExpiresAt: expiresAt.toISOString(),
            requestStatus: 'PENDING',
            requestRecipientId: recipientId,
          },
        };

        await fetch(`${backendUrl}/api/chat/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify(messagePayload),
        });
      }

      toast.success(isRequest ? 'Friendly match request sent!' : 'Friendly match created successfully');
      router.back();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create match';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return (
    <CreateFriendlyMatchScreen
      sport={sport as 'pickleball' | 'tennis' | 'padel'}
      onClose={handleClose}
      onCreateMatch={handleCreateMatch}
      isRequest={isRequest}
      recipientId={recipientId}
      threadId={threadId}
    />
  );
}

