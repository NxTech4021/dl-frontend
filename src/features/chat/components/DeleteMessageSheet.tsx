import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// NOTE: BottomSheetModal returns null at the call site when not mounted (mount=false).
// Wrapping it in a zero-size View ensures a stable native child is always present
// in the parent's view tree, preventing 'EdgeToEdgeReactViewGroup null child at index N'
// crashes on Android when the draw thread traverses the view tree during navigation.
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  scale,
  verticalScale,
  moderateScale,
} from '@/core/utils/responsive';

// Safe haptics wrapper
const triggerNotification = async (type: Haptics.NotificationFeedbackType) => {
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // Haptics not supported on this device
  }
};

interface DeleteMessageSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
}

export const DeleteMessageSheet: React.FC<DeleteMessageSheetProps> = ({
  visible,
  onClose,
  onConfirmDelete,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => [verticalScale(180) + insets.bottom], [insets.bottom]);

  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const handleDelete = useCallback(() => {
    if (Platform.OS !== 'web') {
      triggerNotification(Haptics.NotificationFeedbackType.Warning);
    }
    onConfirmDelete();
  }, [onConfirmDelete]);

  return (
    <View style={styles.stableWrapper} pointerEvents="none">
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose={true}
      enableDismissOnClose={true}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: insets.bottom + verticalScale(12) }]}>
        <Text style={styles.title}>Delete message?</Text>
        <Text style={styles.subtitle}>This can't be undone.</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            activeOpacity={0.7}
            accessibilityLabel="Delete message"
            accessibilityRole="button"
            accessibilityHint="Permanently delete this message"
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityLabel="Cancel"
            accessibilityRole="button"
            accessibilityHint="Go back without deleting"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
  },
  handleIndicator: {
    backgroundColor: '#D1D5DB',
    width: scale(36),
    height: verticalScale(4),
  },
  content: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(4),
  },
  title: {
    fontSize: moderateScale(17),
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    marginTop: verticalScale(4),
    marginBottom: verticalScale(20),
  },
  buttonContainer: {
    gap: verticalScale(8),
  },
  button: {
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  deleteButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  // Zero-size wrapper keeps a stable native view in the ChatThreadScreen root
  // view tree. Without it, BottomSheetModal renders null (mount=false initially),
  // which leaves a null child at its index — the Android ThreadedRenderer will
  // crash on that null during a concurrent draw pass (e.g., back-gesture transition).
  stableWrapper: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
});
