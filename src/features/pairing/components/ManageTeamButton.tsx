import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { usePartnershipStatus } from '../hooks/usePartnershipStatus';

interface ManageTeamButtonProps {
  seasonId: string;
  partnershipId: string;
  size?: 'small' | 'large';
}

export const ManageTeamButton: React.FC<ManageTeamButtonProps> = ({
  seasonId,
  partnershipId,
  size = 'small',
}) => {
  // Fetch partnership status to check if partner has requested change or left
  const partnershipStatus = usePartnershipStatus({
    partnershipId,
    enabled: !!partnershipId,
    pollingInterval: 60000, // Poll every 60 seconds (less frequent for button indicator)
  });

  // Show indicator if partner has requested change or left
  const showAlertIndicator = partnershipStatus.hasPartnerPendingRequest || partnershipStatus.partnerHasLeft;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/pairing/manage-partnership/${seasonId}` as any);
  };

  return (
    <TouchableOpacity
      style={[styles.button, size === 'large' && styles.buttonLarge]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="settings-outline" size={16} color="#FEA04D" />
      <Text style={styles.buttonText}>Manage Team</Text>

      {/* Alert indicator at top-right corner of button */}
      {showAlertIndicator && (
        <View style={styles.alertIndicator} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FEA04D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  buttonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  alertIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#FEA04D',
  },
});
