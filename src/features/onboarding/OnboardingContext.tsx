import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { OnboardingData, SportType, GenderType, SkillAssessmentResult } from './types';
import { OnboardingStorage } from '@core/storage';
import { useSession } from '@/lib/auth-client';
import { questionnaireAPI } from './services/api';

// Re-export types for convenience
export type { OnboardingData, SportType, GenderType, SkillAssessmentResult };

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  clearData: () => void;
  isLoading: boolean;
  saveProgress: () => Promise<void>;
}

const initialData: OnboardingData = {
  fullName: '',
  gender: null,
  dateOfBirth: null,
  location: '',
  useCurrentLocation: false,
  latitude: undefined,
  longitude: undefined,
  selectedSports: [],
  skillAssessments: {},
  profileImage: undefined,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const { data: session } = useSession();

  // Load data from local storage first, then fetch from backend if needed
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        setIsLoading(true);
        const storedData = await OnboardingStorage.loadData<OnboardingData>();

        if (storedData && storedData.fullName) {
          // We have local data, use it
          console.log('OnboardingContext: Loaded data from local storage');
          setData({ ...initialData, ...storedData });
        } else if (session?.user?.id) {
          // No local data, try to fetch from backend
          console.log('OnboardingContext: No local data, fetching from backend...');
          try {
            const profileResponse = await questionnaireAPI.getUserProfile(session.user.id);
            if (profileResponse.success && profileResponse.user) {
              const backendData: Partial<OnboardingData> = {};

              if (profileResponse.user.name) {
                backendData.fullName = profileResponse.user.name;
              }
              if (profileResponse.user.gender) {
                backendData.gender = profileResponse.user.gender as GenderType;
              }
              if (profileResponse.user.dateOfBirth) {
                backendData.dateOfBirth = new Date(profileResponse.user.dateOfBirth);
              }
              if (profileResponse.user.area) {
                backendData.location = profileResponse.user.area;
              }

              if (Object.keys(backendData).length > 0) {
                console.log('OnboardingContext: Loaded profile from backend:', backendData);
                const mergedData = { ...initialData, ...backendData };
                setData(mergedData);
                // Save to local storage for future use
                await OnboardingStorage.saveData(mergedData);
              }
            }
          } catch (backendError) {
            console.error('Failed to fetch profile from backend:', backendError);
          }
        }
      } catch (error) {
        console.error('Failed to load onboarding data:', error);
        // Continue with initial data if loading fails
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, [session?.user?.id]);

  const updateData = async (updates: Partial<OnboardingData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    
    // Auto-save to storage
    try {
      await OnboardingStorage.saveData(newData);
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      // Continue despite save failure
    }
  };

  const clearData = async () => {
    setData(initialData);
    try {
      await OnboardingStorage.clearData();
      await OnboardingStorage.clearProgress();
    } catch (error) {
      console.error('Failed to clear onboarding data:', error);
    }
  };

  const saveProgress = async () => {
    try {
      const completedSteps: string[] = [];
      
      // Determine completed steps based on data
      if (data.fullName && data.gender && data.dateOfBirth) {
        completedSteps.push('personal-info');
      }
      if (data.location || (data.useCurrentLocation && data.latitude && data.longitude)) {
        completedSteps.push('location');
      }
      if (data.selectedSports.length > 0) {
        completedSteps.push('game-select');
      }
      if (Object.keys(data.skillAssessments).length > 0) {
        completedSteps.push('skill-assessment');
      }
      if (data.profileImage) {
        completedSteps.push('profile-picture');
      }

      await OnboardingStorage.saveProgress({
        currentStep: completedSteps[completedSteps.length - 1] || 'personal-info',
        completedSteps,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  return (
    <OnboardingContext.Provider value={{ 
      data, 
      updateData, 
      clearData, 
      isLoading, 
      saveProgress 
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};