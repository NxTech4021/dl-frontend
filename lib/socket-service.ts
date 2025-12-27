import { getBackendBaseURL } from '@/config/network';
import { io, Socket } from 'socket.io-client';
import { authClient } from './auth-client';

export class SocketService {
  private static instance: SocketService;
  private _socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  async connect(): Promise<void> {
    if (this._socket?.connected) {
      console.log('SocketService: Already connected, skipping...');
      return;
    }

    try {
      const backendUrl = getBackendBaseURL();
      
      // Get the session token from Better Auth
      const session = await authClient.getSession();
      
      if (!session?.data) {
        console.log('SocketService: No session token available, skipping socket connection');
        return;
      }

      const userId = session.data.user?.id;
      const sessionToken = session.data.session?.token;
      
      console.log('SocketService: Connecting to:', backendUrl);
      console.log('SocketService: User ID:', userId);

      // Pass session info for Better Auth to validate
      this._socket = io(backendUrl, {
        extraHeaders: {
          'x-user-id': userId || '',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : '',
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: this.reconnectDelay,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this._socket.on('connect', () => {
        console.log('✅ SocketService: Connected successfully!');
        console.log('✅ Socket ID:', this._socket?.id);
        console.log('✅ Transport:', this._socket?.io?.engine?.transport?.name);
        this.reconnectAttempts = 0;
        this.emit('connection_status', { connected: true });
      });

      this._socket.on('disconnect', (reason) => {
        console.log('❌ SocketService: Disconnected, reason:', reason);
        this.emit('connection_status', { connected: false });
      });

      this._socket.on('connect_error', (error) => {
        console.error('❌ SocketService: Connection error:', error.message);
        console.error('❌ Error details:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ SocketService: Max reconnection attempts reached');
          this.emit('connection_status', { connected: false, error: 'Max reconnection attempts reached' });
        } else {
          console.log(`🔄 SocketService: Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        }
      });

      // Chat-related events
      this._socket.on('new_message', (data) => {
        this.emit('new_message', data);
      });

      this._socket.on('message_sent', (data) => {
        this.emit('message_sent', data);
      });

      this._socket.on('message_deleted', (data) => {
        this.emit('message_deleted', data);
      });

      this._socket.on('message_read', (data) => {
        console.log('👁️ SocketService: Message read receipt:', data);
        this.emit('message_read', data);
      });

      this._socket.on('unread_count_update', (data) => {
        console.log('📊 SocketService: Unread count update:', data);
        this.emit('unread_count_update', data);
      });

      this._socket.on('thread_marked_read', (data) => {
        console.log('📖 SocketService: Thread marked as read:', data);
        this.emit('thread_marked_read', data);
      });

      this._socket.on('thread_updated', (data) => {
        console.log('🔄 SocketService: Thread updated:', data);
        this.emit('thread_update', data);
      });

      this._socket.on('thread_created', (data) => {
        console.log('🆕 SocketService: Thread created:', data);
        this.emit('thread_created', data);
      });

      this._socket.on('new_thread', (data) => {
        console.log('🆕 SocketService: New thread:', data);
        this.emit('new_thread', data);
      });

      // Notification events
      this._socket.on('new_notification', (data) => {
        console.log('🔔 SocketService: New notification:', data);
        this.emit('new_notification', data);
      });

      this._socket.on('notification_read', (data) => {
        console.log('👁️ SocketService: Notification read:', data);
        this.emit('notification_read', data);
      });

      this._socket.on('notification_deleted', (data) => {
        console.log('🗑️ SocketService: Notification deleted:', data);
        this.emit('notification_deleted', data);
      });

      this._socket.on('user_online', (data) => {
        console.log('🟢 SocketService: User online:', data);
        this.emit('user_status', { ...data, isOnline: true });
      });

      this._socket.on('user_offline', (data) => {
        console.log('⚫ SocketService: User offline:', data);
        this.emit('user_status', { ...data, isOnline: false });
      });

      this._socket.on('typing_start', (data) => {
        console.log('✍️ SocketService: User started typing:', data);
        this.emit('typing', { ...data, isTyping: true });
      });

      this._socket.on('typing_stop', (data) => {
        console.log('✍️ SocketService: User stopped typing:', data);
        this.emit('typing', { ...data, isTyping: false });
      });

      // Season invitation events
      this._socket.on('season_invitation_received', (data) => {
        console.log('SocketService: Season invitation received:', data);
        this.emit('season_invitation_received', data);
      });

      this._socket.on('season_invitation_accepted', (data) => {
        console.log('SocketService: Season invitation accepted:', data);
        this.emit('season_invitation_accepted', data);
      });

      this._socket.on('partnership_created', (data) => {
        console.log('SocketService: Partnership created:', data);
        this.emit('partnership_created', data);
      });

      this._socket.on('team_registration_completed', (data) => {
        console.log('SocketService: Team registration completed:', data);
        this.emit('team_registration_completed', data);
      });

      // Match events
      this._socket.on('match:participant:joined', (data) => {
        console.log('SocketService: Match participant joined:', data);
        this.emit('match_participant_joined', data);
      });

      this._socket.on('match:updated', (data) => {
        console.log('SocketService: Match updated:', data);
        this.emit('match_updated', data);
      });

      // Match comment events
      this._socket.on('match_comment_added', (data) => {
        console.log('💬 SocketService: Match comment added:', data);
        this.emit('match_comment_added', data);
      });

      this._socket.on('match_comment_updated', (data) => {
        console.log('✏️ SocketService: Match comment updated:', data);
        this.emit('match_comment_updated', data);
      });

      this._socket.on('match_comment_deleted', (data) => {
        console.log('🗑️ SocketService: Match comment deleted:', data);
        this.emit('match_comment_deleted', data);
      });

      // Join user to their personal room for notifications
      if (session.data.user?.id) {
        this._socket.emit('join_user_room', { userId: session.data.user.id });
      }

    } catch (error) {
      console.error('SocketService: Failed to connect:', error);
      this.emit('connection_status', { connected: false});
    }
  }

  disconnect(): void {
    if (this._socket) {
      console.log('SocketService: Disconnecting socket');
      this._socket.disconnect();
      this._socket = null;
      this.reconnectAttempts = 0;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    //  console.log(`📝 SocketService: Listener registered for '${event}'. Total listeners: ${this.listeners.get(event)!.length}`);
  }

  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        //  console.log(`🗑️ SocketService: Listener removed for '${event}'. Remaining listeners: ${callbacks.length}`);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
   //  console.log(`🔔 SocketService: Emitting '${event}' to ${callbacks?.length || 0} listener(s)`);
    if (callbacks && callbacks.length > 0) {
      callbacks.forEach((callback, index) => {
        try {
          console.log(`  ↳ Calling listener #${index + 1} for '${event}'`);
          callback(data);
        } catch (error) {
          console.error(`SocketService: Error in callback for event ${event}:`, error);
        }
      });
    } else {
      console.warn(`⚠️ SocketService: No listeners registered for '${event}'!`);
    }
  }

  // Send a message through socket
  sendMessage(threadId: string, content: string, messageType: string = 'TEXT'): void {
    if (this._socket?.connected) {
      console.log('SocketService: Sending message via socket:', { threadId, content, messageType });
      this._socket.emit('send_message', {
        threadId,
        content,
        type: messageType.toUpperCase(),
      });
    } else {
      console.warn('SocketService: Cannot send message - socket not connected');
    }
  }

  // Join a specific thread room
  joinThread(threadId: string): void {
    if (this._socket?.connected) {
      this._socket.emit('join_thread', { threadId });
      
      // Listen for acknowledgment from backend
      this._socket.once('thread_joined', (data: any) => {
        console.log('✅ Backend confirmed thread join:', data);
      });
    } else {
      console.error('❌ Cannot join thread - socket not connected!');
    }
  }

  // Leave a specific thread room
  leaveThread(threadId: string): void {
    if (this._socket?.connected) {
      this._socket.emit('leave_thread', { threadId });
    } else {
      console.warn('⚠️ Cannot leave thread - socket not connected');
    }
  }

  // Join a specific match room (for real-time match updates and comments)
  joinMatch(matchId: string): void {
    if (this._socket?.connected) {
      console.log('🎾 SocketService: Joining match room:', matchId);
      this._socket.emit('join_match', { matchId });
    } else {
      console.warn('⚠️ Cannot join match room - socket not connected');
    }
  }

  // Leave a specific match room
  leaveMatch(matchId: string): void {
    if (this._socket?.connected) {
      console.log('🎾 SocketService: Leaving match room:', matchId);
      this._socket.emit('leave_match', { matchId });
    } else {
      console.warn('⚠️ Cannot leave match room - socket not connected');
    }
  }

  // Mark message as read
  markAsRead(threadId: string, messageId: string): void {
    if (this._socket?.connected) {
      //  console.log('SocketService: Marking message as read:', { threadId, messageId });
      this._socket.emit('mark_as_read', { threadId, messageId });
    }
  }

  // Mark message as read (alternative method signature)
  markMessageAsRead(messageId: string, userId: string): void {
    if (this._socket?.connected) {
      //  console.log('SocketService: Marking message as read:', { messageId, userId });
      this._socket.emit('message_mark_read', { messageId, userId });
    }
  }

  // Send typing indicator
  sendTyping(threadId: string, isTyping: boolean): void {
    if (this._socket?.connected) {
      const eventName = isTyping ? 'typing_start' : 'typing_stop';
      this._socket.emit(eventName, { threadId });
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this._socket?.connected || false;
  }

  // Manually reconnect
  async reconnect(): Promise<void> {
    this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.connect();
  }

  // Get the socket instance (for direct access if needed)
  getSocket(): Socket | null {
    return this._socket;
  }

  // Debug method to check listeners
  debugListeners(): void {
    console.log('🔍 SocketService: Current listeners:');
    this.listeners.forEach((callbacks, event) => {
      console.log(`  - ${event}: ${callbacks.length} listener(s)`);
    });
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();
