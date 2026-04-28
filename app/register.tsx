import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { SignUpScreen, SignUpData } from '@/src/features/auth/screens/SignUpScreen';
import { authClient } from '@/lib/auth-client';
import { signInWithNativeOAuth } from '@/lib/native-social-auth';
import { toast } from 'sonner-native';
import { AuthStorage } from '@/src/core/storage';
import { useEmailVerificationStore } from '@/src/stores/emailVerificationStore';

export default function RegisterRoute() {
  const router = useRouter();
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const { setEmail: storeEmail } = useEmailVerificationStore();

  const handleSignUp = async (data: SignUpData) => {
    try {
      if (__DEV__) {
        console.log('📱 Register Route - Received signup data:', {
          email: data.email,
          username: data.username,
          password: '***'
        });
      }

      const signupPayload = {
        email: data.email,
        password: data.password,
        name: data.username,
        username: data.username,
        phoneNumber: '',
      };

      if (__DEV__) {
        console.log('📤 Register Route:', {
          ...signupPayload,
          password: '***'
        });
      }

      // Better Auth returns { data, error } - must check error explicitly
      const result = await authClient.signUp.email(signupPayload);

      if (__DEV__) {
        console.log('📥 Register Route - Signup result:', {
          hasData: !!result.data,
          hasError: !!result.error,
          error: result.error
        });
      }

      // Check for errors (including duplicate email)
      if (result.error) {
        if (__DEV__) console.error('Sign up error:', result.error);
        const errorMessage = result.error.message || 'Sign up failed';
        const errorMsg = errorMessage.toLowerCase();

        // Duplicate email/user — better-auth codes:
        // USER_ALREADY_EXISTS → "User already exists."
        // USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL → "User already exists. Use another email."
        if (
          errorMsg.includes('user already exists') ||
          (errorMsg.includes('email') && (errorMsg.includes('exist') || errorMsg.includes('already') || errorMsg.includes('taken')))
        ) {
          toast.error('Email already registered', {
            description: 'An account with this email already exists. Please log in instead.',
          });
          return;
        }
        // Duplicate username
        if (errorMsg.includes('username') && (errorMsg.includes('exist') || errorMsg.includes('taken') || errorMsg.includes('already'))) {
          toast.error('Username taken', {
            description: 'That username is already in use. Please choose a different one.',
          });
          return;
        }
        // Password too short/long — better-auth codes:
        // PASSWORD_TOO_SHORT → "Password too short"
        // PASSWORD_TOO_LONG → "Password too long"
        if (
          errorMsg.includes('password too short') ||
          errorMsg.includes('password too long') ||
          (errorMsg.includes('password') && (errorMsg.includes('weak') || errorMsg.includes('short') || errorMsg.includes('long') || errorMsg.includes('requirement') || errorMsg.includes('invalid')))
        ) {
          toast.error('Password requirements not met', {
            description: errorMsg.includes('too long')
              ? 'Your password is too long. Please use a shorter password.'
              : 'Your password is too short. Please use at least 8 characters.',
          });
          return;
        }
        // Invalid email format — better-auth code: INVALID_EMAIL → "Invalid email"
        if (errorMsg.includes('invalid email') || errorMsg.includes('email format') || errorMsg.includes('valid email')) {
          toast.error('Invalid email address', {
            description: 'Please enter a valid email address (e.g. name@example.com).',
          });
          return;
        }
        // Rate limiting
        if (errorMsg.includes('too many') || (result.error as any)?.status === 429) {
          toast.error('Too many attempts', {
            description: 'Too many sign-up attempts from this device. Please wait a few minutes and try again.',
          });
          return;
        }
        // Fallback — surface the raw better-auth message
        toast.error('Sign up failed', { description: errorMessage });
        return;
      }

      // Mark that user has registered (so they see login screen on return, not landing)
      await AuthStorage.markLoggedIn();

      // Note: better-auth automatically sends verification email during signup
      // via the sendVerificationOTP callback configured in auth.ts
      if (__DEV__) console.log('✅ Register Route - Account created, verification email sent automatically by better-auth');

      toast.success('Account created! Please check your email to verify.');
      // Store email securely (not in URL) and navigate
      storeEmail(data.email);
      router.push('/verifyEmail');
    } catch (error: any) {
      if (__DEV__) console.error('Sign up failed:', error);
      
      const errorMsg = error?.message?.toLowerCase() || '';
      const status = error?.status;
      const isNetworkError =
        errorMsg.includes('network') ||
        errorMsg.includes('fetch') ||
        errorMsg.includes('failed to connect') ||
        errorMsg.includes('econnrefused') ||
        errorMsg.includes('connection');
      
      if (isNetworkError || status === 'failed to connect' || status === 'ECONNREFUSED') {
        toast.error('Unable to connect to server', {
          description: 'Please check your internet connection and try again.',
        });
        return;
      }
      
      if (status === 500 || status === 'internal server error') {
        toast.error('Server error', {
          description: "We're having trouble creating your account. Please try again in a few minutes.",
        });
        return;
      }
      
      if (status === 0 || !status) {
        toast.error('Unable to connect to server', {
          description: 'Please check your internet connection.',
        });
        return;
      }

      toast.error('Sign up failed', {
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    }
  };

  const handleLogin = () => {
    router.replace('/login');
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    if (isSocialLoading) return;

    try {
      setIsSocialLoading(true);
      const result = await signInWithNativeOAuth(provider);
      if (result) {
        router.replace(result.nextRoute);
      }
    } catch (error: any) {
      console.error('Social sign-up error:', error);
      const errorMsg = error?.message?.toLowerCase() || '';
      const isNetworkError = errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection');
      
      if (isNetworkError) {
        toast.error('Unable to connect', {
          description: 'Please check your internet connection and try again.',
        });
      } else {
        toast.error(error.message || 'Social sign-up failed. Please try again.');
      }
    } finally {
      setIsSocialLoading(false);
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
