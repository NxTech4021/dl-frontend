import { useState, useCallback } from 'react';
import { Category } from '../services/CategoryService';
import { Season, SeasonService } from '../services/SeasonService';
import { LeagueService } from '@/src/features/leagues/services/LeagueService';
import { normalizeCategoriesFromSeason } from '../utils/categoryNormalization';
import { getCategorySortOrder } from '../utils/categorySortOrder';

/**
 * Custom hook to manage league data fetching and state
 *
 * @param leagueId - The ID of the league to fetch
 * @param userGender - User's gender for category filtering
 * @param isCategoryVisibleToUser - Function to check if category is visible to user
 * @returns League data, seasons, categories, loading state, error, and fetch function
 */
export const useLeagueData = (
  leagueId: string | undefined,
  userGender: string | null | undefined,
  isCategoryVisibleToUser: (category: any) => boolean
) => {
  const [league, setLeague] = useState<any>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!leagueId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch league and its seasons in parallel using the new endpoint
      const [leagueData, seasonsData] = await Promise.all([
        LeagueService.fetchLeagueById(leagueId),
        LeagueService.fetchLeagueSeasons(leagueId)
      ]);

      console.log('✅ useLeagueData: Fetched data:', {
        league: leagueData ? { id: leagueData.id, name: leagueData.name } : null,
        seasonsCount: seasonsData?.length,
      });

      setLeague(leagueData);

      // No need to filter seasons since we're getting league-specific seasons
      const leagueSeasons = seasonsData || [];

      // Normalize category data
      const normalizedSeasons = leagueSeasons.map(season => ({
        ...season,
        categories: normalizeCategoriesFromSeason(season)
      }));

      setSeasons(normalizedSeasons);

      // Extract ALL unique categories (no longer filtered by gender - all users see all categories)
      const availableCategoriesMap = new Map<string, Category>();
      normalizedSeasons.forEach(season => {
        if (season.categories && Array.isArray(season.categories)) {
          season.categories.forEach((category: Category) => {
            if (category && category.id) {
              if (!availableCategoriesMap.has(category.id)) {
                availableCategoriesMap.set(category.id, category as Category);
              }
            }
          });
        }
      });

      const availableCategories = Array.from(availableCategoriesMap.values());

      // Sort categories by name priority: Singles > Doubles, Male > Female > Mixed > Open
      availableCategories.sort((a, b) => {
        return getCategorySortOrder(a.name ?? null) - getCategorySortOrder(b.name ?? null);
      });

      setCategories(availableCategories);
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError('Failed to load league details');
    } finally {
      setIsLoading(false);
    }
  // Note: userGender and isCategoryVisibleToUser kept in deps for backwards compatibility
  // but no longer used since all categories are now visible to all users
  }, [leagueId, userGender, isCategoryVisibleToUser]);

  return {
    league,
    seasons,
    categories,
    isLoading,
    error,
    fetchAllData,
  };
};
