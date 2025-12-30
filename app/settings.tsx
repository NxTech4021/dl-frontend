import React, { useState, useEffect } from 'react';
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
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toast } from 'sonner-native';

// BackgroundGradient Component (consistent with profile)
const BackgroundGradient = () => {
  return (
    <LinearGradient
      colors={['#FE9F4D', '#FFF5EE', '#FFFFFF']}
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
  icon: string;
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

  const [settings, setSettings] = useState({
    notifications: true,
    matchReminders: true,
    locationServices: false,
    hapticFeedback: true,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoadingSettings(true);
      setLoadError(null);

      // Try to load from backend first
      try {
        const backendUrl = getBackendBaseURL();
        const response = await authClient.$fetch(`${backendUrl}/api/player/settings`, {
          method: 'GET',
        }) as any;

        if (response && response.success && response.data) {
          const backendSettings = {
            notifications: response.data.notifications,
            matchReminders: response.data.matchReminders,
            locationServices: response.data.locationServices,
            hapticFeedback: response.data.hapticFeedback,
          };
          setSettings(backendSettings);
          // Also save to local storage as cache
          await AsyncStorage.setItem('user_settings', JSON.stringify(backendSettings));
          return;
        }
      } catch (backendError) {
        // Backend failed, fall back to local storage
      }

      // Fall back to local storage
      const savedSettings = await AsyncStorage.getItem('user_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      // Failed to load settings, use defaults
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLoadError(errorMessage);
      toast.error('Error', {
        description: 'Failed to load settings. Using defaults.',
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const retryLoadSettings = () => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    loadSettings();
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      // Save to local storage first (instant feedback)
      await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));

      // Sync to backend in background
      try {
        const backendUrl = getBackendBaseURL();
        await authClient.$fetch(`${backendUrl}/api/player/settings`, {
          method: 'PUT',
          body: JSON.stringify(newSettings),
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (backendError) {
        // Silent failure - already saved locally, will retry on next load
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Error', {
        description: 'Failed to save settings. Please try again.',
      });
      // Retry once after short delay
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));
          // Try backend sync again
          try {
            const backendUrl = getBackendBaseURL();
            await authClient.$fetch(`${backendUrl}/api/player/settings`, {
              method: 'PUT',
              body: JSON.stringify(newSettings),
              headers: {
                'Content-Type': 'application/json',
              },
            });
          } catch {
            // Silent retry failure
          }
        } catch (retryError) {
          // Silent failure on retry - already showed error to user
        }
      }, 1000);
    }
  };

  const requestNotificationPermission = async (enable: boolean) => {
    if (!enable) return true; // Allow disabling without permission

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to request notification permission',
      });
      return false;
    }
  };

  const requestLocationPermission = async (enable: boolean) => {
    if (!enable) return true; // Allow disabling without permission

    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to request location permission',
      });
      return false;
    }
  };

  const updateSetting = async (key: string, value: boolean) => {
    if (settings.hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Handle notification permission
    if (key === 'notifications') {
      const granted = await requestNotificationPermission(value);
      if (!granted && value) {
        toast.error('Permission Denied', {
          description: 'Enable notifications in device settings',
        });
        return;
      }
    }

    // Handle location permission
    if (key === 'locationServices') {
      const granted = await requestLocationPermission(value);
      if (!granted && value) {
        toast.error('Permission Denied', {
          description: 'Enable location in device settings',
        });
        return;
      }
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from better-auth
              await authClient.signOut();

              // Manually clear all better-auth related storage
              try {
                await SecureStore.deleteItemAsync('deuceleague.sessionToken');
                await SecureStore.deleteItemAsync('deuceleague.session');
                await SecureStore.deleteItemAsync('deuceleague.user');
                await SecureStore.deleteItemAsync('deuceleague.accessToken');
                await SecureStore.deleteItemAsync('deuceleague.refreshToken');
              } catch (storageError) {
                // Some storage items may not exist
              }

              // Add a longer delay to ensure complete cleanup
              await new Promise(resolve => setTimeout(resolve, 500));

              // Show success toast
              toast.success('Signed Out', {
                description: 'You have been successfully signed out.',
              });

              // Navigation to login is handled automatically by NavigationInterceptor
              // when it detects session is null and user is on a protected route

            } catch (error) {
              console.error('Logout error:', error);
              toast.error('Error', {
                description: 'Failed to sign out. Please try again.',
              });
            }
          },
        },
      ]
    );
  };

  const settingSections: SettingSection[] = [
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
          subtitle: 'Sign out of your account',
          type: 'action',
          icon: 'log-out-outline',
          action: handleLogout,
          iconColor: '#EF4444',
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    const handlePress = () => {
      if (isLoadingSettings) return; // Disable actions during loading

      if (item.type === 'toggle') {
        updateSetting(item.id, !item.value);
      } else if (item.action) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.action();
      }
    };

    // Generate accessibility hint based on item type
    const getAccessibilityHint = () => {
      if (item.type === 'toggle') {
        return `Double tap to ${item.value ? 'disable' : 'enable'} ${item.title.toLowerCase()}`;
      }
      return `Double tap to ${item.title.toLowerCase()}`;
    };

    return (
      <Pressable
        key={item.id}
        style={({ pressed }): StyleProp<ViewStyle> => [
          styles.settingItem as ViewStyle,
          { opacity: pressed || isLoadingSettings ? 0.7 : 1 }
        ]}
        onPress={handlePress}
        disabled={isLoadingSettings}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={getAccessibilityHint()}
        accessibilityState={item.type === 'toggle' ? { checked: item.value, disabled: isLoadingSettings } : { disabled: isLoadingSettings }}
      >
        <View style={styles.settingLeft as ViewStyle}>
          <View style={[
            styles.settingIcon as ViewStyle,
            item.iconColor && { backgroundColor: `${item.iconColor}15` }
          ]}>
            <Ionicons 
              name={item.icon as any} 
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
            isLoadingSettings ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Switch
                value={item.value}
                onValueChange={(value) => updateSetting(item.id, value)}
                trackColor={{
                  false: theme.colors.neutral.gray[200],
                  true: `${theme.colors.primary}40`,
                }}
                thumbColor={item.value ? theme.colors.primary : theme.colors.neutral.white}
                ios_backgroundColor={theme.colors.neutral.gray[200]}
                disabled={isLoadingSettings}
              />
            )
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
          
          <Text style={styles.headerTitle as TextStyle}>Settings</Text>
          
          <View style={styles.headerSpacer as ViewStyle} />
        </View>

        <ScrollView 
          style={styles.scrollView as ViewStyle}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent as ViewStyle}
        >
          {settingSections.map((section, sectionIndex) => (
            <View key={section.id} style={styles.section as ViewStyle}>
              <Text style={styles.sectionTitle as TextStyle}>{section.title}</Text>
              
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
    paddingBottom: theme.spacing.xl,
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
    fontWeight: theme.typography.fontWeight.semibold as any,
    color: (theme.colors.neutral.gray as any)[900] || theme.colors.neutral.gray[700],
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
    marginLeft: theme.spacing.lg + 36 + theme.spacing.md, // Align with text
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
});