import { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { MatchHistoryService } from '../services/MatchHistoryService';
import {
  MatchHistoryItem,
  MatchHistoryFilters,
  FilterOption,
} from '../types/matchHistory';

interface UseMatchHistoryOptions {
  autoFetch?: boolean;
  initialFilters?: MatchHistoryFilters;
  pageSize?: number;
}

interface UseMatchHistoryReturn {
  // Data
  matches: MatchHistoryItem[];

  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;

  // Pagination
  hasMore: boolean;
  page: number;
  total: number;

  // Filters
  filters: MatchHistoryFilters;
  setFilters: (filters: MatchHistoryFilters) => void;
  updateFilter: <K extends keyof MatchHistoryFilters>(
    key: K,
    value: MatchHistoryFilters[K]
  ) => void;
  clearFilters: () => void;

  // Actions
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  // Error
  error: string | null;
}

const DEFAULT_PAGE_SIZE = 20;

export function useMatchHistory(
  options: UseMatchHistoryOptions = {}
): UseMatchHistoryReturn {
  const {
    autoFetch = true,
    initialFilters = {},
    pageSize = DEFAULT_PAGE_SIZE,
  } = options;

  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Data state
  const [matches, setMatches] = useState<MatchHistoryItem[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [filters, setFiltersState] = useState<MatchHistoryFilters>(initialFilters);

  // Error state
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch matches (internal)
   */
  const fetchMatches = useCallback(
    async (
      pageNum: number,
      currentFilters: MatchHistoryFilters,
      append: boolean = false
    ) => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setError(null);

        const response = await MatchHistoryService.fetchMatchHistory(
          currentFilters,
          pageNum,
          pageSize
        );

        if (response.success) {
          const { matches: newMatches, pagination } = response.data;

          if (append) {
            setMatches(prev => [...prev, ...newMatches]);
          } else {
            setMatches(newMatches);
          }

          setPage(pagination.page);
          setTotal(pagination.total);
          setHasMore(pagination.hasMore);
        } else {
          setError(response.message || 'Failed to load match history');
          if (!append) {
            setMatches([]);
          }
        }
      } catch (err) {
        console.error('useMatchHistory: Error fetching matches:', err);
        setError(err instanceof Error ? err.message : 'Failed to load match history');
        if (!append) {
          setMatches([]);
        }
      }
    },
    [userId, pageSize]
  );

  /**
   * Initial fetch on mount or when filters change
   */
  const initialFetch = useCallback(async () => {
    setIsLoading(true);
    setPage(1);
    setHasMore(true);
    await fetchMatches(1, filters, false);
    setIsLoading(false);
  }, [fetchMatches, filters]);

  /**
   * Load more matches (infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchMatches(nextPage, filters, true);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, isLoading, page, fetchMatches, filters]);

  /**
   * Refresh matches (pull to refresh)
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchMatches(1, filters, false);
    setIsRefreshing(false);
  }, [fetchMatches, filters]);

  /**
   * Set filters (replaces all filters)
   */
  const setFilters = useCallback((newFilters: MatchHistoryFilters) => {
    setFiltersState(newFilters);
  }, []);

  /**
   * Update a single filter
   */
  const updateFilter = useCallback(
    <K extends keyof MatchHistoryFilters>(
      key: K,
      value: MatchHistoryFilters[K]
    ) => {
      setFiltersState(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      initialFetch();
    }
  }, [autoFetch, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when filters change
  useEffect(() => {
    if (userId) {
      initialFetch();
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    matches,

    // Loading states
    isLoading,
    isLoadingMore,
    isRefreshing,

    // Pagination
    hasMore,
    page,
    total,

    // Filters
    filters,
    setFilters,
    updateFilter,
    clearFilters,

    // Actions
    loadMore,
    refresh,

    // Error
    error,
  };
}
