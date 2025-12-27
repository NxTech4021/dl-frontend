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
  const maxSlots = matchType === 'DOUBLES' ? 4 : 2;
  const emptySlots = maxSlots - acceptedParticipants.length;
  const emptyPairs = matchType === 'DOUBLES' ? Math.ceil(emptySlots / 2) : emptySlots;

  return (
    <View style={styles.playersRow}>
      {/* Show accepted participants */}
      {acceptedParticipants.map((participant) => (
        <View key={participant.userId} style={styles.playerColumn}>
          <View style={styles.playerAvatarLarge}>
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
          <Text style={styles.playerNameText} numberOfLines={1}>
            {participant.user.name?.split(' ')[0] || 'Player'}
          </Text>
        </View>
      ))}

      {/* Show empty slots */}
      {emptySlots > 0 && (
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
      )}
    </View>
  );
}
