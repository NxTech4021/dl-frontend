import { useSession } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Message } from '../types';
import { MatchMessageBubble } from './MatchMessageBubble';
import { SwipeableMessageBubble } from './SwipeableMessageBubble';
import { BREAKPOINTS, FLATLIST_CONFIG } from '../constants';
import { getSportColors, SportType } from '@/constants/SportsColor';

interface MessageWindowProps {
  messages: Message[];
  threadId: string;
  onLoadMore?: () => void;
  loading?: boolean;
  isGroupChat?: boolean;
  sportType?: string | null;
  onReply?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLongPress?: (message: Message, position?: { x: number; y: number; width: number; height: number }) => void;
}

const { width } = require('react-native').Dimensions.get('window');
const isSmallScreen = width < BREAKPOINTS.SMALL;
const isTablet = width > BREAKPOINTS.TABLET;

interface GroupedMessage {
  id: string;
  type: 'date' | 'message';
  date?: string;
  message?: Message;
}

// Memoized date divider component
const DateDivider = React.memo<{ dateString: string }>(({ dateString }) => {
  const getDateLabel = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) return 'Today';
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMMM d, yyyy');
  };

  return (
    <View style={styles.dateDivider}>
      <View style={styles.dateDividerBadge}>
        <Text style={styles.dateDividerText}>{getDateLabel(dateString)}</Text>
      </View>
    </View>
  );
});

DateDivider.displayName = 'DateDivider';

// Memoized empty component
const EmptyMessages = React.memo(() => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>💬</Text>
    <Text style={styles.emptyText}>No messages yet</Text>
    <Text style={styles.emptySubtext}>Start the conversation by sending a message</Text>
  </View>
));

EmptyMessages.displayName = 'EmptyMessages';

// Skeleton loader component
const MessageSkeleton = React.memo(() => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonAvatar} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonNameLine} />
      <View style={styles.skeletonMessageLine} />
    </View>
  </View>
));

MessageSkeleton.displayName = 'MessageSkeleton';

// No-op fallback to avoid creating new function references
const noop = () => {};

export const MessageWindow: React.FC<MessageWindowProps> = ({
  messages,
  threadId,
  onLoadMore,
  loading = false,
  isGroupChat = false,
  sportType,
  onReply,
  onDeleteMessage,
  onLongPress,
}) => {
  const { data: session } = useSession();
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = session?.user;

  // Get sport-specific colors for UI elements
  const sportColors = React.useMemo(
    () => getSportColors(sportType as SportType | null),
    [sportType]
  );

  // Create a message lookup map for O(1) access
  const messageMap = React.useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach(msg => map.set(msg.id, msg));
    return map;
  }, [messages]);

  // Cleanup highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Group messages by date (reversed for inverted FlatList - newest first)
  const groupedMessages = React.useMemo(() => {
    const grouped: Record<string, Message[]> = {};

    messages.forEach(message => {
      const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });

    const flatData: GroupedMessage[] = [];
    // Sort dates in descending order (newest first) for inverted list
    Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .forEach(([, dateMessages]) => {
        // Sort messages within each day in descending order (newest first)
        const sortedMessages = dateMessages.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Add messages first (they appear at top in inverted list, which is visual bottom)
        sortedMessages.forEach(message => {
          flatData.push({
            id: message.id,
            type: 'message',
            message,
          });
        });

        // Add date divider after messages (appears above messages visually in inverted list)
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        flatData.push({
          id: `date-${format(new Date(lastMessage.timestamp), 'yyyy-MM-dd')}`,
          type: 'date',
          date: lastMessage.timestamp.toISOString(),
        });
      });

    return flatData;
  }, [messages]);

  // Auto-scroll to bottom when messages change (for inverted list, scroll to offset 0)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (messages.length > 0) {
      timeoutId = setTimeout(() => {
        // For inverted list, offset 0 is the visual bottom (newest messages)
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [messages.length]);

  // Handle reply preview press - scroll to the original message and highlight it
  const handleReplyPreviewPress = useCallback((messageId: string) => {
    // Find the index of the message in groupedMessages
    const index = groupedMessages.findIndex(
      item => item.type === 'message' && item.message?.id === messageId
    );

    if (index !== -1) {
      // Clear any existing highlight timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }

      // Scroll to the message
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // Center the message in the view
      });

      // Highlight the message after a short delay to allow scroll to complete
      setTimeout(() => {
        setHighlightedMessageId(messageId);
      }, 300);

      // Clear highlight after animation completes (150ms fade in + 800ms hold + 500ms fade out = 1450ms)
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1800);
    }
  }, [groupedMessages]);

  // Memoized render item function
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<GroupedMessage>) => {
      if (item.type === 'date') {
        return <DateDivider dateString={item.date!} />;
      }

      const message = item.message!;
      const isCurrentUser = message.senderId === user?.id;
      const previousItem = index > 0 ? groupedMessages[index - 1] : null;
      const nextItem = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;

      const previousMessage = previousItem?.type === 'message' ? previousItem.message : null;
      const nextMessage = nextItem?.type === 'message' ? nextItem.message : null;

      const showAvatar = !nextMessage || nextMessage.senderId !== message.senderId;
      // In inverted list: previousMessage (index-1) is visually BELOW (newer)
      // isLastInGroup = true when this is the last message before sender changes
      // i.e., the message below (previousMessage) is from a different sender or doesn't exist
      const isLastInGroup = !previousMessage || previousMessage.senderId !== message.senderId;

      // Check for match message type
      const messageWithType = message as Message & { messageType?: string; matchData?: unknown };
      const isMatchMessage = messageWithType.messageType === 'MATCH' || message.type === 'match';

      let matchDataParsed = messageWithType.matchData || message.matchData;
      if (typeof matchDataParsed === 'string') {
        try {
          matchDataParsed = JSON.parse(matchDataParsed);
        } catch {
          matchDataParsed = undefined;
        }
      }

      if (isMatchMessage && matchDataParsed) {
        return (
          <MatchMessageBubble
            message={{ ...message, matchData: matchDataParsed }}
            isCurrentUser={isCurrentUser}
            isGroupChat={isGroupChat}
          />
        );
      }

      return (
        <SwipeableMessageBubble
          message={message}
          isCurrentUser={isCurrentUser}
          showAvatar={showAvatar}
          isLastInGroup={isLastInGroup}
          isGroupChat={isGroupChat}
          sportType={sportType as SportType | null}
          onReply={onReply || noop}
          onDelete={onDeleteMessage || noop}
          onLongPress={onLongPress}
          messageMap={messageMap}
          isHighlighted={highlightedMessageId === message.id}
          onReplyPreviewPress={handleReplyPreviewPress}
        />
      );
    },
    [user?.id, groupedMessages, isGroupChat, sportType, onReply, onDeleteMessage, onLongPress, messageMap, highlightedMessageId, handleReplyPreviewPress]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: GroupedMessage) => item.id, []);

  // Memoized scroll handler for inverted FlatList
  // In inverted list: contentOffset.y = 0 means at visual bottom (newest messages)
  // Higher contentOffset.y means scrolled up (viewing older messages)
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      // Show button when scrolled up past 150px threshold
      const isNearBottom = contentOffset.y < 150;
      setShowScrollButton(!isNearBottom && messages.length > 5);
    },
    [messages.length]
  );

  // Memoized scroll to bottom (for inverted list, scroll to offset 0)
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Handle scroll to index failure (message not yet rendered)
  const handleScrollToIndexFailed = useCallback((info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    // Scroll to the closest rendered item first, then try again
    flatListRef.current?.scrollToOffset({
      offset: info.averageItemLength * info.index,
      animated: true,
    });

    // Retry scrolling after a delay
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: info.index,
        animated: true,
        viewPosition: 0.5,
      });
    }, 100);
  }, []);

  // Loading skeleton
  if (loading && messages.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          {Array.from({ length: 5 }).map((_, index) => (
            <MessageSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.contentContainer,
          groupedMessages.length === 0 && styles.emptyContentContainer
        ]}
        inverted
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={EmptyMessages}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        // Performance optimizations
        initialNumToRender={FLATLIST_CONFIG.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={FLATLIST_CONFIG.MAX_TO_RENDER_PER_BATCH}
        windowSize={FLATLIST_CONFIG.WINDOW_SIZE}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      {/* Loading indicator for sending messages */}
      {loading && messages.length > 0 && (
        <View style={styles.sendingIndicator}>
          <ActivityIndicator size="small" color="#6B7280" />
          <Text style={styles.sendingText}>Sending...</Text>
        </View>
      )}

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Pressable
          style={({ pressed }) => [
            styles.scrollToBottomButton,
            { backgroundColor: sportColors.buttonColor },
            pressed && styles.scrollButtonPressed
          ]}
          onPress={scrollToBottom}
        >
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  messagesList: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    // For inverted list: paddingTop adds space at visual bottom (above input)
    // paddingBottom adds space at visual top (oldest messages)
    paddingTop: 4, // Minimal gap above input (WhatsApp style)
    paddingBottom: isSmallScreen ? 8 : isTablet ? 16 : 12, // Space at top for oldest messages
    flexGrow: 1,
  },
  emptyContentContainer: {
    justifyContent: 'center',
  },
  dateDivider: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 12 : isTablet ? 20 : 16,
  },
  dateDividerBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: isSmallScreen ? 10 : isTablet ? 16 : 12,
    paddingVertical: isSmallScreen ? 3 : isTablet ? 6 : 4,
    borderRadius: 16,
  },
  dateDividerText: {
    fontSize: isSmallScreen ? 11 : isTablet ? 14 : 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    transform: [{ scaleY: -1 }], // Counteract FlatList inverted prop
  },
  emptyEmoji: {
    fontSize: isSmallScreen ? 50 : isTablet ? 70 : 60,
    marginBottom: isSmallScreen ? 12 : isTablet ? 20 : 16,
  },
  emptyText: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: isSmallScreen ? 6 : isTablet ? 10 : 8,
  },
  emptySubtext: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 18 : isTablet ? 22 : 20,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonNameLine: {
    height: 12,
    width: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  skeletonMessageLine: {
    height: 16,
    width: 200,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendingText: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    color: '#6B7280',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  scrollButtonPressed: {
    opacity: 0.8,
  },
});
