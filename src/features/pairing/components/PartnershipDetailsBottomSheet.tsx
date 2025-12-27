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

interface Player {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string | null;
  image?: string | null;
  area?: string | null;
  gender?: string | null;
  dmr?: number;
}

interface SeasonPartnership {
  id: string;
  captainId: string;
  partnerId: string;
  seasonId: string;
  generalPartnershipId?: string | null;
  captain: Player;
  partner: Player;
  totalDmr?: number;
}

interface PartnershipDetailsBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  partnership: SeasonPartnership | null;
  currentUserId: string;
  isLoading?: boolean;
  onUnlink: (partnershipId: string) => Promise<void>;
}

export const PartnershipDetailsBottomSheet: React.FC<PartnershipDetailsBottomSheetProps> = ({
  bottomSheetRef,
  partnership,
  currentUserId,
  isLoading = false,
  onUnlink,
}) => {
  const [isUnlinking, setIsUnlinking] = React.useState(false);

  const captain = partnership?.captain;
  const partner = partnership?.partner;
  const totalDmr = partnership?.totalDmr || 0;

  const handleUnlink = useCallback(() => {
    if (!partnership) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const partnerName = partnership.captainId === currentUserId
      ? partnership.partner.name
      : partnership.captain.name;

    Alert.alert(
      'Unlink Partnership',
      `Are you sure you want to unlink from ${partnerName} for this season? Your general partnership will remain intact.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUnlinking(true);
              await onUnlink(partnership.id);
            } catch (error) {
              console.error('Error unlinking partnership:', error);
            } finally {
              setIsUnlinking(false);
            }
          },
        },
      ]
    );
  }, [partnership, currentUserId, onUnlink]);

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

  const renderPlayerCard = (player: Player | undefined, label: string) => {
    if (!player) return null;

    return (
      <View style={styles.playerCard}>
        <Text style={styles.roleLabel}>{label}</Text>
        <View style={styles.playerInfo}>
          {player.image ? (
            <Image source={{ uri: player.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {player.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.playerDetails}>
            <Text style={styles.playerName}>{player.name}</Text>
            {player.dmr && player.dmr > 0 && (
              <View style={styles.dmrBadge}>
                <Text style={styles.dmrText}>DMR: {player.dmr.toFixed(1)}</Text>
              </View>
            )}
            {player.area && (
              <View style={styles.locationBadge}>
                <Ionicons name="location-outline" size={12} color="#666666" />
                <Text style={styles.locationText}>{player.area}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['65%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Partnership Details</Text>
          <Text style={styles.subtitle}>
            Your active partnership for this season
          </Text>
        </View>

        {isLoading || !partnership || !captain || !partner ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FEA04D" />
          </View>
        ) : (
          <>
            <View style={styles.playersContainer}>
              {renderPlayerCard(captain, 'Captain')}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerIcon}>
                  <Ionicons name="people" size={20} color="#FEA04D" />
                </View>
                <View style={styles.dividerLine} />
              </View>
              {renderPlayerCard(partner, 'Partner')}
            </View>

            {totalDmr > 0 && (
              <View style={styles.totalDmrCard}>
                <View style={styles.totalDmrRow}>
                  <Text style={styles.totalDmrLabel}>Combined DMR</Text>
                  <View style={styles.totalDmrBadge}>
                    <Ionicons name="trophy" size={18} color="#FEA04D" />
                    <Text style={styles.totalDmrValue}>{totalDmr.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            )}

            {partnership.generalPartnershipId && (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle-outline" size={20} color="#666666" />
                <Text style={styles.infoText}>
                  Unlinking removes this season partnership but keeps your general partnership intact
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.unlinkButton, isUnlinking && styles.unlinkButtonDisabled]}
              onPress={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? (
                <ActivityIndicator size="small" color="#F44336" />
              ) : (
                <>
                  <Ionicons name="link-outline" size={20} color="#F44336" />
                  <Text style={styles.unlinkButtonText}>Unlink Partnership</Text>
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
    marginBottom: 20,
  },
  title: {
    fontSize: isSmallScreen ? 20 : isTablet ? 26 : 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    fontWeight: '400',
    color: '#666666',
    fontFamily: 'Inter',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  playersContainer: {
    marginBottom: 16,
  },
  playerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: isSmallScreen ? 52 : isTablet ? 64 : 56,
    height: isSmallScreen ? 52 : isTablet ? 64 : 56,
    borderRadius: isSmallScreen ? 26 : isTablet ? 32 : 28,
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 18 : isTablet ? 26 : 22,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  playerDetails: {
    marginLeft: 14,
    flex: 1,
  },
  playerName: {
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E2E2',
  },
  dividerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  totalDmrCard: {
    backgroundColor: '#FFF4EC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalDmrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalDmrLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter',
  },
  totalDmrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEA04D',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  totalDmrValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
    fontFamily: 'Inter',
    lineHeight: 18,
  },
  unlinkButton: {
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
  unlinkButtonDisabled: {
    opacity: 0.6,
  },
  unlinkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
    fontFamily: 'Inter',
  },
});
