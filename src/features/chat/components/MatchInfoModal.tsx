import React, { useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetHandle,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MatchInfoModalProps {
  visible: boolean;
  onClose: () => void;
  matchData: {
    matchType?: 'SINGLES' | 'DOUBLES';
    numberOfPlayers?: string;
    sportType: string;
    location: string;
    date: string;
    time: string;
    duration: number;
    fee: 'FREE' | 'SPLIT' | 'FIXED';
    feeAmount?: string;
    courtBooked?: boolean;
    notes?: string;
    description?: string;
    participants?: Array<{
      userId?: string;
      id?: string;
      invitationStatus?: string;
      user?: {
        id: string;
        name: string;
        image?: string;
      };
    }>;
  };
  /** Used to display the match creator as the first player */
  creatorName: string;
  /** Used to display the match creator's avatar */
  creatorImage?: string | null;
  formattedDate: string;
  formattedTime: string;
  formattedEndTime: string;
  /** Loading state while fetching participant details */
  isLoading?: boolean;
}

export const MatchInfoModal: React.FC<MatchInfoModalProps> = memo(({
  visible,
  onClose,
  matchData,
  creatorName,
  creatorImage,
  formattedDate,
  formattedTime,
  formattedEndTime,
  isLoading = false,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ['85%', '95%'], []);

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  // Memoize sport colors based on sport type
  const sportColors = useMemo(() => {
    switch (matchData.sportType) {
      case 'PICKLEBALL':
        return { badge: '#A855F7', label: 'Pickleball' };
      case 'TENNIS':
        return { badge: '#22C55E', label: 'Tennis' };
      case 'PADEL':
        return { badge: '#60A5FA', label: 'Padel' };
      default:
        return { badge: '#A855F7', label: 'League' };
    }
  }, [matchData.sportType]);

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
      style={styles.bottomSheetContainer}
      enablePanDownToClose={true}
      enableDismissOnClose={true}
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Match Information</Text>
        </View>

        {/* Match Type Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: '#F3F4F6' }]}>
            <Text style={styles.typeBadgeText}>
              {matchData.matchType === 'DOUBLES' || matchData.numberOfPlayers === '4' ? 'Doubles' : 'Singles'} Match
            </Text>
          </View>
          <View style={[styles.sportBadge, { borderColor: sportColors.badge }]}>
            <Text style={[styles.sportBadgeText, { color: sportColors.badge }]}>
              {sportColors.label}
            </Text>
          </View>
        </View>

        {/* Players */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players</Text>
          <View style={styles.playersContainer}>
            {/* Creator (first player) */}
            <View style={styles.playerItem}>
              {creatorImage ? (
                <Image source={{ uri: creatorImage }} style={styles.playerAvatar} />
              ) : (
                <View style={styles.playerAvatarPlaceholder}>
                  <Text style={styles.playerAvatarText}>
                    {creatorName?.charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.playerName} numberOfLines={1}>
                {creatorName || 'Unknown'}
              </Text>
            </View>
            {/* Other participants (excluding creator) */}
            {matchData.participants
              ?.filter(p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING')
              .slice(1) // Skip first participant (creator already shown)
              .map((participant, index) => {
                // Handle both API format (has user object) and chat format (just userId)
                const userName = participant.user?.name || (isLoading ? 'Loading...' : 'Player');
                const userImage = participant.user?.image;
                const userInitial = userName.charAt(0).toUpperCase();

                return (
                  <View key={participant.user?.id || participant.userId || index} style={styles.playerItem}>
                    {userImage ? (
                      <Image source={{ uri: userImage }} style={styles.playerAvatar} />
                    ) : (
                      <View style={styles.playerAvatarPlaceholder}>
                        <Text style={styles.playerAvatarText}>
                          {userInitial}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.playerName} numberOfLines={1}>
                      {userName}
                    </Text>
                  </View>
                );
              })}
            {/* Empty slots */}
            {(() => {
              const activeCount = matchData.participants?.filter(
                p => !p.invitationStatus || p.invitationStatus === 'ACCEPTED' || p.invitationStatus === 'PENDING'
              ).length || 0;
              // Use at least 1 for creator if no participants
              const filledSlots = Math.max(activeCount, 1);
              const maxSlots = matchData.matchType === 'DOUBLES' || matchData.numberOfPlayers === '4' ? 4 : 2;
              const emptySlots = Math.max(0, maxSlots - filledSlots);
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

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#86868B" />
            <Text style={styles.infoText}>{formattedDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#86868B" />
            <Text style={styles.infoText}>
              {formattedTime} – {formattedEndTime}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={20} color="#86868B" />
            <Text style={styles.infoText}>{matchData.duration} hour{matchData.duration > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#86868B" />
            <Text style={styles.infoText}>{matchData.location || 'TBD'}</Text>
          </View>
        </View>

        {/* Court Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Court Status</Text>
          <View style={[
            styles.statusBadge,
            matchData.courtBooked ? styles.statusBadgeBooked : styles.statusBadgeNotBooked
          ]}>
            <Ionicons 
              name={matchData.courtBooked ? "checkmark-circle" : "close-circle"} 
              size={18} 
              color={matchData.courtBooked ? "#16A34A" : "#DC2626"} 
            />
            <Text style={[
              styles.statusText,
              matchData.courtBooked ? styles.statusTextBooked : styles.statusTextNotBooked
            ]}>
              Court {matchData.courtBooked ? 'booked' : 'not booked'}
            </Text>
          </View>
        </View>

        {/* Court Fee */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Court Fee</Text>
          <View style={styles.infoRow}>
            <Text style={styles.costIcon}>$</Text>
            <Text style={styles.infoText}>
              {(() => {
                const fee = matchData.fee as 'FREE' | 'SPLIT' | 'FIXED' | undefined;
                const feeAmount = matchData.feeAmount as string | undefined;
                
                if (fee === 'FREE' || !fee) {
                  return 'Free';
                } else if (fee === 'SPLIT' && feeAmount) {
                  const totalAmount = parseFloat(feeAmount);
                  const numPlayers = parseInt(matchData.numberOfPlayers || '2', 10);
                  const perPlayer = numPlayers > 0 ? (totalAmount / numPlayers).toFixed(2) : '0.00';
                  return `Split · Est. RM${perPlayer} per player`;
                } else if (fee === 'FIXED' && feeAmount) {
                  return `Fixed · RM${parseFloat(feeAmount).toFixed(2)} per player`;
                }
                return 'Free';
              })()}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {matchData.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{matchData.notes}</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

MatchInfoModal.displayName = 'MatchInfoModal';

const styles = StyleSheet.create({
  handleContainer: {
    paddingTop: 8,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
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
  sportBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  sportBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
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
});
