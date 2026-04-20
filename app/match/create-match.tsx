import { CreateMatchScreen, MatchFormData } from '@/features/chat/components/CreateMatchScreen';
import { useCreateMatchStore } from '@/features/chat/stores/CreateMatchStore';
import axiosInstance from '@/lib/endpoints';
import { useLocalSearchParams, router } from 'expo-router';
import React from 'react';

export default function CreateMatchPage() {
  const params = useLocalSearchParams();
  const { setPendingMatchData, setMatchCreated } = useCreateMatchStore();
  
  const leagueInfo = {
    name: (params.leagueName as string) || 'League',
    season: params.season as string | undefined,
    division: params.division as string | undefined,
    sportType: (params.sportType as 'PICKLEBALL' | 'TENNIS' | 'PADEL') || 'PICKLEBALL',
    divisionId: params.divisionId as string | undefined,
    gameType: params.gameType as 'SINGLES' | 'DOUBLES' | undefined,
    seasonId: params.seasonId as string | undefined,
  };

  const handleClose = () => {
    router.back();
  };

  const handleCreateMatch = async (matchData: MatchFormData): Promise<void> => {
    const divisionId = params.divisionId as string;

    if (divisionId) {
      // League match from FAB: create via API directly so list refetches immediately
      const startTime = matchData.time.includes(' - ')
        ? matchData.time.split(' - ')[0].trim()
        : matchData.time.trim();
      const [timePart, period] = startTime.split(' ');
      let [hoursStr, minutes] = timePart.split(':');
      let hours = hoursStr;
      if (hours === '12') {
        hours = period?.toUpperCase() === 'AM' ? '00' : '12';
      } else {
        hours =
          period?.toUpperCase() === 'PM'
            ? String(parseInt(hours, 10) + 12)
            : hours.padStart(2, '0');
      }
      const dateTimeString = `${matchData.date}T${hours}:${minutes}:00`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const matchType = matchData.numberOfPlayers === 4 ? 'DOUBLES' : 'SINGLES';
      await axiosInstance.post('/api/match/create', {
        divisionId,
        matchType,
        format: 'STANDARD',
        matchDate: dateTimeString,
        deviceTimezone: timezone,
        location: matchData.location || 'TBD',
        notes: matchData.description,
        duration: matchData.duration || 2,
        courtBooked: matchData.courtBooked || false,
        fee: matchData.fee || 'FREE',
        feeAmount:
          matchData.fee !== 'FREE'
            ? parseFloat(matchData.feeAmount || '0')
            : undefined,
        ...(matchType === 'DOUBLES' && matchData.partnerId
          ? { partnerId: matchData.partnerId }
          : {}),
      });

      setMatchCreated();
    } else {
      // Chat/other flow: store for the calling screen (ChatThreadScreen) to handle
      setPendingMatchData(matchData);
    }

    router.back();
  };

  return (
    <CreateMatchScreen
      leagueInfo={leagueInfo}
      onClose={handleClose}
      onCreateMatch={handleCreateMatch}
    />
  );
}
