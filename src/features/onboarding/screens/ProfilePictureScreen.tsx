import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, G, Circle, Rect, Defs, ClipPath } from 'react-native-svg';
import { CircularImageCropper } from '../components';
import { LinearGradient } from 'expo-linear-gradient';
import { toast } from 'sonner-native';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { questionnaireAPI } from '../services/api';
import * as Haptics from 'expo-haptics';
import AllSetArrowIcon from '../../../../assets/icons/allset-arrow.svg';
import {
  scale,
  verticalScale,
  moderateScale,
  responsivePadding,
  responsiveWidth,
  getResponsiveValue,
} from '@/core/utils/responsive';
import { useProfileImageUpload } from '@/src/shared/hooks/useProfileImageUpload';

const DefaultProfileIcon = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 296 296" fill="none">
    <G clipPath="url(#clip0_1283_2316)">
      <Rect width="311" height="311" fill="#EBEBEB" fillOpacity="0.32" />
      <Circle cx="145" cy="148" r="138" fill="#EBEBEB" />
      <Path
        d="M145 155.083C161.972 155.083 177.406 159.999 188.761 166.926C194.427 170.383 199.273 174.463 202.772 178.897C206.214 183.254 208.75 188.467 208.75 194.041C208.75 200.027 205.839 204.744 201.645 208.109C197.679 211.296 192.444 213.407 186.884 214.881C175.706 217.834 160.789 218.833 145 218.833C129.211 218.833 114.294 217.841 103.116 214.881C97.5558 213.407 92.3212 211.296 88.3546 208.109C84.1542 204.737 81.25 200.027 81.25 194.041C81.25 188.467 83.7858 183.254 87.2283 178.89C90.7275 174.463 95.5654 170.39 101.239 166.919C112.594 160.006 128.035 155.083 145 155.083ZM145 77.1665C154.393 77.1665 163.401 80.8979 170.043 87.5398C176.685 94.1817 180.417 103.19 180.417 112.583C180.417 121.976 176.685 130.985 170.043 137.627C163.401 144.268 154.393 148 145 148C135.607 148 126.599 144.268 119.957 137.627C113.315 130.985 109.583 121.976 109.583 112.583C109.583 103.19 113.315 94.1817 119.957 87.5398C126.599 80.8979 135.607 77.1665 145 77.1665Z"
        fill="#555555"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_1283_2316">
        <Rect width="296" height="296" fill="white" />
      </ClipPath>
    </Defs>
  </Svg>
);

const ProfilePictureScreen = () => {
  const [hadUploadedImage, setHadUploadedImage] = useState(false); // Track if user uploaded an image before skip
  const [isSkipSelected, setIsSkipSelected] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Use shared profile image upload hook
  const {
    profileImage,
    isUploadingImage,
    showCropper,
    selectedImageUri,
    setProfileImage,
    pickImageFromLibrary,
    openCamera,
    handleCropComplete,
    handleCropCancel,
    handleEditImage,
  } = useProfileImageUpload({
    userId: session?.user?.id,
    onUploadSuccess: () => {
      setHadUploadedImage(true); // Mark that user has uploaded an image
    },
  });

  // Responsive sizes
  const imageSize = getResponsiveValue({
    smallPhone: 200,
    phone: 240,
    largePhone: 260,
    tablet: 300,
    default: 260,
  });

  // Wrapper functions to clear skip selection when uploading
  const handlePickImageFromLibrary = async () => {
    setIsSkipSelected(false);
    await pickImageFromLibrary();
  };

  const handleOpenCamera = async () => {
    setIsSkipSelected(false);
    await openCamera();
  };

  // Custom crop complete handler for onboarding (handles skip state)
  const onCropComplete = async (croppedUri: string) => {
    setIsSkipSelected(false);
    await handleCropComplete(croppedUri);
  };

  const handleComplete = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log('=== HANDLE COMPLETE DEBUG ===');
      console.log('isSkipSelected:', isSkipSelected);
      console.log('hadUploadedImage:', hadUploadedImage);
      console.log('profileImage:', profileImage);
      console.log('session?.user?.id:', session?.user?.id);
      console.log('============================');

      // If skip is selected, remove any uploaded profile picture and skip
      if (isSkipSelected) {
        console.log('=== SKIP SELECTED - CLEARING IMAGE ===');
        console.log('hadUploadedImage:', hadUploadedImage);
        console.log('session?.user?.id:', session?.user?.id);

        // If user had uploaded an image before clicking skip, delete it from backend
        if (hadUploadedImage && session?.user?.id) {
          try {
            const backendUrl = getBackendBaseURL();
            console.log('Sending PUT request to clear image...');
            console.log('URL:', `${backendUrl}/api/player/profile/me`);
            console.log('Body:', { image: null });

            const response = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
              method: 'PUT',
              body: JSON.stringify({ image: null }),
              headers: {
                'Content-Type': 'application/json',
              },
            });

            console.log('✅ Profile image cleared successfully');
            console.log('Response:', response);

            // Verify the response indicates success (check both nested and top-level)
            const isSuccess = (response as any)?.success || (response as any)?.data?.success;
            const imageCleared = (response as any)?.data?.data?.image === null;

            if (isSuccess && imageCleared) {
              console.log('✅ Backend confirmed image cleared');
            } else if (isSuccess) {
              console.log('✅ Backend responded successfully');
            } else {
              console.warn('⚠️ Backend response unclear:', response);
            }
          } catch (err) {
            console.error('❌ Error removing profile picture:', err);
            console.error('Error details:', JSON.stringify(err, null, 2));

            // Show error to user but allow them to continue
            toast.error('Warning', {
              description: 'Could not remove profile picture. Continuing anyway.',
            });
          }
        } else {
          console.log('No image to delete - hadUploadedImage:', hadUploadedImage, 'session?.user?.id:', session?.user?.id);
        }

        // Update step and mark onboarding as completed
        if (session?.user?.id) {
          // First update the step to PROFILE_PICTURE
          try {
            await questionnaireAPI.updateOnboardingStep(session.user.id, 'PROFILE_PICTURE');
            console.log('ProfilePictureScreen: Onboarding step updated to PROFILE_PICTURE (skip)');
          } catch (stepError) {
            console.error('Error updating onboarding step:', stepError);
          }

          console.log('ProfilePictureScreen: Calling completeOnboarding API (skip)...');
          const result = await questionnaireAPI.completeOnboarding(session.user.id);
          console.log('ProfilePictureScreen: Onboarding completion result (skip):', result);
          console.log('ProfilePictureScreen: Onboarding marked as completed (skip)');

          // Wait longer for the backend to process the completion and database to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log('ProfilePictureScreen: Waited for backend processing (skip)');
        }

        // Skip photo and navigate to main app
        toast.success('Success!', {
          description: 'Onboarding completed! Welcome to DeuceLeague!',
        });

        console.log('ProfilePictureScreen: Navigating to dashboard (skip)...');

        // Force clear any cached navigation state and navigate
        router.replace('/user-dashboard');
        return;
      }
      
      // Otherwise, complete normally with profile picture
      // Update step and mark onboarding as completed
      if (session?.user?.id) {
        // First update the step to PROFILE_PICTURE
        try {
          await questionnaireAPI.updateOnboardingStep(session.user.id, 'PROFILE_PICTURE');
          console.log('ProfilePictureScreen: Onboarding step updated to PROFILE_PICTURE');
        } catch (stepError) {
          console.error('Error updating onboarding step:', stepError);
        }

        console.log('ProfilePictureScreen: Calling completeOnboarding API...');
        const result = await questionnaireAPI.completeOnboarding(session.user.id);
        console.log('ProfilePictureScreen: Onboarding completion result:', result);
        console.log('ProfilePictureScreen: Onboarding marked as completed');

        // Wait longer for the backend to process the completion and database to update
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('ProfilePictureScreen: Waited for backend processing');
      }
      
      // Save profile data and navigate to main app
      toast.success('Success!', {
        description: 'Onboarding completed! Welcome to DeuceLeague!',
      });
      
      console.log('ProfilePictureScreen: Navigating to dashboard...');
      
      // Force clear any cached navigation state and navigate
      router.replace('/user-dashboard');
    } catch (error) {
      console.error('ProfilePictureScreen: Error completing onboarding:', error);
      // Still navigate even if completion fails
      console.log('ProfilePictureScreen: Navigating to dashboard despite error...');
      router.push('/user-dashboard');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    console.log('=== HANDLE SKIP DEBUG ===');
    console.log('Current isSkipSelected:', isSkipSelected);
    console.log('Current hadUploadedImage:', hadUploadedImage);
    console.log('Current profileImage:', profileImage);
    console.log('========================');

    // Toggle skip selection
    const newSkipState = !isSkipSelected;
    setIsSkipSelected(newSkipState);

    console.log('New skip state:', newSkipState);

    // Clear profile image display when skip is selected
    if (newSkipState) {
      console.log('Clearing profileImage because skip is selected');
      setProfileImage(null);
    } else {
      // If user un-toggles skip, reset the hadUploadedImage flag
      console.log('User un-toggled skip - resetting hadUploadedImage flag');
      setHadUploadedImage(false);
    }
    // Note: hadUploadedImage flag remains true when skip is toggled on
    // This allows us to delete it from backend when "All set" is clicked
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back Button - Absolute positioned outside scroll */}
      <View style={styles.backButtonWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Svg width={scale(36)} height={scale(36)} viewBox="0 0 36 36" fill="none">
            <Path
              d="M22.5 27L13.5 18L22.5 9"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>One final step...</Text>
          <Text style={styles.subtitle}>Don&apos;t be shy!</Text>
          <Text style={styles.description}>
            Upload or take a profile picture to help other players recognise and connect with you.
          </Text>
        </View>

        {/* Profile Image Container */}
        <View style={styles.imageOuterContainer}>
          <View style={[styles.imageContainer, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}>
            {isUploadingImage ? (
              <View style={[styles.uploadingContainer, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}>
                <ActivityIndicator size="large" color="#FE9F4D" />
              </View>
            ) : profileImage ? (
              <>
                <Image
                  key={profileImage} // Force re-render when URL changes
                  source={{
                    uri: profileImage,
                    cache: 'reload' // Force reload from network, don't use cache
                  }}
                  style={[styles.profileImage, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
                  onError={() => {
                    console.log('Profile image failed to load:', profileImage);
                  }}
                  onLoad={() => {
                    console.log('Profile image loaded successfully:', profileImage);
                  }}
                />
                {/* Edit button overlay */}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleEditImage();
                  }}
                >
                  <Svg width={scale(20)} height={scale(20)} viewBox="0 0 20 20" fill="none">
                    <Path
                      d="M14.166 2.5009C14.3849 2.28203 14.6447 2.10842 14.9307 1.98996C15.2167 1.87151 15.5232 1.81055 15.8327 1.81055C16.1422 1.81055 16.4487 1.87151 16.7347 1.98996C17.0206 2.10842 17.2805 2.28203 17.4993 2.5009C17.7182 2.71977 17.8918 2.97961 18.0103 3.26558C18.1287 3.55154 18.1897 3.85804 18.1897 4.16757C18.1897 4.4771 18.1287 4.7836 18.0103 5.06956C17.8918 5.35553 17.7182 5.61537 17.4993 5.83424L6.24935 17.0842L1.66602 18.3342L2.91602 13.7509L14.166 2.5009Z"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </>
            ) : (
              <DefaultProfileIcon size={imageSize} />
            )}
          </View>
        </View>

        {/* Upload Photo Button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handlePickImageFromLibrary();
          }}
          disabled={isUploadingImage}
          style={styles.buttonTouchableContainer}
        >
          <LinearGradient
            colors={isUploadingImage ? ['#BABABA', '#BABABA'] : ['#FEA04D', '#FF8C1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.button,
              isUploadingImage && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Upload a photo</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Take Photo Button */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            handleOpenCamera();
          }}
          disabled={isUploadingImage}
          style={styles.buttonTouchableContainer}
        >
          <View
            style={[
              styles.button,
              styles.takePhotoButtonSolid,
              isUploadingImage && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.takePhotoButtonText}>Take a photo</Text>
          </View>
        </TouchableOpacity>

        {/* Skip for now */}
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            {isSkipSelected && (
              <Image
                source={require('../../../../assets/images/yes.png')}
                style={styles.skipIcon}
              />
            )}
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        {/* All set text - now in normal flow */}
        <View style={styles.allSetContainer}>
          <TouchableOpacity onPress={handleComplete} style={styles.allSetButton}>
            <Text style={styles.allSetText}>All set</Text>
            <AllSetArrowIcon width={scale(14)} height={scale(14)} />
          </TouchableOpacity>
          <View style={styles.readyToDeuceContainer}>
            <Text style={styles.readyToText}>Ready to </Text>
            <Text style={styles.deuceText}>DEUCE!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Circular Image Cropper Modal */}
      {selectedImageUri && (
        <CircularImageCropper
          visible={showCropper}
          imageUri={selectedImageUri}
          onCropComplete={onCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButtonWrapper: {
    position: 'absolute',
    top: Platform.select({
      ios: verticalScale(50),
      android: verticalScale(42),
    }),
    left: scale(19),
    zIndex: 10,
  },
  backButton: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(40),
  },
  headerContainer: {
    paddingHorizontal: responsivePadding.lg,
    marginBottom: verticalScale(24),
    width: '100%',
  },
  title: {
    fontSize: moderateScale(32),
    fontWeight: '700',
    color: '#000000',
    lineHeight: moderateScale(40),
    marginBottom: verticalScale(5),
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: '#FEA04D',
    lineHeight: moderateScale(34),
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: verticalScale(16),
  },
  description: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: '#8C8C8C',
    lineHeight: moderateScale(20),
    letterSpacing: -0.01,
    fontFamily: 'Inter',
  },
  imageOuterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(32),
    width: '100%',
  },
  imageContainer: {
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    // Dynamic styles applied inline
  },
  editButton: {
    position: 'absolute',
    bottom: scale(10),
    right: scale(10),
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: '#FE9F4D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadingContainer: {
    backgroundColor: 'rgba(235, 235, 235, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTouchableContainer: {
    borderRadius: moderateScale(22),
    overflow: 'hidden',
    marginBottom: verticalScale(12),
    width: responsiveWidth(70),
    alignSelf: 'center',
  },
  button: {
    height: scale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsivePadding.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
    lineHeight: moderateScale(24),
    fontFamily: 'Inter',
  },
  takePhotoButtonSolid: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FE9F4D',
  },
  takePhotoButtonText: {
    color: '#FE9F4D',
    fontSize: moderateScale(16),
    fontWeight: '500',
    lineHeight: moderateScale(24),
    fontFamily: 'Inter',
  },
  skipContainer: {
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIcon: {
    width: scale(24),
    height: scale(24),
    marginRight: scale(8),
    transform: [{ rotate: '7.09deg' }],
  },
  skipText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#FE8E2B',
    lineHeight: moderateScale(24),
    fontFamily: 'Inter',
  },
  allSetContainer: {
    alignItems: 'center',
    marginTop: verticalScale(4),
    paddingBottom: verticalScale(20),
  },
  allSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  allSetText: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#404040',
    lineHeight: moderateScale(28),
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    textAlign: 'center',
    marginRight: scale(10),
  },
  readyToDeuceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyToText: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#555555',
    fontFamily: 'Inter',
  },
  deuceText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    fontStyle: 'italic',
    fontFamily: 'Inter',
    color: '#FF8C1A',
  },
});

export default ProfilePictureScreen;