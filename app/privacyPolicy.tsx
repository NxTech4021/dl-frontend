import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

// Type definitions
interface PrivacySettings {
  // Currently no settings needed
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


const { width } = Dimensions.get('window');

// BackgroundGradient Component (consistent with settings)
const BackgroundGradient = () => {
  return (
    <LinearGradient
      colors={['#f2af74', '#FFF5EE', '#FFFFFF']}
      locations={[0, 0.4, 1.0]}
      style={styles.backgroundGradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
};

const PrivacySecuritySettings: React.FC = () => {
  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({});

  // Password modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState<boolean>(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Legal modal states
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState<boolean>(false);
  const [dataCollectionModalVisible, setDataCollectionModalVisible] = useState<boolean>(false);
  const [contactModalVisible, setContactModalVisible] = useState<boolean>(false);

 


  // Password validation
  const validatePassword = (password: string): PasswordValidation => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
    };
  };

  // Handle password change
  const handlePasswordChange = async () => {
    const errors: PasswordErrors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else {
      const validation = validatePassword(passwordForm.newPassword);
      if (!validation.isValid) {
        errors.newPassword = 'Password must meet all requirements';
      }
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      
      try {
        // Make actual API call to change password
        const { getBackendBaseURL } = await import('../src/config/network');
        const { authClient } = await import('../lib/auth-client');
        
        console.log('🔑 Frontend: Attempting to change password...');
        
        const backendUrl = getBackendBaseURL();
        const response = await authClient.$fetch(`${backendUrl}/api/player/profile/password`, {
          method: 'PUT',
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('🔑 Frontend: Password change response:', response);

        if (response && (response as any).data && (response as any).data.success) {
          // Success feedback with haptic
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Password Updated',
            'Your password has been successfully changed.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setPasswordModalVisible(false);
                  resetPasswordForm();
                }
              }
            ]
          );
        } else {
          const errorMessage = (response as any)?.data?.message || (response as any)?.message || 'Failed to change password';
          throw new Error(errorMessage);
        }
      } catch (error) {
        // Error feedback with haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.error('🔑 Frontend: Password change error:', error);
        
        const errorMessage = (error as any)?.message || 'Failed to update password. Please try again.';
        Alert.alert('Error', errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Error feedback for validation failures
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Reset password form
  const resetPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsSubmitting(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    if (!isSubmitting) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPasswordModalVisible(false);
      resetPasswordForm();
    }
  };

  // Render section header
  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={20} color={colors.text} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );



  // Render button item
  const renderButtonItem = (label: string, description: string, onPress: () => void, buttonText: string = 'Action') => (
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
    isConfirmPassword?: boolean
  ) => {
    // Check if passwords match for confirm password field
    const passwordsMatch = isConfirmPassword && value && passwordForm.newPassword && value === passwordForm.newPassword;
    const passwordsDontMatch = isConfirmPassword && value && passwordForm.newPassword && value !== passwordForm.newPassword;
    
    // Determine container style based on password matching
    const getContainerStyle = () => {
      if (error) return [styles.passwordInputContainer, styles.inputError];
      if (passwordsMatch) return [styles.passwordInputContainer, styles.inputSuccess];
      if (passwordsDontMatch) return [styles.passwordInputContainer, styles.inputWarning];
      return styles.passwordInputContainer;
    };

    return (
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Text style={styles.inputLabel}>{label}</Text>
          {isConfirmPassword && value && passwordForm.newPassword && (
            <View style={styles.matchIndicator}>
              <Ionicons
                name={passwordsMatch ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={passwordsMatch ? colors.success : colors.error}
              />
              <Text style={[styles.matchText, { color: passwordsMatch ? colors.success : colors.error }]}>
                {passwordsMatch ? 'Passwords match' : 'Passwords don\'t match'}
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
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.passwordRightSection}>
            {isConfirmPassword && value && passwordForm.newPassword && (
              <View style={styles.matchIconContainer}>
                <Ionicons
                  name={passwordsMatch ? 'checkmark' : 'close'}
                  size={18}
                  color={passwordsMatch ? colors.success : colors.error}
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
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {isConfirmPassword && !error && passwordsDontMatch && (
          <View style={styles.warningContainer}>
            <Ionicons name="information-circle" size={14} color={colors.warning} />
            <Text style={styles.warningText}>Passwords must match to continue</Text>
          </View>
        )}
      </View>
    );
  };

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
            style={[styles.legalCloseButton, isSubmitting && styles.disabledButton]}
          >
            <Ionicons name="close" size={24} color={isSubmitting ? colors.gray400 : colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.legalModalTitle}>Change Password</Text>
          <TouchableOpacity 
            onPress={handlePasswordChange}
            disabled={isSubmitting}
            style={[styles.passwordSaveButton, isSubmitting && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.passwordSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.legalModalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.legalScrollContent}
        >
          <View style={styles.passwordContentContainer}>
            <Text style={styles.passwordDescription}>
              Create a strong password with at least 8 characters including uppercase, lowercase, numbers, and special characters.
            </Text>

              {renderPasswordInput(
                'Current Password',
                passwordForm.currentPassword,
                (text) => setPasswordForm(prev => ({ ...prev, currentPassword: text })),
                'Enter your current password',
                showCurrentPassword,
                () => setShowCurrentPassword(!showCurrentPassword),
                passwordErrors.currentPassword
              )}

              {renderPasswordInput(
                'New Password',
                passwordForm.newPassword,
                (text) => setPasswordForm(prev => ({ ...prev, newPassword: text })),
                'Enter your new password',
                showNewPassword,
                () => setShowNewPassword(!showNewPassword),
                passwordErrors.newPassword
              )}

              {passwordForm.newPassword && (
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password Strength</Text>
                  <View style={styles.requirementsList}>
                    {Object.entries({
                      minLength: 'At least 8 characters',
                      hasUpperCase: 'One uppercase letter',
                      hasLowerCase: 'One lowercase letter', 
                      hasNumbers: 'One number',
                      hasSpecialChar: 'One special character',
                    }).map(([key, text]) => {
                      const validation = validatePassword(passwordForm.newPassword);
                      const keyTyped = key as keyof PasswordValidation;
                      const isValid = validation[keyTyped];
                      return (
                        <View key={key} style={styles.requirementItem}>
                          <View style={[styles.requirementIcon, isValid && styles.requirementIconValid]}>
                            <Ionicons
                              name={isValid ? 'checkmark' : 'close'}
                              size={12}
                              color={isValid ? colors.white : colors.gray400}
                            />
                          </View>
                          <Text style={[styles.requirementText, isValid && styles.requirementTextValid]}>
                            {text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
              {renderPasswordInput(
                'Confirm New Password',
                passwordForm.confirmPassword,
                (text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text })),
                'Confirm your new password',
                showConfirmPassword,
                () => setShowConfirmPassword(!showConfirmPassword),
                passwordErrors.confirmPassword,
                true // isConfirmPassword flag
              )}

            <View style={styles.passwordSecurityTip}>
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
              <Text style={styles.passwordSecurityTipText}>
                For your security, you'll be logged out of all devices after changing your password.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Privacy Policy Modal
  const renderPrivacyPolicyModal = () => (
    <Modal
      visible={privacyPolicyModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setPrivacyPolicyModalVisible(false)}
    >
      <SafeAreaView style={styles.legalModalContainer}>
        <View style={styles.legalModalHeader}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPrivacyPolicyModalVisible(false);
            }}
            style={styles.legalCloseButton}
          >
            <Ionicons name="close" size={24} color={colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.legalModalTitle}>Privacy Policy</Text>
          <View style={styles.legalHeaderSpacer} />
        </View>

        <ScrollView 
          style={styles.legalModalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.legalScrollContent}
        >
          <View style={styles.legalContentContainer}>
            <Text style={[styles.legalSectionTitle, { marginTop: 0, borderTopWidth: 0, paddingTop: 0 }]}>Last Updated: January 15, 2024</Text>
              
              <Text style={styles.legalText}>
                Welcome to Deuce League! We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our pickleball platform.
              </Text>

              <Text style={styles.legalSectionTitle}>Information We Collect</Text>
              <Text style={styles.legalText}>
                • Personal Information: Name, email address, phone number, and profile photo{"\n"}
                • Game Data: Match results, skill levels, and playing statistics{"\n"}
                • Location Data: Court locations and check-ins (with your permission){"\n"}
                • Device Information: Device type, operating system, and app usage analytics
              </Text>

              <Text style={styles.legalSectionTitle}>How We Use Your Information</Text>
              <Text style={styles.legalText}>
                We use your information to provide and improve our services, including matching you with other players, tracking your progress, and enhancing your overall experience. We never sell your personal data to third parties.
              </Text>

              <Text style={styles.legalSectionTitle}>Data Security</Text>
              <Text style={styles.legalText}>
                We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. Your information is stored securely and accessed only by authorized personnel.
              </Text>

              <Text style={styles.legalSectionTitle}>Your Rights</Text>
              <Text style={styles.legalText}>
                You have the right to access, update, or delete your personal information at any time. You can also opt out of certain data collection practices through your account settings.
              </Text>

              <Text style={styles.legalSectionTitle}>Contact Us</Text>
            <Text style={styles.legalText}>
              If you have any questions about this Privacy Policy, please contact our privacy team at privacy@deuceleague.com or through the app's contact form.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Data Collection Modal
  const renderDataCollectionModal = () => (
    <Modal
      visible={dataCollectionModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setDataCollectionModalVisible(false)}
    >
      <SafeAreaView style={styles.legalModalContainer}>
        <View style={styles.legalModalHeader}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setDataCollectionModalVisible(false);
            }}
            style={styles.legalCloseButton}
          >
            <Ionicons name="close" size={24} color={colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.legalModalTitle}>Data Collection Notice</Text>
          <View style={styles.legalHeaderSpacer} />
        </View>

        <ScrollView 
          style={styles.legalModalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.legalScrollContent}
        >
          <View style={styles.legalContentContainer}>
            <Text style={[styles.legalSectionTitle, { marginTop: 0, borderTopWidth: 0, paddingTop: 0 }]}>What Data We Collect</Text>
              
              <Text style={styles.legalSubTitle}>Account Information</Text>
              <Text style={styles.legalText}>
                When you create an account, we collect your name, email address, phone number, and any profile information you choose to provide.
              </Text>

              <Text style={styles.legalSubTitle}>Game Performance Data</Text>
              <Text style={styles.legalText}>
                We track your match results, game statistics, skill progression, and tournament participation to provide personalized recommendations and improve matchmaking.
              </Text>

              <Text style={styles.legalSubTitle}>Location Information</Text>
              <Text style={styles.legalText}>
                With your permission, we collect location data to help you find nearby courts, track court visits, and provide location-based features.
              </Text>

              <Text style={styles.legalSubTitle}>Usage Analytics</Text>
              <Text style={styles.legalText}>
                We collect anonymous usage data to understand how our app is used, identify bugs, and improve performance. This includes app crashes, feature usage, and navigation patterns.
              </Text>

              <Text style={styles.legalSectionTitle}>Why We Collect This Data</Text>
              <Text style={styles.legalText}>
                • To match you with players of similar skill levels{"\n"}
                • To track your progress and achievements{"\n"}
                • To recommend courts and events near you{"\n"}
                • To improve app performance and user experience{"\n"}
                • To provide customer support and resolve issues
              </Text>

              <Text style={styles.legalSectionTitle}>Data Retention</Text>
            <Text style={styles.legalText}>
              We retain your data for as long as your account is active. If you delete your account, we will permanently remove your personal information within 30 days, except for anonymized usage data used for analytics.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Contact Privacy Team Modal
  // const renderContactModal = () => (
  //   <Modal
  //     visible={contactModalVisible}
  //     animationType="slide"
  //     presentationStyle="pageSheet"
  //     onRequestClose={() => setContactModalVisible(false)}
  //   >
  //     <SafeAreaView style={styles.legalModalContainer}>
  //       <View style={styles.legalModalHeader}>
  //         <TouchableOpacity 
  //           onPress={() => {
  //             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //             setContactModalVisible(false);
  //           }}
  //           style={styles.legalCloseButton}
  //         >
  //           <Ionicons name="close" size={24} color={colors.gray600} />
  //         </TouchableOpacity>
  //         <Text style={styles.legalModalTitle}>Contact Privacy Team</Text>
  //         <View style={styles.legalHeaderSpacer} />
  //       </View>

  //       <ScrollView 
  //         style={styles.legalModalContent}
  //         showsVerticalScrollIndicator={false}
  //         contentContainerStyle={styles.legalScrollContent}
  //       >
  //         <View style={styles.legalContentContainer}>
  //           <Text style={[styles.legalSectionTitle, { marginTop: 0, borderTopWidth: 0, paddingTop: 0 }]}>Get in Touch</Text>
              
  //             <Text style={styles.legalText}>
  //               Our privacy team is here to help with any questions or concerns about your data privacy and security.
  //             </Text>

  //             <View style={styles.contactMethod}>
  //               <Ionicons name="mail" size={20} color={colors.primary} />
  //               <View style={styles.contactInfo}>
  //                 <Text style={styles.contactTitle}>Email</Text>
  //                 <Text style={styles.contactDetail}>privacy@deuceleague.com</Text>
  //                 <Text style={styles.contactDescription}>We typically respond within 24 hours</Text>
  //               </View>
  //             </View>

  //             <View style={styles.contactMethod}>
  //               <Ionicons name="time" size={20} color={colors.primary} />
  //               <View style={styles.contactInfo}>
  //                 <Text style={styles.contactTitle}>Response Time</Text>
  //                 <Text style={styles.contactDetail}>24-48 hours</Text>
  //                 <Text style={styles.contactDescription}>Monday through Friday, 9 AM - 6 PM PST</Text>
  //               </View>
  //             </View>

  //             <View style={styles.contactMethod}>
  //               <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
  //               <View style={styles.contactInfo}>
  //                 <Text style={styles.contactTitle}>What We Can Help With</Text>
  //                 <Text style={styles.contactDetail}>
  //                   • Data deletion requests{"\n"}
  //                   • Privacy policy questions{"\n"}
  //                   • Data access requests{"\n"}
  //                   • Security concerns{"\n"}
  //                   • Account privacy settings
  //                 </Text>
  //               </View>
  //             </View>

  //             <View style={styles.securityNote}>
  //               <Ionicons name="information-circle" size={16} color={colors.primary} />
  //               <Text style={styles.securityNoteText}>
  //                 For your security, never share your password or account credentials via email. Our team will never ask for this information.
  //               </Text>
  //             </View>

  //             <TouchableOpacity 
  //               style={styles.contactButton}
  //               onPress={() => {
  //                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //                 Alert.alert(
  //                   'Contact Sent',
  //                   'Your message has been sent to our privacy team. We\'ll get back to you within 24 hours.',
  //                   [{ text: 'OK' }]
  //                 );
  //               }}
  //             >
  //               <Ionicons name="send" size={16} color={colors.white} />
  //               <Text style={styles.contactButtonText}>Send Message</Text>
  //             </TouchableOpacity>
  //         </View>
  //       </ScrollView>
  //     </SafeAreaView>
  //   </Modal>
  // );

  return (
    <View style={styles.container}>
      <BackgroundGradient />
      
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
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          
          <Text style={styles.headerTitle}>Privacy & Security</Text>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Account Security Section */}
          <View style={styles.section}>
            {renderSectionHeader('Account Security', 'lock-closed')}
            <View style={styles.card}>
              {renderButtonItem(
                'Change Password',
                'Update your account password',
                () => setPasswordModalVisible(true),
                'Change'
              )}
            </View>
          </View>

          {/* Legal & Transparency Section */}
          <View style={styles.section}>
            {renderSectionHeader('Legal & Transparency', 'document-text')}
            <View style={styles.card}>
            {renderButtonItem(
              'Privacy Policy',
              'Read our privacy policy',
              () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPrivacyPolicyModalVisible(true);
              },
              'View'
            )}
            {renderButtonItem(
              'Data Collection Notice',
              'What data we collect and why',
              () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDataCollectionModalVisible(true);
              },
              'View'
            )}
            {/* {renderButtonItem(
              'Contact Privacy Team',
              'Questions about your privacy',
              () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setContactModalVisible(true);
              },
              'Contact'
            )} */}
            </View>
          </View>
        </ScrollView>

        {renderPasswordModal()}
        {renderPrivacyPolicyModal()}
        {renderDataCollectionModal()}
        {/* {renderContactModal()} */}
      </SafeAreaView>
    </View>
  );
};

// Modern color theme (consistent with settings)
const colors = {
  primary: '#FE9F4D',
  primaryLight: '#FFAB70',
  primaryDark: '#E8854A',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 0,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20, // theme.typography.fontSize.xl
    fontWeight: '700', // theme.typography.fontWeight.heavy
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  headerSpacer: {
    width: 44,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17, // theme.typography.fontSize.lg
    fontWeight: '600', // theme.typography.fontWeight.bold
    color: colors.gray700,
    marginLeft: 8,
    fontFamily: 'Inter',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: '600', // theme.typography.fontWeight.semibold (RN compatible)
    color: colors.gray900,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  settingDescription: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray500,
    lineHeight: 20, // theme.typography.lineHeight.normal
    fontFamily: 'Inter',
  },
  secondaryButton: {
    backgroundColor: colors.gray100,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  secondaryButtonText: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: '600', // theme.typography.fontWeight.semibold (RN compatible)
    color: colors.gray700,
  },
  inputGroup: {
    marginVertical: 18,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 15, // theme.typography.fontSize.base
    fontWeight: '600', // theme.typography.fontWeight.semibold (RN compatible)
    color: colors.gray900,
    fontFamily: 'Inter',
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    marginLeft: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray900,
    fontFamily: 'Inter',
  },
  passwordRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  inputSuccess: {
    borderColor: colors.success,
    borderWidth: 1.5,
    backgroundColor: '#F0FDF4',
  },
  inputWarning: {
    borderColor: colors.warning,
    borderWidth: 1.5,
    backgroundColor: '#FFFBEB',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  warningText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    fontWeight: '400',
    fontFamily: 'Inter',
    flex: 1,
  },
  errorText: {
    fontSize: 12, // theme.typography.fontSize.sm
    color: colors.error,
    marginLeft: 6,
    fontWeight: '400', // theme.typography.fontWeight.regular
    fontFamily: 'Inter',
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
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    fontWeight: '600', // theme.typography.fontWeight.semibold (RN compatible)
    color: colors.gray700,
    marginBottom: 12,
    fontFamily: 'Inter',
  },
  requirementsList: {
    gap: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  requirementIconValid: {
    backgroundColor: colors.success,
  },
  requirementText: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray600,
    fontFamily: 'Inter',
    flex: 1,
  },
  requirementTextValid: {
    color: colors.success,
    fontWeight: '500',
  },
  // Legal content styles
  legalContentContainer: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  legalSectionTitle: {
    fontSize: 18, // theme.typography.fontSize.lg+
    fontWeight: '700', // theme.typography.fontWeight.heavy
    color: colors.gray900,
    fontFamily: 'Inter',
    marginBottom: 16,
    marginTop: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  legalSubTitle: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: '600', // theme.typography.fontWeight.semibold
    color: colors.gray700,
    fontFamily: 'Inter',
    marginBottom: 8,
    marginTop: 16,
  },
  legalText: {
    fontSize: 15, // theme.typography.fontSize.base+
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray700,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
    padding: 20,
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    fontWeight: '600', // theme.typography.fontWeight.semibold
    color: colors.gray900,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray700,
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 12, // theme.typography.fontSize.sm
    fontWeight: '400', // theme.typography.fontWeight.regular
    color: colors.gray500,
    fontFamily: 'Inter',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3CD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  securityNoteText: {
    fontSize: 12, // theme.typography.fontSize.sm
    color: colors.gray600,
    fontWeight: '400', // theme.typography.fontWeight.regular
    fontFamily: 'Inter',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
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
    color: colors.white,
    fontSize: 14, // theme.typography.fontSize.base
    fontWeight: '600', // theme.typography.fontWeight.semibold
    fontFamily: 'Inter',
    marginLeft: 8,
  },
  // Professional legal modal styles
  legalModalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    backgroundColor: colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalModalTitle: {
    fontSize: 17, // theme.typography.fontSize.lg
    fontWeight: '600', // theme.typography.fontWeight.bold
    color: colors.gray900,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  legalHeaderSpacer: {
    width: 44,
  },
  legalModalContent: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  legalScrollContent: {
    paddingBottom: 40,
  },
  // Professional password modal styles
  passwordSaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordSaveText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  passwordContentContainer: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
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
    fontWeight: '400',
    color: colors.gray600,
    fontFamily: 'Inter',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  passwordSecurityTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3CD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  passwordSecurityTipText: {
    fontSize: 13,
    color: colors.gray700,
    fontWeight: '400',
    fontFamily: 'Inter',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

export default PrivacySecuritySettings;