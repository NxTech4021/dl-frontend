import { useState, useCallback } from 'react';
import { Category } from '../services/CategoryService';
import { Season, SeasonService } from '../services/SeasonService';
import { LeagueService } from '@/src/features/leagues/services/LeagueService';
import { normalizeCategoriesFromSeason } from '../utils/categoryNormalization';

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

      // Fetch league and seasons in parallel
      const [leagueData, seasonsData] = await Promise.all([
        LeagueService.fetchLeagueById(leagueId),
        SeasonService.fetchAllSeasons()
      ]);

      console.log('✅ useLeagueData: Fetched data:', {
        league: leagueData ? { id: leagueData.id, name: leagueData.name } : null,
        seasonsCount: seasonsData?.length || 0,
      });

      setLeague(leagueData);

      // Filter seasons to only those belonging to this league
      const leagueSeasons = seasonsData.filter(season =>
        season.leagues?.some(l => l.id === leagueId)
      );

      // Normalize category data
      const normalizedSeasons = leagueSeasons.map(season => ({
        ...season,
        categories: normalizeCategoriesFromSeason(season)
      }));

      // Filter seasons by gender
      const genderFilteredSeasons = normalizedSeasons.filter(season => {
        if (!season.categories || !Array.isArray(season.categories) || season.categories.length === 0) {
          return false;
        }

        return season.categories.some(category =>
          category && isCategoryVisibleToUser(category)
        );
      });

      setSeasons(normalizedSeasons);

      // Extract unique categories from gender-filtered seasons
      const availableCategoriesMap = new Map<string, Category>();
      genderFilteredSeasons.forEach(season => {
        if (season.categories && Array.isArray(season.categories)) {
          season.categories.forEach(category => {
            if (category && category.id && isCategoryVisibleToUser(category)) {
              if (!availableCategoriesMap.has(category.id)) {
                availableCategoriesMap.set(category.id, category as Category);
              }
            }
          });
        }
      });

      const availableCategories = Array.from(availableCategoriesMap.values());

      // Sort categories by categoryOrder if available
      availableCategories.sort((a, b) => {
        const orderA = (a as any).categoryOrder || 0;
        const orderB = (b as any).categoryOrder || 0;
        return orderA - orderB;
      });

      setCategories(availableCategories);
    } catch (err) {
      console.error('Error fetching league data:', err);
      setError('Failed to load league details');
    } finally {
      setIsLoading(false);
    }
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
