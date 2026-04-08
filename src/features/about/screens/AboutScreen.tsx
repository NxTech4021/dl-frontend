import { theme } from "@core/theme/theme";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeuceLogo } from "../../onboarding";
// Safe haptics wrapper - handles unsupported devices gracefully
const triggerHaptic = async (
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not supported on this device
  }
};

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

interface LinkItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
}

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ||
    Constants.expoConfig?.android?.versionCode ||
    "1";
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] =
    useState(false);
  const [dataCollectionModalVisible, setDataCollectionModalVisible] =
    useState(false);

  const openExternalURL = useCallback(
    async (url: string, fallbackMessage: string) => {
      try {
        const result = await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
        });
        if (result.type === "cancel" || result.type === "dismiss") return;
      } catch (error) {
        if (__DEV__) console.error("Failed to open URL:", error);
        Alert.alert("Unable to Open", fallbackMessage);
      }
    },
    [],
  );

  const handleOpenPrivacyPolicy = useCallback(() => {
    triggerHaptic();
    openExternalURL(
      "https://deuceleague.com/privacy-policy",
      "Unable to open Terms of Service.",
    );
  }, [openExternalURL]);

  const handleOpenDataCollection = useCallback(() => {
    triggerHaptic();
    setDataCollectionModalVisible(true);
  }, []);

  const handleOpenTerms = useCallback(() => {
    triggerHaptic();
    openExternalURL(
      "https://deuceleague.com/terms-of-service",
      "Unable to open Terms of Service.",
    );
  }, [openExternalURL]);

  const handleOpenWebsite = useCallback(() => {
    triggerHaptic();
    openExternalURL("https://deuceleague.com", "Unable to open the website.");
  }, [openExternalURL]);

  const links: LinkItem[] = useMemo(
    () => [
      {
        id: "privacy",
        title: "Privacy Policy",
        icon: "shield-outline",
        action: handleOpenPrivacyPolicy,
      },
      {
        id: "dataCollection",
        title: "Data Collection Notice",
        icon: "information-circle-outline",
        action: handleOpenDataCollection,
      },
      {
        id: "terms",
        title: "Terms of Service",
        icon: "document-text-outline",
        action: handleOpenTerms,
      },
      {
        id: "website",
        title: "Visit Our Website",
        icon: "globe-outline",
        action: handleOpenWebsite,
      },
    ],
    [
      handleOpenPrivacyPolicy,
      handleOpenDataCollection,
      handleOpenTerms,
      handleOpenWebsite,
    ],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => {
              triggerHaptic();
              router.back();
            }}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.headerTitle}>About</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Logo and Info */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <DeuceLogo width={50} height={60} />
              </View>
            </View>
            <Text style={styles.appName}>Deuce League</Text>
            <Text style={styles.appTagline}>Play. Compete. Connect.</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>
                Version {appVersion} ({buildNumber})
              </Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                Deuce League is the ultimate platform for racket sports
                enthusiasts. Join leagues, schedule matches, track your
                progress, and connect with players in your area. Whether you
                play Tennis, Pickleball, or Padel - we've got you covered.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresContainer}>
              <View style={styles.featureRow}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="trophy-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Leagues</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Scheduling</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="stats-chart-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Ratings</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Chat</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Community</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons
                      name="tennisball-outline"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <Text style={styles.featureText}>Multi-Sport</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal & Links</Text>
            <View style={styles.linksContainer}>
              {links.map((link, index) => (
                <React.Fragment key={link.id}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.linkItem,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={link.action}
                    accessible={true}
                    accessibilityLabel={link.title}
                    accessibilityRole="link"
                    accessibilityHint={`Opens ${link.title}`}
                  >
                    <View style={styles.linkIcon}>
                      <Ionicons
                        name={link.icon}
                        size={20}
                        color={theme.colors.neutral.gray[600]}
                      />
                    </View>
                    <Text style={styles.linkText}>{link.title}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.colors.neutral.gray[400]}
                    />
                  </Pressable>
                  {index < links.length - 1 && (
                    <View style={styles.linkDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.copyrightText}>
              {currentYear} Deuce League. All rights reserved.
            </Text>
            <Text style={styles.madeWithText}>
              Made with love for racket sports
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Privacy Policy Modal */}
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
                triggerHaptic();
                setPrivacyPolicyModalVisible(false);
              }}
              style={styles.legalCloseButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.neutral.gray[600]}
              />
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
              <Text
                style={[
                  styles.legalSectionTitle,
                  { marginTop: 0, borderTopWidth: 0, paddingTop: 0 },
                ]}
              >
                Last Updated: January 15, {new Date().getFullYear()}
              </Text>
              <Text style={styles.legalText}>
                Welcome to Deuce League! We value your privacy and are committed
                to protecting your personal information. This Privacy Policy
                explains how we collect, use, and safeguard your data when you
                use our platform.
              </Text>
              <Text style={styles.legalSectionTitle}>
                Information We Collect
              </Text>
              <Text style={styles.legalText}>
                - Personal Information: Name, email address, phone number, and
                profile photo{"\n"}- Game Data: Match results, skill levels, and
                playing statistics{"\n"}- Location Data: Court locations and
                check-ins (with your permission){"\n"}- Device Information:
                Device type, operating system, and app usage analytics
              </Text>
              <Text style={styles.legalSectionTitle}>
                How We Use Your Information
              </Text>
              <Text style={styles.legalText}>
                We use your information to provide and improve our services,
                including matching you with other players, tracking your
                progress, and enhancing your overall experience. We never sell
                your personal data to third parties.
              </Text>
              <Text style={styles.legalSectionTitle}>Data Security</Text>
              <Text style={styles.legalText}>
                We implement industry-standard security measures to protect your
                data, including encryption, secure servers, and regular security
                audits. Your information is stored securely and accessed only by
                authorized personnel.
              </Text>
              <Text style={styles.legalSectionTitle}>Your Rights</Text>
              <Text style={styles.legalText}>
                You have the right to access, update, or delete your personal
                information at any time. You can also opt out of certain data
                collection practices through your account settings.
              </Text>
              <Text style={styles.legalSectionTitle}>Contact Us</Text>
              <Text style={styles.legalText}>
                If you have any questions about this Privacy Policy, please
                contact our privacy team at privacy@deuceleague.com or through
                the app's contact form.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Data Collection Notice Modal */}
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
                triggerHaptic();
                setDataCollectionModalVisible(false);
              }}
              style={styles.legalCloseButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.neutral.gray[600]}
              />
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
              <Text
                style={[
                  styles.legalSectionTitle,
                  { marginTop: 0, borderTopWidth: 0, paddingTop: 0 },
                ]}
              >
                What Data We Collect
              </Text>
              <Text style={styles.legalSubTitle}>Account Information</Text>
              <Text style={styles.legalText}>
                When you create an account, we collect your name, email address,
                phone number, and any profile information you choose to provide.
              </Text>
              <Text style={styles.legalSubTitle}>Game Performance Data</Text>
              <Text style={styles.legalText}>
                We track your match results, game statistics, skill progression,
                and tournament participation to provide personalized
                recommendations and improve matchmaking.
              </Text>
              <Text style={styles.legalSubTitle}>Location Information</Text>
              <Text style={styles.legalText}>
                With your permission, we collect location data to help you find
                nearby courts, track court visits, and provide location-based
                features.
              </Text>
              <Text style={styles.legalSubTitle}>Usage Analytics</Text>
              <Text style={styles.legalText}>
                We collect anonymous usage data to understand how our app is
                used, identify bugs, and improve performance. This includes app
                crashes, feature usage, and navigation patterns.
              </Text>
              <Text style={styles.legalSectionTitle}>
                Why We Collect This Data
              </Text>
              <Text style={styles.legalText}>
                - To match you with players of similar skill levels{"\n"}- To
                track your progress and achievements{"\n"}- To recommend courts
                and events near you{"\n"}- To improve app performance and user
                experience{"\n"}- To provide customer support and resolve issues
              </Text>
              <Text style={styles.legalSectionTitle}>Data Retention</Text>
              <Text style={styles.legalText}>
                We retain your data for as long as your account is active. If
                you delete your account, we will permanently remove your
                personal information within 30 days, except for anonymized usage
                data used for analytics.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    color: "#FFFFFF",
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  logoSection: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.lg,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.neutral.white,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  appName: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeight.heavy as any,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  appTagline: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.md,
  },
  versionBadge: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  versionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium as any,
    fontFamily: theme.typography.fontFamily.primary,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.md,
  },
  descriptionCard: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
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
  descriptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 24,
    textAlign: "center",
  },
  featuresContainer: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
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
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  featureText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: "center",
  },
  linksContainer: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.lg,
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
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutral.gray[50],
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  linkText: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
  },
  linkDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[100],
    marginLeft: theme.spacing.lg + 36 + theme.spacing.md,
  },
  footer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  copyrightText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
  madeWithText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[400],
    fontFamily: theme.typography.fontFamily.primary,
  },
  legalModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  legalModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.gray[200],
  },
  legalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legalModalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
  },
  legalHeaderSpacer: {
    width: 36,
  },
  legalModalContent: {
    flex: 1,
  },
  legalScrollContent: {
    padding: theme.spacing.lg,
  },
  legalContentContainer: {
    gap: theme.spacing.md,
  },
  legalSectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[800],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.gray[100],
  },
  legalSubTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
  },
  legalText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: 22,
  },
});
