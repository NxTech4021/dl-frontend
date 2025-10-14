// Export all authentication screens
export { LoadingScreen } from './screens/LoadingScreen';
export { LoginScreen } from './screens/LoginScreen';
export { SignUpScreen, type SignUpData } from './screens/SignUpScreen';
export { VerificationScreen } from './screens/VerificationScreen';
export { SplashScreen } from './screens/SplashScreen';

// Export authentication components
export {
  StatusBar,
  HomeIndicator,
  Logo,
  InputField,
  // PhoneInput,
  CircleArrowButton,
  PrimaryButton,
  SocialButton,
  LinkText,
  BackButton,
  GradientBackground,
  VerificationInput,
} from './components/AuthComponents';

// Export authentication styles
export { AuthStyles, AuthColors, AuthTypography } from './styles/AuthStyles';