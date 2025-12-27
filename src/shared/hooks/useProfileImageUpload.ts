import { useState, useCallback } from 'react';
import { Image, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { toast } from 'sonner-native';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';

interface UseProfileImageUploadOptions {
  userId?: string;
  onUploadSuccess?: (imageUrl: string) => void;
  onUploadError?: (error: Error) => void;
}

interface UseProfileImageUploadReturn {
  // State
  profileImage: string | null;
  originalLocalImage: string | null;
  isUploadingImage: boolean;
  showCropper: boolean;
  selectedImageUri: string | null;

  // Actions
  setProfileImage: (uri: string | null) => void;
  uploadProfileImage: (imageUri: string, retryCount?: number) => Promise<string | null>;
  pickImageFromLibrary: () => Promise<void>;
  openCamera: () => Promise<void>;
  handleCropComplete: (croppedUri: string) => Promise<void>;
  handleCropCancel: () => void;
  handleEditImage: () => void;
  resetState: () => void;
}

const MAX_RETRIES = 2;

/**
 * Shared hook for profile image upload functionality.
 * Used by ProfilePictureScreen (onboarding), ProfileScreen, and edit-profile.
 *
 * Features:
 * - CircularImageCropper integration
 * - EXIF orientation normalization via expo-image-manipulator
 * - FormData multipart upload with MIME type detection
 * - Platform-specific URI handling (iOS file:// prefix removal)
 * - Retry logic with exponential backoff (2 retries)
 * - 500x500 PNG output from cropper
 */
export function useProfileImageUpload(options: UseProfileImageUploadOptions = {}): UseProfileImageUploadReturn {
  const { userId, onUploadSuccess, onUploadError } = options;

  // State
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalLocalImage, setOriginalLocalImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  /**
   * Normalize image orientation using EXIF data.
   * This ensures the displayed image matches what will be cropped.
   */
  const normalizeImageOrientation = useCallback(async (imageUri: string): Promise<string> => {
    try {
      console.log('=== NORMALIZING IMAGE ORIENTATION ===');
      console.log('Original URI:', imageUri);

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
            console.log('========================================');
            resolve(normalized.uri);
          }, (error) => {
            console.error('Error getting normalized image size:', error);
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
  }, []);

  /**
   * Upload profile image to backend with retry logic.
   * Returns the uploaded image URL on success, null on failure.
   */
  const uploadProfileImage = useCallback(async (imageUri: string, retryCount = 0): Promise<string | null> => {
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
      // React Native FormData expects: { uri, type, name }
      // iOS requires file:// prefix removal, Android doesn't
      const normalizedUri = Platform.OS === 'ios' && imageUri.startsWith('file://')
        ? imageUri.replace('file://', '')
        : imageUri;

      const file = {
        uri: normalizedUri,
        type: mimeType,
        name: `profile-${Date.now()}.${fileExtension}`,
      };

      // TypeScript doesn't know about React Native's FormData format
      // In RN, FormData.append accepts { uri, type, name } objects
      formData.append('image', file as any);

      console.log('Uploading profile image:', imageUri);
      console.log('Backend URL:', backendUrl);
      console.log('Attempt:', retryCount + 1);

      // Get session token for authentication
      const sessionData = await authClient.getSession();
      const token = sessionData?.data?.session?.token;
      const currentUserId = userId || sessionData?.data?.user?.id;

      if (!token && !currentUserId) {
        throw new Error('No authentication token available. Please sign in again.');
      }

      // Use fetch directly for FormData (authClient.$fetch may not handle multipart correctly)
      const headers: Record<string, string> = {};

      // Add authorization token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add user ID header for mobile compatibility
      if (currentUserId) {
        headers['x-user-id'] = currentUserId;
      }

      const response = await fetch(`${backendUrl}/api/player/profile/upload-image`, {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `Upload failed with status ${response.status}`;
        try {
          const errorText = await response.text();
          const errorJson = errorText ? JSON.parse(errorText) : null;
          errorMessage = errorJson?.message || errorJson?.error || errorText || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        console.error('Upload failed:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload response:', result);

      // Backend returns: { success: true, data: { user: {...}, imageUrl: "url" }, message: "..." }
      let imageUrl: string | null = null;

      if (result?.success && result?.data) {
        // Backend structure: result.data.imageUrl
        imageUrl = result.data.imageUrl || null;
      }

      if (!imageUrl) {
        console.error('No image URL found in response:', result);
        throw new Error('Upload successful but no image URL received from server');
      }

      console.log('Image URL received:', imageUrl);
      console.log('Setting profileImage state to:', imageUrl);

      // Update local state with new image URL
      setProfileImage(imageUrl);

      console.log('profileImage state updated');

      toast.success('Success', {
        description: 'Profile picture updated successfully!',
      });

      onUploadSuccess?.(imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && error instanceof Error && error.message.includes('Network request failed')) {
        console.log(`Retrying upload (attempt ${retryCount + 2} of ${MAX_RETRIES + 1})...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        setIsUploadingImage(false);
        return uploadProfileImage(imageUri, retryCount + 1);
      }

      toast.error('Error', {
        description: 'Failed to upload profile picture. Please try again.',
      });

      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  }, [userId, onUploadSuccess, onUploadError]);

  /**
   * Open image library picker.
   */
  const pickImageFromLibrary = useCallback(async () => {
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Disable native editing, we'll use custom crop
        quality: 1.0, // Max quality before cropping
      });

      if (!result.canceled && result.assets[0]) {
        console.log('=== PHOTO LIBRARY IMAGE SELECTED ===');
        console.log('Library image URI:', result.assets[0].uri);
        console.log('Library result width:', result.assets[0].width);
        console.log('Library result height:', result.assets[0].height);
        console.log('Has EXIF:', result.assets[0].exif !== undefined);
        console.log('=====================================');

        // Normalize EXIF rotation BEFORE showing cropper
        // This ensures the displayed image matches what will be cropped
        console.log('Normalizing library image before cropper...');
        const normalized = await manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1, format: SaveFormat.JPEG }
        );
        console.log('Normalized URI for cropper:', normalized.uri);

        setOriginalLocalImage(normalized.uri); // Save original for re-cropping
        setSelectedImageUri(normalized.uri);
        setShowCropper(true);
      }
    } catch (error) {
      console.error('Error opening image library:', error);
      toast.error('Error', {
        description: 'Failed to open photo library. Please try again.',
      });
    }
  }, []);

  /**
   * Open camera to take photo.
   */
  const openCamera = useCallback(async () => {
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
        console.log('=== CAMERA PHOTO TAKEN ===');
        console.log('Raw camera URI:', result.assets[0].uri);
        console.log('Camera result width:', result.assets[0].width);
        console.log('Camera result height:', result.assets[0].height);
        console.log('Has EXIF:', result.assets[0].exif !== undefined);
        console.log('==========================');

        // Normalize EXIF rotation BEFORE showing cropper
        // This ensures the displayed image matches what will be cropped
        console.log('Normalizing camera image before cropper...');
        const normalized = await manipulateAsync(
          result.assets[0].uri,
          [],
          { compress: 1, format: SaveFormat.JPEG }
        );
        console.log('Normalized URI for cropper:', normalized.uri);

        setOriginalLocalImage(normalized.uri); // Save original for re-cropping
        setSelectedImageUri(normalized.uri);
        setShowCropper(true);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      toast.error('Error', {
        description: 'Failed to open camera. Please try again.',
      });
    }
  }, []);

  /**
   * Handle crop completion - upload the cropped image.
   */
  const handleCropComplete = useCallback(async (croppedUri: string) => {
    setShowCropper(false);
    setSelectedImageUri(null);
    await uploadProfileImage(croppedUri);
  }, [uploadProfileImage]);

  /**
   * Handle crop cancellation.
   */
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setSelectedImageUri(null);
  }, []);

  /**
   * Handle edit button click - reopen cropper with original image.
   */
  const handleEditImage = useCallback(() => {
    if (!profileImage) return;

    // Use the original local image for re-cropping, not the uploaded URL
    if (originalLocalImage) {
      console.log('Re-cropping original local image:', originalLocalImage);
      setSelectedImageUri(originalLocalImage);
      setShowCropper(true);
    } else {
      toast.info('Replace Image', {
        description: 'To change your photo, please upload or take a new one.',
      });
    }
  }, [profileImage, originalLocalImage]);

  /**
   * Reset all state to initial values.
   */
  const resetState = useCallback(() => {
    setProfileImage(null);
    setOriginalLocalImage(null);
    setIsUploadingImage(false);
    setShowCropper(false);
    setSelectedImageUri(null);
  }, []);

  return {
    // State
    profileImage,
    originalLocalImage,
    isUploadingImage,
    showCropper,
    selectedImageUri,

    // Actions
    setProfileImage,
    uploadProfileImage,
    pickImageFromLibrary,
    openCamera,
    handleCropComplete,
    handleCropCancel,
    handleEditImage,
    resetState,
  };
}
