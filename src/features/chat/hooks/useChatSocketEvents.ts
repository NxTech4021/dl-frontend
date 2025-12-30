import { socketService } from '@/lib/socket-service';
import { socketLogger } from '@/utils/logger';
import { useEffect, useRef } from 'react';
import { SOCKET_EVENTS } from '../constants';
import { useChatStore } from '../stores/ChatStore';
import { BackendMessage, BackendThreadMember, Message } from '../types';

// Socket event data types
interface MessageDeletedData {
  messageId: string;
  threadId: string;
}

interface MessageSentData {
  messageId: string;
  threadId: string;
  message?: BackendMessage;
}

interface MessageReadData {
  messageId: string;
  threadId: string;
  readerId: string;
  readerName: string;
}

interface UnreadCountUpdateData {
  threadId: string;
  unreadCount: number;
  userId?: string;
}

interface ThreadMarkedReadData {
  threadId: string;
  timestamp: string;
}

interface ThreadCreatedData {
  thread?: {
    id: string;
    members?: BackendThreadMember[];
    [key: string]: unknown;
  };
  id?: string;
  members?: BackendThreadMember[];
  [key: string]: unknown;
}

interface MatchEventData {
  matchId: string;
  threadId: string;
  [key: string]: unknown;
}

/**
 * Custom hook to manage Socket.IO event listeners for chat
 * Handles real-time message delivery, read receipts, and deletions
 */
export const useChatSocketEvents = (threadId: string | null, currentUserId: string) => {
  const {
    addMessage,
    deleteMessage,
    markMessageAsRead,
    updateThread,
    addThread,
  } = useChatStore();

  const isConnected = socketService.isConnected();

  // Use ref to avoid stale closure issues
  const currentThreadIdRef = useRef(threadId);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    currentThreadIdRef.current = threadId;
    currentUserIdRef.current = currentUserId;
  }, [threadId, currentUserId]);

  // Transform backend message to frontend format
  const transformMessage = (backendMessage: BackendMessage): Message => {
    return {
      id: backendMessage.id,
      threadId: backendMessage.threadId,
      senderId: backendMessage.senderId,
      content: backendMessage.content || "",
      timestamp: new Date(backendMessage.createdAt || backendMessage.timestamp || Date.now()),
      isRead: (backendMessage.readBy?.length ?? 0) > 0,
      isDelivered: true,
      replyTo: backendMessage.repliesToId,
      type: backendMessage.messageType === 'MATCH' ? 'match' : 'text',
      matchData: backendMessage.matchData as Message['matchData'],
      metadata: {
        isEdited: backendMessage.isEdited,
        isDeleted: backendMessage.isDeleted,
        sender: backendMessage.sender,
        readBy: backendMessage.readBy || [],
        updatedAt: backendMessage.updatedAt,
      },
    };
  };

  useEffect(() => {
    if (!isConnected) {
      socketLogger.debug('Socket not connected, waiting...');
      return;
    }

    // Handle new messages
    const handleNewMessage = (backendMessage: BackendMessage) => {
      const message = transformMessage(backendMessage);

      // Add message to store
      addMessage(message);

      // Update thread's last message and move to top
      const currentThreads = useChatStore.getState().threads;
      const thread = currentThreads.find(t => t.id === message.threadId);
      if (thread) {
        const updatedThread = {
          ...thread,
          lastMessage: message,
          updatedAt: new Date(message.timestamp),
        };

        updateThread(updatedThread);
      }

      // If message is in current thread and not from current user, mark as read automatically
      if (message.threadId === currentThreadIdRef.current && message.senderId !== currentUserIdRef.current) {
        socketService.markMessageAsRead(message.id, currentUserIdRef.current);
      }
    };

    // Handle message deletion
    const handleMessageDeleted = (data: MessageDeletedData) => {
      socketLogger.debug('Message deleted:', data.messageId);
      deleteMessage(data.messageId, data.threadId);
    };

    // Handle message sent confirmation
    const handleMessageSent = (data: MessageSentData) => {
      socketLogger.debug('Message sent confirmed:', data.messageId);

      // If full message data is provided, transform and update it in store
      if (data.message) {
        const message = transformMessage(data.message);
        addMessage(message);
      }
    };

    // Handle message read receipts
    const handleMessageRead = (data: MessageReadData) => {
      socketLogger.debug('Message read by:', data.readerName);

      // Just update read receipts - backend handles unread count
      markMessageAsRead(data.messageId, data.threadId, data.readerId, data.readerName);
    };

    // Handle unread count updates
    const handleUnreadCountUpdate = (data: UnreadCountUpdateData) => {
      socketLogger.debug('Unread count update:', data);

      // Only update if this update is for the current user (or no userId specified)
      if (!data.userId || data.userId === currentUserIdRef.current) {
        const currentThreads = useChatStore.getState().threads;
        const thread = currentThreads.find(t => t.id === data.threadId);
        if (thread) {
          updateThread({
            ...thread,
            unreadCount: data.unreadCount,
          });
        }
      }
    };

    // Handle thread marked as read event
    const handleThreadMarkedRead = (data: ThreadMarkedReadData) => {
      socketLogger.debug('Thread marked as read:', data.threadId);

      const currentThreads = useChatStore.getState().threads;
      const thread = currentThreads.find(t => t.id === data.threadId);
      if (thread) {
        updateThread({
          ...thread,
          unreadCount: 0,
        });
      }
    };

    // Handle new thread created
    const handleThreadCreated = (data: ThreadCreatedData) => {
      socketLogger.debug('New thread created');

      const thread = data.thread || data;

      // Only add if user is a member
      const members = thread.members || [];
      const isMember = members.some((m: BackendThreadMember) => m.userId === currentUserIdRef.current);
      if (isMember && thread.id) {
        addThread(thread as unknown as Parameters<typeof addThread>[0]);
      }
    };

    // Handle match participant joined
    const handleMatchParticipantJoined = (data: MatchEventData) => {
      socketLogger.debug('Match participant joined:', data.matchId);

      // Update the match message in the current thread if it exists
      if (data.matchId && data.threadId === currentThreadIdRef.current) {
        const messagesMap = useChatStore.getState().messages;
        const threadMessages = messagesMap[data.threadId] || [];
        const matchMessage = threadMessages.find(
          (m: Message) => m.matchData?.matchId === data.matchId
        );

        if (matchMessage) {
          socketLogger.debug('Match message found, may need refresh');
        }
      }
    };

    // Handle match updated
    const handleMatchUpdated = (data: MatchEventData) => {
      socketLogger.debug('Match updated:', data.matchId);

      if (data.matchId && data.threadId === currentThreadIdRef.current) {
        socketLogger.debug('Match in current thread was updated');
      }
    };

    // Register all listeners
    socketLogger.debug('Registering socket event listeners...');
    socketService.on(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
    socketService.on(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    socketService.on(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
    socketService.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    socketService.on(SOCKET_EVENTS.UNREAD_COUNT_UPDATE, handleUnreadCountUpdate);
    socketService.on(SOCKET_EVENTS.THREAD_MARKED_READ, handleThreadMarkedRead);
    socketService.on(SOCKET_EVENTS.THREAD_CREATED, handleThreadCreated);
    socketService.on('new_thread', handleThreadCreated); // Backend sends this too
    socketService.on(SOCKET_EVENTS.MATCH_PARTICIPANT_JOINED, handleMatchParticipantJoined);
    socketService.on(SOCKET_EVENTS.MATCH_UPDATED, handleMatchUpdated);

    // Join thread room if we have a current thread
    if (threadId) {
      socketLogger.debug('Joining thread:', threadId);
      socketService.joinThread(threadId);
    }

    // Cleanup function
    return () => {
      socketLogger.debug('Removing chat socket listeners');

      socketService.off(SOCKET_EVENTS.NEW_MESSAGE, handleNewMessage);
      socketService.off(SOCKET_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      socketService.off(SOCKET_EVENTS.MESSAGE_SENT, handleMessageSent);
      socketService.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
      socketService.off(SOCKET_EVENTS.UNREAD_COUNT_UPDATE, handleUnreadCountUpdate);
      socketService.off(SOCKET_EVENTS.THREAD_MARKED_READ, handleThreadMarkedRead);
      socketService.off(SOCKET_EVENTS.THREAD_CREATED, handleThreadCreated);
      socketService.off('new_thread', handleThreadCreated);
      socketService.off(SOCKET_EVENTS.MATCH_PARTICIPANT_JOINED, handleMatchParticipantJoined);
      socketService.off(SOCKET_EVENTS.MATCH_UPDATED, handleMatchUpdated);

      // Leave thread room
      if (threadId) {
        socketLogger.debug('Leaving thread room:', threadId);
        socketService.leaveThread(threadId);
      }
    };
  }, [isConnected, threadId, addMessage, deleteMessage, markMessageAsRead, updateThread, addThread]);

  // Join all thread rooms when on chat list screen (threadId is null)
  // This ensures real-time updates are received for all conversations
  useEffect(() => {
    if (!isConnected || threadId !== null) return;

    const threads = useChatStore.getState().threads;
    if (threads.length === 0) return;

    const threadIds = threads.map(t => t.id);

    // Join all thread rooms
    threadIds.forEach((id) => {
      socketService.joinThread(id);
    });

    socketLogger.debug(`Joined ${threadIds.length} thread rooms for chat list updates`);

    return () => {
      // Leave all thread rooms when leaving chat list
      threadIds.forEach((id) => {
        socketService.leaveThread(id);
      });
      socketLogger.debug(`Left ${threadIds.length} thread rooms`);
    };
  }, [isConnected, threadId]);

  return {
    isConnected,
  };
};
