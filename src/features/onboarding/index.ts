/**
 * Onboarding Module Index
 * 
 * Main entry point for the onboarding module. This file exports everything
 * needed to use the onboarding functionality throughout the application.
 * 
 * Usage:
 * ```typescript
 * import { 
 *   PersonalInfoScreen, 
 *   OnboardingProvider, 
 *   SportType 
 * } from '@/onboarding';
 * ```
 */

// ============================================================================
// SCREENS
// ============================================================================
export * from './screens';

// ============================================================================
// COMPONENTS
// ============================================================================
export * from './components';

// ============================================================================
// SERVICES
// ============================================================================
export {
  PickleballQuestionnaire,
  TennisQuestionnaire,
  PadelQuestionnaire,
} from './services';

// ============================================================================
// CONTEXT & PROVIDERS
// ============================================================================
export { OnboardingProvider, useOnboarding } from './OnboardingContext';

// ============================================================================
// TYPES
// ============================================================================
export * from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Order of onboarding screens
 */
export const ONBOARDING_FLOW = [
  'personal-info',
  'location', 
  'game-select',
  'skill-assessment',
  'assessment-results',
  'profile-picture'
] as const;

/**
 * Available sports for selection
 */
export const AVAILABLE_SPORTS = ['pickleball', 'tennis', 'padel'] as const;

/**
 * Default onboarding configuration
 */
export const ONBOARDING_CONFIG = {
  allowSkipSteps: false,
  requireAllSportsAssessment: true,
  maxSportsSelection: 3,
  minAge: 13,
} as const;