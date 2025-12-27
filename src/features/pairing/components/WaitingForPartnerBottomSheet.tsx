import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface Partner {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string | null;
  image?: string | null;
  area?: string | null;
  gender?: string | null;
  dmr?: number;
}

interface SeasonInvitation {
  id: string;
  senderId: string;
  recipientId: string;
  generalPartnershipId: string;
  seasonId: string;
  status: string;
  createdAt: string;
  sender?: Partner;
  recipient?: Partner;
}

interface WaitingForPartnerBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  invitation: SeasonInvitation | null;
  currentUserId: string;
  isLoading?: boolean;
  onCancelInvitation: (invitationId: string) => Promise<void>;
}

export const WaitingForPartnerBottomSheet: React.FC<WaitingForPartnerBottomSheetProps> = ({
  bottomSheetRef,
  invitation,
  currentUserId,
  isLoading = false,
  onCancelInvitation,
}) => {
  const [isCancelling, setIsCancelling] = React.useState(false);

  const partner = invitation
    ? invitation.senderId === currentUserId
      ? invitation.recipient
      : invitation.sender
    : null;

  const handleCancelInvitation = useCallback(() => {
    if (!invitation || !partner) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Cancel Invitation',
      `Are you sure you want to cancel your invitation to ${partner.name}?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              await onCancelInvitation(invitation.id);
            } catch (error) {
              console.error('Error cancelling invitation:', error);
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  }, [invitation, partner, onCancelInvitation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['50%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="time-outline" size={48} color="#FEA04D" />
          </View>
          <Text style={styles.title}>Waiting for Partner</Text>
          <Text style={styles.subtitle}>
            Your invitation has been sent and is pending acceptance
          </Text>
        </View>

        {isLoading || !partner ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FEA04D" />
          </View>
        ) : (
          <>
            <View style={styles.partnerCard}>
              <View style={styles.partnerInfo}>
                {partner.image ? (
                  <Image source={{ uri: partner.image }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <Text style={styles.defaultAvatarText}>
                      {partner.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.partnerDetails}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  {partner.dmr && partner.dmr > 0 && (
                    <View style={styles.dmrBadge}>
                      <Text style={styles.dmrText}>DMR: {partner.dmr.toFixed(1)}</Text>
                    </View>
                  )}
                  {partner.area && (
                    <View style={styles.locationBadge}>
                      <Ionicons name="location-outline" size={12} color="#666666" />
                      <Text style={styles.locationText}>{partner.area}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <Ionicons name="information-circle-outline" size={20} color="#666666" />
                <Text style={styles.statusText}>
                  {partner.name} will be notified in the Requests tab
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
              onPress={handleCancelInvitation}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#F44336" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#F44336" />
                  <Text style={styles.cancelButtonText}>Cancel Invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handleIndicator: {
    backgroundColor: '#BABABA',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: isSmallScreen ? 20 : isTablet ? 26 : 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    fontWeight: '400',
    color: '#666666',
    fontFamily: 'Inter',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  partnerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: isSmallScreen ? 56 : isTablet ? 70 : 60,
    height: isSmallScreen ? 56 : isTablet ? 70 : 60,
    borderRadius: isSmallScreen ? 28 : isTablet ? 35 : 30,
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 20 : isTablet ? 28 : 24,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  partnerDetails: {
    marginLeft: 16,
    flex: 1,
  },
  partnerName: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  dmrBadge: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  dmrText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#666666',
    fontFamily: 'Inter',
  },
  statusContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    gap: 8,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
    fontFamily: 'Inter',
  },
});
