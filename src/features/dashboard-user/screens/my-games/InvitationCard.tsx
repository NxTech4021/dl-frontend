import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { MatchInvitation } from './types';
import { invitationCardStyles as styles } from './styles';
import { formatTimeRangeWithDuration } from './utils';

interface InvitationCardProps {
  invitation: MatchInvitation;
  defaultSport: string;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
}

export function InvitationCard({ invitation, defaultSport, onAccept, onDecline }: InvitationCardProps) {
  // Get sport colors based on the dashboard sport
  const sportColors = getSportColors(defaultSport.toUpperCase() as SportType);
  const expiresAt = new Date(invitation.expiresAt);
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  // Get match date/time - prefer matchDate, fallback to timeSlots
  const matchDateTime = invitation.match.matchDate ||
    (invitation.match.timeSlots && invitation.match.timeSlots.length > 0
      ? invitation.match.timeSlots[0].proposedTime
      : undefined);

  // Get other participants (excluding the current user who is the invitee)
  const otherParticipants = invitation.match.participants.filter(
    p => p.userId !== invitation.inviteeId
  );

  // Format fee text
  const renderFeeText = () => {
    const { fee, feeAmount, matchType } = invitation.match;
    if (fee === 'FREE') return 'Free';
    if (!fee || !feeAmount) return 'Fee TBD';
    const totalAmount = Number(feeAmount);
    if (fee === 'SPLIT') {
      const numPlayers = matchType === 'DOUBLES' ? 4 : 2;
      const perPlayer = (totalAmount / numPlayers).toFixed(2);
      return `Split · RM${perPlayer} per player`;
    }
    return `Fixed · RM${totalAmount.toFixed(2)} per player`;
  };

  // Get division and season names
  const divisionName = invitation.match.division?.name;
  const seasonName = invitation.match.division?.season?.name;

  // Render inviter avatar
  const renderInviterAvatar = () => {
    if (invitation.inviter.image) {
      return (
        <Image
          source={{ uri: invitation.inviter.image }}
          style={[styles.inviterAvatar, { width: 40, height: 40 }]}
        />
      );
    }
    return (
      <View style={[styles.inviterAvatar, styles.defaultInviterAvatar, { width: 40, height: 40 }]}>
        <Text style={styles.inviterInitial}>
          {invitation.inviter.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
    );
  };

  // Render participant avatar
  const renderParticipantAvatar = (participant: typeof otherParticipants[0], index: number) => {
    const avatarColors = ['#E8B4BC', '#6de9a0', '#FEA04D', '#60A5FA'];
    const bgColor = avatarColors[index % avatarColors.length];

    if (participant.user.image) {
      return (
        <View key={participant.userId} style={styles.participantAvatarContainer}>
          <Image
            source={{ uri: participant.user.image }}
            style={styles.participantAvatar}
          />
        </View>
      );
    }
    return (
      <View key={participant.userId} style={styles.participantAvatarContainer}>
        <View style={[styles.participantAvatar, styles.defaultParticipantAvatar, { backgroundColor: bgColor }]}>
          <Text style={styles.participantInitial}>
            {participant.user.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      </View>
    );
  };

  const courtBooked = invitation.match.courtBooked;

  return (
    <View style={styles.invitationCard}>
      {/* Header with inviter and chips */}
      <View style={styles.invitationHeader}>
        <View style={styles.inviterRow}>
          {renderInviterAvatar()}
          <View style={styles.inviterTextContainer}>
            <Text style={styles.inviterName}>{invitation.inviter.name}</Text>
            <Text style={styles.invitationSubtext}>invited you to play</Text>
          </View>
        </View>
        {/* Division & Season chips */}
        {(seasonName || divisionName) && (
          <View style={styles.headerChipsContainer}>
            {seasonName && (
              <View style={[styles.headerChip, { borderColor: sportColors.background }]}>
                <Text style={[styles.headerChipText, { color: sportColors.background }]}>
                  {seasonName}
                </Text>
              </View>
            )}
            {divisionName && (
              <View style={[styles.headerChip, { borderColor: sportColors.background }]}>
                <Text style={[styles.headerChipText, { color: sportColors.background }]}>
                  {divisionName}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Participants section */}
      {otherParticipants.length > 0 && (
        <View style={styles.participantsSection}>
          <Text style={styles.participantsLabel}>Playing with</Text>
          <View style={styles.participantsRow}>
            {otherParticipants.slice(0, 4).map((participant, index) =>
              renderParticipantAvatar(participant, index)
            )}
            {otherParticipants.length > 4 && (
              <View style={styles.moreParticipants}>
                <Text style={styles.moreParticipantsText}>
                  +{otherParticipants.length - 4}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Match info */}
      <View style={styles.invitationBody}>
        <Text style={styles.matchTypeText}>
          {invitation.match.matchType === 'DOUBLES' ? 'Doubles' : 'Singles'} League Match
        </Text>

        {/* Details section */}
        <View style={styles.invitationDetails}>
          {/* Date/Time */}
          {matchDateTime && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText}>
                {formatTimeRangeWithDuration(matchDateTime, invitation.match.duration)}
              </Text>
            </View>
          )}

          {/* Venue */}
          {(invitation.match.venue || invitation.match.location) && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText} numberOfLines={1}>
                {invitation.match.venue || invitation.match.location}
              </Text>
            </View>
          )}

          {/* Fee with court booking status */}
          <View style={styles.infoRow}>
            <Text style={styles.feeIcon}>$</Text>
            <Text style={styles.infoText}>{renderFeeText()}</Text>
            {courtBooked !== undefined && (
              <View style={courtBooked ? styles.courtBookedBadge : styles.courtNotBookedBadge}>
                <Text style={courtBooked ? styles.courtBookedText : styles.courtNotBookedText}>
                  {courtBooked ? 'Court booked' : 'Court not booked'}
                </Text>
                <Ionicons
                  name={courtBooked ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={courtBooked ? '#10B981' : '#DC2626'}
                  style={{ marginLeft: 4 }}
                />
              </View>
            )}
          </View>
        </View>

        {/* Expiry warning */}
        {isExpiringSoon && (
          <View style={styles.expiryWarning}>
            <Ionicons name="time-outline" size={12} color="#D97706" />
            <Text style={styles.expiryWarningText}>
              Expires {format(expiresAt, 'MMM dd, h:mm a')}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.invitationActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => onDecline(invitation.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: sportColors.background }]}
          onPress={() => onAccept(invitation.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
