import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';

/**
 * ProfileDataService - Handles all API calls for profile data
 *
 * CRITICAL: This service preserves the exact API call patterns, error handling,
 * and fallback mechanisms from the original profile.tsx implementation.
 * DO NOT modify the authentication patterns or response handling logic.
 */
export class ProfileDataService {
  /**
   * Fetch user achievements from backend
   * Preserves exact error handling and fallback patterns from original implementation
   */
  static async fetchAchievements(session: any): Promise<any[]> {
    try {
      if (!session?.user?.id) {
        console.log('No session user ID available for achievements');
        return [];
      }

      const backendUrl = getBackendBaseURL();
      console.log('Fetching achievements from:', `${backendUrl}/api/player/profile/achievements`);

      const response = await authClient.$fetch(`${backendUrl}/api/player/profile/achievements`, {
        method: 'GET',
      });

      console.log('Achievements API response:', response);

      const data = response as { data?: { achievements?: any[] } };
      if (data?.data?.achievements) {
        console.log('Setting achievements data:', data.data.achievements);
        return data.data.achievements;
      } else {
        console.log('No achievements data found, setting empty array');
        return [];
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast.error('Error', {
        description: 'Failed to load achievements. Please try again.',
      });
      return []; // Set empty array on error
    }
  }

  /**
   * Fetch user profile data from backend
   * Preserves exact response parsing logic from original implementation
   */
  static async fetchProfileData(session: any): Promise<any | null> {
    try {
      if (!session?.user?.id) {
        console.log('No session user ID available');
        return null;
      }

      console.log('Current session:', session);

      const backendUrl = getBackendBaseURL();
      console.log('Fetching profile data from:', `${backendUrl}/api/player/profile/me`);

      // Use authClient.$fetch as primary method for better session handling
      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
        method: 'GET',
      });

      console.log('Profile API response:', authResponse);

      const data = authResponse as { data?: { data?: any } & any };
      if (data?.data?.data) {
        console.log('Setting profile data:', data.data.data);
        return data.data.data;
      } else if (data?.data) {
        console.log('Setting profile data (direct):', data.data);
        return data.data;
      } else {
        console.error('No profile data received from authClient');
        return null;
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Error', {
        description: 'Failed to load profile data. Please try again.',
      });
      return null;
    }
  }

  /**
   * Fetch match history from backend
   * Preserves exact dual fallback strategy from original implementation
   */
  static async fetchMatchHistory(session: any): Promise<any[]> {
    try {
      if (!session?.user?.id) return [];

      const backendUrl = getBackendBaseURL();
      console.log('Fetching match history from:', `${backendUrl}/api/player/profile/matches`);

      // Use authClient's internal fetch method for proper session handling
      const response = await authClient.$fetch(`${backendUrl}/api/player/profile/matches`, {
        method: 'GET',
      });

      console.log('Match history data received:', response);

      const data = response as unknown as { data?: any[]; error?: { status?: number } };
      if (data?.data) {
        return data.data;
      } else if (data?.error?.status === 404) {
        console.log('No match history found for user (404) - this is normal for new users');
        return [];
      } else {
        console.error('No match history data received');
        return [];
      }
    } catch (error) {
      console.error('Error fetching match history:', error);
      toast.error('Error', {
        description: 'Failed to load match history. Please try again.',
      });

      // Fallback to regular fetch with proper headers if authClient.$fetch fails
      try {
        const backendUrl = getBackendBaseURL();
        const response = await fetch(`${backendUrl}/api/player/profile/matches`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          return result.data || [];
        } else if (response.status === 404) {
          console.log('No match history found (fallback 404) - normal for new users');
          return [];
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError);
        return []; // Set empty array as final fallback
      }
    }

    return [];
  }

  /**
   * Load all profile data with exact error handling from original
   * Preserves the loading state management and toast notifications
   */
  static async loadAllProfileData(
    session: any,
    hasLoadedBefore: boolean
  ): Promise<{
    profileData: any | null;
    achievements: any[];
    matchHistory: any[];
  }> {
    try {
      // Fetch profile data and achievements in parallel
      const [profileData, achievements] = await Promise.all([
        this.fetchProfileData(session),
        this.fetchAchievements(session),
        // Note: fetchMatchHistory is commented out until match system is ready
        // this.fetchMatchHistory(session)
      ]);

      // Show success toast only if this is a refresh (not initial load)
      if (hasLoadedBefore) {
        toast.success('Profile Updated', {
          description: 'Your profile data has been refreshed.',
        });
      }

      return {
        profileData,
        achievements,
        matchHistory: [], // Empty until match system is ready
      };
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Error', {
        description: 'Failed to load profile data. Please try again.',
      });

      return {
        profileData: null,
        achievements: [],
        matchHistory: [],
      };
    }
  }
}