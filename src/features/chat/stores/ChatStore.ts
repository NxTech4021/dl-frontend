import { create } from 'zustand';
import { chatLogger } from '@/utils/logger';
import { ChatService } from '../services/ChatService';
import { ChatState, Message, ReadReceipt, Thread } from '../types';

// Match data type for sending messages
interface MatchMessageData {
  [key: string]: unknown;
}

interface ChatActions {
  setCurrentThread: (thread: Thread | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string, threadId: string) => void;
  markMessageAsRead: (messageId: string, threadId: string, readerId: string, readerName: string) => void;
  updateThread: (thread: Thread) => void;
  addThread: (thread: Thread) => void;
  loadThreads: (userId: string) => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  loadMoreMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, senderId: string, content: string, replyToId?: string, type?: 'text' | 'match', matchData?: MatchMessageData) => Promise<void>;
  setConnectionStatus: (connected: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  getTotalUnreadCount: () => number;
  setReplyingTo: (message: Message | null) => void;
  handleDeleteMessage: (messageId: string, threadId: string) => Promise<void>;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // State
  threads: [],
  currentThread: null,
  messages: {},
  messagePagination: {},
  isConnected: false,
  isLoading: false,
  error: null,
  replyingTo: null,

  // Actions
  setCurrentThread: (thread) => {
    chatLogger.debug('Setting current thread:', thread?.name || 'null');
    set({ currentThread: thread });
  },

  addMessage: (message) => {
    chatLogger.debug('Adding message:', message.id);

    const { messages } = get();
    const threadMessages = messages[message.threadId] || [];

    // Check if message already exists to prevent duplicates
    const exists = threadMessages.some(m => m.id === message.id);
    if (exists) {
      return;
    }

    // Check if this is a real message that should replace an optimistic one
    // (same content, same sender, sent within last 10 seconds)
    const optimisticMatch = threadMessages.find(m =>
      m.tempId &&
      m.senderId === message.senderId &&
      m.content === message.content &&
      (m.status === 'sending' || m.status === 'sent') &&
      Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 10000
    );

    if (optimisticMatch) {
      // Replace the optimistic message with the real one
      chatLogger.debug('Replacing optimistic message with real one:', optimisticMatch.tempId, '->', message.id);
      const updatedMessages = {
        ...messages,
        [message.threadId]: threadMessages.map(m =>
          m.tempId === optimisticMatch.tempId
            ? { ...message, status: 'sent' as const }
            : m
        ),
      };
      set({ messages: updatedMessages });
      return;
    }

    const updatedMessages = {
      ...messages,
      [message.threadId]: [...threadMessages, message],
    };

    set({ messages: updatedMessages });
  },

  updateMessage: (messageId, updates) => {
    chatLogger.debug('Updating message:', messageId);
    const { messages } = get();
    const updatedMessages = { ...messages };

    for (const threadId in updatedMessages) {
      updatedMessages[threadId] = updatedMessages[threadId].map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );
    }

    set({ messages: updatedMessages });
  },

  deleteMessage: (messageId, threadId) => {
    const { messages } = get();
    const threadMessages = messages[threadId] || [];

    set({
      messages: {
        ...messages,
        [threadId]: threadMessages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                content: 'This message has been deleted',
                metadata: {
                  ...msg.metadata,
                  isDeleted: true,
                }
              }
            : msg
        ),
      },
    });
  },

  markMessageAsRead: (messageId, threadId, readerId, readerName) => {
    chatLogger.debug('Marking message as read:', messageId);
    const { messages } = get();
    const threadMessages = messages[threadId] || [];

    set({
      messages: {
        ...messages,
        [threadId]: threadMessages.map(msg => {
          if (msg.id === messageId) {
            const readBy = msg.metadata?.readBy || [];
            const alreadyRead = readBy.some((r: ReadReceipt) => r.userId === readerId);

            if (!alreadyRead) {
              return {
                ...msg,
                isRead: true,
                metadata: {
                  ...msg.metadata,
                  readBy: [
                    ...readBy,
                    {
                      id: `${messageId}-${readerId}`,
                      userId: readerId,
                      messageId: messageId,
                      readAt: new Date().toISOString(),
                      user: { id: readerId, name: readerName },
                    },
                  ],
                },
              };
            }
          }
          return msg;
        }),
      },
    });
  },

  updateThread: (updatedThread) => {
    chatLogger.debug('Updating thread:', updatedThread.name);
    const { threads } = get();

    // Update the thread and sort by most recent
    const updatedThreads = threads
      .map(thread => {
        if (thread.id === updatedThread.id) {
          return updatedThread;
        }
        return thread;
      })
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });

    set({ threads: updatedThreads });
  },

  addThread: (newThread) => {
    // Validate thread before adding
    if (!newThread || !newThread.id) {
      chatLogger.warn('Attempted to add invalid thread');
      return;
    }

    chatLogger.debug('Adding new thread:', newThread.name);
    const { threads } = get();

    // Ensure updatedAt is a Date object
    const threadToAdd: Thread = {
      ...newThread,
      updatedAt: newThread.updatedAt instanceof Date
        ? newThread.updatedAt
        : new Date(newThread.updatedAt || Date.now()),
      createdAt: newThread.createdAt instanceof Date
        ? newThread.createdAt
        : new Date(newThread.createdAt || Date.now()),
    };

    // Filter out any null/invalid threads and remove existing thread with same ID to prevent duplicates
    const validThreads = threads.filter(t => t && t.id && t.id !== threadToAdd.id);
    const updatedThreads = [threadToAdd, ...validThreads].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });

    set({ threads: updatedThreads });
  },

  loadThreads: async (userId: string) => {
    chatLogger.debug('Loading threads for user:', userId);
    try {
      set({ isLoading: true, error: null });
      const threads = await ChatService.getThreads(userId);

      // Deduplicate threads by ID in case backend returns duplicates
      const uniqueThreads = Array.from(
        new Map(threads.map(thread => [thread.id, thread])).values()
      );

      chatLogger.debug('Loaded threads:', uniqueThreads.length);
      set({ threads: uniqueThreads, isLoading: false });
    } catch (error) {
      chatLogger.error('Error loading threads:', error);
      set({
        error: 'Failed to load threads',
        isLoading: false,
        threads: []
      });
    }
  },

  loadMessages: async (threadId) => {
    chatLogger.debug('Loading messages for thread:', threadId);
    try {
      set({ isLoading: true, error: null });
      const PAGE_SIZE = 50;
      const messages = await ChatService.getMessages(threadId, 1, PAGE_SIZE);
      chatLogger.debug('Loaded messages:', messages.length);
      const { messages: currentMessages, messagePagination } = get();
      set({
        messages: {
          ...currentMessages,
          [threadId]: messages,
        },
        messagePagination: {
          ...messagePagination,
          [threadId]: { page: 1, hasMore: messages.length >= PAGE_SIZE, isLoadingMore: false },
        },
        isLoading: false,
      });
    } catch (error) {
      chatLogger.error('Error loading messages:', error);
      set({ error: 'Failed to load messages', isLoading: false });
    }
  },

  loadMoreMessages: async (threadId) => {
    const { messagePagination, messages } = get();
    const pagination = messagePagination[threadId];

    // Guard: don't load if already loading, no more pages, or no initial load done
    if (!pagination || pagination.isLoadingMore || !pagination.hasMore) return;

    const nextPage = pagination.page + 1;
    const PAGE_SIZE = 50;

    chatLogger.debug('Loading more messages for thread:', threadId, 'page:', nextPage);

    // Set loading state
    set({
      messagePagination: {
        ...get().messagePagination,
        [threadId]: { ...pagination, isLoadingMore: true },
      },
    });

    try {
      const olderMessages = await ChatService.getMessages(threadId, nextPage, PAGE_SIZE);

      const { messages: currentMessages, messagePagination: currentPagination } = get();
      const existingMessages = currentMessages[threadId] || [];

      // Deduplicate — older messages might overlap with socket-delivered ones
      const existingIds = new Set(existingMessages.map(m => m.id));
      const newMessages = olderMessages.filter(m => !existingIds.has(m.id));

      set({
        messages: {
          ...currentMessages,
          [threadId]: [...existingMessages, ...newMessages],
        },
        messagePagination: {
          ...currentPagination,
          [threadId]: { page: nextPage, hasMore: olderMessages.length >= PAGE_SIZE, isLoadingMore: false },
        },
      });

      chatLogger.debug('Loaded', newMessages.length, 'more messages (page', nextPage, ')');
    } catch (error) {
      chatLogger.error('Error loading more messages:', error);
      // Reset loading state but keep current page
      set({
        messagePagination: {
          ...get().messagePagination,
          [threadId]: { ...pagination, isLoadingMore: false },
        },
      });
    }
  },

  sendMessage: async (threadId, senderId, content, replyToId, type, matchData) => {
    chatLogger.debug('Sending message to thread:', threadId);

    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      tempId: tempId,
      threadId,
      senderId,
      content,
      timestamp: new Date(),
      isRead: false,
      isDelivered: false,
      replyTo: replyToId,
      type: type === 'match' ? 'match' : 'text',
      status: 'sending',
      matchData: matchData as Message['matchData'],
    };

    // Add optimistic message to UI immediately
    get().addMessage(optimisticMessage);

    try {
      const messageType = type === 'match' ? 'MATCH' : 'TEXT';
      const sentMessage = await ChatService.sendMessage(
        threadId,
        senderId,
        content,
        replyToId,
        messageType,
        matchData
      );

      // Replace optimistic message with real message from server
      const { messages } = get();
      const threadMessages = messages[threadId] || [];
      const updatedMessages = threadMessages.map(msg =>
        msg.tempId === tempId
          ? { ...sentMessage, status: 'sent' as const }
          : msg
      );

      set({
        messages: {
          ...messages,
          [threadId]: updatedMessages,
        },
      });

      chatLogger.debug('Message sent successfully:', sentMessage.id);
    } catch (error) {
      chatLogger.error('Error sending message:', error);

      // Mark the optimistic message as failed
      const { messages } = get();
      const threadMessages = messages[threadId] || [];
      const updatedMessages = threadMessages.map(msg =>
        msg.tempId === tempId
          ? { ...msg, status: 'failed' as const }
          : msg
      );

      set({
        messages: {
          ...messages,
          [threadId]: updatedMessages,
        },
        error: 'Failed to send message',
      });
    }
  },

  setConnectionStatus: (connected) => {
    chatLogger.debug('Connection status:', connected);
    set({ isConnected: connected });
  },

  setError: (error) => {
    if (error) {
      chatLogger.warn('Error set:', error);
    }
    set({ error });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  getTotalUnreadCount: () => {
    const { threads } = get();
    return threads.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0);
  },

  setReplyingTo: (message) => {
    chatLogger.debug('Setting replying to:', message?.id || 'null');
    set({ replyingTo: message });
  },

  handleDeleteMessage: async (messageId: string, threadId: string) => {
    chatLogger.debug('Deleting message:', messageId);
    try {
      await ChatService.deleteMessage(messageId);
      // Update local state
      get().deleteMessage(messageId, threadId);
    } catch (error) {
      chatLogger.error('Error deleting message:', error);
      set({ error: 'Failed to delete message' });
    }
  },
}));
