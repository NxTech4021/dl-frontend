import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useOnboarding } from '../OnboardingContext';
import { InputField, GenderSelector, DatePicker } from '@shared/components/forms';
import { DeuceLogo, ConfirmButton, ProgressIndicator } from '../components';
import { LoadingSpinner } from '@shared/components/ui';
import { validateFullName, validateGender, validateDateOfBirth } from '../utils/validation';
import { questionnaireAPI } from '../services/api';
import { useSession } from '../../../../lib/auth-client';
import { toast } from 'sonner-native';

const PersonalInfoScreen = () => {
  const { data, updateData, isLoading } = useOnboarding();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    fullName: data.fullName || '',
    gender: data.gender || null,
    dateOfBirth: data.dateOfBirth || null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Update context when form data changes
  useEffect(() => {
    updateData({
      fullName: formData.fullName,
      gender: formData.gender,
      dateOfBirth: formData.dateOfBirth,
    });
  }, [formData]);

  const [errors, setErrors] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
  });

  const validateForm = () => {
    const nameValidation = validateFullName(formData.fullName);
    const genderValidation = validateGender(formData.gender);
    const dobValidation = validateDateOfBirth(formData.dateOfBirth);

    const newErrors = {
      fullName: nameValidation.isValid ? '' : nameValidation.error || '',
      gender: genderValidation.isValid ? '' : genderValidation.error || '',
      dateOfBirth: dobValidation.isValid ? '' : dobValidation.error || '',
    };

    setErrors(newErrors);
    return nameValidation.isValid && genderValidation.isValid && dobValidation.isValid;
  };

  const handleNext = async () => {
    if (!validateForm()) {
      return;
    }

    if (!session?.user?.id) {
      toast.error('Error', {
        description: 'Please log in to continue.',
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSaving(true);

    try {
      // Update local context first
      updateData({
        fullName: formData.fullName,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
      });

      // Save to backend database
      await questionnaireAPI.updateUserProfile(session.user.id, {
        name: formData.fullName.trim(),
        gender: formData.gender as 'male' | 'female',
        dateOfBirth: formData.dateOfBirth?.toISOString().split('T')[0] || '',
      });

      // Update onboarding step to PERSONAL_INFO
      try {
        await questionnaireAPI.updateOnboardingStep(session.user.id, 'PERSONAL_INFO');
        console.log('Onboarding step updated to PERSONAL_INFO');
      } catch (stepError) {
        console.error('Error updating onboarding step:', stepError);
      }

      // Navigate to location screen (required step)
      router.push('/onboarding/location');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Error', {
        description: 'Failed to save your profile information. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading spinner while data is loading
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading your information..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <DeuceLogo width={42} height={42} />
          </View>

          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Welcome aboard.</Text>
            <Text style={styles.subtitle}>
              Let&apos;s get you ready for the court...
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <InputField
              label="Your Name"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => {
                setFormData({ ...formData, fullName: text });
                if (errors.fullName) {
                  setErrors({ ...errors, fullName: '' });
                }
              }}
              error={errors.fullName}
            />

            {/* Gender */}
            <GenderSelector
              label="Your Gender"
              selectedGender={formData.gender}
              onGenderSelect={(gender) => {
                setFormData({ ...formData, gender });
                if (errors.gender) {
                  setErrors({ ...errors, gender: '' });
                }
              }}
              error={errors.gender}
            />

            {/* Date of Birth */}
            <DatePicker
              label="Your Birthday"
              selectedDate={formData.dateOfBirth}
              onDateSelect={(date) => {
                setFormData({ ...formData, dateOfBirth: date });
                if (errors.dateOfBirth) {
                  setErrors({ ...errors, dateOfBirth: '' });
                }
              }}
              error={errors.dateOfBirth}
            />
          </View>

          {/* Confirm Button */}
          <View style={styles.buttonContainer}>
            <ConfirmButton
              onPress={handleNext}
              disabled={!formData.fullName || !formData.gender || !formData.dateOfBirth}
              isLoading={isSaving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Fixed Progress Indicator */}
      <ProgressIndicator currentStep={0} totalSteps={3} />
    </SafeAreaView>
  );
};

const { width: screenWidth } = Dimensions.get('window');
const horizontalPadding = Math.max(screenWidth * 0.08, 20); // 8% of screen, min 20px
const buttonPadding = Math.max(screenWidth * 0.18, 60); // 18% of screen, min 60px

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  buttonContainer: {
    paddingHorizontal: buttonPadding,
    marginTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FE9F4D',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  headerContainer: {
    paddingHorizontal: horizontalPadding,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 40,
    marginBottom: 10,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FE9F4D',
    lineHeight: 30,
    fontFamily: 'Inter',
  },
  formContainer: {
    paddingHorizontal: horizontalPadding,
  },
});

export default PersonalInfoScreen;