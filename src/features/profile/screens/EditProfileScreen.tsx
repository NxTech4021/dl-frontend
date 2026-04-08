import { useSession } from "@/lib/auth-client";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { theme } from "@core/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageStyle,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { toast } from "sonner-native";

// Import shared profile image upload hook
import { useProfileImageUpload } from "@/src/shared/hooks/useProfileImageUpload";

// Constants
const DEBOUNCE_DELAY = 500;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

// Validation function
const validateUsername = (
  username: string,
): { isValid: boolean; error: string } => {
  const trimmed = username.trim();
  if (!trimmed) {
    return { isValid: false, error: "Username is required" };
  }
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Username must be at least ${MIN_USERNAME_LENGTH} characters`,
    };
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Username must be less than ${MAX_USERNAME_LENGTH} characters`,
    };
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }
  return { isValid: true, error: "" };
};

// Safe haptics wrapper
const triggerHaptic = async (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not supported on this device
  }
};

interface FormData {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  location: string;
  bio: string;
  profilePicture: string;
  dateOfBirth: string;
}

interface ProfileData {
  name: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  area: string | null;
  bio: string | null;
  image: string | null;
  dateOfBirth: string | null;
}

interface ProfileUpdateResponse {
  success: boolean;
  data: ProfileData;
  message?: string;
}

export default function EditProfileScreen() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    username: "",
    email: "",
    phoneNumber: "",
    location: "",
    bio: "",
    profilePicture: "",
    dateOfBirth: "",
  });

  // Store original data to detect changes
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "unchanged"
  >("idle");
  const [usernameError, setUsernameError] = useState("");
  const usernameDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Focus states for enhanced input styling
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const entryAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isSavingRef = useRef(false);
  const isMountedRef = useRef(true);
  const saveAbortRef = useRef<AbortController | null>(null);

  // Use shared profile image upload hook
  const {
    isUploadingImage,
    setProfileImage,
    pickImageFromLibrary,
    openCamera,
  } = useProfileImageUpload({
    userId: session?.user?.id,
    onUploadSuccess: (imageUrl) => {
      updateField("profilePicture", imageUrl);
    },
  });

  // Helper function to safely parse date of birth
  const parseDateOfBirth = (dob: string | null): string => {
    if (!dob) return "";
    try {
      const date = new Date(dob);
      if (isNaN(date.getTime())) return "";
      return dob.split("T")[0];
    } catch {
      return "";
    }
  };

  // Check username availability
  const checkUsernameAvailability = useCallback(
    async (usernameValue: string, originalUsername: string) => {
      // If username hasn't changed from original, mark as unchanged
      if (
        usernameValue.trim().toLowerCase() === originalUsername.toLowerCase()
      ) {
        setUsernameStatus("unchanged");
        setUsernameError("");
        return;
      }

      const validation = validateUsername(usernameValue);

      if (!validation.isValid) {
        setUsernameStatus("idle");
        setUsernameError(validation.error);
        return;
      }

      setUsernameStatus("checking");
      setUsernameError("");

      try {
        const response = await axiosInstance.post(
          endpoints.auth.checkUsername,
          {
            username: usernameValue.trim(),
          },
        );

        if (response.data?.data?.available) {
          setUsernameStatus("available");
          setUsernameError("");
        } else {
          setUsernameStatus("taken");
          setUsernameError(
            response.data?.message || "This username is already taken",
          );
        }
      } catch (error: any) {
        if (__DEV__) console.error("Username check error:", error);
        setUsernameStatus("idle");
        if (error.code === "ERR_NETWORK" || !error.response) {
          setUsernameError("Network error — please check your connection");
        } else {
          setUsernameError(
            error.response?.data?.message || "Could not verify username",
          );
        }
      }
    },
    [],
  );

  // Handle username change with debounced validation
  const handleUsernameChange = useCallback(
    (text: string) => {
      setFormData((prev) => ({ ...prev, username: text }));
      setUsernameStatus("idle");
      setUsernameError("");

      // Clear previous timer
      if (usernameDebounceTimer.current) {
        clearTimeout(usernameDebounceTimer.current);
      }

      // Only check if username looks valid and we have original data
      const trimmed = text.trim();
      if (
        trimmed.length >= MIN_USERNAME_LENGTH &&
        USERNAME_REGEX.test(trimmed) &&
        originalData
      ) {
        usernameDebounceTimer.current = setTimeout(() => {
          checkUsernameAvailability(text, originalData.username);
        }, DEBOUNCE_DELAY);
      }
    },
    [checkUsernameAvailability, originalData],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (usernameDebounceTimer.current)
        clearTimeout(usernameDebounceTimer.current);
    };
  }, []);

  // Fetch current profile data
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const fetchProfileData = async () => {
      if (!session?.user?.id) {
        setIsDataLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get("/api/player/profile/me", {
          signal,
        });

        if (signal.aborted) return;

        if (response?.data?.data) {
          const profileData = response.data.data;
          const loadedData: FormData = {
            fullName: profileData.name || "",
            username: profileData.username || "",
            email: profileData.email || "",
            phoneNumber: profileData.phoneNumber || "",
            location: profileData.area || "",
            bio: profileData.bio || "",
            profilePicture: profileData.image || "",
            dateOfBirth: parseDateOfBirth(profileData.dateOfBirth),
          };
          setFormData(loadedData);
          setOriginalData(loadedData);
          if (profileData.image) {
            setProfileImage(profileData.image);
          }
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        console.error("Error fetching profile data:", error);
        toast.error("Error", {
          description: "Failed to load profile data. Please try again.",
        });
      } finally {
        if (!signal.aborted) {
          setIsDataLoading(false);

          if (!hasPlayedEntryAnimation.current) {
            hasPlayedEntryAnimation.current = true;
            const animation = Animated.stagger(100, [
              Animated.parallel([
                Animated.spring(headerEntryOpacity, {
                  toValue: 1,
                  tension: 60,
                  friction: 10,
                  useNativeDriver: true,
                }),
                Animated.spring(headerEntryTranslateY, {
                  toValue: 0,
                  tension: 60,
                  friction: 10,
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.spring(contentEntryOpacity, {
                  toValue: 1,
                  tension: 60,
                  friction: 10,
                  useNativeDriver: true,
                }),
                Animated.spring(contentEntryTranslateY, {
                  toValue: 0,
                  tension: 60,
                  friction: 10,
                  useNativeDriver: true,
                }),
              ]),
            ]);
            entryAnimationRef.current = animation;
            animation.start();
          }
        }
      }
    };

    fetchProfileData();

    return () => {
      abortControllerRef.current?.abort();
      entryAnimationRef.current?.stop();
    };
  }, [
    session?.user?.id,
    setProfileImage,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      saveAbortRef.current?.abort();
    };
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    if (field === "username") {
      handleUsernameChange(value);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Show action sheet for image picker
  const handleImagePicker = () => {
    triggerHaptic();

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Take Photo", "Choose from Library"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            pickImageFromLibrary();
          }
        },
      );
    } else {
      Alert.alert(
        "Profile Picture",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Take Photo", onPress: () => openCamera() },
          {
            text: "Choose from Library",
            onPress: () => pickImageFromLibrary(),
          },
        ],
        { cancelable: true },
      );
    }
  };

  const handleSave = async () => {
    if (isSavingRef.current || isLoading) return;
    isSavingRef.current = true;

    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

    if (!session?.user?.id) {
      toast.error("Error", {
        description: "You must be logged in to update your profile",
      });
      isSavingRef.current = false;
      return;
    }

    // Basic validation
    if (!formData.fullName.trim() || !formData.username.trim()) {
      toast.error("Error", {
        description: "Please fill in all required fields (Name, Username)",
      });
      isSavingRef.current = false;
      return;
    }

    // Username format validation
    if (!USERNAME_REGEX.test(formData.username.trim())) {
      toast.error("Validation Error", {
        description:
          "Username can only contain letters, numbers, and underscores",
      });
      isSavingRef.current = false;
      return;
    }

    // Check username availability status
    if (usernameStatus === "taken") {
      toast.error("Username Taken", {
        description:
          "This username is already taken. Please choose a different username.",
      });
      isSavingRef.current = false;
      return;
    }

    if (usernameStatus === "checking") {
      toast.info("Please Wait", {
        description: "Checking username availability...",
      });
      isSavingRef.current = false;
      return;
    }

    // Phone number format validation
    if (formData.phoneNumber.trim()) {
      const phoneRegex = /^\+?[0-9\s\-()]+$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        toast.error("Validation Error", {
          description: "Please enter a valid phone number",
        });
        isSavingRef.current = false;
        return;
      }
    }

    // Check if any data has been changed
    if (originalData) {
      const hasChanges =
        formData.fullName.trim() !== originalData.fullName ||
        formData.username.trim() !== originalData.username ||
        formData.phoneNumber.trim() !== originalData.phoneNumber ||
        formData.location.trim() !== originalData.location ||
        formData.bio.trim() !== originalData.bio ||
        formData.profilePicture !== originalData.profilePicture;

      if (!hasChanges) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.warning("No Changes", {
          description:
            "No data has been modified. Make some changes before saving.",
        });
        isSavingRef.current = false;
        return;
      }
    }

    setIsLoading(true);
    saveAbortRef.current = new AbortController();

    try {
      const response = await axiosInstance.put(
        "/api/player/profile/me",
        {
          name: formData.fullName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(), // Keep email in request but it won't change
          location: formData.location.trim(),
          image: formData.profilePicture || null,
          phoneNumber: formData.phoneNumber.trim() || null,
          bio: formData.bio.trim(),
          dateOfBirth: formData.dateOfBirth || null,
        },
        {
          signal: saveAbortRef.current.signal,
        },
      );

      const apiResponse = response?.data as ProfileUpdateResponse | undefined;

      if (
        apiResponse &&
        "success" in apiResponse &&
        apiResponse.success &&
        apiResponse.data
      ) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("Profile Updated", {
          description: "Your profile has been successfully updated.",
        });

        navigationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.back();
          }
        }, 1500);
      } else {
        const errorMessage = (
          apiResponse && "message" in apiResponse
            ? apiResponse.message
            : "Failed to update profile"
        ) as string;
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error("Error updating profile:", error);

      if (
        originalData &&
        formData.profilePicture !== originalData.profilePicture
      ) {
        updateField("profilePicture", originalData.profilePicture);
        setProfileImage(originalData.profilePicture || null);
        toast.warning("Image Reverted", {
          description:
            "Your new profile picture was not saved. Please try again.",
        });
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      isSavingRef.current = false;
    }
  };

  // Field-specific max lengths
  const fieldMaxLengths: Record<keyof FormData, number> = {
    fullName: 100,
    username: 30,
    email: 254,
    phoneNumber: 20,
    location: 100,
    bio: 250,
    profilePicture: 2000,
    dateOfBirth: 10,
  };

  // Get validation icon for username
  const getUsernameValidationIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <ActivityIndicator size="small" color={theme.colors.primary} />;
      case "available":
        return (
          <View style={styles.validationIconContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
        );
      case "taken":
        return (
          <View style={styles.validationIconContainer}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </View>
        );
      case "unchanged":
        return (
          <View style={styles.validationIconContainer}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.neutral.gray[400]}
            />
          </View>
        );
      default:
        return null;
    }
  };

  // Get border color for username field
  const getUsernameBorderColor = () => {
    if (usernameStatus === "available") return "#10B981";
    if (usernameStatus === "taken") return "#EF4444";
    if (focusedField === "username") return theme.colors.primary;
    return theme.colors.neutral.gray[200];
  };

  // Show loading screen while fetching data
  if (isDataLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          style={{
            opacity: headerEntryOpacity,
            transform: [{ translateY: headerEntryTranslateY }],
          }}
        >
          <View style={styles.header}>
            <Pressable
              style={styles.headerButton}
              onPress={() => {
                triggerHaptic();
                router.back();
              }}
              accessible={true}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <View style={styles.headerButtonInner}>
                <Ionicons
                  name="close"
                  size={22}
                  color={theme.colors.neutral.gray[700]}
                />
              </View>
            </Pressable>

            <Text style={styles.headerTitle}>Edit Profile</Text>

            <Pressable
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
              accessible={true}
              accessibilityLabel="Save changes"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            flex: 1,
            opacity: contentEntryOpacity,
            transform: [{ translateY: contentEntryTranslateY }],
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoid}
          >
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Profile Picture Section */}
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  <View style={styles.profileImageWrapper}>
                    {isUploadingImage ? (
                      <View style={styles.uploadingImageContainer}>
                        <ActivityIndicator
                          size="large"
                          color={theme.colors.primary}
                        />
                      </View>
                    ) : formData.profilePicture ? (
                      <Image
                        source={{
                          uri: formData.profilePicture,
                          cache: "reload",
                        }}
                        style={styles.profileImage}
                      />
                    ) : (
                      <View style={styles.defaultProfileImage}>
                        <Svg width="56" height="56" viewBox="0 0 24 24">
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
                  <Pressable
                    style={[
                      styles.editImageButton,
                      isUploadingImage && styles.editImageButtonDisabled,
                    ]}
                    onPress={handleImagePicker}
                    disabled={isUploadingImage}
                    accessible={true}
                    accessibilityLabel="Change profile picture"
                    accessibilityRole="button"
                  >
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* Profile Name Preview */}
                <View style={styles.namePreviewSection}>
                  <Text style={styles.profileNamePreview}>
                    {formData.fullName || "Your Name"}
                  </Text>
                  <Text style={styles.profileUsernamePreview}>
                    @{formData.username || "username"}
                  </Text>
                </View>
              </View>

              {/* Form Card */}
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                {/* Full Name Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "fullName" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={formData.fullName}
                      onChangeText={(text) => updateField("fullName", text)}
                      placeholder="Enter your full name"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      editable={!isLoading}
                      maxLength={fieldMaxLengths.fullName}
                      onFocus={() => setFocusedField("fullName")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Username Input with Validation */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderColor: getUsernameBorderColor() },
                    ]}
                  >
                    <Text style={styles.atSymbol}>@</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.username}
                      onChangeText={(text) => updateField("username", text)}
                      placeholder="Choose a username"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      maxLength={fieldMaxLengths.username}
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => setFocusedField(null)}
                    />
                    {getUsernameValidationIcon()}
                  </View>
                  {usernameError ? (
                    <Text style={styles.errorText}>{usernameError}</Text>
                  ) : usernameStatus === "available" ? (
                    <Text style={styles.successText}>
                      Username is available
                    </Text>
                  ) : null}
                </View>

                {/* Email Input - Read Only */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View style={styles.readOnlyBadge}>
                      <Ionicons
                        name="lock-closed"
                        size={10}
                        color={theme.colors.neutral.gray[500]}
                      />
                      <Text style={styles.readOnlyText}>Read only</Text>
                    </View>
                  </View>
                  <View
                    style={[styles.inputWrapper, styles.inputWrapperDisabled]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={formData.email}
                      placeholder="Your email address"
                      placeholderTextColor={theme.colors.neutral.gray[300]}
                      editable={false}
                    />
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Email cannot be changed for security reasons
                  </Text>
                </View>

                {/* Phone Number Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "phoneNumber" &&
                        styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={formData.phoneNumber}
                      onChangeText={(text) => updateField("phoneNumber", text)}
                      placeholder="Enter your phone number"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      keyboardType="phone-pad"
                      editable={!isLoading}
                      maxLength={fieldMaxLengths.phoneNumber}
                      onFocus={() => setFocusedField("phoneNumber")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Location Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Location</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === "location" && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={formData.location}
                      onChangeText={(text) => updateField("location", text)}
                      placeholder="Enter your location"
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      editable={!isLoading}
                      maxLength={fieldMaxLengths.location}
                      onFocus={() => setFocusedField("location")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Birthday Input - Read Only */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Birthday</Text>
                    <View style={styles.readOnlyBadge}>
                      <Ionicons
                        name="lock-closed"
                        size={10}
                        color={theme.colors.neutral.gray[500]}
                      />
                      <Text style={styles.readOnlyText}>Read only</Text>
                    </View>
                  </View>
                  <View
                    style={[styles.inputWrapper, styles.inputWrapperDisabled]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputDisabled]}
                      value={formData.dateOfBirth || "Not set"}
                      placeholder="Your birthday"
                      placeholderTextColor={theme.colors.neutral.gray[300]}
                      editable={false}
                    />
                  </View>
                </View>

                {/* Bio Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <View
                    style={[
                      styles.bioWrapper,
                      focusedField === "bio" && styles.inputWrapperFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.bioInput}
                      value={formData.bio}
                      onChangeText={(text) => updateField("bio", text)}
                      placeholder="Tell us about yourself..."
                      placeholderTextColor={theme.colors.neutral.gray[400]}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      editable={!isLoading}
                      maxLength={500}
                      onFocus={() => setFocusedField("bio")}
                      onBlur={() => setFocusedField(null)}
                    />
                    <Text style={styles.charCounter}>
                      {formData.bio.length}/250
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom spacing */}
              <View style={{ height: 40 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  } as ViewStyle,
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
    zIndex: 0,
  } as ViewStyle,
  safeArea: {
    flex: 1,
    zIndex: 1,
  } as ViewStyle,
  keyboardAvoid: {
    flex: 1,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "transparent",
  } as ViewStyle,
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  headerButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  } as ViewStyle,
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.neutral.gray[800],
    fontFamily: "Inter",
    letterSpacing: -0.3,
  } as TextStyle,
  saveButton: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  } as ViewStyle,
  saveButtonDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter",
  } as TextStyle,
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  } as ViewStyle,
  scrollContent: {
    paddingBottom: 20,
  } as ViewStyle,
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "transparent",
  } as ViewStyle,
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  } as ViewStyle,
  profileImageWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  } as ViewStyle,
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  } as ImageStyle,
  defaultProfileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: theme.colors.neutral.gray[300],
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  editImageButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  } as ViewStyle,
  editImageButtonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
  uploadingImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(240, 240, 240, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  namePreviewSection: {
    alignItems: "center",
  } as ViewStyle,
  profileNamePreview: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.neutral.gray[800],
    fontFamily: "Inter",
    marginBottom: 4,
    letterSpacing: -0.3,
  } as TextStyle,
  profileUsernamePreview: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.neutral.gray[500],
    fontFamily: "Inter",
  } as TextStyle,
  formCard: {
    marginHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  } as ViewStyle,
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.neutral.gray[800],
    fontFamily: "Inter",
    marginBottom: 24,
    letterSpacing: -0.3,
  } as TextStyle,
  inputGroup: {
    marginBottom: 20,
  } as ViewStyle,
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as ViewStyle,
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.neutral.gray[600],
    fontFamily: "Inter",
    marginBottom: 8,
    letterSpacing: 0.2,
  } as TextStyle,
  readOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.neutral.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  } as ViewStyle,
  readOnlyText: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.neutral.gray[500],
    fontFamily: "Inter",
  } as TextStyle,
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.neutral.gray[50],
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral.gray[200],
    paddingHorizontal: 14,
    height: 50,
  } as ViewStyle,
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: "#FFFFFF",
  } as ViewStyle,
  inputWrapperDisabled: {
    backgroundColor: theme.colors.neutral.gray[100],
    borderColor: theme.colors.neutral.gray[200],
  } as ViewStyle,
  inputIcon: {
    marginRight: 10,
  } as TextStyle,
  atSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.neutral.gray[500],
    marginRight: 4,
    fontFamily: "Inter",
  } as TextStyle,
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.neutral.gray[800],
    fontFamily: "Inter",
    paddingVertical: 0,
  } as TextStyle,
  inputDisabled: {
    color: theme.colors.neutral.gray[500],
  } as TextStyle,
  validationIconContainer: {
    marginLeft: 8,
  } as ViewStyle,
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    fontFamily: "Inter",
    fontWeight: "500",
  } as TextStyle,
  successText: {
    fontSize: 12,
    color: "#10B981",
    marginTop: 6,
    fontFamily: "Inter",
    fontWeight: "500",
  } as TextStyle,
  helperText: {
    fontSize: 12,
    color: theme.colors.neutral.gray[400],
    marginTop: 6,
    fontFamily: "Inter",
    fontStyle: "italic",
  } as TextStyle,
  bioWrapper: {
    backgroundColor: theme.colors.neutral.gray[50],
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral.gray[200],
    padding: 14,
    minHeight: 120,
  } as ViewStyle,
  bioInput: {
    fontSize: 15,
    fontWeight: "400",
    color: theme.colors.neutral.gray[700],
    fontFamily: "Inter",
    lineHeight: 22,
    minHeight: 80,
  } as TextStyle,
  charCounter: {
    fontSize: 11,
    color: theme.colors.neutral.gray[400],
    textAlign: "right",
    marginTop: 8,
    fontFamily: "Inter",
    fontWeight: "500",
  } as TextStyle,
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  } as ViewStyle,
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  } as ViewStyle,
  loadingText: {
    fontSize: 15,
    color: theme.colors.neutral.gray[600],
    fontFamily: "Inter",
    marginTop: 16,
    fontWeight: "500",
  } as TextStyle,
});
