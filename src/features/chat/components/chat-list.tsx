import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useChatStore } from "../stores/ChatStore";
import { Thread } from "../types";

interface ThreadListProps {
  threads: Thread[];
  onThreadSelect: (thread: Thread) => void;
  currentUserId?: string;
}

export const ThreadList: React.FC<ThreadListProps> = ({ onThreadSelect, currentUserId }) => {
  const { threads, loadThreads, isLoading } = useChatStore();

  // console.log("ThreadList: Rendering with threads:", threads?.length || 0);

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity
      style={styles.threadItem}
      onPress={() => {
        onThreadSelect(item);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{item.name?.charAt(0) || "?"}</Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
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

        {item.type === "group" && (
          <Text style={styles.participantCount}>
            {item.participants.length} participants
          </Text>
        )}

        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage.content}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={
        !threads || threads.length === 0 ? styles.emptyContainer : undefined
      }
      ListEmptyComponent={renderEmpty}
      refreshing={isLoading}
      onRefresh={() => loadThreads(currentUserId)}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
  },
  avatarPlaceholder: {
    width: 48, 
    height: 48,
    borderRadius: 24,
    backgroundColor: '#863A73', 
    justifyContent: 'center',
    alignItems: 'center',
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
    position: "absolute",
    top: -5,
    right: -5,
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
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  threadName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: '600',
    marginTop: 1, 
  },
  participantCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
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
