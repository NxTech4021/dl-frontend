import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { useCallback, useState } from "react";
import { toast } from "sonner-native";
import { Friend, FriendRequestsData } from "../types";

export const useFriends = () => {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestsData>({
    sent: [],
    received: [],
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        return;
      }

      const response = await axiosInstance.get("/api/pairing/friends");

      if (response.data) {
        const friendsData = response.data.data || response.data;
        setFriends(friendsData);
      }
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  }, [session?.user?.id]);

  const fetchFriendRequests = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        return;
      }

      const response = await axiosInstance.get(
        "/api/pairing/friendship/requests",
      );

      if (response.data) {
        const requestsData = response.data.data || response.data;
        setFriendRequests(requestsData);
      }
    } catch (error) {
      console.error("Error fetching friend requests:", error);
    }
  }, [session?.user?.id]);

  const sendFriendRequest = useCallback(
    async (recipientId: string) => {
      if (!session?.user?.id) return;

      // Optimistic update: immediately show button as Pending
      setActionLoading(recipientId);
      setFriendRequests((prev) => ({
        ...prev,
        sent: [
          ...prev.sent,
          {
            id: `optimistic-${recipientId}`,
            requesterId: session.user.id,
            recipientId,
            status: "PENDING" as const,
            createdAt: new Date().toISOString(),
            respondedAt: null,
          },
        ],
      }));

      try {
        await axiosInstance.post("/api/pairing/friendship/request", {
          recipientId,
        });
        toast.success("Success", {
          id: `friend-request-sent-${recipientId}`,
          description: "Friend request sent!",
        });
        // Sync with real server data
        await fetchFriendRequests();
      } catch (error: any) {
        // Revert optimistic update on failure
        setFriendRequests((prev) => ({
          ...prev,
          sent: prev.sent.filter((r) => r.id !== `optimistic-${recipientId}`),
        }));
        console.error("Error sending friend request:", error);
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Failed to send friend request";
        toast.error("Error", {
          id: `friend-request-error-${recipientId}`,
          description: message,
        });
      } finally {
        setActionLoading(null);
      }
    },
    [session?.user?.id, fetchFriendRequests],
  );

  const acceptFriendRequest = useCallback(
    async (friendshipId: string) => {
      try {
        setActionLoading(friendshipId);

        const response = await axiosInstance.post(
          `/api/pairing/friendship/${friendshipId}/accept`,
        );

        if (response.data?.message) {
          toast.success("Success", {
            id: `friend-request-accepted-${friendshipId}`,
            description: "Friend request accepted!",
          });
          await fetchFriendRequests();
          await fetchFriends();
        }
      } catch (error) {
        console.error("Error accepting friend request:", error);
        toast.error("Error", {
          id: `friend-accept-error-${friendshipId}`,
          description: "Failed to accept request",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [fetchFriendRequests, fetchFriends],
  );

  const rejectFriendRequest = useCallback(
    async (friendshipId: string) => {
      try {
        setActionLoading(friendshipId);

        const response = await axiosInstance.post(
          `/api/pairing/friendship/${friendshipId}/reject`,
        );

        if (response.data?.message) {
          toast.success("Request rejected", {
            id: `friend-request-rejected-${friendshipId}`,
          });
          await fetchFriendRequests();
        }
      } catch (error) {
        console.error("Error rejecting friend request:", error);
        toast.error("Error", {
          id: `friend-reject-error-${friendshipId}`,
          description: "Failed to reject request",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [fetchFriendRequests],
  );

  const removeFriend = useCallback(
    async (friendshipId: string) => {
      try {
        setActionLoading(friendshipId);

        const response = await axiosInstance.delete(
          `/api/pairing/friendship/${friendshipId}`,
        );

        if (response.data?.message) {
          toast.success("Friend removed", {
            id: `friend-removed-${friendshipId}`,
          });
          await fetchFriends();
        }
      } catch (error) {
        console.error("Error removing friend:", error);
        toast.error("Error", {
          id: `friend-remove-error-${friendshipId}`,
          description: "Failed to remove friend",
        });
      } finally {
        setActionLoading(null);
      }
    },
    [fetchFriends],
  );

  return {
    friends,
    friendRequests,
    actionLoading,
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  };
};
