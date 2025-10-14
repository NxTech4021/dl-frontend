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
    router.replace('/login');
  };

  const handleSocialSignUp = (provider: 'facebook' | 'google' | 'apple') => {
    // TODO: Implement social sign up
    toast.info(`${provider} sign up coming soon!`);
  };

  return (
    <SignUpScreen
      onSignUp={handleSignUp}
      onLogin={handleLogin}
      onSocialSignUp={handleSocialSignUp}
    />
  );
}