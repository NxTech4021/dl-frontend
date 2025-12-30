import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetHandle,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Match } from './types';

interface MatchDetailModalProps {
  match: Match | null;
  visible: boolean;
  onClose: () => void;
  onJoinMatch: (match: Match) => void;
  isUserInMatch: boolean;
  isJoining: boolean;
  sportType: string;
  sportColors: {
    background: string;
    badgeColor: string;
  };
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  visible,
  onClose,
  onJoinMatch,
  isUserInMatch,
  isJoining,
  sportType,
  sportColors,
}) => {
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%', '95%'], []);

  useEffect(() => {
    if (visible && match) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, match]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={() => bottomSheetModalRef.current?.dismiss()}
      />
    ),
    []
  );

  const isMatchFull = useMemo(() => {
    if (!match?.participants) return false;
    const activeCount = match.participants.filter(
      p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
    ).length;
    const maxSlots = match.matchType === 'DOUBLES' ? 4 : 2;
    return activeCount >= maxSlots;
  }, [match]);

  if (!match) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      handleComponent={(props) => (
        <View style={styles.handleContainer}>
          <BottomSheetHandle {...props} />
        </View>
      )}
      backgroundStyle={styles.bottomSheetBackground}
      enablePanDownToClose={true}
      enableDismissOnClose={true}
    >
      <BottomSheetScrollView
        style={styles.modalContent}
        contentContainerStyle={[styles.modalContentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Match Information</Text>
        </View>

        {/* Match Type Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={styles.typeBadgeText}>
              {match.matchType === 'DOUBLES' ? 'Doubles' : 'Singles'} Match
            </Text>
          </View>
          <View style={[styles.sportBadgeModal, { borderColor: sportColors.background }]}>
            <Text style={[styles.sportBadgeModalText, { color: sportColors.background }]}>
              {sportType.charAt(0).toUpperCase() + sportType.slice(1).toLowerCase()}
            </Text>
          </View>
        </View>

        {/* Players */}
        {match.participants && match.participants.length > 0 && (
          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Players</Text>
            <View style={styles.playersContainer}>
              {match.participants
                .filter(p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING')
                .map((participant) => (
                  <View key={participant.user.id} style={styles.playerItem}>
                    {participant.user.image ? (
                      <Image source={{ uri: participant.user.image }} style={styles.playerAvatar} />
                    ) : (
                      <View style={styles.playerAvatarPlaceholder}>
                        <Text style={styles.playerAvatarText}>
                          {participant.user.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.playerName} numberOfLines={1}>
                      {participant.user.name}
                    </Text>
                  </View>
                ))}
              {/* Show empty slots */}
              {(() => {
                const activeCount = match.participants.filter(
                  p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
                ).length;
                const maxSlots = match.matchType === 'DOUBLES' ? 4 : 2;
                const emptySlots = maxSlots - activeCount;
                return Array.from({ length: emptySlots }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.playerItem}>
                    <View style={styles.emptyPlayerSlot}>
                      <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                    </View>
                    <Text style={styles.emptySlotText}>Open slot</Text>
                  </View>
                ));
              })()}
            </View>
          </View>
        )}

        {/* Date & Time */}
        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.infoRowModal}>
            <Ionicons name="calendar-outline" size={20} color="#86868B" />
            <Text style={styles.infoTextModal}>
              {match.scheduledTime || match.matchDate
                ? format(new Date(match.scheduledTime || match.matchDate!), 'EEEE, d MMMM yyyy')
                : 'TBD'}
            </Text>
          </View>
          <View style={styles.infoRowModal}>
            <Ionicons name="time-outline" size={20} color="#86868B" />
            <Text style={styles.infoTextModal}>
              {(() => {
                const dateString = match.scheduledTime || match.matchDate;
                if (!dateString) return 'TBD';
                const startDate = new Date(dateString);
                const duration = match.duration || 2;
                const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
                return `${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`;
              })()}
            </Text>
          </View>
          <View style={styles.infoRowModal}>
            <Ionicons name="hourglass-outline" size={20} color="#86868B" />
            <Text style={styles.infoTextModal}>
              {match.duration || 2} hour{(match.duration || 2) > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoRowModal}>
            <Ionicons name="location-outline" size={20} color="#86868B" />
            <Text style={styles.infoTextModal}>
              {match.location || match.venue || 'TBD'}
            </Text>
          </View>
        </View>

        {/* Court Status */}
        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Court Status</Text>
          <View style={[
            styles.statusBadge,
            match.courtBooked ? styles.statusBadgeBooked : styles.statusBadgeNotBooked
          ]}>
            <Ionicons
              name={match.courtBooked ? "checkmark-circle" : "close-circle"}
              size={18}
              color={match.courtBooked ? "#16A34A" : "#DC2626"}
            />
            <Text style={[
              styles.statusText,
              match.courtBooked ? styles.statusTextBooked : styles.statusTextNotBooked
            ]}>
              Court {match.courtBooked ? 'booked' : 'not booked'}
            </Text>
          </View>
        </View>

        {/* Court Fee */}
        <View style={styles.modalSection}>
          <Text style={styles.sectionTitle}>Court Fee</Text>
          <View style={styles.infoRowModal}>
            <Text style={styles.costIcon}>$</Text>
            <Text style={styles.infoTextModal}>
              {(() => {
                const fee = match.fee;
                const feeAmount = match.feeAmount;

                if (fee === 'FREE' || !fee) {
                  return 'Free';
                } else if (fee === 'SPLIT' && feeAmount) {
                  const totalAmount = Number(feeAmount);
                  const numPlayers = match.matchType === 'DOUBLES' ? 4 : 2;
                  const perPlayer = numPlayers > 0 ? (totalAmount / numPlayers).toFixed(2) : '0.00';
                  return `Split · Est. RM${perPlayer} per player`;
                } else if (fee === 'FIXED' && feeAmount) {
                  return `Fixed · RM${Number(feeAmount).toFixed(2)} per player`;
                }
                return 'Free';
              })()}
            </Text>
          </View>
        </View>

        {/* Description/Notes */}
        {match.description && (
          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{match.description}</Text>
          </View>
        )}

        {/* Join Match Button */}
        <View style={styles.joinButtonContainer}>
          <TouchableOpacity
            style={[
              styles.joinMatchButton,
              {
                backgroundColor: isUserInMatch || isMatchFull ? '#9CA3AF' : sportColors.background
              }
            ]}
            activeOpacity={isUserInMatch || isMatchFull ? 1 : 0.8}
            disabled={isUserInMatch || isJoining || isMatchFull}
            onPress={() => onJoinMatch(match)}
          >
            <Text style={styles.joinMatchButtonText}>
              {isJoining ? 'Loading...' : isUserInMatch ? 'Already Joined' : isMatchFull ? 'Match Full' : 'Join Match'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    paddingTop: 8,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  sportBadgeModal: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  sportBadgeModalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  playersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  playerItem: {
    alignItems: 'center',
    width: 70,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  playerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8B4BC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  playerAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  emptyPlayerSlot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTextModal: {
    fontSize: 15,
    color: '#86868B',
    marginLeft: 10,
  },
  costIcon: {
    fontSize: 15,
    fontWeight: '500',
    color: '#86868B',
    width: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgeBooked: {
    backgroundColor: '#F0FDF4',
  },
  statusBadgeNotBooked: {
    backgroundColor: '#FEF2F2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusTextBooked: {
    color: '#16A34A',
  },
  statusTextNotBooked: {
    color: '#DC2626',
  },
  notesText: {
    fontSize: 14,
    color: '#86868B',
    lineHeight: 20,
  },
  joinButtonContainer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  joinMatchButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinMatchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
