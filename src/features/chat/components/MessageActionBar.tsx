import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MessageActionBarProps {
  visible: boolean;
  isCurrentUser: boolean;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
  messageCount?: number;
}

export const MessageActionBar: React.FC<MessageActionBarProps> = React.memo(({
  visible,
  isCurrentUser,
  onReply,
  onCopy,
  onDelete,
  onClose,
  messageCount = 1,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Memoized action handlers
  const handleReplyAction = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onReply();
    onClose();
  }, [onReply, onClose]);

  const handleCopyAction = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onCopy();
    onClose();
  }, [onCopy, onClose]);

  const handleDeleteAction = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDelete();
    onClose();
  }, [onDelete, onClose]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      />

      {/* Action Bar */}
      <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top }]}>
        <View style={styles.content}>
          {/* Left side - Message count */}
          <View style={styles.leftSection}>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </Pressable>
            <Text style={styles.messageCount}>{messageCount}</Text>
          </View>

          {/* Right side - Action buttons */}
          <View style={styles.rightSection}>
            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
              onPress={handleReplyAction}
            >
              <Ionicons name="arrow-undo-outline" size={24} color="#111827" />
              <Text style={styles.actionLabel}>Reply</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
              onPress={handleCopyAction}
            >
              <Ionicons name="copy-outline" size={24} color="#111827" />
              <Text style={styles.actionLabel}>Copy</Text>
            </Pressable>

            {isCurrentUser && (
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
                onPress={handleDeleteAction}
              >
                <Ionicons name="trash-outline" size={24} color="#DC2626" />
                <Text style={[styles.actionLabel, styles.deleteLabel]}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
});

MessageActionBar.displayName = 'MessageActionBar';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  closeButton: {
    padding: 4,
  },
  messageCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  deleteLabel: {
    color: '#DC2626',
  },
});
