import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FriendRequest } from '../types';
import { formatShortRelativeTime } from '../utils/timeUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH > 768;

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'received' | 'sent';
  actionLoading: string | null;
  mutualFriendsCount?: number;
  mutualFriendNames?: string[];
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onCardPress?: (playerId: string) => void;
}

const CARD_HEIGHT = 140;

export const FriendRequestCard: React.FC<FriendRequestCardProps> = ({
  request,
  type,
  actionLoading,
  mutualFriendsCount,
  mutualFriendNames,
  onAccept,
  onReject,
  onCancel,
  onCardPress,
}) => {
  const player = type === 'received' ? request.requester : request.recipient;
  const [isDismissing, setIsDismissing] = useState(false);

  // Animation values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const cardHeight = useSharedValue(CARD_HEIGHT);
  const marginBottom = useSharedValue(12);

  const callbackRef = useRef<(() => void) | null>(null);

  const executeCallback = useCallback(() => {
    if (callbackRef.current) {
      callbackRef.current();
      callbackRef.current = null;
    }
  }, []);

  const animateDismiss = useCallback(
    (direction: 'left' | 'right', callback: () => void) => {
      setIsDismissing(true);
      callbackRef.current = callback;
      const targetX = direction === 'right' ? SCREEN_WIDTH + 50 : -SCREEN_WIDTH - 50;

      translateX.value = withTiming(targetX, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });

      opacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });

      cardHeight.value = withDelay(
        200,
        withTiming(0, {
          duration: 200,
          easing: Easing.inOut(Easing.cubic),
        })
      );

      marginBottom.value = withDelay(
        200,
        withTiming(
          0,
          {
            duration: 200,
            easing: Easing.inOut(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(executeCallback)();
            }
          }
        )
      );
    },
    [executeCallback]
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
    marginBottom: marginBottom.value,
    overflow: 'hidden',
  }));

  if (!player) return null;

  const isPending = request.status === 'PENDING';
  const isActionLoading = actionLoading === request.id;
  const timestamp = formatShortRelativeTime(request.createdAt);

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    animateDismiss('right', () => onAccept?.(request.id));
  };

  const handleReject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    animateDismiss('left', () => onReject?.(request.id));
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateDismiss('left', () => onCancel?.(request.id));
  };

  const handleCardPress = () => {
    if (onCardPress && player.id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onCardPress(player.id);
    }
  };

  const getMutualFriendsText = () => {
    if (!mutualFriendsCount || mutualFriendsCount === 0) return null;
    if (mutualFriendsCount === 1) {
      return mutualFriendNames?.[0] ? `Friends with ${mutualFriendNames[0]}` : '1 mutual friend';
    }
    if (mutualFriendsCount === 2 && mutualFriendNames?.length === 2) {
      return `Friends with ${mutualFriendNames[0]} and ${mutualFriendNames[1]}`;
    }
    return `${mutualFriendsCount} mutual friends`;
  };

  const mutualFriendsText = getMutualFriendsText();

  return (
    <Animated.View style={[styles.card, animatedCardStyle]}>
      <TouchableOpacity
        activeOpacity={onCardPress ? 0.7 : 1}
        onPress={handleCardPress}
        disabled={!onCardPress || isDismissing}
        style={styles.cardContent}
      >
        {/* Header Row */}
        <View style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {player.image ? (
              <Image source={{ uri: player.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Text style={styles.defaultAvatarText}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
            </Text>
            {player.displayUsername && (
              <Text style={styles.username} numberOfLines={1}>
                @{player.displayUsername}
              </Text>
            )}
            {mutualFriendsText && (
              <Text style={styles.mutualFriends} numberOfLines={1}>
                {mutualFriendsText}
              </Text>
            )}
          </View>

          {/* Timestamp */}
          {timestamp && (
            <Text style={styles.timestamp}>{timestamp}</Text>
          )}
        </View>

        {/* Action Buttons */}
        {isPending && (
          <View style={styles.actionButtons}>
            {type === 'received' ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={isActionLoading || isDismissing}
                  activeOpacity={0.7}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#F44336" />
                  ) : (
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={handleAccept}
                  disabled={isActionLoading || isDismissing}
                  activeOpacity={0.7}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={isActionLoading || isDismissing}
                activeOpacity={0.7}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#666666" />
                ) : (
                  <Text style={styles.cancelButtonText}>Cancel Request</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AVATAR_SIZE = isSmallScreen ? 56 : isTablet ? 72 : 64;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#EEEEEE',
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 20 : isTablet ? 26 : 22,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  name: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 15 : isTablet ? 18 : 16,
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  username: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : isTablet ? 14 : 13,
    color: '#666666',
    marginTop: 2,
  },
  mutualFriends: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 11 : isTablet ? 13 : 12,
    color: '#999999',
    marginTop: 4,
  },
  timestamp: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 11 : isTablet ? 13 : 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    justifyContent: 'flex-end',
  },
  button: {
    paddingHorizontal: isSmallScreen ? 18 : isTablet ? 28 : 22,
    paddingVertical: isSmallScreen ? 9 : isTablet ? 12 : 10,
    borderRadius: 999,
    minWidth: isSmallScreen ? 80 : isTablet ? 110 : 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 13 : isTablet ? 15 : 14,
    color: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 13 : isTablet ? 15 : 14,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  cancelButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 13 : isTablet ? 15 : 14,
    color: '#666666',
  },
});
