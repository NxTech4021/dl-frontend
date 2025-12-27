import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  Platform,
  Linking,
  Image,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

// BackgroundGradient Component (consistent with settings)
const BackgroundGradient = () => {
  return (
    <LinearGradient
      colors={['#FE9F4D', '#FFF5EE', '#FFFFFF']}
      locations={[0, 0.4, 1.0]}
      style={styles.backgroundGradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
};

interface LinkItem {
  id: string;
  title: string;
  icon: string;
  action: () => void;
}

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || '1';

  const handleOpenPrivacyPolicy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/privacyPolicy');
  };

  const handleOpenTerms = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Create terms page or open external URL
    Linking.openURL('https://deuceleague.com/terms');
  };

  const handleOpenWebsite = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://deuceleague.com');
  };

  const links: LinkItem[] = [
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'shield-outline',
      action: handleOpenPrivacyPolicy,
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: 'document-text-outline',
      action: handleOpenTerms,
    },
    {
      id: 'website',
      title: 'Visit Our Website',
      icon: 'globe-outline',
      action: handleOpenWebsite,
    },
  ];

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
                <Ionicons name="tennisball" size={48} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={styles.appName}>Deuce League</Text>
            <Text style={styles.appTagline}>Play. Compete. Connect.</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>Version {appVersion} ({buildNumber})</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                Deuce League is the ultimate platform for racket sports enthusiasts.
                Join leagues, schedule matches, track your progress, and connect with
                players in your area. Whether you play Tennis, Pickleball, or Padel -
                we've got you covered.
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
                    <Ionicons name="trophy-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureText}>Leagues</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureText}>Scheduling</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="stats-chart-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureText}>Ratings</Text>
                </View>
              </View>
              <View style={styles.featureRow}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureText}>Chat</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.featureText}>Community</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="tennisball-outline" size={20} color={theme.colors.primary} />
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
                    style={styles.linkItem}
                    onPress={link.action}
                  >
                    <View style={styles.linkIcon}>
                      <Ionicons name={link.icon as any} size={20} color={theme.colors.neutral.gray[600]} />
                    </View>
                    <Text style={styles.linkText}>{link.title}</Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.colors.neutral.gray[400]} />
                  </Pressable>
                  {index < links.length - 1 && <View style={styles.linkDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.copyrightText}>
              {new Date().getFullYear()} Deuce League. All rights reserved.
            </Text>
            <Text style={styles.madeWithText}>
              Made with love for racket sports
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
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
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.heavy as any,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  logoSection: {
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  featureText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutral.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
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
});
