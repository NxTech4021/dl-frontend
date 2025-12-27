import { getSportColors } from '@/constants/SportsColor';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Message } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MessageContextMenuProps {
  visible: boolean;
  message: Message | null;
  isCurrentUser: boolean;
  messagePosition?: { x: number; y: number; width: number; height: number };
  sportType?: string | null;
  onReply: () => void;
  onCopy: () => void;
  onDeletePress: () => void; // Triggers the delete bottom sheet
  onClose: () => void;
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = React.memo(({
  visible,
  message,
  isCurrentUser,
  messagePosition,
  sportType,
  onReply,
  onCopy,
  onDeletePress,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Get sport-specific colors for the message bubble
  const sportColors = getSportColors(sportType as any);
  const bubbleColor = isCurrentUser ? sportColors.background : '#F3F4F6';

  // Format timestamp to match SwipeableMessageBubble
  const formattedTime = useMemo(() => {
    if (!message?.timestamp) return '';
    return format(new Date(message.timestamp), 'HH:mm');
  }, [message?.timestamp]);

  // Determine if message is short (inline timestamp) or long (timestamp below)
  const isShortMessage = useMemo(() => {
    const content = message?.content || '';
    return content.length <= 20 && !content.includes('\n');
  }, [message?.content]);

  useEffect(() => {
    if (visible) {
      // Smooth fade + scale in animation (no bounce)
      backdropOpacity.value = withTiming(1, { duration: 150 });
      scale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic)
      });
      opacity.value = withTiming(1, { duration: 150 });

      // Haptic feedback on open
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else {
      // Smooth fade out
      backdropOpacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 150, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Calculate positions for message preview and menu
  const getPositions = useCallback(() => {
    if (!messagePosition) {
      return {
        messageTop: SCREEN_HEIGHT / 4,
        menuTop: SCREEN_HEIGHT / 3 + 80,
        messageLeft: 20,
        messageRight: 20,
        menuLeft: 20,
        menuRight: 20,
      };
    }

    const menuHeight = 160; // Menu height (Reply, Copy, Delete)
    const messagePadding = 16;
    const menuPadding = 16;
    const gapBetween = 12;

    // Calculate vertical positioning
    // Try to show message at its original position, menu below it
    let messageTop = messagePosition.y;
    let menuTop = messagePosition.y + messagePosition.height + gapBetween;

    // Check if menu would go off screen at bottom
    if (menuTop + menuHeight > SCREEN_HEIGHT - insets.bottom - 20) {
      // Position menu above the message instead
      menuTop = messagePosition.y - menuHeight - gapBetween;
      // If menu would go off screen at top, adjust message position down
      if (menuTop < insets.top + 20) {
        menuTop = insets.top + 20;
        messageTop = menuTop + menuHeight + gapBetween;
      }
    }

    // Horizontal positioning for message (keep original position)
    let messageLeft: number | undefined;
    let messageRight: number | undefined;

    if (isCurrentUser) {
      messageRight = SCREEN_WIDTH - messagePosition.x - messagePosition.width;
      if (messageRight < messagePadding) messageRight = messagePadding;
    } else {
      messageLeft = messagePosition.x;
      if (messageLeft < messagePadding) messageLeft = messagePadding;
    }

    // Horizontal positioning for menu (aligned with message)
    let menuLeft: number | undefined;
    let menuRight: number | undefined;
    const menuWidth = 200;

    if (isCurrentUser) {
      menuRight = SCREEN_WIDTH - messagePosition.x - messagePosition.width;
      if (menuRight < menuPadding) menuRight = menuPadding;
    } else {
      menuLeft = messagePosition.x;
      if (menuLeft < menuPadding) menuLeft = menuPadding;
      if (menuLeft + menuWidth > SCREEN_WIDTH - menuPadding) {
        menuLeft = SCREEN_WIDTH - menuWidth - menuPadding;
      }
    }

    return { messageTop, menuTop, messageLeft, messageRight, menuLeft, menuRight };
  }, [messagePosition, isCurrentUser, insets]);

  const handleReply = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReply();
    onClose();
  }, [onReply, onClose]);

  const handleCopy = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (message?.content) {
      await Clipboard.setStringAsync(message.content);
    }
    onCopy();
    onClose();
  }, [message, onCopy, onClose]);

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Directly trigger delete - the parent will close the context menu
    onDeletePress();
  }, [onDeletePress]);

  if (!visible) return null;

  const positions = getPositions();

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
      {/* Blur backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.androidBackdrop} />
          )}
        </Pressable>
      </Animated.View>

      {/* Message Preview Bubble - Matching SwipeableMessageBubble exactly */}
      {message && messagePosition && (
        <Animated.View
          style={[
            styles.messagePreviewContainer,
            menuAnimatedStyle,
            {
              top: positions.messageTop,
              left: positions.messageLeft,
              right: positions.messageRight,
              maxWidth: messagePosition.width,
            },
            isCurrentUser ? styles.messagePreviewRight : styles.messagePreviewLeft,
          ]}
        >
          <View style={styles.bubbleWrapper}>
            <View
              style={[
                styles.messageBubble,
                { backgroundColor: bubbleColor },
                isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
              ]}
            >
              {isShortMessage ? (
                <View style={styles.shortMessageContainer}>
                  <Text
                    style={[
                      styles.messageText,
                      isCurrentUser ? styles.currentUserText : styles.otherUserText,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text style={[styles.timestampInline, isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp]}>
                    {formattedTime}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text
                    style={[
                      styles.messageText,
                      isCurrentUser ? styles.currentUserText : styles.otherUserText,
                    ]}
                    numberOfLines={6}
                  >
                    {message.content}
                  </Text>
                  <Text style={[styles.timestampBelow, isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp]}>
                    {formattedTime}
                  </Text>
                </View>
              )}
            </View>

            {/* Bubble tail */}
            <View style={[
              styles.bubbleTail,
              isCurrentUser ? styles.bubbleTailRight : styles.bubbleTailLeft,
            ]}>
              <Svg width={12} height={16} viewBox="0 0 12 16">
                {isCurrentUser ? (
                  <Path
                    d="M0 0C0 0 1 8 12 16C4 16 0 12 0 12V0Z"
                    fill={bubbleColor}
                  />
                ) : (
                  <Path
                    d="M12 0C12 0 11 8 0 16C8 16 12 12 12 12V0Z"
                    fill="#F3F4F6"
                  />
                )}
              </Svg>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Context Menu Card */}
      <Animated.View
        style={[
          styles.menuCard,
          menuAnimatedStyle,
          {
            top: positions.menuTop,
            left: positions.menuLeft,
            right: positions.menuRight,
          },
        ]}
      >
        <View style={styles.actionsContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              pressed && styles.actionItemPressed,
            ]}
            onPress={handleReply}
          >
            <Ionicons name="arrow-undo" size={20} color="#111827" />
            <Text style={styles.actionText}>Reply</Text>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable
            style={({ pressed }) => [
              styles.actionItem,
              pressed && styles.actionItemPressed,
            ]}
            onPress={handleCopy}
          >
            <Ionicons name="copy-outline" size={20} color="#111827" />
            <Text style={styles.actionText}>Copy</Text>
          </Pressable>

          {isCurrentUser && (
            <>
              <View style={styles.actionDivider} />
              <Pressable
                style={({ pressed }) => [
                  styles.actionItem,
                  pressed && styles.actionItemPressed,
                ]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </Pressable>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

MessageContextMenu.displayName = 'MessageContextMenu';

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
  },
  androidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  messagePreviewContainer: {
    position: 'absolute',
  },
  messagePreviewRight: {
    alignItems: 'flex-end',
  },
  messagePreviewLeft: {
    alignItems: 'flex-start',
  },
  bubbleWrapper: {
    position: 'relative',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  currentUserBubble: {
    borderBottomRightRadius: 6,
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
  },
  shortMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#111827',
  },
  timestampInline: {
    fontSize: 10,
    marginBottom: -1,
    marginLeft: 4,
  },
  timestampBelow: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 6,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTimestamp: {
    color: '#9CA3AF',
  },
  bubbleTail: {
    position: 'absolute',
    bottom: 0,
  },
  bubbleTailRight: {
    right: -8,
  },
  bubbleTailLeft: {
    left: -8,
  },
  menuCard: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    minWidth: 200,
    maxWidth: 240,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  actionsContainer: {
    paddingVertical: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionItemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  actionText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  deleteText: {
    color: '#DC2626',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 48,
  },
});
