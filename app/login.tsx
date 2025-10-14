import React from 'react';
import { useRouter } from 'expo-router';
import { LoginScreen } from '@/src/features/auth/screens/LoginScreen';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner-native';

export default function LoginRoute() {
  const router = useRouter();

  const handleLogin = async (emailOrUsername: string, password: string) => {
    try {
      console.log('Login attempt with:', emailOrUsername);
      
      // Check if input looks like an email (contains @)
      const isEmail = emailOrUsername.includes('@');
      
      let result;
      if (isEmail) {
        console.log('Attempting email login');
        result = await authClient.signIn.email({
          email: emailOrUsername,
          password: password,
        });
      } else {
        console.log('Attempting username login');
        result = await authClient.signIn.username({
          username: emailOrUsername,
          password: password,
        });
      }
      
      console.log('Login result:', result);
      
      if (result.data) {
        console.log('Login successful, checking session...');
        
        // Wait a moment for session to be established
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check session after login
        const sessionCheck = await authClient.getSession();
        console.log('Session after login:', sessionCheck);
        
        if (sessionCheck.data) {
          console.log('Session confirmed, redirecting to dashboard');
        } else {
          console.error('Session not established after login');
          toast.error('Session not established. Please try again.');
        }
      } else {
        console.error('Login failed:', result.error);
        toast.error(result.error?.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
    }
  };

  const handleSignUp = () => {
    router.replace('/register');
  };

  const handleForgotPassword = () => {
    router.push('/resetPassword');
  };

  const handleSocialLogin = (provider: 'facebook' | 'google' | 'apple') => {
    console.log(`Social login with ${provider} - not implemented yet`);
    // TODO: Implement social login functionality
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onSignUp={handleSignUp}
      onForgotPassword={handleForgotPassword}
      onSocialLogin={handleSocialLogin}
    />
  );
}