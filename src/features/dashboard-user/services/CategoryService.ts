import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';

export interface Category {
  id: string;
  leagueId?: string;
  name?: string;
  genderRestriction: 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN';
  matchFormat?: string;
  maxPlayers?: number;
  maxTeams?: number;
  game_type?: 'SINGLES' | 'DOUBLES';
  gameType?: 'SINGLES' | 'DOUBLES'; 
  gender_category?: 'MALE' | 'FEMALE' | 'MIXED';
  genderCategory?: 'MALE' | 'FEMALE' | 'MIXED'; 
  isActive: boolean;
  categoryOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryResponse {
  success: boolean;
  statusCode: number;
  data: {
    categories: Category[];
  };
  message: string;
}

export class CategoryService {
  // fetch categories for a specific league
  static async fetchLeagueCategories(leagueId: string): Promise<Category[]> {
    try {
      const backendUrl = getBackendBaseURL();
      console.log('CategoryService: Fetching categories for league:', leagueId);
      console.log('CategoryService: API URL:', `${backendUrl}/api/category/league/${leagueId}`);

      const response = await authClient.$fetch(`${backendUrl}/api/category/league/${leagueId}`, {
        method: 'GET',
      });

      console.log('CategoryService: Raw API response:', response);

      if (response && typeof response === 'object') {
        const apiResponse = response as any;
        
        console.log('CategoryService: Debug - response structure:', {
          hasSuccess: 'success' in apiResponse,
          hasData: 'data' in apiResponse,
          hasError: 'error' in apiResponse,
          dataType: typeof apiResponse.data,
          dataKeys: apiResponse.data ? Object.keys(apiResponse.data) : 'no data'
        });
        
        // handle the authClient.$fetch wrapped response structure
        if (apiResponse.data && apiResponse.data.success && apiResponse.data.data) {
          // Response is wrapped: { data: { success: true, data: [categories], message: "..." }, error: null }
          if (Array.isArray(apiResponse.data.data)) {
            console.log('CategoryService: Successfully fetched categories (wrapped):', apiResponse.data.data.length);
            return apiResponse.data.data.filter((category: Category) => category.isActive);
          }
        }
        
        // handle direct ApiResponse structure (from backend controller)
        if (apiResponse.success && Array.isArray(apiResponse.data)) {
          console.log('CategoryService: Successfully fetched categories (direct):', apiResponse.data.length);
          return apiResponse.data.filter((category: Category) => category.isActive);
        }
      }

      console.warn('CategoryService: No categories found or invalid response');
      return [];
    } catch (error) {
      console.error('CategoryService: Error fetching categories:', error);
      return [];
    }
  }

  // get display name for category based on gender restriction and game type
  static getCategoryDisplayName(category: Category, gameType: 'SINGLES' | 'DOUBLES'): string {
    const { genderRestriction, name, game_type, gameType: gameTypeCamel, gender_category, genderCategory } = category;
    
    // use custom name if provided
    if (name) {
      return name;
    }
    
    // use game_type or gameType from category if available, otherwise use the passed gameType
    const effectiveGameType = game_type || gameTypeCamel || gameType;
    
    // use gender_category or genderCategory if available, otherwise fall back to genderRestriction
    const effectiveGender = gender_category || genderCategory || genderRestriction;
    
    if (effectiveGameType === 'SINGLES') {
      switch (effectiveGender) {
        case 'MALE':
          return "Men's Singles";
        case 'FEMALE':
          return "Women's Singles";
        case 'MIXED':
          return "Mixed Singles";
        case 'OPEN':
          return "Open Singles";
        default:
          return "Singles";
      }
    } else {
      switch (effectiveGender) {
        case 'MALE':
          return "Men's Doubles";
        case 'FEMALE':
          return "Women's Doubles";
        case 'MIXED':
          return "Mixed Doubles";
        case 'OPEN':
          return "Open Doubles";
        default:
          return "Doubles";
      }
    }
  }

  // get emoji for category based on gender restriction
  static getCategoryEmoji(genderRestriction: string): string {
    switch (genderRestriction) {
      case 'MALE':
        return '👤';
      case 'FEMALE':
        return '👩';
      case 'MIXED':
        return '👥';
      case 'OPEN':
        return '👤';
      default:
        return '👤';
    }
  }

  // filter categories based on game type and other criteria
  // updated to show all categories instead of filtering by game type
  static filterCategoriesByGameType(categories: Category[], gameType: 'SINGLES' | 'DOUBLES'): Category[] {
    // Return all active categories - don't filter by game type
    // The game type filtering should be handled at the UI level, not here
    return categories.filter(category => category.isActive);
  }

  // get effective gender for display purposes
  static getEffectiveGender(category: Category): 'MALE' | 'FEMALE' | 'MIXED' | 'OPEN' {
    return category.gender_category || category.genderCategory || category.genderRestriction;
  }

  // get effective game type for display purposes
  static getEffectiveGameType(category: Category, fallbackGameType: 'SINGLES' | 'DOUBLES'): 'SINGLES' | 'DOUBLES' {
    // Check both snake_case (game_type) and camelCase (gameType) for backward compatibility
    return category.game_type || category.gameType || fallbackGameType;
  }
}
