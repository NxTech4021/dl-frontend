import axiosInstance from "@/lib/endpoints";
import { theme } from "@/src/core/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

// Type definitions
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface PasswordChangeResponse {
  data?: {
    success?: boolean;
    message?: string;
  };
  message?: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

interface PasswordInputOptions {
  isConfirmPassword?: boolean;
  onFocus?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  testID?: string;
}

// BackgroundGradient Component (Removed to make it consistent to the new design)
// const BackgroundGradient = () => {
//   return (
//     <LinearGradient
//       colors={['#f2af74', '#FFF5EE', '#FFFFFF']}
//       locations={[0, 0.4, 1.0]}
//       style={styles.backgroundGradient}
//       start={{ x: 0.5, y: 0 }}
//       end={{ x: 0.5, y: 1 }}
//     />
//   );
// };

const PrivacySecuritySettings: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Password modal state
  const [passwordModalVisible, setPasswordModalVisible] =
    useState<boolean>(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [showCurrentPassword, setShowCurrentPassword] =
    useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmPasswordInputY, setConfirmPasswordInputY] = useState<number>(0);

  // Refs for safety guards
  const isMountedRef = useRef<boolean>(true);
  const isSubmittingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const passwordModalScrollRef = useRef<ScrollView | null>(null);

  const passwordModalBottomPadding = Math.max(
    insets.bottom + 32,
    Math.round(windowHeight * 0.18),
  );
  const passwordModalSideMargin = Math.max(16, Math.round(windowWidth * 0.04));
  const passwordModalCardPadding = windowWidth < 380 ? 20 : 24;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!passwordModalVisible) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      passwordModalScrollRef.current?.scrollTo({ y: 0, animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [passwordModalVisible]);

  // Password validation
  const validatePassword = useCallback(
    (password: string | null | undefined): PasswordValidation => {
      const safePassword = password ?? "";
      const minLength = safePassword.length >= 8;
      const hasUpperCase = /[A-Z]/.test(safePassword);
      const hasLowerCase = /[a-z]/.test(safePassword);
      const hasNumbers = /\d/.test(safePassword);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(safePassword);

      return {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar,
        isValid:
          minLength &&
          hasUpperCase &&
          hasLowerCase &&
          hasNumbers &&
          hasSpecialChar,
      };
    },
    [],
  );

  // Reset password form (defined before handlePasswordChange to avoid dependency issues)
  const resetPasswordForm = useCallback(() => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  // Handle password change with proper guards
  const handlePasswordChange = useCallback(async () => {
    // Ref-based guard to prevent double-submit race conditions
    if (isSubmittingRef.current) return;

    const errors: PasswordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = "New password is required";
    } else {
      const validation = validatePassword(passwordForm.newPassword);
      if (!validation.isValid) {
        errors.newPassword = "Password must meet all requirements";
      }
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Set guards BEFORE async operations
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPasswordErrors({});

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Make actual API call to change password
      const response = await axiosInstance.put(
        "/api/player/profile/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        {
          signal: abortControllerRef.current.signal,
        },
      );

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      // axiosInstance normalizes response to { success: true, data: ... }
      const typedResponse = response?.data;

      if (typedResponse?.success === true) {
        // Success feedback with haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Password Updated",
          "Your password has been successfully changed.",
          [
            {
              text: "OK",
              onPress: () => {
                if (isMountedRef.current) {
                  setPasswordModalVisible(false);
                  resetPasswordForm();
                }
              },
            },
          ],
        );
      } else {
        const errorMessage =
          typedResponse?.message ?? "Failed to change password";
        throw new Error(errorMessage);
      }
    } catch (error: unknown) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") return;

      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;

      // Error feedback with haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Safe error message extraction
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update password. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      if (isMountedRef.current) {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }, [passwordForm, validatePassword, resetPasswordForm]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    if (!isSubmitting) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPasswordModalVisible(false);
      resetPasswordForm();
    }
  }, [isSubmitting, resetPasswordForm]);

  // Render section header with proper icon typing
  const renderSectionHeader = useCallback(
    (title: string, icon: IoniconName) => (
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={theme.colors.neutral.black} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    ),
    [],
  );

  // Render button item
  const renderButtonItem = (
    label: string,
    description: string,
    onPress: () => void,
    buttonText: string = "Action",
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
        <Text style={styles.secondaryButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );

  // Render password input with visibility toggle
  const renderPasswordInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    showPassword: boolean,
    toggleShowPassword: () => void,
    error?: string,
    options?: PasswordInputOptions,
  ) => {
    const {
      isConfirmPassword = false,
      onFocus,
      onLayout,
      testID,
    } = options ?? {};

    // Check if passwords match for confirm password field
    const passwordsMatch =
      isConfirmPassword &&
      value &&
      passwordForm.newPassword &&
      value === passwordForm.newPassword;
    const passwordsDontMatch =
      isConfirmPassword &&
      value &&
      passwordForm.newPassword &&
      value !== passwordForm.newPassword;

    // Determine container style based on password matching
    const getContainerStyle = () => {
      if (error) return [styles.passwordInputContainer, styles.inputError];
      if (passwordsMatch)
        return [styles.passwordInputContainer, styles.inputSuccess];
      if (passwordsDontMatch)
        return [styles.passwordInputContainer, styles.inputWarning];
      return styles.passwordInputContainer;
    };

    return (
      <View style={styles.inputGroup} onLayout={onLayout} testID={testID}>
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          {isConfirmPassword && value && passwordForm.newPassword && (
            <View style={styles.matchIndicator}>
              <Ionicons
                name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                size={16}
                color={
                  passwordsMatch
                    ? theme.colors.semantic.success
                    : theme.colors.semantic.error
                }
              />
              <Text
                style={[
                  {
                    color: passwordsMatch
                      ? theme.colors.semantic.success
                      : theme.colors.semantic.error,
                  },
                  styles.matchText,
                ]}
              >
                {passwordsMatch ? "Passwords match" : "Passwords don't match"}
              </Text>
            </View>
          )}
        </View>

        <View style={getContainerStyle()}>
          <TextInput
            style={styles.passwordInput}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!showPassword}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.neutral.gray[400]}
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel={label}
            accessibilityHint={`Enter your ${label.toLowerCase()}`}
            importantForAccessibility="yes"
            maxLength={128}
            onFocus={onFocus}
          />

          <View style={styles.passwordRightSection}>
            {isConfirmPassword && value && passwordForm.newPassword && (
              <View style={styles.matchIconContainer}>
                <Ionicons
                  name={passwordsMatch ? "checkmark" : "close"}
                  size={18}
                  color={
                    passwordsMatch
                      ? theme.colors.semantic.success
                      : theme.colors.semantic.error
                  }
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleShowPassword();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
              accessibilityRole="button"
              accessibilityHint={
                showPassword
                  ? "Hides the password text"
                  : "Shows the password text"
              }
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={theme.colors.neutral.gray[400]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons
              name="warning"
              size={14}
              color={theme.colors.semantic.error}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isConfirmPassword && !error && passwordsDontMatch && (
          <View style={styles.warningContainer}>
            <Ionicons
              name="information-circle"
              size={14}
              color={theme.colors.semantic.warning}
            />
            <Text style={styles.warningText}>
              Passwords must match to continue
            </Text>
          </View>
        )}
      </View>
    );
  };

  const handleConfirmPasswordLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setConfirmPasswordInputY(event.nativeEvent.layout.y);
    },
    [],
  );

  const scrollConfirmPasswordIntoView = useCallback(() => {
    const topOffset = Math.max(32, Math.round(windowHeight * 0.12));

    requestAnimationFrame(() => {
      passwordModalScrollRef.current?.scrollTo({
        y: Math.max(0, confirmPasswordInputY - topOffset),
        animated: true,
      });
    });
  }, [confirmPasswordInputY, windowHeight]);

  // Password change modal
  const renderPasswordModal = () => (
    <Modal
      visible={passwordModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleModalClose}
    >
      <SafeAreaView style={styles.legalModalContainer}>
        <View style={styles.legalModalHeader}>
          <TouchableOpacity
            onPress={handleModalClose}
            disabled={isSubmitting}
            style={[
              styles.legalCloseButton,
              isSubmitting && styles.disabledButton,
            ]}
          >
            <Ionicons
              name="close"
              size={24}
              color={
                isSubmitting
                  ? theme.colors.neutral.gray[400]
                  : theme.colors.neutral.gray[600]
              }
            />
          </TouchableOpacity>
          <Text style={styles.legalModalTitle}>Change Password</Text>
          <TouchableOpacity
            onPress={handlePasswordChange}
            disabled={isSubmitting}
            style={[
              styles.passwordSaveButton,
              isSubmitting && styles.disabledButton,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.passwordSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          testID="change-password-keyboard-container"
          style={styles.legalModalBody}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <ScrollView
            ref={passwordModalScrollRef}
            testID="change-password-scroll"
            style={styles.legalModalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            contentContainerStyle={[
              styles.legalScrollContent,
              styles.passwordScrollContent,
              { paddingBottom: passwordModalBottomPadding },
            ]}
          >
            <View
              style={[
                styles.passwordContentContainer,
                {
                  marginHorizontal: passwordModalSideMargin,
                  padding: passwordModalCardPadding,
                },
              ]}
            >
              <Text style={styles.passwordDescription}>
                Create a strong password with at least 8 characters including
                uppercase, lowercase, numbers, and special characters.
              </Text>

              {renderPasswordInput(
                "Current Password",
                passwordForm.currentPassword,
                (text) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: text,
                  })),
                "Enter your current password",
                showCurrentPassword,
                () => setShowCurrentPassword(!showCurrentPassword),
                passwordErrors.currentPassword,
              )}

              {renderPasswordInput(
                "New Password",
                passwordForm.newPassword,
                (text) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: text })),
                "Enter your new password",
                showNewPassword,
                () => setShowNewPassword(!showNewPassword),
                passwordErrors.newPassword,
              )}

              {passwordForm.newPassword && (
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>
                    Password Strength
                  </Text>
                  <View style={styles.requirementsList}>
                    {Object.entries({
                      minLength: "At least 8 characters",
                      hasUpperCase: "One uppercase letter",
                      hasLowerCase: "One lowercase letter",
                      hasNumbers: "One number",
                      hasSpecialChar: "One special character",
                    }).map(([key, text]) => {
                      const validation = validatePassword(
                        passwordForm.newPassword,
                      );
                      const keyTyped = key as keyof PasswordValidation;
                      const isValid = validation[keyTyped];
                      return (
                        <View key={key} style={styles.requirementItem}>
                          <View
                            style={[
                              styles.requirementIcon,
                              isValid && styles.requirementIconValid,
                            ]}
                          >
                            <Ionicons
                              name={isValid ? "checkmark" : "close"}
                              size={12}
                              color={
                                isValid
                                  ? theme.colors.neutral.white
                                  : theme.colors.neutral.gray[400]
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.requirementText,
                              isValid && styles.requirementTextValid,
                            ]}
                          >
                            {text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              {renderPasswordInput(
                "Confirm New Password",
                passwordForm.confirmPassword,
                (text) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: text,
                  })),
                "Confirm your new password",
                showConfirmPassword,
                () => setShowConfirmPassword(!showConfirmPassword),
                passwordErrors.confirmPassword,
                {
                  isConfirmPassword: true,
                  onFocus: scrollConfirmPasswordIntoView,
                  onLayout: handleConfirmPasswordLayout,
                  testID: "change-password-confirm-group",
                },
              )}

              <View style={styles.passwordSecurityTip}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.passwordSecurityTipText}>
                  For your security, you'll be logged out of all devices after
                  changing your password.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );

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

          <Text style={styles.headerTitle}>Change Password</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Account Security Section */}
          <View style={styles.section}>
            {renderSectionHeader("Account Security", "lock-closed")}
            <View style={styles.card}>
              {renderButtonItem(
                "Change Password",
                "Update your account password",
                () => setPasswordModalVisible(true),
                "Change",
              )}
            </View>
          </View>
        </ScrollView>

        {renderPasswordModal()}
      </SafeAreaView>
    </View>
  );
};

// Please Use colors from the main theme.ts file

// Styles
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
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    fontSize: 20, // theme.typography.fontSize.xl
    fontWeight: "700", // theme.typography.fontWeight.heavy
    color: theme.colors.neutral.black,
    fontFamily: "Inter",
  },
  headerSpacer: {
    width: 44,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17, // theme.typography.fontSize.lg
    fontWeight: "600", // theme.typography.fontWeight.bold
    color: theme.colors.neutral.gray[700],
    marginLeft: 8,
    fontFamily: "Inter",
  },
  card: {
    backgroundColor: theme.colors.background.white,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[100],
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "600", // theme.typography.fontWeight.semibold (RN compatible)
    color: theme.colors.neutral.gray[900],
    marginBottom: 4,
    fontFamily: "Inter",
  },
  settingDescription: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: "400", // theme.typography.fontWeight.regular
    color: theme.colors.neutral.gray[500],
    lineHeight: 20, // theme.typography.lineHeight.normal
    fontFamily: "Inter",
  },
  secondaryButton: {
    backgroundColor: theme.colors.neutral.gray[100],
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: "600", // theme.typography.fontWeight.semibold (RN compatible)
    color: theme.colors.neutral.gray[700],
  },
  inputGroup: {
    marginVertical: 18,
  },
  inputLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 15, // theme.typography.fontSize.base
    fontWeight: "600", // theme.typography.fontWeight.semibold (RN compatible)
    color: theme.colors.neutral.gray[900],
    fontFamily: "Inter",
  },
  matchIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter",
    marginLeft: 4,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[200],
    borderRadius: 10,
    backgroundColor: theme.colors.neutral.gray[50],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "400", // theme.typography.fontWeight.regular
    color: theme.colors.neutral.gray[900],
    fontFamily: "Inter",
  },
  passwordRightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchIconContainer: {
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  inputError: {
    borderColor: theme.colors.semantic.error,
    borderWidth: 1.5,
  },
  inputSuccess: {
    borderColor: theme.colors.semantic.success,
    borderWidth: 1.5,
    backgroundColor: "#F0FDF4",
  },
  inputWarning: {
    borderColor: theme.colors.semantic.warning,
    borderWidth: 1.5,
    backgroundColor: "#FFFBEB",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.semantic.warning,
    marginLeft: 6,
    fontWeight: "400",
    fontFamily: "Inter",
    flex: 1,
  },
  errorText: {
    fontSize: 12, // theme.typography.fontSize.sm
    color: theme.colors.semantic.error,
    marginLeft: 6,
    fontWeight: "400", // theme.typography.fontWeight.regular
    fontFamily: "Inter",
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  passwordRequirements: {
    marginTop: 20,
    padding: 20,
    backgroundColor: theme.colors.neutral.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  requirementsTitle: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "600", // theme.typography.fontWeight.semibold (RN compatible)
    color: theme.colors.neutral.gray[700],
    marginBottom: 12,
    fontFamily: "Inter",
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  requirementIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.neutral.gray[200],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  requirementIconValid: {
    backgroundColor: theme.colors.semantic.success,
  },
  requirementText: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: "400", // theme.typography.fontWeight.regular
    color: theme.colors.neutral.gray[600],
    fontFamily: "Inter",
    flex: 1,
  },
  requirementTextValid: {
    color: theme.colors.semantic.success,
    fontWeight: "500",
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 12,
    padding: 20,
    backgroundColor: theme.colors.neutral.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "600", // theme.typography.fontWeight.semibold
    color: theme.colors.neutral.gray[900],
    fontFamily: "Inter",
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "400", // theme.typography.fontWeight.regular
    color: theme.colors.neutral.gray[700],
    fontFamily: "Inter",
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: "400", // theme.typography.fontWeight.regular
    color: theme.colors.neutral.gray[500],
    fontFamily: "Inter",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FEF3CD",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  securityNoteText: {
    fontSize: 12, // theme.typography.fontSize.sm
    color: theme.colors.neutral.gray[600],
    fontWeight: "400", // theme.typography.fontWeight.regular
    fontFamily: "Inter",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  contactButtonText: {
    color: theme.colors.background.white,
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: "600", // theme.typography.fontWeight.semibold
    fontFamily: "Inter",
    marginLeft: 8,
  },
  // Professional legal modal styles
  legalModalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.white,
  },
  legalModalBody: {
    flex: 1,
  },
  legalModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.background.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  legalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.neutral.gray[50],
    justifyContent: "center",
    alignItems: "center",
  },
  legalModalTitle: {
    fontSize: 17, // theme.typography.fontSize.lg
    fontWeight: "600", // theme.typography.fontWeight.bold
    color: theme.colors.neutral.gray[900],
    fontFamily: "Inter",
    textAlign: "center",
  },
  legalHeaderSpacer: {
    width: 44,
  },
  legalModalContent: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50],
  },
  legalScrollContent: {
    paddingBottom: 40,
  },
  passwordScrollContent: {
    flexGrow: 1,
  },
  // Professional password modal styles
  passwordSaveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  passwordSaveText: {
    color: theme.colors.neutral.white,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter",
  },
  passwordContentContainer: {
    backgroundColor: theme.colors.background.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  passwordDescription: {
    fontSize: 15,
    fontWeight: "400",
    color: theme.colors.neutral.gray[600],
    fontFamily: "Inter",
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  passwordSecurityTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FEF3CD",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  passwordSecurityTipText: {
    fontSize: 13,
    color: theme.colors.neutral.gray[700],
    fontWeight: "400",
    fontFamily: "Inter",
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

export default PrivacySecuritySettings;
