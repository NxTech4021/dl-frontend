// src/features/feed/hooks/useFeedPosts.ts

import { useState, useCallback, useRef } from 'react';
import { useSession } from '@/lib/auth-client';
import axiosInstance from '@/lib/endpoints';
import { FeedPost, FeedResponse } from '../types';

// TODO(endpoints): Feed API URLs are inline strings here instead of centralized in lib/endpoints.ts.
// Consistent with useLikes.ts, useComments.ts, usePostActions.ts. Consider migrating to endpoints.feed.xxx.

interface UseFeedPostsOptions {
  sport?: string;
  limit?: number;
  filter?: 'all' | 'friends' | 'recommended';
}

export const useFeedPosts = (options: UseFeedPostsOptions = {}) => {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  const fetchPosts = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        cursorRef.current = null;
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams();

      if (options.sport && options.sport !== 'default') params.append('sport', options.sport);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.filter) params.append('filter', options.filter);
      if (!refresh && cursorRef.current) params.append('cursor', cursorRef.current);

      const url = `/api/feed/posts${params.toString() ? `?${params}` : ''}`;

      const response = await axiosInstance.get(url);

      if (response.data?.data) {
        const feedData: FeedResponse = response.data.data;

        if (refresh) {
          setPosts(feedData.posts);
        } else {
          // Deduplicate posts to avoid key collisions in FlatList
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts = feedData.posts.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }

        cursorRef.current = feedData.nextCursor;
        setHasMore(feedData.hasMore);
      }
    } catch (err) {
      console.error('Error fetching feed posts:', err);
      setError('Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [options.sport, options.limit, options.filter]);

  const refreshPosts = useCallback(() => {
    return fetchPosts(true);
  }, [fetchPosts]);

  const loadMorePosts = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      return fetchPosts(false);
    }
  }, [fetchPosts, isLoadingMore, hasMore]);

  // Update post in local state (for optimistic updates)
  const updatePostLocally = useCallback((postId: string, updates: Partial<FeedPost>) => {
    setPosts(prev => prev.map(post =>
      post.id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  // Remove post from local state
  const removePostLocally = useCallback((postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  }, []);

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    fetchPosts: refreshPosts,
    loadMorePosts,
    updatePostLocally,
    removePostLocally,
  };
};
