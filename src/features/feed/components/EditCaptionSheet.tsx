// src/features/feed/components/EditCaptionSheet.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
  BottomSheetScrollView,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { feedTheme } from '../theme';

const MAX_CAPTION_LENGTH = 500;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface EditCaptionSheetProps {
  postId: string | null;
  initialCaption: string;
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onClose: () => void;
  onSave: (postId: string, newCaption: string) => void;
  isSaving?: boolean;
}

export const EditCaptionSheet: React.FC<EditCaptionSheetProps> = ({
  postId,
  initialCaption,
  bottomSheetRef,
  onClose,
  onSave,
  isSaving = false,
}) => {
  const [caption, setCaption] = useState(initialCaption);
  const insets = useSafeAreaInsets();

  // Reset caption when postId changes (new post selected for editing)
  useEffect(() => {
    setCaption(initialCaption);
  }, [postId, initialCaption]);

  const hasChanges = caption !== initialCaption;
  const isOverLimit = caption.length > MAX_CAPTION_LENGTH;
  const canSave = hasChanges && !isOverLimit && !isSaving && postId !== null;

  const handleSave = useCallback(() => {
    if (canSave && postId) {
      onSave(postId, caption);
    }
  }, [canSave, postId, caption, onSave]);

  const handleCancel = useCallback(() => {
    setCaption(initialCaption);
    bottomSheetRef.current?.dismiss();
  }, [initialCaption, bottomSheetRef]);

  // Footer with Cancel / Save buttons — pinned above keyboard, mirrors CommentsSheet pattern
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={0}>
        <View
          style={[
            styles.buttonContainer,
            {
              paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 12) : 12,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={!canSave}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetFooter>
    ),
    [handleCancel, handleSave, canSave, isSaving, insets.bottom],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing={true}
      maxDynamicContentSize={SCREEN_HEIGHT * 0.8}
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Caption</Text>

        <View style={styles.inputContainer}>
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Add a caption..."
            placeholderTextColor={feedTheme.colors.textTertiary}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={MAX_CAPTION_LENGTH + 50}
            textAlignVertical="top"
            editable={!isSaving}
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

        {/* Spacer so footer buttons don't overlap the last line of content */}
        <View style={styles.footerSpacer} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: feedTheme.colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 8,
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
    minHeight: 120,
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
  footerSpacer: {
    height: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: feedTheme.spacing.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: feedTheme.colors.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    backgroundColor: feedTheme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: feedTheme.colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: feedTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
