/**
 * Normalizes category data from a season object
 *
 * Handles both singular `category` and plural `categories` fields for backward compatibility
 *
 * @param season - Season object that may have either `category` (singular) or `categories` (plural)
 * @returns Normalized array of categories
 *
 * @example
 * // Season with singular category
 * const season = { id: '1', category: { id: 'cat1', name: 'Singles' } };
 * normalizeCategoriesFromSeason(season); // [{ id: 'cat1', name: 'Singles' }]
 *
 * @example
 * // Season with plural categories
 * const season = { id: '1', categories: [{ id: 'cat1', name: 'Singles' }] };
 * normalizeCategoriesFromSeason(season); // [{ id: 'cat1', name: 'Singles' }]
 */
export const normalizeCategoriesFromSeason = (season: any): any[] => {
  const category = season.category;
  const categories = season.categories || (category ? [category] : []);
  return Array.isArray(categories) ? categories : [categories].filter(Boolean);
};
