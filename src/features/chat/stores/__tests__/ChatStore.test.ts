import { act } from '@testing-library/react-native';
import { useChatStore } from '../ChatStore';

// Mock the ChatService
jest.mock('../../services/ChatService', () => ({
  ChatService: {
    getThreads: jest.fn(),
    getMessages: jest.fn(),
    sendMessage: jest.fn(),
    deleteMessage: jest.fn(),
  },
}));

import { ChatService } from '../../services/ChatService';

const mockChatService = ChatService as jest.Mocked<typeof ChatService>;

// Mock thread and message data
const mockThread = {
  id: 'thread-1',
  name: 'Test Thread',
  type: 'direct' as const,
  participants: [],
  unreadCount: 0,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockMessage = {
  id: 'msg-1',
  threadId: 'thread-1',
  senderId: 'user-1',
  content: 'Hello World',
  type: 'text' as const,
  timestamp: new Date('2024-01-01'),
  isRead: false,
  isDelivered: true,
  metadata: {},
};

describe('ChatStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    const store = useChatStore.getState();
    useChatStore.setState({
      threads: [],
      currentThread: null,
      messages: {},
      isConnected: false,
      isLoading: false,
      error: null,
      replyingTo: null,
    });
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useChatStore.getState();

      expect(state.threads).toEqual([]);
      expect(state.currentThread).toBeNull();
      expect(state.messages).toEqual({});
      expect(state.isConnected).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.replyingTo).toBeNull();
    });
  });

  describe('setCurrentThread', () => {
    it('should set current thread', () => {
      act(() => {
        useChatStore.getState().setCurrentThread(mockThread);
      });

      expect(useChatStore.getState().currentThread).toEqual(mockThread);
    });

    it('should clear current thread when null is passed', () => {
      act(() => {
        useChatStore.getState().setCurrentThread(mockThread);
      });

      act(() => {
        useChatStore.getState().setCurrentThread(null);
      });

      expect(useChatStore.getState().currentThread).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to thread', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(mockMessage);
    });

    it('should not add duplicate messages', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
        useChatStore.getState().addMessage(mockMessage);
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages).toHaveLength(1);
    });

    it('should add multiple different messages', () => {
      const message2 = { ...mockMessage, id: 'msg-2', content: 'Second message' };

      act(() => {
        useChatStore.getState().addMessage(mockMessage);
        useChatStore.getState().addMessage(message2);
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages).toHaveLength(2);
    });
  });

  describe('updateMessage', () => {
    it('should update message content', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      act(() => {
        useChatStore.getState().updateMessage('msg-1', { content: 'Updated content' });
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].content).toBe('Updated content');
    });

    it('should update message read status', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      act(() => {
        useChatStore.getState().updateMessage('msg-1', { isRead: true });
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].isRead).toBe(true);
    });
  });

  describe('deleteMessage', () => {
    it('should mark message as deleted', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      act(() => {
        useChatStore.getState().deleteMessage('msg-1', 'thread-1');
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].metadata?.isDeleted).toBe(true);
      expect(messages[0].content).toBe('This message has been deleted');
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read with reader info', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      act(() => {
        useChatStore.getState().markMessageAsRead('msg-1', 'thread-1', 'reader-1', 'Reader Name');
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].isRead).toBe(true);
      expect(messages[0].metadata?.readBy).toHaveLength(1);
      expect(messages[0]?.metadata?.readBy?.[0]?.userId).toBe('reader-1');
    });

    it('should not add duplicate read receipts', () => {
      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      act(() => {
        useChatStore.getState().markMessageAsRead('msg-1', 'thread-1', 'reader-1', 'Reader Name');
        useChatStore.getState().markMessageAsRead('msg-1', 'thread-1', 'reader-1', 'Reader Name');
      });

      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].metadata?.readBy).toHaveLength(1);
    });
  });

  describe('addThread', () => {
    it('should add new thread', () => {
      act(() => {
        useChatStore.getState().addThread(mockThread);
      });

      expect(useChatStore.getState().threads).toHaveLength(1);
      expect(useChatStore.getState().threads[0].id).toBe('thread-1');
    });

    it('should not add invalid thread', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      act(() => {
        useChatStore.getState().addThread(null as any);
      });

      expect(useChatStore.getState().threads).toHaveLength(0);
      consoleSpy.mockRestore();
    });

    it('should replace existing thread with same ID', () => {
      const updatedThread = { ...mockThread, name: 'Updated Thread' };

      act(() => {
        useChatStore.getState().addThread(mockThread);
        useChatStore.getState().addThread(updatedThread);
      });

      expect(useChatStore.getState().threads).toHaveLength(1);
      expect(useChatStore.getState().threads[0].name).toBe('Updated Thread');
    });

    it('should sort threads by updatedAt', () => {
      const olderThread = { ...mockThread, id: 'thread-2', updatedAt: new Date('2024-01-01') };
      const newerThread = { ...mockThread, id: 'thread-1', updatedAt: new Date('2024-01-02') };

      act(() => {
        useChatStore.getState().addThread(olderThread);
        useChatStore.getState().addThread(newerThread);
      });

      const threads = useChatStore.getState().threads;
      expect(threads[0].id).toBe('thread-1'); // Newer first
      expect(threads[1].id).toBe('thread-2');
    });
  });

  describe('updateThread', () => {
    it('should update existing thread', () => {
      act(() => {
        useChatStore.getState().addThread(mockThread);
      });

      const updatedThread = { ...mockThread, name: 'Updated Name', unreadCount: 5 };

      act(() => {
        useChatStore.getState().updateThread(updatedThread);
      });

      const thread = useChatStore.getState().threads.find(t => t.id === 'thread-1');
      expect(thread?.name).toBe('Updated Name');
      expect(thread?.unreadCount).toBe(5);
    });
  });

  describe('loadThreads', () => {
    it('should load threads from service', async () => {
      mockChatService.getThreads.mockResolvedValue([mockThread]);

      await act(async () => {
        await useChatStore.getState().loadThreads('user-1');
      });

      expect(useChatStore.getState().threads).toHaveLength(1);
      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should handle load error', async () => {
      mockChatService.getThreads.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useChatStore.getState().loadThreads('user-1');
      });

      expect(useChatStore.getState().error).toBe('Failed to load threads');
      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should deduplicate threads', async () => {
      mockChatService.getThreads.mockResolvedValue([mockThread, mockThread]);

      await act(async () => {
        await useChatStore.getState().loadThreads('user-1');
      });

      expect(useChatStore.getState().threads).toHaveLength(1);
    });
  });

  describe('loadMessages', () => {
    it('should load messages from service', async () => {
      mockChatService.getMessages.mockResolvedValue([mockMessage]);

      await act(async () => {
        await useChatStore.getState().loadMessages('thread-1');
      });

      expect(useChatStore.getState().messages['thread-1']).toHaveLength(1);
      expect(useChatStore.getState().isLoading).toBe(false);
    });

    it('should handle load error', async () => {
      mockChatService.getMessages.mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useChatStore.getState().loadMessages('thread-1');
      });

      expect(useChatStore.getState().error).toBe('Failed to load messages');
    });
  });

  describe('sendMessage', () => {
    it('should send message via service', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockMessage);

      await act(async () => {
        await useChatStore.getState().sendMessage('thread-1', 'user-1', 'Hello');
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        'thread-1',
        'user-1',
        'Hello',
        undefined,
        'TEXT',
        undefined
      );
    });

    it('should send match message with correct type', async () => {
      mockChatService.sendMessage.mockResolvedValue(mockMessage);
      const matchData = { matchId: 'match-1' };

      await act(async () => {
        await useChatStore.getState().sendMessage('thread-1', 'user-1', 'Match created', undefined, 'match', matchData);
      });

      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        'thread-1',
        'user-1',
        'Match created',
        undefined,
        'MATCH',
        matchData
      );
    });

    it('should handle send error', async () => {
      mockChatService.sendMessage.mockRejectedValue(new Error('Send failed'));

      await act(async () => {
        await useChatStore.getState().sendMessage('thread-1', 'user-1', 'Hello');
      });

      expect(useChatStore.getState().error).toBe('Failed to send message');
    });
  });

  describe('handleDeleteMessage', () => {
    it('should delete message via service and update local state', async () => {
      mockChatService.deleteMessage.mockResolvedValue(undefined);

      act(() => {
        useChatStore.getState().addMessage(mockMessage);
      });

      await act(async () => {
        await useChatStore.getState().handleDeleteMessage('msg-1', 'thread-1');
      });

      expect(mockChatService.deleteMessage).toHaveBeenCalledWith('msg-1');
      const messages = useChatStore.getState().messages['thread-1'];
      expect(messages[0].metadata?.isDeleted).toBe(true);
    });
  });

  describe('getTotalUnreadCount', () => {
    it('should return total unread count across all threads', () => {
      const thread1 = { ...mockThread, id: 'thread-1', unreadCount: 3 };
      const thread2 = { ...mockThread, id: 'thread-2', unreadCount: 5 };

      act(() => {
        useChatStore.getState().addThread(thread1);
        useChatStore.getState().addThread(thread2);
      });

      const count = useChatStore.getState().getTotalUnreadCount();
      expect(count).toBe(8);
    });

    it('should return 0 when no threads', () => {
      const count = useChatStore.getState().getTotalUnreadCount();
      expect(count).toBe(0);
    });
  });

  describe('setReplyingTo', () => {
    it('should set replying to message', () => {
      act(() => {
        useChatStore.getState().setReplyingTo(mockMessage);
      });

      expect(useChatStore.getState().replyingTo).toEqual(mockMessage);
    });

    it('should clear replying to when null', () => {
      act(() => {
        useChatStore.getState().setReplyingTo(mockMessage);
        useChatStore.getState().setReplyingTo(null);
      });

      expect(useChatStore.getState().replyingTo).toBeNull();
    });
  });

  describe('Connection Status', () => {
    it('should update connection status', () => {
      act(() => {
        useChatStore.getState().setConnectionStatus(true);
      });

      expect(useChatStore.getState().isConnected).toBe(true);

      act(() => {
        useChatStore.getState().setConnectionStatus(false);
      });

      expect(useChatStore.getState().isConnected).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('should update loading state', () => {
      act(() => {
        useChatStore.getState().setLoading(true);
      });

      expect(useChatStore.getState().isLoading).toBe(true);

      act(() => {
        useChatStore.getState().setLoading(false);
      });

      expect(useChatStore.getState().isLoading).toBe(false);
    });
  });

  describe('Error State', () => {
    it('should update error state', () => {
      act(() => {
        useChatStore.getState().setError('Something went wrong');
      });

      expect(useChatStore.getState().error).toBe('Something went wrong');

      act(() => {
        useChatStore.getState().setError(null);
      });

      expect(useChatStore.getState().error).toBeNull();
    });
  });
});
