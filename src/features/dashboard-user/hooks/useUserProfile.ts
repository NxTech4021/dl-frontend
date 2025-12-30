import { useState, useEffect, useCallback, useRef } from 'react';
import { questionnaireAPI } from '@/src/features/onboarding/services/api';
import { getBackendBaseURL } from '@/src/config/network';
import { authClient } from '@/lib/auth-client';

/**
 * Custom hook to manage user profile data and gender
 *
 * @param userId - The ID of the current user
 * @returns Profile data, user gender, and fetch function
 */
export const useUserProfile = (userId: string | undefined) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [userGender, setUserGender] = useState<string | null | undefined>(undefined);

  // Use ref to store the last fetched gender to preserve it during refresh
  const lastKnownGender = useRef<string | null>(null);

  // Fetch user gender (can be called externally for refresh)
  const fetchUserGender = useCallback(async () => {
    if (!userId) {
      // If no userId, explicitly set to null so data fetching can proceed
      setUserGender(null);
      return;
    }

    try {
      const { user } = await questionnaireAPI.getUserProfile(userId);
      const gender = user.gender?.toUpperCase() || null;
      lastKnownGender.current = gender;
      setUserGender(gender);
    } catch (error) {
      console.error('Error fetching user gender:', error);
      // On error, use last known gender if available, otherwise set to null
      setUserGender(lastKnownGender.current ?? null);
    }
  }, [userId]);

  // Fetch user profile data from /api/player/profile/me
  const fetchProfileData = useCallback(async () => {
    if (!userId) {
      setProfileData(null);
      return;
    }

    try {
      const backendUrl = getBackendBaseURL();
      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
        method: 'GET',
      });
      if (authResponse && (authResponse as any).data && (authResponse as any).data.data) {
        const data = (authResponse as any).data.data;
        setProfileData(data);

        // Also update gender from profile data if available
        if (data.gender) {
          const gender = data.gender.toUpperCase();
          lastKnownGender.current = gender;
          setUserGender(gender);
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setProfileData(null);
    }
  }, [userId]);

  // Fetch user gender on mount
  useEffect(() => {
    fetchUserGender();
  }, [fetchUserGender]);

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  return {
    profileData,
    userGender,
    fetchProfileData,
    fetchUserGender,
  };
};
