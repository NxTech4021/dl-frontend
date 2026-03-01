import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { authClient } from '@/lib/auth-client';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';
import { navigateAndClearStack, setLogoutInProgress } from '@core/navigation';
import { useSettings } from '../hooks/useSettings';

const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Haptics not supported on this device
  }
};

// BackgroundGradient Component - half screen variant for settings
const BackgroundGradient = () => {
  return (
    <LinearGradient
      colors={[theme.colors.primary, '#FFF5EE', theme.colors.neutral.white]}
      locations={[0, 0.4, 1.0]}
      style={styles.backgroundGradient as ViewStyle}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
};

// Settings data structure
interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigate' | 'action';
  icon: keyof typeof Ionicons.glyphMap;
  value?: boolean;
  action?: () => void;
  iconColor?: string;
}

interface SettingSection {
  id: string;
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const { cleanup: cleanupPushNotifications } = usePushNotifications();
  const { settings, isLoading, loadError, updateSetting, retryLoad } = useSettings();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Timeout wrapper to prevent async operations from hanging indefinitely
  const withTimeout = useCallback(<T,>(promise: Promise<T>, ms: number, fallbackMessage: string): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          if (__DEV__) console.warn(fallbackMessage);
          resolve(null);
        }, ms);
      }),
    ]);
  }, []);

  const handleLogout = useCallback(() => {
    if (settings.hapticFeedback) {
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (isLoggingOut) return;
            setIsLoggingOut(true);
            // Signal globally so NavigationInterceptor blocks protected routes immediately
            // This prevents the brief "glimpse" of protected content during session teardown
            setLogoutInProgress(true);

            try {
              // Clean up push notifications with timeout (don't block logout if this hangs)
              await withTimeout(
                cleanupPushNotifications(),
                5000,
                'Push notification cleanup timed out, continuing logout...'
              );

              // Sign out from better-auth with timeout
              await withTimeout(
                authClient.signOut(),
                5000,
                'Auth signOut timed out, continuing cleanup...'
              );

              // signOut() above already clears the real SecureStore keys
              // (deuceleague_cookie, deuceleague_session_data) via the
              // expo client's init hook. No manual key deletion needed.

              toast.success('Signed Out', {
                description: 'You have been successfully signed out.',
              });

              navigateAndClearStack('/login');
              // Clear logout flag after navigation (brief delay for stack to settle)
              setTimeout(() => setLogoutInProgress(false), 500);
            } catch (error) {
              if (__DEV__) console.error('Logout error:', error);
              setLogoutInProgress(false);
              toast.error('Error', {
                description: 'Failed to sign out. Please try again.',
              });
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }, [settings.hapticFeedback, isLoggingOut, cleanupPushNotifications, withTimeout]);

  // Memoize settingSections to prevent recreation on every render
  const settingSections: SettingSection[] = useMemo(() => [
    {
      id: 'account',
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          type: 'navigate',
          icon: 'person-outline',
          action: () => router.push('/edit-profile'),
        },
        {
          id: 'privacy',
          title: 'Privacy & Security',
          subtitle: 'Manage your account security',
          type: 'navigate',
          icon: 'shield-outline',
          action: () => router.push('/privacyPolicy'),
        },
      ],
    },
    {
      id: 'preferences',
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive match updates and news',
          type: 'toggle',
          icon: 'notifications-outline',
          value: settings.notifications,
        },
        {
          id: 'matchReminders',
          title: 'Match Reminders',
          subtitle: 'Get reminded about upcoming matches',
          type: 'toggle',
          icon: 'time-outline',
          value: settings.matchReminders,
        },
        {
          id: 'locationServices',
          title: 'Location Services',
          subtitle: 'Find nearby courts and players',
          type: 'toggle',
          icon: 'location-outline',
          value: settings.locationServices,
        },
        {
          id: 'hapticFeedback',
          title: 'Haptic Feedback',
          subtitle: 'Feel vibrations for interactions',
          type: 'toggle',
          icon: 'phone-portrait-outline',
          value: settings.hapticFeedback,
        },
      ],
    },
    {
      id: 'support',
      title: 'Support & About',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          subtitle: 'Get help and support',
          type: 'navigate',
          icon: 'help-circle-outline',
          action: () => router.push('/help'),
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          subtitle: 'Share your thoughts with us',
          type: 'navigate',
          icon: 'chatbubble-outline',
          action: () => router.push('/feedback'),
        },
        {
          id: 'about',
          title: 'About Deuce',
          subtitle: `Version ${version}`,
          type: 'navigate',
          icon: 'information-circle-outline',
          action: () => router.push('/about'),
        },
      ],
    },
    {
      id: 'account_actions',
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          subtitle: isLoggingOut ? 'Signing out...' : 'Sign out of your account',
          type: 'action',
          icon: 'log-out-outline',
          action: handleLogout,
          iconColor: theme.colors.semantic?.error || '#EF4444',
        },
      ],
    },
  ], [settings, isLoggingOut, version, handleLogout]);

  const renderSettingItem = (item: SettingItem) => {
    // Fix: Don't handle toggle in Pressable - let Switch handle it to prevent double-update race condition
    const handlePress = async () => {
      if (isLoading || isLoggingOut) return;

      // Only handle non-toggle items - Switch handles toggle items via onValueChange
      if (item.type !== 'toggle' && item.action) {
        if (settings.hapticFeedback) {
          await triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
        }
        item.action();
      }
    };

    const getAccessibilityHint = () => {
      if (item.type === 'toggle') {
        return `Double tap to ${item.value ? 'disable' : 'enable'} ${item.title.toLowerCase()}`;
      }
      return `Double tap to ${item.title.toLowerCase()}`;
    };

    const isDisabled = isLoading || (item.id === 'logout' && isLoggingOut);

    return (
      <Pressable
        key={item.id}
        style={({ pressed }): StyleProp<ViewStyle> => [
          styles.settingItem as ViewStyle,
          { opacity: pressed || isDisabled ? 0.7 : 1 }
        ]}
        onPress={handlePress}
        disabled={isDisabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={
          item.type === 'toggle'
            ? { checked: item.value, disabled: isDisabled }
            : { disabled: isDisabled }
        }
      >
        <View style={styles.settingLeft as ViewStyle}>
          <View style={[
            styles.settingIcon as ViewStyle,
            item.iconColor && { backgroundColor: `${item.iconColor}15` }
          ]}>
            <Ionicons
              name={item.icon}
              size={20}
              color={item.iconColor || theme.colors.neutral.gray[600]}
            />
          </View>
          <View style={styles.settingText as ViewStyle}>
            <Text style={[
              styles.settingTitle as TextStyle,
              item.iconColor && { color: item.iconColor }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle as TextStyle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.settingRight as ViewStyle}>
          {item.type === 'toggle' ? (
            isLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Switch
                value={item.value}
                onValueChange={(value) => updateSetting(item.id as keyof typeof settings, value)}
                trackColor={{
                  false: theme.colors.neutral.gray[200],
                  true: `${theme.colors.primary}40`,
                }}
                thumbColor={item.value ? theme.colors.primary : theme.colors.neutral.white}
                ios_backgroundColor={theme.colors.neutral.gray[200]}
                disabled={isLoading}
                accessibilityLabel={`${item.title} toggle`}
                accessibilityHint={`Currently ${item.value ? 'enabled' : 'disabled'}`}
              />
            )
          ) : item.id === 'logout' && isLoggingOut ? (
            <ActivityIndicator size="small" color={item.iconColor || theme.colors.primary} />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.neutral.gray[400]}
            />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container as ViewStyle}>
      <BackgroundGradient />

      <SafeAreaView style={styles.safeArea as ViewStyle}>
        {/* Header */}
        <View style={styles.header as ViewStyle}>
          <Pressable
            style={styles.backButton as ViewStyle}
            onPress={async () => {
              if (settings.hapticFeedback) {
                await triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              }
              router.back();
            }}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral.white} />
          </Pressable>

          <Text style={styles.headerTitle as TextStyle}>Settings</Text>

          <View style={styles.headerSpacer as ViewStyle} />
        </View>

        {/* Error Banner - with live region for screen reader announcements */}
        {loadError && (
          <View accessibilityLiveRegion="polite">
            <Pressable
              style={styles.errorBanner as ViewStyle}
              onPress={retryLoad}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Error: Failed to load settings. Tap to retry."
              accessibilityHint="Double tap to retry loading your settings"
            >
              <Ionicons name="alert-circle" size={20} color={theme.colors.semantic?.error || '#EF4444'} />
              <Text style={styles.errorText as TextStyle}>
                Failed to load settings. Tap to retry.
              </Text>
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.scrollView as ViewStyle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent as ViewStyle}
        >
          {settingSections.map((section) => (
            <View key={section.id} style={styles.section as ViewStyle}>
              <Text
                style={styles.sectionTitle as TextStyle}
                accessibilityRole="header"
              >
                {section.title}
              </Text>

              <View style={styles.sectionContent as ViewStyle}>
                {section.items.map((item, itemIndex) => (
                  <React.Fragment key={item.id}>
                    {renderSettingItem(item)}
                    {itemIndex < section.items.length - 1 && (
                      <View style={styles.itemDivider as ViewStyle} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer as ViewStyle}>
            <Text style={styles.footerText as TextStyle}>Version {version}</Text>
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
    fontWeight: theme.typography.fontWeight.heavy as TextStyle['fontWeight'],
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 44,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: '#991B1B',
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as TextStyle['fontWeight'],
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionContent: {
    backgroundColor: theme.colors.neutral.white,
    marginHorizontal: theme.spacing.lg,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.neutral.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as TextStyle['fontWeight'],
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    lineHeight: theme.typography.lineHeight.normal,
  },
  settingRight: {
    marginLeft: theme.spacing.md,
  },
  itemDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[100],
    marginLeft: theme.spacing.lg + 36 + theme.spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as TextStyle['fontWeight'],
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
});
