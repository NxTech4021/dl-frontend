import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { toast } from 'sonner-native';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';

interface Partnership {
  id: string;
  seasonId?: string;
  captainId: string;
  partnerId: string;
  captain: { id: string; name: string };
  partner: { id: string; name: string };
  season: { id: string; name: string };
}

interface PartnerChangeRequestModalProps {
  visible: boolean;
  partnership: Partnership | null;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
  sport?: 'pickleball' | 'tennis' | 'padel';
}

const getSportColors = (sport: 'pickleball' | 'tennis' | 'padel' = 'pickleball') => {
  switch (sport) {
    case 'tennis':
      return {
        primary: '#587A27',
        primaryLight: '#A2E047',
        background: '#F5F9F0',
      };
    case 'padel':
      return {
        primary: '#2E6698',
        primaryLight: '#4DABFE',
        background: '#F0F7FC',
      };
    case 'pickleball':
    default:
      return {
        primary: '#A04DFE',
        primaryLight: '#602E98',
        background: '#F5F0FC',
      };
  }
};

const CHANGE_REASONS = [
  { value: 'AVAILABILITY_CONFLICT', label: 'Availability Conflict' },
  { value: 'SKILL_MISMATCH', label: 'Skill Level Mismatch' },
  { value: 'COMMUNICATION_ISSUES', label: 'Communication Issues' },
  { value: 'PERSONAL_REASONS', label: 'Personal Reasons' },
  { value: 'PERFORMANCE_CONCERNS', label: 'Performance Concerns' },
  { value: 'OTHER', label: 'Other (Please specify)' },
];

export const PartnerChangeRequestModal: React.FC<PartnerChangeRequestModalProps> = ({
  visible,
  partnership,
  currentUserId,
  onClose,
  onSuccess,
  sport = 'pickleball',
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sportColors = getSportColors(sport);

  const partnerName = partnership
    ? partnership.captainId === currentUserId
      ? partnership.partner.name
      : partnership.captain.name
    : '';

  const handleReasonSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(value);
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Error', {
        description: 'Please select a reason for the partner change request',
      });
      return;
    }

    if (selectedReason === 'OTHER' && !customReason.trim()) {
      toast.error('Error', {
        description: 'Please specify your reason',
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Submit Partner Change Request',
      `This will send a request to admin for approval to change your partner. You will be notified once the admin processes your request.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit Request',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              const finalReason =
                selectedReason === 'OTHER'
                  ? customReason
                  : CHANGE_REASONS.find((r) => r.value === selectedReason)?.label || selectedReason;

              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/season/withdrawals`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    seasonId: partnership?.seasonId || partnership?.season?.id,
                    partnershipId: partnership?.id,
                    reason: finalReason,
                  }),
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              const responseData = (response as any).data || response;
              if (responseData && (responseData.id || responseData.success)) {
                toast.success('Request Submitted', {
                  description:
                    'Your partner change request has been sent to admin for review',
                  duration: 5000,
                });
                setSelectedReason(null);
                setCustomReason('');
                onSuccess();
                onClose();
              } else {
                const errorMessage = typeof responseData.error === 'string'
                  ? responseData.error
                  : responseData.message || 'Failed to submit partner change request';

                toast.error('Error', {
                  description: errorMessage,
                });
              }
            } catch (error) {
              console.error('Error submitting partner change request:', error);
              toast.error('Error', {
                description: 'Failed to submit partner change request',
              });
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedReason(null);
    setCustomReason('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="swap-horizontal" size={24} color={sportColors.primary} />
              <Text style={styles.headerTitle}>Request Partner Change</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoText}>
                You are requesting to change your partner for{' '}
                <Text style={[styles.boldText, { color: sportColors.primary }]}>{partnership?.season?.name}</Text>.
              </Text>
              <Text style={styles.infoTextSecondary}>
                This request will be sent to admin for review. If approved, your
                partnership will be dissolved and you can find a new partner.
              </Text>
            </View>

            {/* Reason Selection */}
            <Text style={styles.sectionTitle}>
              Select reason for change <Text style={styles.required}>*</Text>
            </Text>

            {CHANGE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.value && [
                    styles.reasonOptionSelected,
                    { borderColor: sportColors.primary, backgroundColor: sportColors.background },
                  ],
                ]}
                onPress={() => handleReasonSelect(reason.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radio,
                    selectedReason === reason.value && { borderColor: sportColors.primary },
                  ]}
                >
                  {selectedReason === reason.value && (
                    <View style={[styles.radioInner, { backgroundColor: sportColors.primary }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.reasonLabel,
                    selectedReason === reason.value && [
                      styles.reasonLabelSelected,
                      { color: sportColors.primary },
                    ],
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Custom Reason Input */}
            {selectedReason === 'OTHER' && (
              <View style={styles.customReasonContainer}>
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Please specify your reason..."
                  placeholderTextColor="#999"
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>{customReason.length}/500</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: sportColors.primary },
                (!selectedReason || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  infoSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoTextSecondary: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  required: {
    color: '#DC2626',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    marginBottom: 10,
  },
  reasonOptionSelected: {
    // Colors applied dynamically via inline styles
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    // Color applied dynamically via inline styles
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    // Color applied dynamically via inline styles
  },
  reasonLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  reasonLabelSelected: {
    fontWeight: '600',
    // Color applied dynamically via inline styles
  },
  customReasonContainer: {
    marginTop: 12,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    // Background color applied dynamically via inline styles
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
