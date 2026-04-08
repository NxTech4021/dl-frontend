import axiosInstance, { endpoints } from "@/lib/endpoints";
import { theme } from "@core/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import {
  extractErrorMessage,
  extractResponseData,
} from "../utils/responseHelpers";

// Feedback types — must match backend BugReportType enum
type FeedbackType = "FEEDBACK" | "BUG" | "SUGGESTION" | "IMPROVEMENT";

interface FeedbackTypeOption {
  id: FeedbackType;
  label: string;
  icon: string;
  description: string;
}

const feedbackTypes: FeedbackTypeOption[] = [
  {
    id: "FEEDBACK",
    label: "Feedback",
    icon: "chatbubble-outline",
    description: "General feedback",
  },
  {
    id: "BUG",
    label: "Bug Report",
    icon: "bug-outline",
    description: "Report an issue",
  },
  {
    id: "SUGGESTION",
    label: "Feature",
    icon: "bulb-outline",
    description: "Suggest a feature",
  },
  {
    id: "IMPROVEMENT",
    label: "Improvement",
    icon: "trending-up-outline",
    description: "Suggest improvement",
  },
];

export default function FeedbackScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<FeedbackType>("FEEDBACK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [initFailed, setInitFailed] = useState(false);

  // Refs for race condition prevention and memory leak protection
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize app — extracted so it can be retried
  const initApp = async (signal?: AbortSignal) => {
    setInitFailed(false);
    try {
      const response = await axiosInstance.get(endpoints.bug.initApp, {
        ...(signal ? { signal } : {}),
      });
      if (isMountedRef.current) {
        const appData = extractResponseData(response.data);
        if (appData?.appId) {
          setAppId(appData.appId);
        }
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
        console.error("Failed to initialize app:", error);
        if (isMountedRef.current) {
          setInitFailed(true);
        }
      }
    }
  };

  // Initialize app on mount with cleanup
  useEffect(() => {
    const controller = new AbortController();
    initApp(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const pickImage = async () => {
    // Prevent multiple picker opens
    if (isPicking) return;
    setIsPicking(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        toast.error("Permission Required", {
          description:
            "Please allow access to your photo library to attach screenshots.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file size
        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          toast.warning("Image Too Large", {
            description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
          });
          return;
        }

        setScreenshot(asset);
      }
    } finally {
      setIsPicking(false);
    }
  };

  const removeScreenshot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScreenshot(null);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      toast.error("Title Required", {
        description: "Please enter a title for your feedback.",
      });
      return false;
    }
    if (title.trim().length < 5) {
      toast.error("Title Too Short", {
        description: "Title must be at least 5 characters.",
      });
      return false;
    }
    if (!description.trim()) {
      toast.error("Description Required", {
        description: "Please describe your feedback in detail.",
      });
      return false;
    }
    if (description.trim().length < 10) {
      toast.error("Description Too Short", {
        description: "Please provide more details (at least 10 characters).",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    // Prevent duplicate submissions with synchronous ref check
    if (isSubmittingRef.current || isSubmitting) return;
    if (!validateForm()) return;

    // Check appId is initialized — auto-retry if not
    if (!appId) {
      toast.error("Not Ready", {
        description: "Initializing... Please try again in a moment.",
      });
      initApp();
      return;
    }

    isSubmittingRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    try {
      // Create the bug report
      const reportData = {
        appId: appId,
        module: "Feedback",
        reportType: selectedType,
        title: title.trim(),
        description: description.trim(),
        osName: Platform.OS,
        osVersion: Platform.Version?.toString(),
        appVersion: Constants.expoConfig?.version || "1.0.0",
      };

      const response = await axiosInstance.post(
        endpoints.bug.createReport,
        reportData,
      );
      const responseData = extractResponseData(response.data);
      const reportId = responseData?.id;

      if (!reportId) {
        throw new Error("Invalid server response - missing report ID");
      }

      // Upload screenshot if attached
      let screenshotFailed = false;
      if (screenshot) {
        try {
          const formData = new FormData();
          formData.append("bugReportId", reportId);

          // Use correct MIME type from asset or derive from URI
          const fileExtension =
            screenshot.uri.split(".").pop()?.toLowerCase() || "jpg";
          const mimeType =
            screenshot.mimeType ||
            (fileExtension === "png" ? "image/png" : "image/jpeg");

          formData.append("screenshot", {
            uri: screenshot.uri,
            type: mimeType,
            name: `screenshot.${fileExtension}`,
          } as any);

          await axiosInstance.post(endpoints.bug.uploadScreenshot, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (uploadError) {
          console.warn("Screenshot upload failed:", uploadError);
          screenshotFailed = true;
        }
      }

      // Sync to Google Sheets if configured
      try {
        await axiosInstance.post(endpoints.bug.syncReport(reportId));
      } catch (syncError) {
        console.warn("Google Sheets sync failed:", syncError);
        // Don't fail the whole submission if sync fails
      }

      // Show appropriate success message
      if (screenshotFailed) {
        toast.warning("Feedback Submitted", {
          description:
            "Your feedback was submitted but the screenshot failed to upload.",
        });
      } else {
        toast.success("Thank You!", {
          description: "Your feedback has been submitted successfully.",
        });
      }

      // Navigate back - don't reset state after navigation
      router.back();
    } catch (error: any) {
      console.error("Failed to submit feedback:", error);
      if (isMountedRef.current) {
        toast.error("Submission Failed", {
          description: extractErrorMessage(error, "Please try again later."),
        });
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.neutral.black}
            />
          </Pressable>

          <Text style={styles.headerTitle}>Send Feedback</Text>

          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Init failure retry banner */}
            {initFailed && !appId && (
              <Pressable
                style={styles.retryBanner}
                onPress={() => initApp()}
                accessible={true}
                accessibilityLabel="Retry connection"
                accessibilityRole="button"
              >
                <Ionicons name="refresh-outline" size={18} color="#D97706" />
                <Text style={styles.retryBannerText}>
                  Connection failed. Tap to retry.
                </Text>
              </Pressable>
            )}

            {/* Feedback Type Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What type of feedback?</Text>
              <View style={styles.typeGrid}>
                {feedbackTypes.map((type) => (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.typeCard,
                      selectedType === type.id && styles.typeCardSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedType(type.id);
                    }}
                  >
                    <View
                      style={[
                        styles.typeIconContainer,
                        selectedType === type.id &&
                          styles.typeIconContainerSelected,
                      ]}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={20}
                        color={
                          selectedType === type.id
                            ? "#FFFFFF"
                            : theme.colors.neutral.gray[600]
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.typeLabel,
                        selectedType === type.id && styles.typeLabelSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Title</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Brief summary of your feedback"
                  placeholderTextColor={theme.colors.neutral.gray[400]}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  returnKeyType="next"
                />
                <Text style={styles.charCount}>{title.length}/100</Text>
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Please describe your feedback in detail..."
                  placeholderTextColor={theme.colors.neutral.gray[400]}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={1000}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/1000</Text>
              </View>
            </View>

            {/* Screenshot */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Screenshot (Optional)</Text>

              {screenshot ? (
                <View style={styles.screenshotContainer}>
                  <Image
                    source={{ uri: screenshot.uri }}
                    style={styles.screenshotPreview}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.removeScreenshotButton}
                    onPress={removeScreenshot}
                  >
                    <Ionicons name="close-circle" size={28} color="#EF4444" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.addScreenshotButton}
                  onPress={pickImage}
                >
                  <Ionicons
                    name="camera-outline"
                    size={24}
                    color={theme.colors.neutral.gray[500]}
                  />
                  <Text style={styles.addScreenshotText}>Add Screenshot</Text>
                </Pressable>
              )}
            </View>

            {/* Submit Button */}
            <Pressable
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </Pressable>

            {/* Footer Note */}
            <Text style={styles.footerNote}>
              Your feedback helps us improve the app. Thank you!
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.heavy as any,
    color: theme.colors.neutral.black,
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.md,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  typeCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.neutral.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  typeCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.background.white}`,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral.gray[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  typeIconContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  typeLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: "center",
  },
  typeLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  inputContainer: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[200],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  textInput: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[900],
    fontFamily: theme.typography.fontFamily.primary,
    padding: theme.spacing.lg,
    minHeight: 50,
  },
  textArea: {
    minHeight: 150,
  },
  charCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[400],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: "right",
    paddingRight: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  screenshotContainer: {
    position: "relative",
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
  },
  screenshotPreview: {
    width: "100%",
    height: 180,
    borderRadius: theme.borderRadius.lg,
  },
  removeScreenshotButton: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.neutral.white,
    borderRadius: 14,
  },
  addScreenshotButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.neutral.gray[300],
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  addScreenshotText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.primary,
  },
  footerNote: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: "center",
    marginTop: theme.spacing.lg,
  },
  retryBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    gap: 8,
  },
  retryBannerText: {
    fontSize: theme.typography.fontSize.sm,
    color: "#D97706",
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: "500",
  },
});
