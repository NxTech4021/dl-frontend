import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  Pressable,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { authClient } from '@/lib/auth-client';
import * as SecureStore from 'expo-secure-store';
import { toast } from 'sonner-native';

// BackgroundGradient Component (consistent with profile)
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
  const [settings, setSettings] = useState({
    notifications: true,
    matchReminders: true,
    locationServices: false,
    darkMode: false,
    hapticFeedback: true,
  });

  const updateSetting = (key: string, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: value }));
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
              console.log('User signing out...');
              
              // Show loading toast
              // toast.loading('Signing out...', {
              //   description: 'Please wait while we sign you out.',
              // });
              
              // Sign out from better-auth
              await authClient.signOut();
              console.log('Sign out completed, clearing local storage...');
              
              // Manually clear all better-auth related storage
              try {
                await SecureStore.deleteItemAsync('deuceleague.sessionToken');
                await SecureStore.deleteItemAsync('deuceleague.session');
                await SecureStore.deleteItemAsync('deuceleague.user');
                await SecureStore.deleteItemAsync('deuceleague.accessToken');
                await SecureStore.deleteItemAsync('deuceleague.refreshToken');
                console.log('Local storage cleared successfully');
              } catch (storageError) {
                console.log('Some storage items may not exist:', storageError);
              }
              
              // Add a longer delay to ensure complete cleanup
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Show success toast
              toast.success('Signed Out', {
                description: 'You have been successfully signed out.',
              });
              
              console.log('Successfully signed out');

              
              console.log('Logout process completed - user should see login page');
              
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
          subtitle: 'Version 1.0.0',
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
      if (item.type === 'toggle') {
        updateSetting(item.id, !item.value);
      } else if (item.action) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        item.action();
      }
    };

    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.settingItem,
          { opacity: pressed ? 0.7 : 1 }
        ]}
        onPress={handlePress}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        <View style={styles.settingLeft}>
          <View style={[
            styles.settingIcon,
            item.iconColor && { backgroundColor: `${item.iconColor}15` }
          ]}>
            <Ionicons 
              name={item.icon as any} 
              size={20} 
              color={item.iconColor || theme.colors.neutral.gray[600]} 
            />
          </View>
          <View style={styles.settingText}>
            <Text style={[
              styles.settingTitle,
              item.iconColor && { color: item.iconColor }
            ]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.settingRight}>
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={(value) => updateSetting(item.id, value)}
              trackColor={{
                false: theme.colors.neutral.gray[200],
                true: `${theme.colors.primary}40`,
              }}
              thumbColor={item.value ? theme.colors.primary : theme.colors.neutral.white}
              ios_backgroundColor={theme.colors.neutral.gray[200]}
            />
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
          
          <Text style={styles.headerTitle}>Settings</Text>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {settingSections.map((section, sectionIndex) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              
              <View style={styles.sectionContent}>
                {section.items.map((item, itemIndex) => (
                  <React.Fragment key={item.id}>
                    {renderSettingItem(item)}
                    {itemIndex < section.items.length - 1 && (
                      <View style={styles.itemDivider} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
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
    fontWeight: theme.typography.fontWeight.heavy,
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
    fontWeight: theme.typography.fontWeight.bold,
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
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.neutral.gray[900],
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
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
  },
});