import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';
import { PartnerChangeRequestModal } from './PartnerChangeRequestModal';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface Partnership {
  id: string;
  seasonId?: string;
  captainId: string;
  partnerId: string;
  captain: {
    id: string;
    name: string;
    image: string | null;
    skillRatings?: Record<string, { singles?: number; doubles?: number }>;
  };
  partner: {
    id: string;
    name: string;
    image: string | null;
    skillRatings?: Record<string, { singles?: number; doubles?: number }>;
  };
  division: {
    id: string;
    name: string;
  } | null;
  pairRating: number | null;
  season: {
    id: string;
    name: string;
    sportType?: string;
    category?: {
      gameType?: string;
    };
    leagues?: Array<{
      sportType?: string;
    }>;
  };
}

interface PartnershipCardProps {
  partnership: Partnership;
  currentUserId?: string;
  onDissolve?: () => void;
  showActions?: boolean;
  hasPartnerPendingRequest?: boolean;
  hasMyPendingRequest?: boolean;
}

export const PartnershipCard: React.FC<PartnershipCardProps> = ({
  partnership,
  currentUserId,
  onDissolve,
  showActions = true,
  hasPartnerPendingRequest = false,
  hasMyPendingRequest = false,
}) => {
  const [changeRequestModalVisible, setChangeRequestModalVisible] = useState(false);

  // Determine which player is the current user and which is the partner
  const isCurrentUserCaptain = partnership.captainId === currentUserId;
  const currentUser = isCurrentUserCaptain ? partnership.captain : partnership.partner;
  const partner = isCurrentUserCaptain ? partnership.partner : partnership.captain;

  // Get sport type from leagues[0].sportType (actual sport like Pickleball/Tennis)
  // NOT from category.gameType which is the match format (Singles/Doubles)
  const sportType = partnership.season.leagues?.[0]?.sportType || partnership.season.sportType || 'Tennis';

  // Calculate Team DMR as average of both players' doubles ratings for this sport
  const teamDMR = useMemo(() => {
    // First check if pairRating exists (from backend)
    if (partnership.pairRating) {
      return partnership.pairRating;
    }

    // Otherwise calculate from skillRatings
    // skillRatings are keyed by sport name (pickleball, tennis, padel)
    // and values are in decimal form (e.g., 3.5 = 3500), so multiply by 1000
    const sportKey = sportType.toLowerCase();
    const currentUserRating = currentUser.skillRatings?.[sportKey]?.doubles;
    const partnerRating = partner.skillRatings?.[sportKey]?.doubles;

    if (currentUserRating && partnerRating) {
      // Ratings are stored as decimals (e.g., 3.5), multiply by 1000 to get DMR value
      return Math.round(((currentUserRating + partnerRating) / 2) * 1000);
    } else if (currentUserRating) {
      return Math.round(currentUserRating * 1000);
    } else if (partnerRating) {
      return Math.round(partnerRating * 1000);
    }

    return null;
  }, [partnership.pairRating, currentUser.skillRatings, partner.skillRatings, sportType]);

  const handleViewProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/player-profile/${partner.id}` as any);
  };

  // Buttons should be disabled if either user has a pending request
  const areActionsDisabled = hasPartnerPendingRequest || hasMyPendingRequest;

  const handleRequestPartnerChange = () => {
    if (areActionsDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChangeRequestModalVisible(true);
  };

  const handleDissolve = () => {
    if (areActionsDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Leave Partnership',
      `Are you sure you want to leave your partnership with ${partner.name}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave Partnership',
          style: 'destructive',
          onPress: async () => {
            try {
              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/partnership/${partnership.id}/dissolve`,
                {
                  method: 'POST',
                }
              );

              const responseData = (response as any).data || response;
              if (responseData && responseData.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                toast.success('Partnership Dissolved', {
                  description: 'You can now find a new partner',
                });

                if (onDissolve) {
                  onDissolve();
                }

                // Navigate to doubles team pairing page
                if (partnership?.season?.id) {
                  router.push({
                    pathname: '/user-dashboard/doubles-team-pairing',
                    params: { seasonId: partnership.season.id }
                  } as any);
                } else {
                  toast.error('Error', {
                    description: 'Season information missing',
                  });
                }
              } else {
                toast.error('Error', {
                  description: responseData.message || 'Failed to dissolve partnership',
                });
              }
            } catch (error) {
              console.error('Error dissolving partnership:', error);
              toast.error('Error', {
                description: 'Failed to dissolve partnership',
              });
            }
          },
        },
      ]
    );
  };

  // Render avatar helper
  const renderAvatar = (
    user: { name: string; image: string | null },
    size: number,
    style?: any
  ) => {
    if (user.image) {
      return (
        <Image
          source={{ uri: user.image }}
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: '#FFFFFF',
            },
            style,
          ]}
        />
      );
    }
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            backgroundColor: '#A04DFE',
            justifyContent: 'center',
            alignItems: 'center',
          },
          style,
        ]}
      >
        <Text
          style={{
            fontFamily: 'Inter',
            fontSize: size * 0.4,
            fontWeight: '600',
            color: '#FFFFFF',
          }}
        >
          {user.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  // Format sport type for display (capitalize first letter)
  const formatSportType = (sport: string) => {
    return sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(100)}
      style={styles.card}
    >
      {/* Header: Season title with view profile button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your partner for {partnership.season.name}</Text>
        <TouchableOpacity
          style={styles.viewProfileIconButton}
          onPress={handleViewProfile}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person-outline" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Stacked Avatars + Partner Name */}
      <View style={styles.teamSection}>
        <View style={styles.stackedAvatars}>
          {/* Current user avatar (back) */}
          <View style={styles.avatarBack}>
            {renderAvatar(currentUser, 52)}
          </View>
          {/* Partner avatar (front, overlapping) */}
          <View style={styles.avatarFront}>
            {renderAvatar(partner, 52)}
          </View>
        </View>

        <View style={styles.teamInfo}>
          <Text style={styles.partnerName}>{partner.name}</Text>
          <Text style={styles.teamLabel}>& You</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Team DMR */}
        <View style={styles.statItem}>
          <View style={styles.statIconContainer}>
            <Ionicons name="analytics" size={16} color="#A04DFE" />
          </View>
          <View>
            <Text style={styles.statValue}>
              {teamDMR ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Team DMR</Text>
          </View>
        </View>

        {/* Division */}
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="trophy" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.statValue}>
              {partnership.division?.name || 'TBD'}
            </Text>
            <Text style={styles.statLabel}>Division</Text>
          </View>
        </View>

        {/* Sport Type */}
        <View style={styles.statItem}>
          <View style={[styles.statIconContainer, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="tennisball" size={16} color="#10B981" />
          </View>
          <View>
            <Text style={styles.statValue}>
              {formatSportType(sportType)}
            </Text>
            <Text style={styles.statLabel}>Sport</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.requestChangeButton,
              areActionsDisabled && styles.buttonDisabled,
            ]}
            onPress={handleRequestPartnerChange}
            activeOpacity={areActionsDisabled ? 1 : 0.7}
            disabled={areActionsDisabled}
          >
            <Ionicons
              name="swap-horizontal"
              size={18}
              color={areActionsDisabled ? '#9CA3AF' : '#EA580C'}
            />
            <Text
              style={[
                styles.requestChangeText,
                areActionsDisabled && styles.buttonTextDisabled,
              ]}
            >
              Request Change
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.leaveButton,
              areActionsDisabled && styles.buttonDisabled,
            ]}
            onPress={handleDissolve}
            activeOpacity={areActionsDisabled ? 1 : 0.7}
            disabled={areActionsDisabled}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={areActionsDisabled ? '#9CA3AF' : '#DC2626'}
            />
            <Text
              style={[
                styles.leaveButtonText,
                areActionsDisabled && styles.buttonTextDisabled,
              ]}
            >
              Leave
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Partner Change Request Modal */}
      <PartnerChangeRequestModal
        visible={changeRequestModalVisible}
        partnership={partnership}
        currentUserId={currentUserId || ''}
        onClose={() => setChangeRequestModalVisible(false)}
        onSuccess={() => {
          if (onDissolve) {
            onDissolve();
          }
        }}
        sport={sportType.toLowerCase() as 'pickleball' | 'tennis' | 'padel'}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginHorizontal: 16,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.2,
    flex: 1,
  },
  viewProfileIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBack: {
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarFront: {
    marginLeft: -20,
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  teamInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  teamLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  requestChangeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  requestChangeText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  leaveButtonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Disabled button styles
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});
