import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthColors } from '../styles/AuthStyles';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.gray600} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Reusable text components for legal content
export const LegalSectionTitle: React.FC<{ children: React.ReactNode; isFirst?: boolean }> = ({ children, isFirst }) => (
  <Text style={[styles.sectionTitle, isFirst && styles.firstSectionTitle]}>
    {children}
  </Text>
);

export const LegalSubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.subTitle}>{children}</Text>
);

export const LegalText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.text}>{children}</Text>
);

export const LegalBulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={styles.bulletList}>
    {items.map((item, index) => (
      <View key={index} style={styles.bulletItem}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.bulletText}>{item}</Text>
      </View>
    ))}
  </View>
);

// Modern color theme
const colors = {
  primary: AuthColors.primary,
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
  white: '#FFFFFF',
  black: '#000000',
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray900,
    fontFamily: 'Inter',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    fontFamily: 'Inter',
    marginBottom: 16,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  firstSectionTitle: {
    marginTop: 0,
    borderTopWidth: 0,
    paddingTop: 0,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    fontFamily: 'Inter',
    marginBottom: 8,
    marginTop: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.gray700,
    fontFamily: 'Inter',
    lineHeight: 24,
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  bulletList: {
    marginBottom: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.gray700,
    marginRight: 12,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: colors.gray700,
    fontFamily: 'Inter',
    lineHeight: 24,
    letterSpacing: 0.2,
  },
});