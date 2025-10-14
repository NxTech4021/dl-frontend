import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface PairRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
  recipientName: string;
  seasonName: string;
  leagueName?: string;
}

const MAX_MESSAGE_LENGTH = 200;

export const PairRequestModal: React.FC<PairRequestModalProps> = ({
  visible,
  onClose,
  onSend,
  recipientName,
  seasonName,
  leagueName,
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsSubmitting(true);
      await onSend(message);
      setMessage('');
      onClose();
    } catch (error) {
      console.error('Error sending pair request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessage('');
    onClose();
  };

  const remainingChars = MAX_MESSAGE_LENGTH - message.length;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#666666" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="people" size={32} color="#FEA04D" />
            <Text style={styles.title}>Request to Pair</Text>
          </View>

          {/* Season/League Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color="#666666" />
              <Text style={styles.infoLabel}>Partner:</Text>
              <Text style={styles.infoValue}>{recipientName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="trophy" size={16} color="#666666" />
              <Text style={styles.infoLabel}>Season:</Text>
              <Text style={styles.infoValue}>{seasonName}</Text>
            </View>
            {leagueName && (
              <View style={styles.infoRow}>
                <Ionicons name="flag" size={16} color="#666666" />
                <Text style={styles.infoLabel}>League:</Text>
                <Text style={styles.infoValue}>{leagueName}</Text>
              </View>
            )}
          </View>

          {/* Message Input */}
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>
              Message <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Add a message to your request..."
              placeholderTextColor="#999999"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MAX_MESSAGE_LENGTH}
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCounter,
                remainingChars < 20 && styles.charCounterWarning,
              ]}
            >
              {remainingChars} characters remaining
            </Text>
          </View>

          {/* Info Message */}
          <View style={styles.infoMessage}>
            <Ionicons name="information-circle" size={16} color="#FEA04D" />
            <Text style={styles.infoMessageText}>
              You cannot send another pair request until {recipientName} responds to this one.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.sendButton]}
              onPress={handleSend}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.sendButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
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
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 20 : isTablet ? 28 : 24,
    width: '100%',
    maxWidth: isTablet ? 500 : 400,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: '#1a1a1a',
    marginTop: 12,
  },
  infoSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666666',
  },
  infoValue: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1a1a1a',
    flex: 1,
  },
  messageSection: {
    marginBottom: 20,
  },
  messageLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    color: '#999999',
    fontSize: isSmallScreen ? 12 : 14,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 12,
    padding: 12,
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1a1a1a',
    minHeight: 100,
    maxHeight: 150,
  },
  charCounter: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#999999',
    marginTop: 6,
    textAlign: 'right',
  },
  charCounterWarning: {
    color: '#FEA04D',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF9F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoMessageText: {
    fontFamily: 'Inter',
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
    flex: 1,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  cancelButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666666',
  },
  sendButton: {
    backgroundColor: '#FEA04D',
  },
  sendButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
  },
});
