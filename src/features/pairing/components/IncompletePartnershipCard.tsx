import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface IncompletePartnership {
  id: string;
  seasonId?: string;
  captainId: string;
  captain: {
    id: string;
    name: string;
    image: string | null;
    skillRatings?: Record<string, { singles?: number; doubles?: number }>;
  };
  partner: null; // Partner is null for INCOMPLETE partnerships
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
  status: 'INCOMPLETE';
}

interface IncompletePartnershipCardProps {
  partnership: IncompletePartnership;
  currentUserId?: string;
  onInvitePartner: () => void;
  incomingRequestCount?: number; // Number of incoming pair requests to display on button
}

export const IncompletePartnershipCard: React.FC<IncompletePartnershipCardProps> = ({
  partnership,
  currentUserId,
  onInvitePartner,
  incomingRequestCount = 0,
}) => {
  const captain = partnership.captain;

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

  const handleInvitePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onInvitePartner();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(100)}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a new partner for {partnership.season.name}</Text>
      </View>

      {/* Stacked Avatars: Current user + Empty partner slot */}
      <View style={styles.teamSection}>
        <View style={styles.stackedAvatars}>
          {/* Current user avatar (back) */}
          <View style={styles.avatarBack}>
            {renderAvatar(captain, 52)}
          </View>
          {/* Empty partner slot (front, overlapping) */}
          <TouchableOpacity
            style={styles.emptyPartnerSlot}
            onPress={handleInvitePress}
            activeOpacity={0.7}
          >
            <View style={styles.dashedCircle}>
              <Ionicons name="person-add-outline" size={24} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.teamInfo}>
          <Text style={styles.youText}>You</Text>
          <Text style={styles.needPartnerText}>Need a partner</Text>
        </View>
      </View>

      {/* Division Info (if assigned) */}
      {partnership.division && (
        <View style={styles.divisionRow}>
          <View style={styles.divisionIconContainer}>
            <Ionicons name="trophy" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.divisionText}>
            Division: <Text style={styles.divisionName}>{partnership.division.name}</Text>
          </Text>
        </View>
      )}

      {/* Invite Partner Button - Shows request count if has incoming requests */}
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={handleInvitePress}
        activeOpacity={0.7}
      >
        <Ionicons name="person-add" size={18} color="#FFFFFF" />
        <Text style={styles.inviteButtonText}>
          {incomingRequestCount > 0
            ? `View ${incomingRequestCount} Request${incomingRequestCount > 1 ? 's' : ''}`
            : 'Invite Partner'}
        </Text>
      </TouchableOpacity>

      {/* Info message about standings preservation */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
        <Text style={styles.infoText}>
          Your standings are preserved. Once you find a new partner, you can continue playing matches.
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
    flex: 1,
  },
  teamSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stackedAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  avatarBack: {
    zIndex: 1,
  },
  emptyPartnerSlot: {
    marginLeft: -16,
    zIndex: 2,
  },
  dashedCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    marginLeft: 12,
    flex: 1,
  },
  youText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  needPartnerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Inter',
    marginTop: 2,
  },
  divisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  divisionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  divisionText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  divisionName: {
    fontWeight: '600',
    color: '#374151',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter',
    flex: 1,
    lineHeight: 18,
  },
});
