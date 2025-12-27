import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';
import { PartnerChangeRequestModal } from './PartnerChangeRequestModal';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface Partnership {
  id: string;
  seasonId?: string;
  player1Id: string;
  player2Id: string;
  player1: {
    id: string;
    name: string;
    image: string | null;
  };
  player2: {
    id: string;
    name: string;
    image: string | null;
  };
  division: {
    id: string;
    name: string;
  } | null;
  pairRating: number | null;
  season: {
    id: string;
    name: string;
    sportType: string;
  };
}

interface PartnershipCardProps {
  partnership: Partnership;
  currentUserId?: string;
  onDissolve?: () => void;
  showActions?: boolean;
}

export const PartnershipCard: React.FC<PartnershipCardProps> = ({
  partnership,
  currentUserId,
  onDissolve,
  showActions = true,
}) => {
  const [changeRequestModalVisible, setChangeRequestModalVisible] = useState(false);

  // Determine which player is the partner (not the current user)
  const partner = partnership.player1Id === currentUserId
    ? partnership.player2
    : partnership.player1;

  const handleViewProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/player-profile/${partner.id}` as any);
  };

  const handleRequestPartnerChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChangeRequestModalVisible(true);
  };

  const handleDissolve = () => {
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
                toast.success('Partnership Dissolved', {
                  description: 'You can now find a new partner',
                });

                if (onDissolve) {
                  onDissolve();
                }

                // Navigate to find partner page
                router.push(`/pairing/find-partner/${partnership.season.id}`);
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

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="people" size={24} color="#4CAF50" />
        <Text style={styles.headerTitle}>Current Partnership</Text>
      </View>

      {/* Partner Info */}
      <View style={styles.partnerSection}>
        {partner.image ? (
          <Image
            source={{ uri: partner.image }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.defaultAvatarText}>
              {partner.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{partner.name}</Text>

          <View style={styles.detailRow}>
            <Ionicons name="trophy" size={14} color="#666666" />
            <Text style={styles.detailText}>
              {partnership.division?.name || 'Unassigned Division'}
            </Text>
          </View>

          {partnership.pairRating && (
            <View style={styles.detailRow}>
              <Ionicons name="star" size={14} color="#FEA04D" />
              <Text style={styles.detailText}>
                Pair Rating: {partnership.pairRating}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color="#666666" />
            <Text style={styles.detailText}>
              {partnership.season.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={handleViewProfile}
          >
            <Ionicons name="person" size={16} color="#FFFFFF" />
            <Text style={styles.viewButtonText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeRequestButton}
            onPress={handleRequestPartnerChange}
          >
            <Ionicons name="swap-horizontal" size={16} color="#FF9800" />
            <Text style={styles.changeRequestButtonText}>Request Change</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dissolveButton}
            onPress={handleDissolve}
          >
            <Ionicons name="exit-outline" size={16} color="#F44336" />
            <Text style={styles.dissolveButtonText}>Leave</Text>
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
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isSmallScreen ? 14 : 16,
    marginHorizontal: isSmallScreen ? 14 : 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  partnerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
  },
  defaultAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  defaultAvatarText: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  partnerInfo: {
    flex: 1,
    gap: 6,
  },
  partnerName: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666666',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  changeRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
    gap: 6,
  },
  changeRequestButtonText: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 12 : 13,
    fontWeight: '600',
    color: '#FF9800',
  },
  dissolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    gap: 6,
  },
  dissolveButtonText: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#F44336',
  },
});
