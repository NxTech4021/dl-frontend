import { useState, useEffect } from 'react';
import { Season } from '../services/SeasonService';
import { Category } from '../services/CategoryService';

/**
 * Custom hook to manage season selection state
 *
 * @param categories - Available categories for selection
 * @returns Selected category ID, selected season, and setter functions
 */
export const useSeasonSelection = (categories: Category[]) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);

  // Set default selected category when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  return {
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSeason,
    setSelectedSeason,
  };
};
