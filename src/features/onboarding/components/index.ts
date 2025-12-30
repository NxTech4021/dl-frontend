/**
 * Onboarding Components Index
 * 
 * Central export point for all onboarding-related components.
 * This provides clean imports throughout the application.
 */

// Core UI Components
export { default as BackgroundGradient } from './BackgroundGradient';
export { default as SportButton } from './SportButton';
export { default as DeuceLogo } from './DeuceLogo';
export { default as BackButton } from './BackButton';
export { default as ConfirmButton } from './ConfirmButton';
export { default as CircularImageCropper } from './CircularImageCropper';
export { default as ProgressIndicator } from './ProgressIndicator';

// Form Components
export { default as OptionButton } from './OptionButton';
export { default as NumberInput } from './NumberInput';
export { default as QuestionContainer } from './QuestionContainer';

// Re-export shared components
export { InputField, GenderSelector, DatePicker } from '@shared/components/forms';
export { PrimaryButton } from '@shared/components/ui';