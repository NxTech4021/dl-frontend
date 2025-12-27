import React from 'react';
import { useRouter } from 'expo-router';
import { SignUpScreen, SignUpData } from '@/src/features/auth/screens/SignUpScreen';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner-native';

export default function RegisterRoute() {
  const router = useRouter();

  const handleSignUp = async (data: SignUpData) => {
    try {
      console.log('📱 Register Route - Received signup data:', {
        email: data.email,
        username: data.username,
        // phone: data.phone,
        password: '***'
      });
      
      const signupPayload = {
        email: data.email,
        password: data.password,
        name: data.username,
        username: data.username, // Add username field
        phoneNumber: '', // Phone number is optional, set to empty string
      };
      
      console.log('📤 Register Route:', {
        ...signupPayload,
        password: '***'
      });
      
      await authClient.signUp.email(signupPayload);
      toast.success('Account created! Please check your email to verify.');
      router.push(`/verifyEmail?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      console.error('Sign up failed:', error);
      toast.error('Sign up failed. Please try again.');
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleSocialSignUp = async (provider: 'facebook' | 'google' | 'apple') => {
    try {
      // Only Google is currently configured
      if (provider !== 'google') {
        toast.info(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-up coming soon!`);
        return;
      }

      console.log(`Social sign-up with ${provider}`);

      // Social sign-in automatically creates account if user doesn't exist
      const result = await authClient.signIn.social({
        provider,
        callbackURL: '/onboarding/personal-info', // New users go to onboarding
      });

      console.log('Social sign-up result:', result);

      if (result.error) {
        console.error('Social sign-up failed:', result.error);
        toast.error(result.error.message || 'Social sign-up failed. Please try again.');
      }
      // Success handling is done via the callbackURL redirect
    } catch (error: any) {
      console.error('Social sign-up error:', error);
      toast.error(error.message || 'Social sign-up failed. Please try again.');
    }
  };

  return (
    <SignUpScreen
      onSignUp={handleSignUp}
      onLogin={handleLogin}
      onSocialSignUp={handleSocialSignUp}
    />
  );
}