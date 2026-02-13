// src/features/feed/hooks/useSharePost.ts

import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert, Linking, Platform, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { toast } from "sonner-native";

// Deep link configuration
const WEB_BASE_URL = "https://deuceleague.com";
const APP_SCHEME = "deuceleague";

/**
 * Opens the device Settings app for this application.
 * iOS: Opens app-specific settings page
 * Android: Opens app settings in system settings
 */
const openSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === "ios") {
      await Linking.openURL("app-settings:");
    } else {
      await Linking.openSettings();
    }
  } catch (err) {
    console.error("Failed to open settings:", err);
  }
};

export type ShareStyle = "transparent" | "white";

interface CaptureOptions {
  style?: ShareStyle;
  format?: string;
  quality?: number;
  pixelRatio?: number;
  width?: number;
  height?: number;
}

export interface ShareError {
  message: string;
  retryAction: () => void;
}

interface UseSharePostReturn {
  isCapturing: boolean;
  isSaving: boolean;
  shareError: ShareError | null;
  clearShareError: () => void;
  captureAndShare: (
    viewRef: React.RefObject<View | null>,
    options?: CaptureOptions,
  ) => Promise<boolean>;
  captureAndSave: (
    viewRef: React.RefObject<View | null>,
    options?: CaptureOptions,
  ) => Promise<boolean>;
  shareToInstagram: (
    viewRef: React.RefObject<View | null>,
    options?: CaptureOptions,
  ) => Promise<boolean>;
  shareLink: (postId: string) => Promise<boolean>;
}

export const useSharePost = (): UseSharePostReturn => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareError, setShareError] = useState<ShareError | null>(null);

  const clearShareError = useCallback(() => {
    setShareError(null);
  }, []);

  /**
   * Get capture configuration based on style
   *
   * Output format: PNG (1080x1920px for 9:16 ratio - optimal for social sharing)
   *
   * Style affects the background rendering:
   * - 'white': Solid white background PNG (standard format)
   * - 'transparent': Transparent background PNG (for editing/overlays)
   *
   * Note: The actual background styling is handled by the ScorecardCaptureWrapper component.
   * The wrapper renders the scorecard with company logo and title for sharing.
   */
  const getCaptureConfig = useCallback((style: ShareStyle = "white") => {
    const config = {
      format: "png" as const,
      quality: 1.0, // Maximum quality
      result: "tmpfile" as const,
      width: 1080, // 9:16 ratio
      height: 1920,
      backgroundColor: "transparent" as const, // Preserve transparency in rounded corners
    };
    console.log(
      "[useSharePost] Capture config:",
      config.width,
      "x",
      config.height,
      "(9:16 ratio)",
    );
    return config;
  }, []);

  /**
   * Capture a view as an image and open the native share sheet
   * Uses maximum quality settings for sharpest possible image
   */
  const captureAndShare = useCallback(
    async (
      viewRef: React.RefObject<View | null>,
      options?: CaptureOptions,
    ): Promise<boolean> => {
      if (!viewRef.current) {
        console.error("View ref is not available for capture");
        return false;
      }

      try {
        setIsCapturing(true);

        // Check if sharing is available on this device
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert(
            "Sharing Unavailable",
            "Sharing is not available on this device.",
          );
          return false;
        }

        // Capture with maximum quality settings for sharpest image
        console.log("[useSharePost] Starting capture for sharing...");
        const capturedUri = await captureRef(viewRef, {
          format: "png",
          quality: 1.0, // Maximum quality
          result: "tmpfile",
          width: 1080, // 9:16 ratio
          height: 1920,
          backgroundColor: "transparent", // Preserve transparency in rounded corners
        });
        console.log("[useSharePost] Image captured at 1080x1920 (9:16 ratio)");

        // Share directly (skip re-processing to maintain quality)
        await Sharing.shareAsync(capturedUri, {
          mimeType: "image/png",
          dialogTitle: "Share Post",
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      } catch (err) {
        console.error("Error capturing and sharing post:", err);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShareError({
          message: "Failed to generate image. Please try again.",
          retryAction: () => captureAndShare(viewRef, options),
        });
        return false;
      } finally {
        setIsCapturing(false);
      }
    },
    [],
  );

  /**
   * Capture a view as an image and save it to the camera roll
   * Uses maximum quality settings for sharpest possible image
   */
  const captureAndSave = useCallback(
    async (
      viewRef: React.RefObject<View | null>,
      options?: CaptureOptions,
    ): Promise<boolean> => {
      if (!viewRef.current) {
        console.error("View ref is not available for capture");
        return false;
      }

      try {
        setIsSaving(true);

        // Check permission status first (won't ask if already granted)
        const { status: existingStatus } =
          await MediaLibrary.getPermissionsAsync();

        let finalStatus = existingStatus;

        // Only request if not already granted
        if (existingStatus !== "granted") {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access to save images.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Settings", onPress: openSettings },
            ],
          );
          return false;
        }

        // Capture with maximum quality settings for sharpest image
        console.log("[useSharePost] Starting capture for saving...");
        const capturedUri = await captureRef(viewRef, {
          format: "png",
          quality: 1.0, // Maximum quality
          result: "tmpfile",
          width: 1080, // 9:16 ratio
          height: 1920,
          backgroundColor: "transparent", // Preserve transparency in rounded corners
        });
        console.log("[useSharePost] Image captured at 1080x1920 (9:16 ratio)");

        // Save directly to camera roll (skip re-processing to maintain quality)
        await MediaLibrary.saveToLibraryAsync(capturedUri);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("Saved to Camera Roll");
        console.log("High-quality image saved successfully at 1080x1920!");
        return true;
      } catch (err) {
        console.error("Error capturing and saving post:", err);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShareError({
          message: "Failed to save image. Please try again.",
          retryAction: () => captureAndSave(viewRef, options),
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  /**
   * Share image directly to Instagram Stories
   * Uses expo-image-manipulator to ensure maximum quality with no compression
   */
  const shareToInstagram = useCallback(
    async (
      viewRef: React.RefObject<View | null>,
      options?: CaptureOptions,
    ): Promise<boolean> => {
      if (!viewRef.current) {
        console.error("View ref is not available for capture");
        return false;
      }

      // Instagram sharing only works on iOS and Android
      if (Platform.OS === "web") {
        Alert.alert(
          "Unavailable",
          "Instagram sharing is not available on web.",
        );
        return false;
      }

      try {
        setIsCapturing(true);

        // Check permission status first (won't ask if already granted)
        const { status: existingStatus } =
          await MediaLibrary.getPermissionsAsync();

        let finalStatus = existingStatus;

        // Only request if not already granted
        if (existingStatus !== "granted") {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant photo library access to share to Instagram.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Settings", onPress: openSettings },
            ],
          );
          return false;
        }

        // Capture the view as a high-quality PNG image
        const capturedUri = await captureRef(
          viewRef,
          getCaptureConfig(options?.style),
        );

        // Use expo-image-manipulator to ensure maximum quality (compress: 1.0 = no compression)
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          capturedUri,
          [], // No modifications, just re-save with quality control
          {
            compress: 1.0, // Maximum quality, no compression
            format: ImageManipulator.SaveFormat.PNG,
          },
        );

        // Save to camera roll first (Instagram reads from there)
        const asset = await MediaLibrary.createAssetAsync(manipulatedImage.uri);

        // Try to open Instagram Stories with the image
        // Instagram URL scheme for stories: instagram-stories://share
        const instagramStoriesUrl = Platform.select({
          ios: `instagram-stories://share?source_application=com.deuceleague.app&backgroundImage=${encodeURIComponent(asset.uri)}`,
          android: `instagram-stories://share`,
        });

        if (instagramStoriesUrl) {
          const canOpen = await Linking.canOpenURL("instagram://");
          if (canOpen) {
            // For Android, we need to use a different approach
            if (Platform.OS === "android") {
              // Android uses intent system - open share sheet with Instagram filter
              const { Share } = await import("react-native");
              await Share.share({
                message: "Check out my Deuce League score!",
                url: asset.uri,
              });
            } else {
              // iOS can use the stories URL scheme
              await Linking.openURL(instagramStoriesUrl);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return true;
          } else {
            Alert.alert(
              "Instagram Not Installed",
              "Please install Instagram to share directly to your story.",
              [{ text: "OK" }],
            );
            return false;
          }
        }

        return false;
      } catch (err) {
        console.error("Error sharing to Instagram:", err);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setShareError({
          message: "Failed to share to Instagram. Please try again.",
          retryAction: () => shareToInstagram(viewRef, options),
        });
        return false;
      } finally {
        setIsCapturing(false);
      }
    },
    [getCaptureConfig],
  );

  /**
   * Share a deep link to a specific post
   */
  const shareLink = useCallback(async (postId: string): Promise<boolean> => {
    try {
      setIsCapturing(true);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device.",
        );
        return false;
      }

      // Create deep link URL
      // Use web URL for universal sharing (works in browsers and can redirect to app)
      const shareUrl = `${WEB_BASE_URL}/post/${postId}`;

      // On some platforms, we can share text/URLs directly
      // expo-sharing primarily handles files, so we use a workaround
      if (Platform.OS === "web") {
        // Web can use navigator.share if available
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: "Deuce League Post",
            text: "Check out this post on Deuce League!",
            url: shareUrl,
          });
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareUrl);
          Alert.alert("Link Copied", "Post link has been copied to clipboard.");
        }
      } else {
        // For native platforms, we need to use a different approach
        // expo-sharing doesn't support sharing plain text/URLs directly
        // We can use Linking or a native share module
        const { Share } = await import("react-native");
        await Share.share({
          message: `Check out this post on Deuce League! ${shareUrl}`,
          url: shareUrl, // iOS only
          title: "Deuce League Post",
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return true;
    } catch (err) {
      // User cancelled sharing is not an error
      if ((err as any)?.message?.includes("cancelled")) {
        return false;
      }
      console.error("Error sharing post link:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return {
    isCapturing,
    isSaving,
    shareError,
    clearShareError,
    captureAndShare,
    captureAndSave,
    shareToInstagram,
    shareLink,
  };
};
