import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { useCallback, useRef, useState } from "react";
import { Player } from "../types";

export const usePlayers = () => {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const currentPageRef = useRef(1);
  const currentQueryRef = useRef("");

  const searchPlayers = useCallback(
    async (query: string = "") => {
      try {
        if (!session?.user?.id) {
          console.log("❌ usePlayers: No session user ID");
          return;
        }

        console.log("🔵 usePlayers: Fetching players with query:", query);
        setIsLoading(true);
        currentPageRef.current = 1;
        currentQueryRef.current = query;

        const searchParam =
          query.trim().length >= 2 ? `&q=${encodeURIComponent(query)}` : "";
        const url = `/api/player/search?page=1&limit=20${searchParam}`;
        console.log("🔵 usePlayers: API URL:", url);

        const response = await axiosInstance.get(url);

        // console.log('📦 usePlayers: API response:', response);

        if (response.data?.data) {
          setPlayers(response.data.data);
          const pagination = response.data.pagination;
          setHasMore(
            pagination ? pagination.page < pagination.totalPages : false,
          );
        }
      } catch (error) {
        console.error("❌ usePlayers: Error fetching players:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [session?.user?.id],
  );

  const loadMorePlayers = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      const nextPage = currentPageRef.current + 1;
      setIsLoadingMore(true);

      const query = currentQueryRef.current;
      const searchParam =
        query.trim().length >= 2 ? `&q=${encodeURIComponent(query)}` : "";
      const url = `/api/player/search?page=${nextPage}&limit=20${searchParam}`;
      console.log("🔵 usePlayers: Loading more, page:", nextPage, "URL:", url);

      const response = await axiosInstance.get(url);

      if (response.data?.data) {
        setPlayers((prev) => [...prev, ...response.data.data]);
        currentPageRef.current = nextPage;
        const pagination = response.data.pagination;
        setHasMore(pagination ? nextPage < pagination.totalPages : false);
      }
    } catch (error) {
      console.error("❌ usePlayers: Error loading more players:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore]);

  return {
    players,
    isLoading,
    isLoadingMore,
    hasMore,
    searchPlayers,
    loadMorePlayers,
  };
};
