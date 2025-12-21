import axiosInstance, { endpoints } from "@/lib/endpoints";
import { AxiosResponse } from "axios";
import { Message, Thread, User } from "../types";

export class ChatService {
  static async getThreads(userId: string): Promise<Thread[]> {
    console.log("ChatService: getThreads called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getThreads(userId)
      );

      console.log("ChatService: Backend response:", response.data);

      // Transform backend data to match our frontend types
      // const threads = Array.isArray(response.data?.data) ? response.data.data.map(this.transformBackendThread) : [];
      const threads = Array.isArray(response.data?.data)
        ? response.data.data.map((thread: any) =>
            this.transformBackendThread(thread, userId)
          )
        : [];

      console.log("ChatService: Transformed threads:", threads.length);

      return threads;
    } catch (error) {
      console.error("Error fetching threads:", error);
      throw error;
    }
  }

  static async getMessages(
    threadId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<Message[]> {
    console.log("ChatService: getMessages called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getMessages(threadId),
        {
          params: {
            page: page.toString(),
            limit: limit.toString(),
          },
        }
      );

      // Transform backend data to match our frontend types
      const messages = Array.isArray(response.data?.data)
        ? response.data.data.map((msg: any) => this.transformBackendMessage(msg))
        : [];

      const users = Array.isArray(response.data?.data)
        ? response.data.data.map((user: any) => this.transformBackendUser(user))
        : [];

      console.log("ChatService: Transformed messages:", messages.length);

      return messages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  static async sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    repliesToId?: string,
    messageType?: 'TEXT' | 'MATCH',
    matchData?: any
  ): Promise<Message> {
    console.log("ChatService: sendMessage called:", {
      threadId,
      senderId,
      content,
      repliesToId,
      messageType,
      matchData,
    });
    try {
      const response: AxiosResponse = await axiosInstance.post(
        endpoints.chat.sendMessage(threadId),
        {
          senderId,
          content,
          ...(repliesToId && { repliesToId }),
          ...(messageType && { messageType }),
          ...(matchData && { matchData }),
        }
      );

      console.log("ChatService: Send message response:", response.data);
      return this.transformBackendMessage(response.data.data);
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  static async createThread(
    currentUserId: string,
    userIds: string[],
    isGroup: boolean = false,
    name?: string
  ): Promise<Thread> {
    console.log("ChatService: createThread called:", {
      currentUserId,
      userIds,
      isGroup,
      name,
    });
    try {
      // Include current user in the userIds array
      const allUserIds = [
        currentUserId,
        ...userIds.filter((id) => id !== currentUserId),
      ];

      const response: AxiosResponse = await axiosInstance.post(
        endpoints.chat.createThread,
        {
          userIds: allUserIds,
          isGroup,
          name: isGroup ? name : undefined,
        }
      );

      console.log("ChatService: Create thread response:", response.data);
      return this.transformBackendThread(response.data.data, currentUserId);
    } catch (error) {
      console.error("Error creating thread:", error);
      throw error;
    }
  }

  static async getAvailableUsers(userId: string): Promise<User[]> {
    console.log("ChatService: getAvailableUsers called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getAvailableUsers(userId)
      );

      console.log("ChatService: Available users response:", response.data);

      // Transform backend data to match our frontend types
      const users = Array.isArray(response.data?.data)
        ? response.data.data.map((user: any) => this.transformBackendUser(user))
        : [];
      console.log("ChatService: Transformed users:", users.length);

      return users;
    } catch (error) {
      console.error("Error fetching available users:", error);
      throw error;
    }
  }

  // Get thread members
  static async getThreadMembers(threadId: string): Promise<User[]> {
    console.log("ChatService: getThreadMembers called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getThreadMembers(threadId)
      );

      console.log("ChatService: Thread members response:", response.data);

      // Transform backend data to match our frontend types
      const members = Array.isArray(response.data?.data)
        ? response.data.data.map((member: any) =>
            this.transformBackendUser(member.user)
          )
        : [];

      console.log("ChatService: Transformed members:", members.length);
      return members;
    } catch (error) {
      console.error("Error fetching thread members:", error);
      throw error;
    }
  }

  // Get all users (for creating new chats)
  static async getAllUsers(): Promise<User[]> {
    console.log("ChatService: getAllUsers called");
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getAllUsers
      );

      console.log("ChatService: All users response:", response.data);

      // Transform backend data to match our frontend types
      const users = Array.isArray(response.data?.data)
        ? response.data.data.map((user: any) => this.transformBackendUser(user))
        : [];
      console.log("ChatService: Transformed all users:", users.length);

      return users;
    } catch (error) {
      console.error("Error fetching all users:", error);
      throw error;
    }
  }

  // Get unread count for a specific thread
  static async getUnreadCount(threadId: string): Promise<number> {
    console.log("ChatService: getUnreadCount called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getUnreadCount(threadId)
      );

      console.log("ChatService: Unread count response:", response.data);
      return response.data?.data?.unreadCount || 0;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  }

  // Get total unread count across all threads
  static async getTotalUnreadCount(userId: string): Promise<number> {
    console.log("ChatService: getTotalUnreadCount called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getTotalUnreadCount(userId)
      );

      console.log("ChatService: Total unread count response:", response.data);
      return response.data?.data?.totalUnreadCount || 0;
    } catch (error) {
      console.error("Error fetching total unread count:", error);
      return 0;
    }
  }

  // Mark all messages in a thread as read
  static async markAllAsRead(threadId: string, userId: string): Promise<void> {
    console.log("ChatService: markThreadAsRead called for thread:", threadId, "user:", userId);
    try {
      await axiosInstance.post(endpoints.chat.markThreadAsRead(threadId), {
        userId
      });
      console.log("ChatService: Thread marked as read");
    } catch (error) {
      console.error("Error marking thread as read:", error);
      throw error;
    }
  }

  // Delete a message
  static async deleteMessage(messageId: string): Promise<void> {
    console.log("ChatService: deleteMessage called for message:", messageId);
    try {
      await axiosInstance.delete(endpoints.chat.deleteMessage(messageId));
      console.log("ChatService: Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  }

  private static transformBackendThread(backendThread: any, currentUserId?: string): Thread {

    const lastMessage = backendThread.messages?.[0];

    return {
      id: backendThread.id,
      name:
        backendThread.name ||
        this.generateThreadName(backendThread.members, backendThread.isGroup, currentUserId),
      type: backendThread.isGroup ? "group" : "direct",
      participants:
        backendThread.members?.map((member: any) =>
          this.transformBackendUser(member.user)
        ) || [],
      lastMessage: lastMessage
        ? this.transformBackendMessage(lastMessage)
        : undefined,
      unreadCount: backendThread.unreadCount || 0,
      isActive: true,
      createdAt: new Date(backendThread.createdAt),
      updatedAt: new Date(backendThread.updatedAt),
      sportType: backendThread.sportType || backendThread.division?.league?.sportType || null,
      recentSportContext: backendThread.recentSportContext ? {
        sportType: backendThread.recentSportContext.sportType,
        lastInteractionAt: backendThread.recentSportContext.lastInteractionAt 
          ? new Date(backendThread.recentSportContext.lastInteractionAt) 
          : null,
        isValid: backendThread.recentSportContext.isValid || false
      } : null,
      division: backendThread.division ? {
        id: backendThread.division.id,
        name: backendThread.division.name,
        gameType: backendThread.division.gameType,
        genderCategory: backendThread.division.genderCategory,
        league: backendThread.division.league ? {
          id: backendThread.division.league.id,
          name: backendThread.division.league.name,
          sportType: backendThread.division.league.sportType,
        } : undefined,
        season: backendThread.division.season ? {
          id: backendThread.division.season.id,
          name: backendThread.division.season.name,
          startDate: backendThread.division.season.startDate,
          endDate: backendThread.division.season.endDate,
          status: backendThread.division.season.status,
        } : undefined,
      } : undefined,
      metadata: {
        avatarUrl: backendThread.avatarUrl,
        divisionId: backendThread.divisionId || backendThread.division?.id,
        seasonId: backendThread.division?.season?.id,
        leagueId: backendThread.division?.league?.id,
        leagueName: backendThread.division?.league?.name,
        seasonName: backendThread.division?.season?.name,
        divisionName: backendThread.division?.name,
        gameType: backendThread.division?.gameType,
        genderCategory: backendThread.division?.genderCategory,
        isGroup: backendThread.isGroup,
        messageCount: backendThread._count?.messages || 0,
      },
    };
  }

  private static transformBackendMessage(backendMessage: any): Message {
    return {
      id: backendMessage.id,
      threadId: backendMessage.threadId,
      senderId: backendMessage.senderId,
      content: backendMessage.content || "",
      timestamp: new Date(backendMessage.createdAt),
      isRead: backendMessage.readBy?.length > 0 || false,
      isDelivered: true,
      replyTo: backendMessage.repliesToId,
      type: backendMessage.messageType === 'MATCH' ? 'match' : 'text',
      matchData: backendMessage.matchData,
      metadata: {
        isEdited: backendMessage.isEdited,
        isDeleted: backendMessage.isDeleted,
        sender: backendMessage.sender,
        readBy: backendMessage.readBy || [],
        updatedAt: backendMessage.updatedAt,
      },
    };
  }

  // Transform backend user data to frontend format
  private static transformBackendUser(backendUser: any): User {
    return {
      id: backendUser.id,
      name: backendUser.name || backendUser.username || "Unknown User",
      avatar: backendUser.image,
      isOnline: false,
      username: backendUser.username,
      email: backendUser.email,
    };
  }

  
  private static generateThreadName(members: any[], isGroup: boolean, currentUserId?: string): string {
   
    if (isGroup) {
      return "Group Chat";
    }

    if (members && members.length >= 2) {
      const otherMembers = currentUserId 
        ? members.filter(member => member.user?.id !== currentUserId)
        : members;
      
      if (otherMembers.length > 0) {
        return otherMembers
          .map(member => member.user?.name || member.user?.username || "Unknown")
          .join(", ");
      }
    }

    return "Chat";
  }

}
