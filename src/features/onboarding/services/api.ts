// API service for questionnaires
import { getBackendBaseURL } from '../../../config/network';

const BASE_URL = getBackendBaseURL();

export interface QuestionOption {
  label: string;
  weight?: number;
  value?: boolean | number;
}

export interface Question {
  key: string;
  question: string;
  type: 'single_choice' | 'number' | 'skill_matrix';
  options?: QuestionOption[];
  subQuestions?: {
    [key: string]: {
      question: string;
      options: QuestionOption[];
    };
  };
  min?: number;
  max?: number;
  step?: number;
  optional?: boolean;
  helptext?: string;
  visible_if?: {
    key: string;
    op: string;
    value: any;
  }[];
}

export interface QuestionnaireData {
  sport: string;
  version: number;
  questions: Question[];
}

export interface QuestionnaireResponse {
  [key: string]: string | number | { [key: string]: string };
}

export interface RatingResult {
  source: string;
  singles: number;
  doubles: number;
  rd: number;
  confidence: string;
  detail?: any;
}

export interface SubmissionResult {
  responseId: number;
  version: number;
  qHash: string;
  result: RatingResult;
  sport: string;
  success: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  gender?: string;
  dateOfBirth?: string;
  area?: string;
  createdAt: string;
}

export interface UserProfileUpdate {
  name: string;
  gender: 'male' | 'female';
  dateOfBirth: string;
}

export interface UserLocationUpdate {
  city: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationSearchResult {
  id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  types: string[];
  // Optional structured address components from backend
  components?: {
    suburb?: string;
    city?: string;
    postcode?: string;
    state?: string;
  };
  // Raw address details if provided
  address?: any;
}

export interface LocationSearchResponse {
  success: boolean;
  results: LocationSearchResult[];
  query: string;
  count: number;
}

export interface ReverseGeocodeResponse {
  success: boolean;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address_details?: any;
  components?: {
    country: string;
    state: string;
    city: string;
  };
}

export class QuestionnaireAPI {
  private readonly getAuthHeaders = async () => {
    return {
      'Content-Type': 'application/json',
      // Add authorization header if needed in the future
    };
  };

  async getQuestionnaire(sport: string): Promise<QuestionnaireData> {
    try {
      const response = await fetch(`${BASE_URL}/api/onboarding/${sport}/questions`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch questionnaire: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching questionnaire:', error);
      throw error;
    }
  }

  async submitQuestionnaire(sport: string, answers: QuestionnaireResponse, userId: string): Promise<SubmissionResult> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/${sport}/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: userId,
          answers
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to submit questionnaire: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      throw error;
    }
  }

  async getUserResponses(userId: string): Promise<{ responses: any[]; success: boolean }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/responses/${userId}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch responses: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user responses:', error);
      throw error;
    }
  }

  async getSportResponse(sport: string, userId: string): Promise<{ response: any; success: boolean } | null> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/responses/${userId}/${sport}`, {
        headers
      });
      
      if (response.status === 404) {
        return null; // No response found for this sport
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sport response: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching sport response:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, profileData: UserProfileUpdate): Promise<{ user: UserProfile; success: boolean }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/profile/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update profile: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<{ user: UserProfile; success: boolean }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/profile/${userId}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch profile: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async saveUserLocation(userId: string, locationData: UserLocationUpdate): Promise<{ success: boolean; location: any }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/location/${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(locationData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save location: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving user location:', error);
      throw error;
    }
  }

  async searchLocations(query: string, limit: number = 10): Promise<LocationSearchResponse> {
    try {
      if (!query || query.trim().length < 2) {
        throw new Error('Query must be at least 2 characters long');
      }

      const headers = await this.getAuthHeaders();
      const url = `${BASE_URL}/api/onboarding/locations/search?q=${encodeURIComponent(query.trim())}&limit=${limit}`;

      console.log('🔍 Location search URL:', url);
      console.log('🌐 Base URL:', BASE_URL);
      
      const response = await fetch(url, {
        headers
      });
      
      console.log('📡 Location search response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Location search error response:', errorData);
        throw new Error(errorData.error || `Failed to search locations: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Location search success:', data);
      return data;
    } catch (error) {
      console.error('❌ Error searching locations:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query,
        limit,
        baseURL: BASE_URL
      });
      throw error;
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${BASE_URL}/api/locations/reverse-geocode?lat=${latitude}&lng=${longitude}`;
      
      console.log('🌐 Reverse geocoding URL:', url);
      console.log('🌐 Base URL:', BASE_URL);
      
      const response = await fetch(url, {
        headers
      });
      
      console.log('📡 Reverse geocoding response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Reverse geocoding error response:', errorData);
        throw new Error(errorData.error || `Failed to reverse geocode: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Reverse geocoding success:', data);
      return data;
    } catch (error) {
      console.error('❌ Error reverse geocoding:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        latitude,
        longitude,
        baseURL: BASE_URL
      });
      throw error;
    }
  }

  async completeOnboarding(userId: string): Promise<{ success: boolean; message: string; completedOnboarding: boolean }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();

      const response = await fetch(`${BASE_URL}/api/onboarding/complete/${userId}`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to complete onboarding: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  async updateOnboardingStep(userId: string, step: string): Promise<{ success: boolean; onboardingStep: string }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const validSteps = [
        'PERSONAL_INFO',
        'LOCATION',
        'GAME_SELECT',
        'SKILL_ASSESSMENT',
        'ASSESSMENT_RESULTS',
        'PROFILE_PICTURE',
      ];

      if (!validSteps.includes(step)) {
        throw new Error(`Invalid step: ${step}. Must be one of: ${validSteps.join(', ')}`);
      }

      const headers = await this.getAuthHeaders();

      const response = await fetch(`${BASE_URL}/api/onboarding/step/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ step })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update onboarding step: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  async getAssessmentStatus(userId: string): Promise<{ hasCompletedAssessment: boolean; assessmentCount: number; success: boolean }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/assessment-status/${userId}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get assessment status: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting assessment status:', error);
      throw error;
    }
  }

  async saveSports(userId: string, sports: string[]): Promise<{ success: boolean; message: string; sports: string[] }> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!Array.isArray(sports) || sports.length === 0) {
        throw new Error('Sports array is required and must not be empty');
      }

      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${BASE_URL}/api/onboarding/sports/${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sports })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save sports: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving sports:', error);
      throw error;
    }
  }
}

export const questionnaireAPI = new QuestionnaireAPI();
