import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface PartnershipStatusBannerProps {
  hasMyPendingRequest: boolean;
  hasPartnerPendingRequest: boolean;
  partnerHasLeft: boolean;
  isIncomplete?: boolean;
}

type BannerType = 'myPending' | 'partnerRequested' | 'partnerLeft' | 'incomplete' | null;

const getBannerConfig = (type: BannerType) => {
  switch (type) {
    case 'myPending':
      return {
        icon: 'time-outline' as const,
        title: 'Request Pending',
        text: 'Your partner change request is awaiting admin review',
        colors: {
          background: '#FFF3E0',
          border: '#FFE0B2',
          icon: '#F57C00',
          title: '#E65100',
          text: '#BF360C',
        },
      };
    case 'partnerRequested':
      return {
        icon: 'alert-circle-outline' as const,
        title: 'Partner Requested Change',
        text: 'Your partner has submitted a request to change partners',
        colors: {
          background: '#FEF2F2',
          border: '#FEE2E2',
          icon: '#EF4444',
          title: '#DC2626',
          text: '#991B1B',
        },
      };
    case 'partnerLeft':
      return {
        icon: 'person-remove-outline' as const,
        title: 'Partner Left',
        text: 'Your partner has left the partnership',
        colors: {
          background: '#FEF2F2',
          border: '#FEE2E2',
          icon: '#EF4444',
          title: '#DC2626',
          text: '#991B1B',
        },
      };
    case 'incomplete':
      return {
        icon: 'people-outline' as const,
        title: 'Partner Needed',
        text: 'Invite a friend or search for a new partner to continue playing matches',
        colors: {
          background: '#FFF7ED',
          border: '#FDBA74',
          icon: '#F59E0B',
          title: '#EA580C',
          text: '#9A3412',
        },
      };
    default:
      return null;
  }
};

export const PartnershipStatusBanner: React.FC<PartnershipStatusBannerProps> = ({
  hasMyPendingRequest,
  hasPartnerPendingRequest,
  partnerHasLeft,
  isIncomplete = false,
}) => {
  // Determine which banner to show (priority: incomplete > partnerLeft > partnerRequested > myPending)
  let bannerType: BannerType = null;

  if (isIncomplete) {
    bannerType = 'incomplete';
  } else if (partnerHasLeft) {
    bannerType = 'partnerLeft';
  } else if (hasPartnerPendingRequest) {
    bannerType = 'partnerRequested';
  } else if (hasMyPendingRequest) {
    bannerType = 'myPending';
  }

  if (!bannerType) {
    return null;
  }

  const config = getBannerConfig(bannerType);
  if (!config) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.banner,
        {
          backgroundColor: config.colors.background,
          borderColor: config.colors.border,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.colors.background }]}>
        <Ionicons name={config.icon} size={24} color={config.colors.icon} />
      </View>
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: config.colors.title }]}>
          {config.title}
        </Text>
        <Text style={[styles.text, { color: config.colors.text }]}>
          {config.text}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: 18,
  },
});
