import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PairRequest } from '../hooks/useIncomingPairRequests';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface IncomingPairRequestCardProps {
  request: PairRequest;
  onAccept: (requestId: string) => void;
  onDeny: (requestId: string, requesterName: string) => void;
  isLoading?: boolean;
}

/**
 * Card component for displaying an incoming pair request
 * Used in ManagePartnershipScreen when user has INCOMPLETE partnership
 */
export const IncomingPairRequestCard: React.FC<IncomingPairRequestCardProps> = ({
  request,
  onAccept,
  onDeny,
  isLoading = false,
}) => {
  const { requester } = request;

  const getTimeRemaining = () => {
    const now = new Date();
    const expiry = new Date(request.expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  const handleAccept = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAccept(request.id);
  };

  const handleDeny = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeny(request.id, requester.name);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="person-add" size={18} color="#F97316" />
          <Text style={styles.title}>Partner Request</Text>
        </View>
        <Text style={styles.expiry}>{getTimeRemaining()}</Text>
      </View>

      <View style={styles.playerRow}>
        {requester.image ? (
          <Image source={{ uri: requester.image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.defaultAvatar]}>
            <Text style={styles.avatarText}>
              {requester.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{requester.name}</Text>
          {requester.displayUsername && (
            <Text style={styles.playerUsername}>@{requester.displayUsername}</Text>
          )}
          <Text style={styles.wantsToJoin}>wants to join your team</Text>
        </View>
      </View>

      {request.message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>Message:</Text>
          <Text style={styles.messageText}>{request.message}</Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.denyButton}
          onPress={handleDeny}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#DC2626" />
          ) : (
            <Text style={styles.denyText}>Decline</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.acceptText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#F97316',
    ...Platform.select({
      ios: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '700',
    color: '#F97316',
    fontFamily: 'Inter',
  },
  expiry: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    backgroundColor: '#A04DFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  playerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  playerName: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  playerUsername: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#6B7280',
    fontFamily: 'Inter',
    marginTop: 1,
  },
  wantsToJoin: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#F97316',
    fontFamily: 'Inter',
    marginTop: 2,
    fontWeight: '500',
  },
  messageBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A3412',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  messageText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#7C2D12',
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    fontFamily: 'Inter',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});
