import { useSession } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useChatStore } from "../stores/ChatStore";
import { Thread } from "../types";
import { GroupAvatarStack } from "./GroupAvatarStack";
import { FriendlyMatchRequestAttachment } from "./FriendlyMatchRequestAttachment";
import { LeagueMatchAttachment } from "./LeagueMatchAttachment";
import {
  FLATLIST_CONFIG,
  getSportChatColors,
  UI_DIMENSIONS
} from "../constants";

interface ThreadListProps {
  onThreadSelect: (thread: Thread) => void;
  threads?: Thread[];
}

// Memoized thread item component for better performance
const ThreadItem = React.memo<{
  item: Thread;
  userId: string | undefined;
  onSelect: (thread: Thread) => void;
}>(({ item, userId, onSelect }) => {
  const sportColors = getSportChatColors(item.sportType);
  const isGroupChat = item.type === 'group';

  // For direct chats, find the other participant
  const otherParticipant = !isGroupChat
    ? item.participants?.find((p) => p.id !== userId)
    : null;

  const avatarImage = otherParticipant?.avatar || (otherParticipant as { image?: string })?.image || null;
  const avatarInitial = isGroupChat
    ? item.name?.charAt(0) || 'G'
    : otherParticipant?.name?.charAt(0) || item.name?.charAt(0) || '?';

  const seasonName = item.division?.season?.name || item.metadata?.seasonName;

  // Get unread badge color based on sport context
  const getUnreadBadgeColor = (): string => {
    if (item.unreadCount === 0) return '#DC2626';
    if (item.type === 'direct' && item.recentSportContext?.isValid) {
      return sportColors.badge || '#A855F7';
    }
    return '#DEE0E2';
  };

  const getUnreadTextColor = (): string => {
    if (item.type === 'direct' && item.recentSportContext?.isValid) {
      return '#FFFFFF';
    }
    return '#1D1D1F';
  };

  // Parse match data safely
  const renderLastMessage = () => {
    if (!item.lastMessage) {
      return (
        <Text style={styles.emptyMessage} numberOfLines={1}>
          No messages yet
        </Text>
      );
    }

    const isMatchMessage =
      (item.lastMessage as { messageType?: string }).messageType === 'MATCH' ||
      item.lastMessage.type === 'match';

    let matchData = item.lastMessage.matchData;

    if (isMatchMessage && matchData) {
      if (typeof matchData === 'string') {
        try {
          matchData = JSON.parse(matchData);
        } catch {
          // Silent fail - render as text message
        }
      }

      if (matchData) {
        const isFriendlyRequest = matchData?.isFriendlyRequest === true;
        const isFromCurrentUser = item.lastMessage.senderId === userId;
        const sportType = matchData?.sportType || item.sportType || null;

        if (isFriendlyRequest) {
          return (
            <FriendlyMatchRequestAttachment
              isFromCurrentUser={isFromCurrentUser}
              sportType={sportType}
            />
          );
        }
        return (
          <LeagueMatchAttachment
            isFromCurrentUser={isFromCurrentUser}
            sportType={sportType}
          />
        );
      }
    }

    // For group chats, show sender name before message
    const senderName = isGroupChat && item.lastMessage.metadata?.sender?.name
      ? item.lastMessage.metadata.sender.name.split(' ')[0]
      : null;

    const messageContent = item.lastMessage.metadata?.isDeleted
      ? "This message was deleted"
      : item.lastMessage.content || "No message content";

    return (
      <Text
        style={[
          styles.lastMessage,
          item.lastMessage.metadata?.isDeleted && styles.deletedMessage
        ]}
        numberOfLines={2}
      >
        {senderName && (
          <Text style={styles.senderName}>{senderName}: </Text>
        )}
        {messageContent}
      </Text>
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.threadItem,
        pressed && styles.threadItemPressed
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.avatarContainer}>
        {isGroupChat ? (
          <GroupAvatarStack
            participants={item.participants}
            sportColor={sportColors.primary}
            size={38}
          />
        ) : avatarImage ? (
          <Image source={{ uri: avatarImage }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
        )}
      </View>

      <View style={styles.threadContent}>
        {isGroupChat && (sportColors.label || seasonName) && (
          <View style={styles.badgeRow}>
            {sportColors.label && (
              <View style={[styles.sportBadge, { borderColor: sportColors.badge }]}>
                <Text style={[styles.sportBadgeText, { color: sportColors.badge }]}>
                  {sportColors.label}
                </Text>
              </View>
            )}
            {seasonName && (
              <View style={[styles.sportBadge, styles.seasonBadge]}>
                <Text style={[styles.sportBadgeText, styles.seasonBadgeText]}>
                  {seasonName}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.nameRow}>
          <Text style={styles.threadName} numberOfLines={1}>
            {item.name || "Chat"}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(
              item.lastMessage?.timestamp || item.updatedAt
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <View style={styles.messageContainer}>
            {renderLastMessage()}
          </View>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: getUnreadBadgeColor() }]}>
              <Text style={[styles.unreadText, { color: getUnreadTextColor() }]}>
                {item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

ThreadItem.displayName = 'ThreadItem';

// Empty component - memoized
const EmptyList = React.memo(() => (
  <View style={styles.emptyContainer}>
    <Ionicons
      name="chatbubble-outline"
      size={56}
      color="#888"
      style={styles.emptyIcon}
    />
    <Text style={styles.emptyText}>No chats yet</Text>
    <Text style={styles.emptySubtext}>Start a conversation!</Text>
  </View>
));

EmptyList.displayName = 'EmptyList';

export const ThreadList: React.FC<ThreadListProps> = ({ onThreadSelect, threads: filteredThreads }) => {
  const { threads: storeThreads, loadThreads, isLoading } = useChatStore();

  // Use filtered threads if provided, otherwise fall back to store threads
  const threads = filteredThreads ?? storeThreads;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Memoized render function
  const renderThread = useCallback(
    ({ item }: ListRenderItemInfo<Thread>) => (
      <ThreadItem item={item} userId={userId} onSelect={onThreadSelect} />
    ),
    [userId, onThreadSelect]
  );

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: Thread) => item?.id || `null-thread-${Math.random()}`,
    []
  );

  // Memoized refresh handler
  const handleRefresh = useCallback(() => {
    if (userId) {
      loadThreads(userId);
    }
  }, [userId, loadThreads]);

  // Memoized getItemLayout for fixed height items
  const getItemLayout = useCallback(
    (_: ArrayLike<Thread> | null | undefined, index: number) => ({
      length: FLATLIST_CONFIG.THREAD_ITEM_HEIGHT,
      offset: FLATLIST_CONFIG.THREAD_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoized content container style
  const contentContainerStyle = useMemo(
    () => (!threads || threads.length === 0 ? styles.emptyListContainer : styles.listContainer),
    [threads]
  );

  return (
    <FlatList
      data={threads || []}
      renderItem={renderThread}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      style={styles.container}
      contentContainerStyle={contentContainerStyle}
      ListEmptyComponent={EmptyList}
      refreshing={isLoading}
      onRefresh={handleRefresh}
      showsVerticalScrollIndicator={false}
      bounces={true}
      scrollEnabled={true}
      // Performance optimizations
      initialNumToRender={FLATLIST_CONFIG.INITIAL_NUM_TO_RENDER}
      maxToRenderPerBatch={FLATLIST_CONFIG.MAX_TO_RENDER_PER_BATCH}
      windowSize={FLATLIST_CONFIG.WINDOW_SIZE}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: UI_DIMENSIONS.NAV_BAR_HEIGHT + 17,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  threadItemPressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  threadContent: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  seasonBadge: {
    borderColor: '#6B7280',
  },
  seasonBadgeText: {
    color: '#6B7280',
  },
  timestamp: {
    fontSize: 12,
    color: "#86868B",
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  senderName: {
    fontWeight: '600',
    color: '#374151',
  },
  deletedMessage: {
    fontStyle: 'italic',
    color: "#9CA3AF",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: 'italic',
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
