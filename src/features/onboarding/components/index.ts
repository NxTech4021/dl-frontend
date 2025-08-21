/**
 * Onboarding Components Index
 * 
 * Central export point for all onboarding-related components.
 * This provides clean imports throughout the application.
 */

// Core UI Components
export { default as BackgroundGradient } from './BackgroundGradient';
export { default as SportButton } from './SportButton';

// Form Components
export { default as OptionButton } from './OptionButton';
export { default as NumberInput } from './NumberInput';
export { default as QuestionContainer } from './QuestionContainer';

// Re-export shared components
export { InputField, GenderSelector, DatePicker } from '@shared/components/forms';
export { PrimaryButton } from '@shared/components/ui';

// Component Types
export type { SportType } from '../types';