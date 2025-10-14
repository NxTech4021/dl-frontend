import React, { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Svg, Path, G, Circle, Rect, Defs, ClipPath } from 'react-native-svg';
import { BackgroundGradient, DeuceLogo, BackButton, ConfirmButton, CircularImageCropper } from '../components';
import { LinearGradient } from 'expo-linear-gradient';
import { toast } from 'sonner-native';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { questionnaireAPI } from '../services/api';
import * as Haptics from 'expo-haptics';

const DefaultProfileIcon = () => (
  <Svg width="296" height="296" viewBox="0 0 296 296" fill="none">
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
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession();

  // Image upload functions
  const uploadProfileImage = async (imageUri: string, retryCount = 0) => {
    const MAX_RETRIES = 2;

    try {
      setIsUploadingImage(true);

      const backendUrl = getBackendBaseURL();
      const formData = new FormData();

      // Get file extension from URI
      const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
      };
      const mimeType = mimeTypes[fileExtension] || 'image/jpeg';

      // Create file object for upload with correct extension
      const file = {
        uri: imageUri,
        type: mimeType,
        name: `profile-${Date.now()}.${fileExtension}`,
      } as any;

      formData.append('image', file);

      console.log('Uploading profile image:', imageUri);
      console.log('Backend URL:', backendUrl);
      console.log('Attempt:', retryCount + 1);

      const response = await authClient.$fetch(`${backendUrl}/api/player/profile/upload-image`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with proper boundary
      });

      console.log('Upload response:', response);

      // Handle different possible response structures
      let imageUrl = null;

      if (response && (response as any).data) {
        const responseData = (response as any).data;
        // Try different possible paths for the image URL
        // Check nested data.data.imageUrl first (current backend structure)
        imageUrl = responseData.data?.imageUrl || responseData.imageUrl || responseData.image || responseData.url || responseData.data?.image;
      }

      if (imageUrl) {
        console.log('Image URL received:', imageUrl);

        // Update local state with new image URL
        setProfileImage(imageUrl);

        toast.success('Success', {
          description: 'Profile picture updated successfully!',
        });
      } else {
        console.error('No image URL found in response:', response);
        toast.error('Error', {
          description: 'Upload successful but no image URL received.',
        });
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('Network request failed')) {
        console.log(`Retrying upload (attempt ${retryCount + 2} of ${MAX_RETRIES + 1})...`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        setIsUploadingImage(false);
        return uploadProfileImage(imageUri, retryCount + 1);
      }

      toast.error('Error', {
        description: 'Failed to upload profile picture. Please try again.',
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to upload a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      await openImageLibrary();
    } catch (error) {
      console.error('Error picking image:', error);
      toast.error('Error', {
        description: 'Failed to open image picker. Please try again.',
      });
    }
  };

  const normalizeImageOrientation = async (imageUri: string) => {
    try {
      console.log('=== NORMALIZING CAMERA IMAGE (ProfilePictureScreen) ===');
      console.log('Original URI:', imageUri);

      // Get original dimensions before normalization
      return new Promise((resolve) => {
        Image.getSize(imageUri, async (width, height) => {
          console.log('Original dimensions:', { width, height });
          console.log('Original aspect ratio:', width / height);

          // Use manipulateAsync with no operations to normalize EXIF orientation
          const normalized = await manipulateAsync(
            imageUri,
            [], // No operations, just normalize
            { compress: 1.0, format: SaveFormat.JPEG }
          );

          console.log('Normalized URI:', normalized.uri);

          // Get dimensions after normalization
          Image.getSize(normalized.uri, (normWidth, normHeight) => {
            console.log('Normalized dimensions:', { width: normWidth, height: normHeight });
            console.log('Normalized aspect ratio:', normWidth / normHeight);
            console.log('Dimensions changed:', normWidth !== width || normHeight !== height);
            console.log('========================================================');
            resolve(normalized.uri);
          });
        }, (error) => {
          console.error('Error getting image size:', error);
          resolve(imageUri);
        });
      });
    } catch (error) {
      console.error('Error normalizing image orientation:', error);
      return imageUri;
    }
  };

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera to take a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Disable native editing, we'll use custom crop
        quality: 1.0, // Max quality before cropping
        exif: false, // Don't include EXIF to avoid rotation issues
      });

      if (!result.canceled && result.assets[0]) {
        console.log('=== CAMERA PHOTO TAKEN (ProfilePictureScreen) ===');
        console.log('Raw camera URI:', result.assets[0].uri);
        console.log('Camera result width:', result.assets[0].width);
        console.log('Camera result height:', result.assets[0].height);
        console.log('Has EXIF:', result.assets[0].exif !== undefined);
        console.log('=================================================');

        // Normalize EXIF rotation BEFORE showing cropper
        // This ensures the displayed image matches what will be cropped
        console.log('Normalizing camera image before cropper...');
        const normalized = await manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1, format: SaveFormat.JPEG }
        );
        console.log('Normalized URI for cropper:', normalized.uri);

        setSelectedImageUri(normalized.uri);
        setShowCropper(true);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      toast.error('Error', {
        description: 'Failed to open camera. Please try again.',
      });
    }
  };

  const openImageLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Disable native editing, we'll use custom crop
        quality: 1.0, // Max quality before cropping
      });

      if (!result.canceled && result.assets[0]) {
        console.log('=== PHOTO LIBRARY IMAGE SELECTED (ProfilePictureScreen) ===');
        console.log('Library image URI:', result.assets[0].uri);
        console.log('Library result width:', result.assets[0].width);
        console.log('Library result height:', result.assets[0].height);
        console.log('Has EXIF:', result.assets[0].exif !== undefined);
        console.log('============================================================');

        // Normalize EXIF rotation BEFORE showing cropper
        // This ensures the displayed image matches what will be cropped
        console.log('Normalizing library image before cropper...');
        const normalized = await manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1, format: SaveFormat.JPEG }
        );
        console.log('Normalized URI for cropper:', normalized.uri);

        setSelectedImageUri(normalized.uri);
        setShowCropper(true);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      toast.error('Error', {
        description: 'Failed to open photo library. Please try again.',
      });
    }
  };

  const handleComplete = async () => {
    try {
      // Mark onboarding as completed
      if (session?.user?.id) {
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

  const handleEditImage = () => {
    if (!profileImage) return;
    setSelectedImageUri(profileImage);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedUri: string) => {
    setShowCropper(false);
    setSelectedImageUri(null);
    await uploadProfileImage(croppedUri);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImageUri(null);
  };

  const handleSkip = async () => {
    try {
      // Mark onboarding as completed
      if (session?.user?.id) {
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
    } catch (error) {
      console.error('ProfilePictureScreen: Error completing onboarding (skip):', error);
      // Still navigate even if completion fails
      console.log('ProfilePictureScreen: Navigating to dashboard despite error (skip)...');
      router.push('/user-dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* <BackgroundGradient /> */}
      <BackButton />

      {/* Logo */}
      <View style={styles.logoContainer}>
        {/* <DeuceLogo /> */}
      </View>

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
        <View style={styles.imageContainer}>
          {isUploadingImage ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#FE9F4D" />
            </View>
          ) : profileImage ? (
            <>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                onError={() => {
                  console.log('Profile image failed to load:', profileImage);
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
                <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
            <DefaultProfileIcon />
          )}
        </View>
      </View>

      {/* Upload Photo Button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          pickImageFromLibrary();
        }}
        disabled={isUploadingImage}
        style={styles.buttonTouchableContainer}
      >
        <LinearGradient
          colors={isUploadingImage ? ['#BABABA', '#BABABA'] : ['#FF7903', '#FEA04D']}
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
          openCamera();
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
      <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>

      {/* All set? text with yes icon */}
      <View style={styles.allSetContainer}>
        <View style={styles.allSetButton}>
          <Text style={styles.allSetText}>All set?</Text>
        </View>
        <TouchableOpacity onPress={handleComplete}>
          <Image
            source={require('../../../../assets/images/yes.png')}
            style={styles.yesIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Circular Image Cropper Modal */}
      {selectedImageUri && (
        <CircularImageCropper
          visible={showCropper}
          imageUri={selectedImageUri}
          onCropComplete={handleCropComplete}
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
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 62,
    left: 19,
    width: 36,
    height: 36,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FE9F4D',
  },
  headerContainer: {
    paddingHorizontal: 37,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 40,
    marginBottom: 0,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FEA04D',
    lineHeight: 34,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    marginBottom: 3,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: '#BABABA',
    lineHeight: 20,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
  },
  imageOuterContainer: {
    width: 296,
    height: 296,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageContainer: {
    width: 276,
    height: 276,
    borderRadius: 138,
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: 276,
    height: 276,
    borderRadius: 138,
  },
  editButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
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
    width: 276,
    height: 276,
    borderRadius: 138,
    backgroundColor: 'rgba(235, 235, 235, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTouchableContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 8,
    width: '70%',
    alignSelf: 'center',
  },
  button: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  takePhotoButtonSolid: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FE9F4D',
    marginBottom: 8,
  },
  takePhotoButtonText: {
    color: '#FE9F4D',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  skipButton: {
    marginBottom: 44,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FE8E2B',
    lineHeight: 24,
    fontFamily: 'Inter',
  },
  allSetContainer: {
    position: 'absolute',
    bottom: Dimensions.get('window').height * 0.06,
    right: Dimensions.get('window').width * 0.08, 
    flexDirection: 'row',
    alignItems: 'center',
  },
  allSetButton: {
    marginRight: 8,
  },
  allSetText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#404040',
    lineHeight: 28,
    letterSpacing: -0.01,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  yesIcon: {
    width: 72,
    height: 72,
    transform: [{ rotate: '7.09deg' }],
  },
});

export default ProfilePictureScreen;