// src/features/feed/components/PostMatchShareSheet.tsx

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { feedTheme } from '../theme';
import { useSharePost } from '../hooks';
import type { ShareStyle } from '../hooks/useSharePost';
import { ScorecardCaptureWrapper, ScorecardCaptureRef } from './ScorecardCaptureWrapper';
import { MatchResult, SportColors } from '@/features/standings/types';

const MAX_CAPTION_LENGTH = 500;

interface PostMatchShareSheetProps {
  visible: boolean;
  scorecardMatch: MatchResult | null;
  sportColors: SportColors;
  isPickleball: boolean;
  onPost: (caption: string) => void;
  onSkip: () => void;
  onClose?: () => void;
  onExternalShare?: () => void;
  onInstagramShare?: () => void;
  isPosting?: boolean;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

export const PostMatchShareSheet: React.FC<PostMatchShareSheetProps> = ({
  visible,
  scorecardMatch,
  sportColors,
  isPickleball,
  onPost,
  onSkip,
  onClose,
  onExternalShare,
  onInstagramShare,
  isPosting = false,
  bottomSheetRef,
}) => {
  const [caption, setCaption] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ShareStyle>('white');
  const scorecardRef = useRef<ScorecardCaptureRef>(null);
  const { captureAndSave, shareToInstagram, isCapturing, isSaving } = useSharePost();
  const cardWidth = Math.min(360, Dimensions.get('window').width - 48);
  const getCaptureViewRef = () => ({ current: scorecardRef.current?.viewRef || null });

  const isOverLimit = caption.length > MAX_CAPTION_LENGTH;
  const canPost = !isOverLimit && !isPosting;

  const handleStyleChange = useCallback((style: ShareStyle) => {
    setSelectedStyle(style);
    scorecardRef.current?.setBackgroundStyle(style);
  }, []);

  const handlePost = useCallback(() => {
    if (canPost) {
      onPost(caption);
      setCaption('');
    }
  }, [canPost, caption, onPost]);

  const handleSkip = useCallback(() => {
    setCaption('');
    onSkip();
  }, [onSkip]);

  const handleClose = useCallback(() => {
    setCaption('');
    // Call onClose if provided (allows parent to reset state without navigation)
    onClose?.();
  }, [onClose]);

  const handleInstagramShare = useCallback(async () => {
    // Check if Instagram is installed
    const canOpen = await Linking.canOpenURL('instagram://');
    if (!canOpen) {
      Alert.alert(
        'Instagram Not Installed',
        'Please install Instagram to share directly to your story.',
        [{ text: 'OK' }]
      );
      return;
    }

    // If custom handler provided, use it; otherwise use internal shareToInstagram
    if (onInstagramShare) {
      onInstagramShare();
    } else {
      const success = await shareToInstagram(getCaptureViewRef());
      if (success) {
        bottomSheetRef.current?.close();
      }
    }
  }, [onInstagramShare, shareToInstagram, bottomSheetRef]);

  const handleSaveToGallery = useCallback(async () => {
    // If custom handler provided, use it; otherwise use internal captureAndSave
    if (onExternalShare) {
      onExternalShare();
    } else {
      const success = await captureAndSave(getCaptureViewRef());
      if (success) {
        bottomSheetRef.current?.close();
      }
    }
  }, [onExternalShare, captureAndSave, bottomSheetRef]);

  // Only render backdrop when visible to prevent touch blocking
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const renderMatchPreview = () => {
    if (!scorecardMatch) return null;

    return (
      <View style={styles.previewCard} collapsable={false}>
        <ScorecardCaptureWrapper
          ref={scorecardRef}
          match={scorecardMatch}
          sportColors={sportColors}
          isPickleball={isPickleball}
          cardWidth={cardWidth}
        />
      </View>
    );
  };

  // Don't render anything if not visible - prevents touch blocking when closed
  if (!visible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={['75%']}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Text style={styles.title}>Share to Activity Feed?</Text>

          {renderMatchPreview()}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a caption..."
              placeholderTextColor={feedTheme.colors.textTertiary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={MAX_CAPTION_LENGTH + 50}
              textAlignVertical="top"
              editable={!isPosting}
            />
            <Text
              style={[
                styles.charCounter,
                isOverLimit && styles.charCounterError,
              ]}
            >
              {caption.length}/{MAX_CAPTION_LENGTH}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
              disabled={isPosting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.postButton,
                !canPost && styles.postButtonDisabled,
              ]}
              onPress={handlePost}
              activeOpacity={0.7}
              disabled={!canPost}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or share externally:</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Background style selector for save to gallery */}
          <View style={styles.styleSelectorContainer}>
            <View style={styles.styleSelectorHeader}>
              <View>
                <Text style={styles.styleSelectorLabel}>Save to gallery</Text>
                <Text style={styles.styleSelectorSubLabel}>Choose a background style</Text>
              </View>
              <TouchableOpacity
                style={styles.saveInlineButton}
                onPress={handleSaveToGallery}
                activeOpacity={0.7}
                disabled={isPosting || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={feedTheme.colors.primary} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={feedTheme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.styleOptionsRow}>
              {(['white', 'dark', 'transparent'] as ShareStyle[]).map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.styleOption,
                    selectedStyle === style && styles.styleOptionSelected,
                  ]}
                  onPress={() => handleStyleChange(style)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.stylePreviewBox, style === 'white' ? styles.stylePreviewWhite : style === 'dark' ? styles.stylePreviewDark : styles.stylePreviewTransparent]} />
                  <Text style={[
                    styles.styleOptionLabel,
                    selectedStyle === style && styles.styleOptionLabelSelected,
                  ]}>
                    {style === 'white' ? 'Standard' : style === 'dark' ? 'Dark' : 'Transparent'}
                  </Text>
                  <Text style={styles.styleOptionSubLabel}>
                    {style === 'transparent' ? 'Card only' : '9:16 story'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Instagram row — coming soon */}
          <TouchableOpacity
            style={styles.instagramRow}
            activeOpacity={0.5}
            disabled
          >
            <View style={styles.instagramIconWrap}>
              <Ionicons name="logo-instagram" size={22} color="#E4405F" />
            </View>
            <View>
              <Text style={styles.instagramRowLabel}>Share to Instagram</Text>
              <Text style={styles.instagramRowSub}>Coming soon</Text>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingBottom: 24,
  },
  keyboardAvoid: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: feedTheme.colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  previewCard: {
    marginBottom: 20,
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: feedTheme.colors.textPrimary,
    lineHeight: 20,
    minHeight: 80,
    maxHeight: 120,
  },
  charCounter: {
    fontSize: 12,
    color: feedTheme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 8,
  },
  charCounterError: {
    color: '#FF3B30',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    backgroundColor: feedTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: feedTheme.colors.textSecondary,
  },
  postButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: feedTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: feedTheme.colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: feedTheme.colors.textSecondary,
    paddingHorizontal: 12,
  },

  styleSelectorContainer: {
    marginBottom: 16,
  },
  styleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveInlineButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    opacity: 0.45,
  },
  instagramIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instagramRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: feedTheme.colors.textPrimary,
  },
  instagramRowSub: {
    fontSize: 12,
    color: feedTheme.colors.textSecondary,
    marginTop: 1,
  },
  styleSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: feedTheme.colors.textPrimary,
    marginBottom: 2,
  },
  styleSelectorSubLabel: {
    fontSize: 12,
    color: feedTheme.colors.textSecondary,
    marginTop: 1,
  },
  styleOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  styleOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: feedTheme.colors.border,
    backgroundColor: feedTheme.colors.background,
  },
  styleOptionSelected: {
    borderColor: feedTheme.colors.primary,
    backgroundColor: `${feedTheme.colors.primary}10`,
  },
  stylePreviewBox: {
    width: '100%',
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
  },
  stylePreviewWhite: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  stylePreviewDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#374151',
  },
  stylePreviewTransparent: {
    backgroundColor: 'transparent',
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  styleOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: feedTheme.colors.textSecondary,
  },
  styleOptionLabelSelected: {
    color: feedTheme.colors.primary,
  },
  styleOptionSubLabel: {
    fontSize: 10,
    color: feedTheme.colors.textTertiary,
    fontWeight: '400',
  },
});
