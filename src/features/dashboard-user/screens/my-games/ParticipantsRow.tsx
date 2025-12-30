import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from './types';
import { matchCardStyles as styles } from './styles';

interface ParticipantsRowProps {
  participants: Match['participants'];
  matchType: string;
}

export function ParticipantsRow({ participants, matchType }: ParticipantsRowProps) {
  const acceptedParticipants = participants.filter(p => p.invitationStatus === 'ACCEPTED');
  const pendingParticipants = participants.filter(p => p.invitationStatus === 'PENDING');
  const displayedParticipants = [...acceptedParticipants, ...pendingParticipants];

  const maxSlots = matchType === 'DOUBLES' ? 4 : 2;
  const emptySlots = maxSlots - displayedParticipants.length;
  const emptyPairs = matchType === 'DOUBLES' ? Math.ceil(emptySlots / 2) : emptySlots;

  // Render a single participant
  const renderParticipant = (participant: Match['participants'][0]) => {
    const isPending = participant.invitationStatus === 'PENDING';
    return (
      <View key={participant.userId} style={styles.playerColumn}>
        <View style={styles.playerAvatarWrapper}>
          <View style={[
            styles.playerAvatarLarge,
            isPending && styles.playerAvatarPending
          ]}>
            {participant.user.image ? (
              <Image
                source={{ uri: participant.user.image }}
                style={styles.playerImageLarge}
              />
            ) : (
              <View style={styles.defaultPlayerAvatarLarge}>
                <Text style={styles.defaultPlayerTextLarge}>
                  {participant.user.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          {isPending && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={12} color="#F59E0B" />
            </View>
          )}
        </View>
        <Text style={[
          styles.playerNameText,
          isPending && styles.playerNamePending
        ]} numberOfLines={1}>
          {participant.user.name?.split(' ')[0] || 'Player'}
        </Text>
      </View>
    );
  };

  // Render empty slots
  const renderEmptySlots = () => {
    if (emptySlots <= 0) return null;
    return (
      <View style={styles.emptySlotColumn}>
        <View style={styles.emptySlotRow}>
          {Array.from({ length: Math.min(emptySlots, 2) }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.emptySlotCircle}>
              <Ionicons name="person" size={24} color="#D1D5DB" />
            </View>
          ))}
        </View>
        <Text style={styles.emptySlotText}>
          {emptyPairs} {matchType === 'DOUBLES' ? 'pair' : 'player'} slot{emptyPairs > 1 ? 's' : ''}
        </Text>
      </View>
    );
  };

  // For DOUBLES matches, group by team
  if (matchType === 'DOUBLES') {
    const team1 = displayedParticipants.filter(p => p.team === 'team1');
    const team2 = displayedParticipants.filter(p => p.team === 'team2');

    // If no team data, fall back to default order (first 2 vs last 2)
    const hasTeamData = team1.length > 0 || team2.length > 0;

    if (hasTeamData) {
      return (
        <View style={styles.playersRow}>
          {/* Team 1 */}
          {team1.map(p => renderParticipant(p))}

          {/* Divider between teams (if both teams have players) */}
          {team1.length > 0 && team2.length > 0 && (
            <View style={styles.teamDivider} />
          )}

          {/* Team 2 */}
          {team2.map(p => renderParticipant(p))}

          {/* Empty slots */}
          {renderEmptySlots()}
        </View>
      );
    }
  }

  // For SINGLES or DOUBLES without team data, render in order
  return (
    <View style={styles.playersRow}>
      {displayedParticipants.map(participant => renderParticipant(participant))}
      {renderEmptySlots()}
    </View>
  );
}
