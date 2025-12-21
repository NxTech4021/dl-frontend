import { useSession } from "@/lib/auth-client";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
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

interface ThreadListProps {
  onThreadSelect: (thread: Thread) => void;
}

export const ThreadList: React.FC<ThreadListProps> = ({ onThreadSelect }) => {
  const { threads, loadThreads, isLoading } = useChatStore();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Get sport-specific colors
  const getSportColors = (sportType: string | null | undefined) => {
    switch (sportType) {
      case 'PICKLEBALL':
        return {
          background: '#863A73',
          badgeColor: '#A855F7',
          label: 'Pickleball',
        };
      case 'TENNIS':
        return {
          background: '#65B741',
          badgeColor: '#22C55E',
          label: 'Tennis',
        };
      case 'PADEL':
        return {
          background: '#3B82F6',
          badgeColor: '#60A5FA',
          label: 'Padel',
        };
      default:
        return {
          background: '#863A73', 
          badgeColor: null,
          label: null,
        };
    }
  };

  // Get unread badge color based on recent sport context
  const getUnreadBadgeColor = (thread: Thread): string => {
    if (thread.unreadCount === 0) return '#DC2626'; // Default red (shouldn't show)
    
    // For direct chats, use recent sport context if valid
    if (thread.type === 'direct' && thread.recentSportContext?.isValid) {
      const sportColors = getSportColors(thread.recentSportContext.sportType);
      return sportColors.badgeColor || '#A855F7'; // Default to pickleball purple
    }
    
    // Fallback: no recent sport or > 60 days
    return '#DEE0E2'; // Neutral gray
  };

  // Get unread badge text color
  const getUnreadTextColor = (thread: Thread): string => {
    if (thread.type === 'direct' && thread.recentSportContext?.isValid) {
      return '#FFFFFF'; // White text on colored background
    }
    return '#1D1D1F'; // Dark text on gray background
  };

  const renderThread = ({ item }: { item: Thread }) => {
    const sportColors = getSportColors(item.sportType);
    const isGroupChat = item.type === 'group';

    // For direct chats, find the other participant (not the current user)
    const otherParticipant = !isGroupChat
      ? item.participants?.find((p) => p.id !== userId)
      : null;
    // Check both 'avatar' (from type) and 'image' (from API) properties
    const avatarImage = otherParticipant?.avatar || (otherParticipant as any)?.image || null;
    const avatarInitial = isGroupChat
      ? item.name?.charAt(0) || 'G'
      : otherParticipant?.name?.charAt(0) || item.name?.charAt(0) || '?';

    return (
    <Pressable
      style={({ pressed }) => [
        styles.threadItem,
        pressed && { opacity: 0.7 }
      ]}
      onPress={() => {
        onThreadSelect(item);
      }}
    >
      <View style={styles.avatarContainer}>
        {isGroupChat ? (
          // Group chat - show stacked avatars of participants
          <GroupAvatarStack
            participants={item.participants}
            sportColor={sportColors.background}
            size={38}
          />
        ) : avatarImage ? (
          // Direct chat with avatar image
          <Image source={{ uri: avatarImage }} style={styles.avatarImage} />
        ) : (
          // Direct chat without avatar - show initial
          <View style={[
            styles.avatarPlaceholder,
            { backgroundColor: '#6de9a0' }
          ]}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
        )}
      </View>

      <View style={styles.threadContent}>
        {/* Top row: Sport badge (for groups) */}
        {isGroupChat && sportColors.label && (
          <View style={[
            styles.sportBadge,
            {
              borderColor: sportColors.badgeColor,
              borderWidth: 1.5,
              alignSelf: 'flex-start',
              marginBottom: 4,
            }
          ]}>
            <Text style={[
              styles.sportBadgeText,
              { color: sportColors.badgeColor }
            ]}>{sportColors.label}</Text>
          </View>
        )}

        {/* Top row: Name and Timestamp aligned */}
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
            {item.lastMessage ? (
              (() => {
                // Check if this is a friendly match request
                const isMatchMessage = 
                  (item.lastMessage as any).messageType === 'MATCH' || 
                  item.lastMessage.type === 'match';
                
                let matchData = item.lastMessage.matchData;
                if (isMatchMessage && matchData) {
                  // Parse matchData if it's a string
                  if (typeof matchData === 'string') {
                    try {
                      matchData = JSON.parse(matchData);
                    } catch (e) {
                      console.error('Failed to parse matchData:', e);
                    }
                  }
                  
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
                  } else {
                    // League match
                    return (
                      <LeagueMatchAttachment 
                        isFromCurrentUser={isFromCurrentUser}
                        sportType={sportType}
                      />
                    );
                  }
                }
                
                // Default text message rendering
                return (
                  <Text
                    style={[
                      styles.lastMessage,
                      item.lastMessage.metadata?.isDeleted && styles.deletedMessage
                    ]}
                    numberOfLines={2}
                  >
                    {item.lastMessage.metadata?.isDeleted
                      ? "This message was deleted"
                      : item.lastMessage.content || "No message content"}
                  </Text>
                );
              })()
            ) : (
              <Text style={styles.emptyMessage} numberOfLines={1}>
                No messages yet
              </Text>
            )}
          </View>
          {item.unreadCount > 0 && (
            <View style={[
              styles.unreadBadge,
              {
                backgroundColor: getUnreadBadgeColor(item),
              }
            ]}>
              <Text style={[
                styles.unreadText,
                { color: getUnreadTextColor(item) }
              ]}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
  };

  const renderEmpty = () => (
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
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#863A73" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={threads || []}
      renderItem={renderThread}
      keyExtractor={(item) => {
        if (!item || !item.id) return `null-thread-${Math.random()}`;
        // Use thread ID as key since it's guaranteed to be unique
        return item.id;
      }}
      extraData={threads}
      style={styles.container}
      contentContainerStyle={
        !threads || threads.length === 0 ? styles.emptyListContainer : styles.listContainer
      }
      ListEmptyComponent={renderEmpty}
      refreshing={isLoading}
      onRefresh={() => {
        console.log('🔄 Refreshing threads for user:', userId);
        if (userId) {
          loadThreads(userId);
        }
      }}
      showsVerticalScrollIndicator={false}
      bounces={true}
      scrollEnabled={true}
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
    paddingBottom: 100, // Account for NavBar (83px) + extra spacing
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  threadItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
    minWidth: 70,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#863A73',
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
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
