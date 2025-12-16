import { getSportColors, SportType } from '@/constants/SportsColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Message } from '../types';

interface SwipeableMessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
  isLastInGroup?: boolean;
  isGroupChat?: boolean;
  sportType?: SportType | null;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onLongPress?: (message: Message) => void;
  messageMap?: Map<string, Message>; // Efficient O(1) lookup for replied messages
}

const SWIPE_THRESHOLD = 60;
const REPLY_ICON_SIZE = 24;

export const SwipeableMessageBubble: React.FC<SwipeableMessageBubbleProps> = ({
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
}) => {
  // Get sport-specific color for current user messages in group chats
  const getSportColor = () => {
    if (!isCurrentUser || !isGroupChat) return '#DCC6FD'; 
    
    const colors = getSportColors(sportType);
    return colors.messageColor;
  };
  
  const bubbleColor = getSportColor();
  const translateX = useSharedValue(0);
  const replyIconScale = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);

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

//   console.log("Message data", message.metadata);
//   console.log("Reply to ID:", message.replyTo);
//   console.log("Replied message found:", repliedMessage?.content);
    
  // Trigger reply action
  const triggerReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  // Pan gesture for swipe
  // Configure to only activate on horizontal swipes and allow vertical scrolling
  const panGesture = Gesture.Pan()
    .activeOffsetX(isCurrentUser ? [-10, -1] : [1, 10]) // Only activate for horizontal swipes
    .failOffsetY([-10, 10]) // Fail if vertical movement detected (allows FlatList scrolling)
    .onUpdate((event) => {
      // Swipe right for other's messages, swipe left for own messages
      if (isCurrentUser) {
        // Swipe left (negative translation)
        if (event.translationX < 0) {
          translateX.value = Math.max(event.translationX, -SWIPE_THRESHOLD * 1.5);
          const progress = Math.min(Math.abs(event.translationX) / SWIPE_THRESHOLD, 1);
          replyIconScale.value = progress;
          replyIconOpacity.value = progress;
        }
      } else {
        // Swipe right (positive translation)
        if (event.translationX > 0) {
          translateX.value = Math.min(event.translationX, SWIPE_THRESHOLD * 1.5);
          const progress = Math.min(event.translationX / SWIPE_THRESHOLD, 1);
          replyIconScale.value = progress;
          replyIconOpacity.value = progress;
        }
      }
    })
    .onEnd((event) => {
      const shouldTrigger = Math.abs(event.translationX) > SWIPE_THRESHOLD;

      if (shouldTrigger) {
        runOnJS(triggerReply)();
      }

      // Reset animation
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      replyIconScale.value = withTiming(0, { duration: 200 });
      replyIconOpacity.value = withTiming(0, { duration: 200 });
    });

  // Callbacks wrapped for gesture handler compatibility
  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      onLongPress(message);
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

  return (
    <View
      style={[
        styles.container,
        isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      ]}
    >
      {/* Reply icon on the left for current user messages */}
      {isCurrentUser && (
        <Animated.View
          style={[styles.replyIconLeft, replyIconAnimatedStyle]}
          pointerEvents="none"
        >
          <Ionicons name="arrow-undo" size={REPLY_ICON_SIZE} color="#863A73" />
        </Animated.View>
      )}

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
            {/* Reply preview if replying to another message */}
            {message.replyTo && repliedMessage && (
              <View style={styles.replyPreviewContainer}>
                <View style={styles.replyPreviewBar} />
                <View style={styles.replyPreviewContent}>
                  <Text style={styles.replyPreviewSender} numberOfLines={1}>
                    {repliedMessage.metadata?.sender?.name || repliedMessage.metadata?.sender?.username || 'User'}
                  </Text>
                  <Text style={styles.replyPreviewText} numberOfLines={1}>
                    {repliedMessage.content || 'Message'}
                  </Text>
                </View>
              </View>
            )}

            <View
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
              {/* Sender name for GROUP chats only - inside bubble */}
              {!isCurrentUser && showAvatar && isGroupChat && (
                <Text style={styles.senderNameInside}>{senderName}</Text>
              )}
              
              {message.metadata?.isDeleted ? (
                <View style={styles.deletedMessageContainer}>
                  <Ionicons name="trash-outline" size={14} color="#9CA3AF" style={styles.trashIcon} />
                  <Text style={styles.deletedMessageText}>
                    This message has been deleted
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isCurrentUser ? styles.currentUserText : styles.otherUserText,
                  ]}
                >
                  {message.content}
                </Text>
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
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Reply icon on the right for other user messages */}
      {!isCurrentUser && (
        <Animated.View
          style={[styles.replyIconRight, replyIconAnimatedStyle]}
          pointerEvents="none"
        >
          <Ionicons name="arrow-undo" size={REPLY_ICON_SIZE} color="#863A73" />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 4,
    position: 'relative',
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
  replyIconRight: {
    position: 'absolute',
    right: 8,
    alignSelf: 'center',
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
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 4,
  },
  replyPreviewBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#A855F7',
    marginRight: 8,
    borderRadius: 2,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#863A73',
    marginBottom: 2,
  },
  replyPreviewText: {
    flex: 1,
    fontSize: 13,
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
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#000000ff',
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
