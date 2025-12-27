/**
 * Main Source Index
 * 
 * Central export point for the entire source directory.
 * This enables clean imports throughout the application.
 */

// Features (excluding ProgressIndicator to avoid conflict with shared/components/ui)
export {
  // Screens
  PersonalInfoScreen,
  LocationScreen,
  GameSelectScreen,
  SkillAssessmentScreen,
  AssessmentResultsScreen,
  ProfilePictureScreen,
  // Components
  BackgroundGradient,
  SportButton,
  DeuceLogo,
  BackButton,
  ConfirmButton,
  CircularImageCropper,
  OptionButton,
  NumberInput,
  QuestionContainer,
  // Context
  OnboardingProvider,
  useOnboarding,
  // Constants
  ONBOARDING_FLOW,
  AVAILABLE_SPORTS,
  ONBOARDING_CONFIG,
} from './features/onboarding';

// Shared
export * from './shared/types';
export * from './shared/components/ui';
export * from './shared/components/forms';
export * from './shared/components/layout';

// Core
export * from './core/config';