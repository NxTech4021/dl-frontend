import { useSession } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { Message } from '../types';
import { MatchMessageBubble } from './MatchMessageBubble';
import { SwipeableMessageBubble } from './SwipeableMessageBubble';

interface MessageWindowProps {
  messages: Message[];
  threadId: string;
  onLoadMore?: () => void;
  loading?: boolean;
  isGroupChat?: boolean;
  sportType?: string | null;
  onReply?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
  onLongPress?: (message: Message) => void;
}

const { height: screenHeight, width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface GroupedMessage {
  id: string;
  type: 'date' | 'message';
  date?: string;
  message?: Message;
}

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

  const user = session?.user;

  // Create a message lookup map for O(1) access - memoized for performance
  const messageMap = React.useMemo(() => {
    const map = new Map<string, Message>();
    messages.forEach(msg => map.set(msg.id, msg));
    return map;
  }, [messages]);

  const groupedMessages = React.useMemo(() => {
    const grouped: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });

  
    const flatData: GroupedMessage[] = [];
    Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .forEach(([date, dateMessages]) => {
        flatData.push({
          id: `date-${date}`,
          type: 'date',
          date: dateMessages[0].timestamp.toISOString(),
        });
        
        // Add messages for this date in order
        dateMessages
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .forEach(message => {
            flatData.push({
              id: message.id,
              type: 'message',
              message,
            });
          });
      });

    return flatData;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const getDateLabel = (dateString: string) => {
    const messageDate = new Date(dateString);
    if (isToday(messageDate)) return 'Today';
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMMM d, yyyy');
  };

  const renderDateDivider = (dateString: string) => (
    <View style={styles.dateDivider}>
      <View style={styles.dateDividerBadge}>
        <Text style={styles.dateDividerText}>
          {getDateLabel(dateString)}
        </Text>
      </View>
    </View>
  );

  const renderMessageSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonNameLine} />
        <View style={styles.skeletonMessageLine} />
      </View>
    </View>
  );

  const renderItem = ({ item, index }: { item: GroupedMessage; index: number }) => {
    if (item.type === 'date') {
      return renderDateDivider(item.date!);
    }

    const message = item.message!;
    const isCurrentUser = message.senderId === user?.id;
    const previousItem = index > 0 ? groupedMessages[index - 1] : null;
    const nextItem = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;
    
    const previousMessage = previousItem?.type === 'message' ? previousItem.message : null;
    const nextMessage = nextItem?.type === 'message' ? nextItem.message : null;
    
    const showAvatar = !previousMessage || previousMessage.senderId !== message.senderId;
    const isLastInGroup = !nextMessage || nextMessage.senderId !== message.senderId;
    
    // Debug logging
    console.log('🔍 Rendering message:', message.id, 'Type:', (message as any).messageType || message.type, 'Has matchData:', !!(message as any).matchData || !!message.matchData);
    
    // Check both messageType (from backend) and type (local)
    const isMatchMessage = (message as any).messageType === 'MATCH' || message.type === 'match';
    const matchDataParsed = typeof (message as any).matchData === 'string' 
      ? JSON.parse((message as any).matchData) 
      : ((message as any).matchData || message.matchData);
    
    // Render MatchMessageBubble for match type messages
    if (isMatchMessage && matchDataParsed) {
      console.log('✅ Rendering MatchMessageBubble for message:', message.id, matchDataParsed);
      return (
        <MatchMessageBubble
          message={{
            ...message,
            matchData: matchDataParsed
          }}
          isCurrentUser={isCurrentUser}
          isGroupChat={isGroupChat}
        />
      );
    }
    
    // Render regular text message bubble
    return (
      <SwipeableMessageBubble
        message={message}
        isCurrentUser={isCurrentUser}
        showAvatar={showAvatar}
        isLastInGroup={isLastInGroup}
        isGroupChat={isGroupChat}
        sportType={sportType as any}
        onReply={onReply || (() => {})}
        onDelete={onDeleteMessage || (() => {})}
        onLongPress={onLongPress}
        messageMap={messageMap}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>Start the conversation by sending a message</Text>
    </View>
  );

  const renderLoadingSkeleton = () => (
    <View style={styles.loadingContainer}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index}>
          {renderMessageSkeleton()}
        </View>
      ))}
    </View>
  );

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentSize.height - contentOffset.y - layoutMeasurement.height < 100;
    setShowScrollButton(!isNearBottom && messages.length > 10);
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  if (loading && messages.length === 0) {
    return (
      <View style={styles.container}>
        {renderLoadingSkeleton()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.contentContainer,
          groupedMessages.length === 0 && styles.emptyContentContainer
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={renderEmpty}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
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
          style={({ pressed }) => [styles.scrollToBottomButton, pressed && { opacity: 0.8 }]}
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
    paddingVertical: isSmallScreen ? 8 : isTablet ? 16 : 12,
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
    backgroundColor: '#863A73',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});