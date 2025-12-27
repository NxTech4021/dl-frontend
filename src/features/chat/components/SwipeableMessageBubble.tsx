import { getSportColors, SportType } from '@/constants/SportsColor';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  Layout,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Message } from '../types';

// Smooth layout transition for when messages are added/removed
const layoutTransition = Layout.duration(150);

interface SwipeableMessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
  isLastInGroup?: boolean;
  isGroupChat?: boolean;
  sportType?: SportType | null;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onLongPress?: (message: Message, position?: { x: number; y: number; width: number; height: number }) => void;
  messageMap?: Map<string, Message>; // Efficient O(1) lookup for replied messages
  isHighlighted?: boolean; // Whether this message should be highlighted (after scroll-to)
  onReplyPreviewPress?: (messageId: string) => void; // Callback when reply preview is tapped
}

const SWIPE_THRESHOLD = 60;
const REPLY_ICON_SIZE = 24;

// Highlight color - native iOS light blue
const HIGHLIGHT_COLOR = 'rgba(0, 122, 255, 0.25)';

export const SwipeableMessageBubble: React.FC<SwipeableMessageBubbleProps> = React.memo(({
  message,
  isCurrentUser,
  showAvatar,
  isLastInGroup = true,
  isGroupChat = false,
  sportType,
  onReply,
  onDelete,
  onLongPress,
  messageMap,
  isHighlighted = false,
  onReplyPreviewPress,
}) => {
  // Memoized sport-specific color for current user messages
  const bubbleColor = useMemo(() => {
    if (!isCurrentUser) return '#F3F4F6'; // Gray for received messages

    // Use sport color for sent messages (both group and direct chats)
    const colors = getSportColors(sportType);
    return colors.background;
  }, [isCurrentUser, sportType]);

  // Reply icon always uses sport color regardless of sender
  const replyIconColor = useMemo(() => {
    const colors = getSportColors(sportType);
    return colors.background;
  }, [sportType]);
  const translateX = useSharedValue(0);
  const replyIconScale = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);
  const hasTriggeredHaptic = useSharedValue(false);

  // Highlight animation for scroll-to-message
  const highlightOpacity = useSharedValue(0);

  // Trigger highlight animation when isHighlighted changes to true
  useEffect(() => {
    if (isHighlighted) {
      // Flash animation: fade in quickly, hold briefly, then fade out slowly
      highlightOpacity.value = withSequence(
        withTiming(1, { duration: 150 }), // Fade in
        withDelay(800, withTiming(0, { duration: 500 })) // Hold, then fade out
      );
    }
  }, [isHighlighted, highlightOpacity]);

  const senderName =
    message.metadata?.sender?.name ||
    message.metadata?.sender?.username ||
    'Unknown';
  
  // Get sender's avatar/image - check both 'avatar' and 'image' properties
  const senderAvatar = message.metadata?.sender?.avatar || 
                       message.metadata?.sender?.image || 
                       null;
  const senderInitial = senderName.charAt(0).toUpperCase();

  // Find the replied message using Map for O(1) lookup instead of O(n) array search
  const repliedMessage = message.replyTo && messageMap
    ? messageMap.get(message.replyTo)
    : null;

  // Format timestamp
  const formattedTime = useMemo(() => {
    return format(new Date(message.timestamp), 'HH:mm');
  }, [message.timestamp]);

  // Determine if message is short (inline timestamp) or long (timestamp below)
  const isShortMessage = useMemo(() => {
    const content = message.content || '';
    return content.length <= 20 && !content.includes('\n');
  }, [message.content]);

//   console.log("Message data", message.metadata);
//   console.log("Reply to ID:", message.replyTo);
//   console.log("Replied message found:", repliedMessage?.content);
    
  // Trigger reply action
  const triggerReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  // Handle reply preview press - scroll to the original message
  const handleReplyPreviewPress = useCallback(() => {
    if (message.replyTo && onReplyPreviewPress) {
      onReplyPreviewPress(message.replyTo);
    }
  }, [message.replyTo, onReplyPreviewPress]);

  // Haptic feedback when threshold is reached
  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Pan gesture for swipe - LEFT TO RIGHT only for all messages
  const panGesture = Gesture.Pan()
    .activeOffsetX([1, 10]) // Only activate for right swipe (left-to-right)
    .failOffsetY([-10, 10]) // Fail if vertical movement detected (allows FlatList scrolling)
    .onUpdate((event) => {
      // Only allow swipe right (positive translation) for all messages
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, SWIPE_THRESHOLD * 1.5);
        const progress = Math.min(event.translationX / SWIPE_THRESHOLD, 1);
        replyIconScale.value = progress;
        replyIconOpacity.value = progress;

        // Trigger haptic when threshold is first crossed
        if (event.translationX >= SWIPE_THRESHOLD && !hasTriggeredHaptic.value) {
          hasTriggeredHaptic.value = true;
          runOnJS(triggerHaptic)();
        }
        // Reset haptic flag if user swipes back below threshold
        if (event.translationX < SWIPE_THRESHOLD) {
          hasTriggeredHaptic.value = false;
        }
      }
    })
    .onEnd((event) => {
      const shouldTrigger = event.translationX > SWIPE_THRESHOLD;

      if (shouldTrigger) {
        runOnJS(triggerReply)();
      }

      // Reset
      hasTriggeredHaptic.value = false;
      translateX.value = withTiming(0, { duration: 200 });
      replyIconScale.value = withTiming(0, { duration: 200 });
      replyIconOpacity.value = withTiming(0, { duration: 200 });
    });

  // Ref to capture message position
  const bubbleRef = useRef<View>(null);

  // Callbacks wrapped for gesture handler compatibility
  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      // Measure the bubble position and pass it to the handler
      bubbleRef.current?.measureInWindow((x, y, width, height) => {
        onLongPress(message, { x, y, width, height });
      });
    }
  }, [message, onLongPress]);

  // Long press gesture for context menu
  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  // Combined gesture
  const composedGesture = Gesture.Race(longPressGesture, panGesture);

  // Animated style for message container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Animated style for reply icon
  const replyIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: replyIconScale.value }],
    opacity: replyIconOpacity.value,
  }));

  // Animated style for highlight overlay
  const highlightAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      highlightOpacity.value,
      [0, 1],
      ['transparent', HIGHLIGHT_COLOR]
    ),
  }));

  return (
    <Animated.View
      layout={layoutTransition}
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {/* Highlight overlay for scroll-to-message */}
      <Animated.View style={[styles.highlightOverlay, highlightAnimatedStyle]} pointerEvents="none" />
      {/* Reply icon on the left for all messages (left-to-right swipe) */}
      <Animated.View
        style={[styles.replyIconLeft, replyIconAnimatedStyle]}
        pointerEvents="none"
      >
        <View style={[styles.replyIconCircle, { backgroundColor: replyIconColor + '40' }]}>
          <Ionicons name="arrow-undo" size={REPLY_ICON_SIZE} color={replyIconColor} />
        </View>
      </Animated.View>

      <View
        style={[
          styles.swipeableContainer,
          isCurrentUser ? styles.currentUserSwipeable : styles.otherUserSwipeable,
        ]}
      >
        {!isCurrentUser && showAvatar && isGroupChat && (
          <View style={styles.avatarContainer}>
            {senderAvatar ? (
              <Image
                source={{ uri: senderAvatar }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{senderInitial}</Text>
              </View>
            )}
          </View>
        )}
        {!isCurrentUser && !showAvatar && isGroupChat && (
          <View style={styles.avatarSpacer} />
        )}

        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.messageContainer, animatedStyle]}>
            <View
              ref={bubbleRef}
              style={[
                styles.bubble,
                isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
                isCurrentUser && { backgroundColor: bubbleColor },
                message.metadata?.isDeleted && styles.deletedBubble,
                isCurrentUser
                  ? {
                      borderBottomRightRadius: isLastInGroup ? 6 : 18,
                      borderTopRightRadius: 18,
                    }
                  : {
                      borderBottomLeftRadius: isLastInGroup ? 6 : 18,
                      borderTopLeftRadius: 18,
                    },
              ]}
            >
              {/* Reply preview inside bubble - WhatsApp style (Pressable to scroll to original message) */}
              {message.replyTo && repliedMessage && (
                <Pressable
                  onPress={handleReplyPreviewPress}
                  style={({ pressed }) => [
                    styles.replyPreviewWrapper,
                    isCurrentUser && { backgroundColor: bubbleColor },
                    pressed && styles.replyPreviewPressed,
                  ]}
                >
                  <View style={[
                    styles.replyPreviewContainer,
                    !isCurrentUser && styles.replyPreviewContainerReceived,
                  ]}>
                    <Text style={styles.replyPreviewSender} numberOfLines={1}>
                      {repliedMessage.metadata?.sender?.name || repliedMessage.metadata?.sender?.username || 'User'}
                    </Text>
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      {repliedMessage.content || 'Message'}
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* Sender name for GROUP chats only - inside bubble */}
              {!isCurrentUser && showAvatar && isGroupChat && !message.replyTo && (
                <Text style={styles.senderNameInside}>{senderName}</Text>
              )}

              {message.metadata?.isDeleted ? (
                <View style={styles.deletedMessageContainer}>
                  <Ionicons name="trash-outline" size={14} color="#9CA3AF" style={styles.trashIcon} />
                  <Text style={styles.deletedMessageText}>
                    This message has been deleted
                  </Text>
                  <Text style={[styles.timestamp, isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp]}>
                    {formattedTime}
                  </Text>
                </View>
              ) : isShortMessage ? (
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
                  >
                    {message.content}
                  </Text>
                  <Text style={[styles.timestampBelow, isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp]}>
                    {formattedTime}
                  </Text>
                </View>
              )}

              {/* Commented out as its not in their design - requiring confirmation */}
              {/* <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.timestamp,
                    isCurrentUser
                      ? styles.currentUserTimestamp
                      : styles.otherUserTimestamp,
                  ]}
                >
                  {format(new Date(message.timestamp), 'HH:mm')}
                </Text>

                {isCurrentUser && (
                  <View style={styles.statusContainer}>
                    {message.isDelivered && <Text style={styles.deliveryStatus}>✓</Text>}
                    {message.isRead && <Text style={styles.readStatus}>✓</Text>}
                  </View>
                )}
              </View> */}
            </View>

            {/* Bubble tail - only show on last message in group, hide for deleted messages */}
            {isLastInGroup && !message.metadata?.isDeleted && (
              <View style={[
                styles.bubbleTail,
                isCurrentUser ? styles.bubbleTailRight : styles.bubbleTailLeft,
              ]}>
                <Svg width={12} height={16} viewBox="0 0 12 16">
                  {isCurrentUser ? (
                    // Right tail for sender
                    <Path
                      d="M0 0C0 0 1 8 12 16C4 16 0 12 0 12V0Z"
                      fill={bubbleColor}
                    />
                  ) : (
                    // Left tail for receiver (mirrored)
                    <Path
                      d="M12 0C12 0 11 8 0 16C8 16 12 12 12 12V0Z"
                      fill="#F3F4F6"
                    />
                  )}
                </Svg>
              </View>
            )}

          </Animated.View>
        </GestureDetector>
      </View>

    </Animated.View>
  );
});

SwipeableMessageBubble.displayName = 'SwipeableMessageBubble';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 4,
    position: 'relative',
  },
  highlightOverlay: {
    position: 'absolute',
    top: -4,
    left: -16,
    right: -16,
    bottom: -4,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  swipeableContainer: {
    flexDirection: 'row',
    maxWidth: '85%',
  },
  currentUserSwipeable: {
    alignSelf: 'flex-end',
  },
  otherUserSwipeable: {
    alignSelf: 'flex-start',
  },
  replyIconLeft: {
    position: 'absolute',
    left: 8,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatarSpacer: {
    width: 40,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    flex: 1,
    marginBottom: 2,
    position: 'relative',
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
  replyPreviewWrapper: {
    marginHorizontal: -14,
    marginTop: -10,
    marginBottom: 8,
    paddingTop: 3,
    paddingHorizontal: 3,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  replyPreviewPressed: {
    opacity: 0.7,
  },
  replyPreviewContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  replyPreviewContainerReceived: {
    backgroundColor: '#E5E7EB', // Darker gray for received messages to distinguish from bubble
  },
  replyPreviewSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 14,
    color: '#6B7280',
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    marginLeft: 4,
    fontWeight: '500',
  },
  senderNameInside: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  currentUserBubble: {
    backgroundColor: '#863A73',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  deletedBubble: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  deletedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trashIcon: {
    marginRight: 6,
  },
  deletedMessageText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#9CA3AF',
    flexShrink: 1,
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
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTimestamp: {
    color: '#9CA3AF',
  },
  statusContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  deliveryStatus: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readStatus: {
    fontSize: 10,
    color: '#34D399',
    marginLeft: -2,
  },
});
