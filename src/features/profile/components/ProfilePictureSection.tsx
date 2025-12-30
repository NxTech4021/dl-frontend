import React from 'react';
import { View, Pressable, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@core/theme/theme';

interface ProfilePictureSectionProps {
  imageUri: string | null | undefined;
  isUploading?: boolean;
  onPickImage?: () => void;
  isEditable?: boolean;
}

export const ProfilePictureSection: React.FC<ProfilePictureSectionProps> = ({
  imageUri,
  isUploading = false,
  onPickImage,
  isEditable = true,
}) => {
  return (
    <View style={styles.profileSection}>
      <View style={styles.profileImageContainer}>
        <View style={styles.profileImageWrapper}>
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#6de9a0" />
            </View>
          ) : imageUri ? (
            <Image
              key={imageUri} // Force re-render when image URL changes
              source={{ uri: imageUri }}
              style={styles.profileImage}
              onError={() => {
                console.log('Profile image failed to load:', imageUri);
              }}
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Svg width="60" height="60" viewBox="0 0 24 24">
                <Path
                  fill="#FFFFFF"
                  fillRule="evenodd"
                  d="M8 7a4 4 0 1 1 8 0a4 4 0 0 1-8 0m0 6a5 5 0 0 0-5 5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3a5 5 0 0 0-5-5z"
                  clipRule="evenodd"
                />
              </Svg>
            </View>
          )}
        </View>
        {isEditable && onPickImage && (
          <Pressable
            style={styles.editImageButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPickImage();
            }}
            accessible={true}
            accessibilityLabel="Change profile picture"
            accessibilityRole="button"
            disabled={isUploading}
          >
            <Ionicons name="camera" size={18} color={theme.colors.neutral.white} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  profileSection: {
    alignItems: 'center',
    marginTop: -180,
    position: 'relative',
    zIndex: 15,
    marginBottom: 0,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 0,
  },
  profileImageWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  uploadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.neutral.white,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.neutral.white,
    shadowColor: theme.colors.neutral.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.neutral.white,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.neutral.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  editImageButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neutral.white,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
