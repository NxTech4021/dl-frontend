import axiosInstance, { endpoints } from "@/lib/endpoints";
import { chatLogger } from "@/utils/logger";
import { AxiosResponse } from "axios";
import {
  BackendMessage,
  BackendThread,
  BackendThreadMember,
  BackendUser,
  Message,
  Thread,
  User
} from "../types";

// Match data structure for sending match messages
interface MatchMessageData {
  matchId?: string;
  matchType?: 'SINGLES' | 'DOUBLES';
  date?: string;
  time?: string;
  duration?: number;
  location?: string;
  sportType?: string;
  isFriendlyRequest?: boolean;
  [key: string]: unknown;
}

export class ChatService {
  static async getThreads(userId: string): Promise<Thread[]> {
    chatLogger.debug("getThreads called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getThreads(userId)
      );

      const threads = Array.isArray(response.data?.data)
        ? response.data.data.map((thread: BackendThread) =>
            this.transformBackendThread(thread, userId)
          )
        : [];

      chatLogger.debug("Transformed threads:", threads.length);
      return threads;
    } catch (error) {
      chatLogger.error("Error fetching threads:", error);
      throw error;
    }
  }

  static async getThread(threadId: string): Promise<Thread | null> {
    chatLogger.debug("getThread called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getThread(threadId)
      );

      if (response.data?.data) {
        return this.transformBackendThread(response.data.data, '');
      }
      return null;
    } catch (error) {
      chatLogger.error("Error fetching thread:", error);
      throw error;
    }
  }

  static async getMessages(
    threadId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<Message[]> {
    chatLogger.debug("getMessages called for thread:", threadId);
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

      const messages = Array.isArray(response.data?.data)
        ? response.data.data.map((msg: BackendMessage) => this.transformBackendMessage(msg))
        : [];

      chatLogger.debug("Transformed messages:", messages.length);
      return messages;
    } catch (error) {
      chatLogger.error("Error fetching messages:", error);
      throw error;
    }
  }

  static async sendMessage(
    threadId: string,
    senderId: string,
    content: string,
    repliesToId?: string,
    messageType?: 'TEXT' | 'MATCH',
    matchData?: MatchMessageData
  ): Promise<Message> {
    chatLogger.debug("sendMessage called:", { threadId, senderId, messageType });
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

      return this.transformBackendMessage(response.data.data);
    } catch (error) {
      chatLogger.error("Error sending message:", error);
      throw error;
    }
  }

  static async createThread(
    currentUserId: string,
    userIds: string[],
    isGroup: boolean = false,
    name?: string
  ): Promise<Thread> {
    chatLogger.debug("createThread called:", { currentUserId, isGroup, name });
    try {
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

      return this.transformBackendThread(response.data.data, currentUserId);
    } catch (error) {
      chatLogger.error("Error creating thread:", error);
      throw error;
    }
  }

  static async getAvailableUsers(userId: string): Promise<User[]> {
    chatLogger.debug("getAvailableUsers called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getAvailableUsers(userId)
      );

      const users = Array.isArray(response.data?.data)
        ? response.data.data.map((user: BackendUser) => this.transformBackendUser(user))
        : [];
      chatLogger.debug("Transformed users:", users.length);

      return users;
    } catch (error) {
      chatLogger.error("Error fetching available users:", error);
      throw error;
    }
  }

  static async getThreadMembers(threadId: string): Promise<User[]> {
    chatLogger.debug("getThreadMembers called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getThreadMembers(threadId)
      );

      const members = Array.isArray(response.data?.data)
        ? response.data.data.map((member: BackendThreadMember) =>
            this.transformBackendThreadMember(member)
          )
        : [];

      chatLogger.debug("Transformed members:", members.length);
      return members;
    } catch (error) {
      chatLogger.error("Error fetching thread members:", error);
      throw error;
    }
  }

  static async getAllUsers(): Promise<User[]> {
    chatLogger.debug("getAllUsers called");
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getAllUsers
      );

      const users = Array.isArray(response.data?.data)
        ? response.data.data.map((user: BackendUser) => this.transformBackendUser(user))
        : [];
      chatLogger.debug("Transformed all users:", users.length);

      return users;
    } catch (error) {
      chatLogger.error("Error fetching all users:", error);
      throw error;
    }
  }

  static async getUnreadCount(threadId: string): Promise<number> {
    chatLogger.debug("getUnreadCount called for thread:", threadId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getUnreadCount(threadId)
      );

      return response.data?.data?.unreadCount || 0;
    } catch (error) {
      chatLogger.error("Error fetching unread count:", error);
      return 0;
    }
  }

  static async getTotalUnreadCount(userId: string): Promise<number> {
    chatLogger.debug("getTotalUnreadCount called for user:", userId);
    try {
      const response: AxiosResponse = await axiosInstance.get(
        endpoints.chat.getTotalUnreadCount(userId)
      );

      return response.data?.data?.totalUnreadCount || 0;
    } catch (error) {
      chatLogger.error("Error fetching total unread count:", error);
      return 0;
    }
  }

  static async markAllAsRead(threadId: string, userId: string): Promise<void> {
    chatLogger.debug("markThreadAsRead called for thread:", threadId);
    try {
      await axiosInstance.post(endpoints.chat.markThreadAsRead(threadId), {
        userId
      });
    } catch (error) {
      chatLogger.error("Error marking thread as read:", error);
      throw error;
    }
  }

  static async deleteMessage(messageId: string): Promise<void> {
    chatLogger.debug("deleteMessage called for message:", messageId);
    try {
      await axiosInstance.delete(endpoints.chat.deleteMessage(messageId));
    } catch (error) {
      chatLogger.error("Error deleting message:", error);
      throw error;
    }
  }

  private static transformBackendThread(backendThread: BackendThread, currentUserId?: string): Thread {
    const lastMessage = backendThread.messages?.[0];

    return {
      id: backendThread.id,
      name:
        backendThread.name ||
        this.generateThreadName(backendThread.members || [], backendThread.isGroup, currentUserId),
      type: backendThread.isGroup ? "group" : "direct",
      participants:
        backendThread.members?.map((member: BackendThreadMember) =>
          this.transformBackendThreadMember(member)
        ) || [],
      lastMessage: lastMessage
        ? this.transformBackendMessage(lastMessage)
        : undefined,
      unreadCount: backendThread.unreadCount || 0,
      isActive: true,
      createdAt: new Date(backendThread.createdAt),
      updatedAt: new Date(backendThread.updatedAt),
      sportType: (backendThread.sportType || backendThread.division?.league?.sportType || null) as Thread['sportType'],
      recentSportContext: backendThread.recentSportContext ? {
        sportType: (backendThread.recentSportContext.sportType ?? null) as 'PICKLEBALL' | 'TENNIS' | 'PADEL' | null,
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

  private static transformBackendMessage(backendMessage: BackendMessage): Message {
    return {
      id: backendMessage.id,
      threadId: backendMessage.threadId,
      senderId: backendMessage.senderId,
      content: backendMessage.content || "",
      timestamp: new Date(backendMessage.createdAt),
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
  }

  private static transformBackendUser(backendUser: BackendUser): User {
    return {
      id: backendUser.id,
      name: backendUser.name || backendUser.username || "Unknown User",
      avatar: backendUser.image,
      isOnline: false,
      username: backendUser.username,
      email: backendUser.email,
    };
  }

  private static transformBackendThreadMember(member: BackendThreadMember): User {
    return {
      id: member.user.id,
      name: member.user.name || member.user.username || "Unknown User",
      avatar: member.user.image,
      isOnline: false,
      username: member.user.username,
      email: member.user.email,
      role: member.role,
    };
  }

  private static generateThreadName(members: BackendThreadMember[], isGroup: boolean, currentUserId?: string): string {
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
