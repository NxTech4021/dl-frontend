import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export interface FriendlyMatch {
  id: string;
  matchType: 'SINGLES' | 'DOUBLES';
  status: string;
  scheduledTime?: string;
  matchDate?: string;
  location?: string;
  venue?: string;
  courtBooked?: boolean;
  fee?: 'FREE' | 'SPLIT' | 'FIXED';
  feeAmount?: number | string;
  duration?: number;
  notes?: string;
  description?: string;
  genderRestriction?: 'MALE' | 'FEMALE' | 'OPEN' | null;
  skillLevels?: string[];
  createdBy?: {
    id: string;
    name: string;
    image?: string;
  };
  participants: Array<{
    user: {
      id: string;
      name: string;
      image?: string;
    };
    role: string;
    team?: string;
    invitationStatus?: string;
  }>;
}

interface FriendlyMatchCardProps {
  match: FriendlyMatch;
  onPress: (match: FriendlyMatch) => void;
}

export const FriendlyMatchCard: React.FC<FriendlyMatchCardProps> = ({ match, onPress }) => {
  const activeParticipants = (match.participants || []).filter(
    p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
  );
  const isDoubles = match.matchType === 'DOUBLES';
  const maxSlots = isDoubles ? 4 : 2;
  const emptySlots = maxSlots - activeParticipants.length;

  const dateString = match.scheduledTime || match.matchDate;
  if (!dateString) {
    return null;
  }

  const formatTimeRange = (dateString: string) => {
    const startDate = new Date(dateString);
    const duration = match.duration || 2;
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    const startTime = format(startDate, 'h:mma').toLowerCase();
    const endTime = format(endDate, 'h:mma').toLowerCase();
    const dayDate = format(startDate, 'EEE d MMMM yyyy');
    return `${startTime} - ${endTime}, ${dayDate}`;
  };

  const renderPlayerAvatar = (player: FriendlyMatch['participants'][0]) => {
    if (player?.user?.image) {
      return <Image source={{ uri: player.user.image }} style={styles.avatarImage} />;
    }
    return (
      <View style={styles.defaultAvatar}>
        <Text style={styles.defaultAvatarText}>
          {player?.user?.name?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
    );
  };

  const getGenderRestrictionText = () => {
    if (!match.genderRestriction) return null;
    switch (match.genderRestriction) {
      case 'MALE':
        return 'Male only';
      case 'FEMALE':
        return 'Female only';
      default:
        return null;
    }
  };

  const formatSkillLevel = (level: string): string => {
    const skillMap: Record<string, string> = {
      'BEGINNER': 'Beginner',
      'IMPROVER': 'Improver',
      'INTERMEDIATE': 'Intermediate',
      'UPPER_INTERMEDIATE': 'Upper Intermediate',
      'EXPERT': 'Expert',
      'ADVANCED': 'Advanced',
    };
    return skillMap[level] || level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  const getSkillLevels = () => {
    if (!match.skillLevels || match.skillLevels.length === 0) return [];
    return match.skillLevels;
  };

  return (
    <TouchableOpacity
      style={styles.matchCard}
      activeOpacity={0.7}
      onPress={() => onPress(match)}
    >
      {/* Top Section - Players and FRIENDLY Badge */}
      <View style={styles.cardTopSection}>
        <View style={styles.playersRow}>
          {/* Show participants */}
          {activeParticipants.map((participant) => (
            <View key={participant.user.id} style={styles.playerColumn}>
              <View style={styles.playerAvatarLarge}>
                {renderPlayerAvatar(participant)}
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
                {isDoubles ? `${Math.ceil(emptySlots / 2)} pair slot` : `${emptySlots} player slot`}
              </Text>
            </View>
          )}
        </View>

        {/* FRIENDLY Badge */}
        <View style={styles.friendlyBadgeCard}>
          <Text style={styles.friendlyBadgeCardText}>FRIENDLY</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Match Info Section */}
      <View style={styles.cardInfoSection}>
        <Text style={styles.matchTitleText}>
          {match.matchType === 'DOUBLES' ? 'Doubles' : 'Singles'} Friendly Match
        </Text>

        <View style={styles.cardInfoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>
            {formatTimeRange(dateString)}
          </Text>
        </View>

        <View style={styles.cardInfoRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>{match.location || match.venue || 'Location TBD'}</Text>
        </View>

        {/* Fee Info with Court Booked Badge */}
        <View style={styles.cardInfoRow}>
          <Text style={styles.feeIcon}>$</Text>
          <Text style={styles.cardInfoText}>
            {(() => {
              if (match.fee === 'FREE') return 'Free';
              if (!match.fee || !match.feeAmount) return 'Fee TBD';
              const totalAmount = Number(match.feeAmount);
              if (match.fee === 'SPLIT') {
                const numPlayers = match.matchType === 'DOUBLES' ? 4 : 2;
                const perPlayer = (totalAmount / numPlayers).toFixed(2);
                return `Split · RM${perPlayer} per player`;
              }
              return `Fixed · RM${totalAmount.toFixed(2)} per player`;
            })()}
          </Text>
          {match.courtBooked !== undefined && (
            <View style={match.courtBooked ? styles.courtBookedBadge : styles.courtNotBookedBadge}>
              <Text style={match.courtBooked ? styles.courtBookedText : styles.courtNotBookedText}>
                {match.courtBooked ? 'Court booked' : 'Court not booked'}
              </Text>
              <Ionicons
                name={match.courtBooked ? "checkmark-circle" : "close-circle"}
                size={14}
                color={match.courtBooked ? "#10B981" : "#DC2626"}
                style={{ marginLeft: 4 }}
              />
            </View>
          )}
        </View>

        {/* Gender and Skill Level Restrictions */}
        {(getGenderRestrictionText() || getSkillLevels().length > 0) && (
          <View style={styles.restrictionsRow}>
            {getGenderRestrictionText() && (
              <View style={styles.restrictionChip}>
                <Text style={styles.restrictionText}>{getGenderRestrictionText()}</Text>
              </View>
            )}
            {getSkillLevels().map((level, index) => (
              <View key={`skill-${index}`} style={styles.restrictionChip}>
                <Text style={styles.restrictionText}>{formatSkillLevel(level)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  playerColumn: {
    alignItems: 'center',
    gap: 4,
  },
  playerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8B4BC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1C1E',
    maxWidth: 60,
    textAlign: 'center',
  },
  emptySlotColumn: {
    alignItems: 'center',
    gap: 4,
  },
  emptySlotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptySlotCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  friendlyBadgeCard: {
    backgroundColor: '#5A5E6A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  friendlyBadgeCardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  cardInfoSection: {
    gap: 8,
  },
  matchTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  feeIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 16,
    textAlign: 'center',
  },
  courtBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  courtBookedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  courtNotBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
  },
  courtNotBookedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  restrictionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  restrictionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  restrictionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
});

export default FriendlyMatchCard;
