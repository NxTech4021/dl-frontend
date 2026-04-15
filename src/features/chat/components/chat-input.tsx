import PadelMatchIcon from '@/assets/icons/chats/padel-match.svg';
import PickleballMatchIcon from '@/assets/icons/chats/pickleball-match.svg';
import TennisMatchIcon from '@/assets/icons/chats/tennis-match.svg';
import {
  scale,
  verticalScale,
  moderateScale,
} from '@/core/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Message } from '../types';

interface MessageInputProps {
  onSendMessage: (message: string, replyToId?: string) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  onhandleMatch?: () => void;
  onEmojiPress?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  sportType?: 'PICKLEBALL' | 'TENNIS' | 'PADEL' | null;
  isGroupChat?: boolean;
  disabled?: boolean;
}

// Ref type for exposing focus method
export interface MessageInputRef {
  focus: () => void;
}

export const MessageInput = React.forwardRef<MessageInputRef, MessageInputProps>(({
  onSendMessage,
  onTyping,
  placeholder = 'Type a message...',
  onhandleMatch,
  onEmojiPress,
  replyingTo,
  onCancelReply,
  sportType,
  isGroupChat = false,
  disabled = false,
}, ref) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendFocusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const insets = useSafeAreaInsets();

  // Expose focus method via ref
  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (sendFocusTimeoutRef.current) {
        clearTimeout(sendFocusTimeoutRef.current);
      }
    };
  }, []);

  // Handle app state changes to fix TextInput after backgrounding (Android issue)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground - blur and allow re-focus on Android
        if (Platform.OS === 'android' && inputRef.current) {
          // Small delay to let gesture handler state settle
          timeoutId = setTimeout(() => {
            inputRef.current?.blur();
          }, 100);
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Track keyboard visibility to adjust bottom padding and blur input when keyboard hides
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
    });
    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      // Blur input when keyboard hides (e.g., Android back button)
      // This ensures the input state matches the keyboard state
      if (Platform.OS === 'android') {
        inputRef.current?.blur();
      }
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Memoized reply colors based on sport type
  const replyColors = useMemo(() => {
    switch (sportType) {
      case 'PICKLEBALL':
        return { bar: '#A04DFE', label: '#7C3AED' };
      case 'TENNIS':
        return { bar: '#65B741', label: '#4D7C0F' };
      case 'PADEL':
        return { bar: '#3B82F6', label: '#2563EB' };
      default:
        return { bar: '#A04DFE', label: '#7C3AED' };
    }
  }, [sportType]);

  // Memoized send button color based on sport type and message
  const sendButtonColor = useMemo(() => {
    if (!message.trim()) return '#E5E7EB'; // Gray when no message

    // Use sport color for send button (both group and direct chats)
    switch (sportType) {
      case 'PICKLEBALL':
        return '#A04DFE'; // Purple
      case 'TENNIS':
        return '#65B741'; // Green
      case 'PADEL':
        return '#3B82F6'; // Blue
      default:
        return '#A04DFE'; // Default purple (pickleball)
    }
  }, [message, sportType]);

  // Memoized match icon component based on sport type
  const MatchIcon = useMemo(() => {
    if (!isGroupChat) {
      // For individual chats, return null to use default Ionicons
      return null;
    }

    switch (sportType) {
      case 'PICKLEBALL':
        return PickleballMatchIcon;
      case 'TENNIS':
        return TennisMatchIcon;
      case 'PADEL':
        return PadelMatchIcon;
      default:
        return null;
    }
  }, [isGroupChat, sportType]);

  const handleTextChange = useCallback((text: string) => {
    setMessage(text);

    if (onTyping) {
      if (!isTyping && text.length > 0) {
        setIsTyping(true);
        onTyping(true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onTyping(false);
      }, 1000);
    }
  }, [onTyping, isTyping]);

  const handleSend = useCallback(() => {
    if (message.trim()) {
      onSendMessage(message.trim(), replyingTo?.id);
      setMessage('');
      setIsTyping(false);
      if (onTyping) onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Keep focus on the input after sending so user can continue typing
      sendFocusTimeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [message, onSendMessage, replyingTo?.id, onTyping]);

  const handleMatch = useCallback(() => {
    if (onhandleMatch) {
      onhandleMatch();
    }
  }, [onhandleMatch]);

  // Memoized handler to focus input
  const handleInputContainerPress = useCallback(() => {
    inputRef.current?.focus();
  }, []);


  // Simple clamp function for padding
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

  // Bottom padding - parent SafeAreaView handles safe area, we just need minimal padding
  // When keyboard is visible, use minimal padding (keyboard covers safe area)
  const bottomPadding = Platform.select({
    ios: keyboardVisible ? 4 : clamp(insets.bottom, 4, 10),
    android: clamp(insets.bottom, 8, 16),
    default: clamp(insets.bottom, 6, 12),
  }) as number;

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* Reply Preview Bar - Animated for smooth appearance */}
      {replyingTo && !disabled && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(150)}
          style={styles.replyPreviewContainer}
        >
          <View style={styles.replyPreviewContent}>
            <View style={[styles.replyBar, { backgroundColor: replyColors.bar }]} />
            <View style={styles.replyTextContainer}>
              <Text style={[styles.replyLabel, { color: replyColors.label }]}>
                {replyingTo.metadata?.sender?.name || replyingTo.metadata?.sender?.username || 'User'}
              </Text>
              <Text style={styles.replyMessageText} numberOfLines={2}>
                {replyingTo.content || 'Message'}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onCancelReply}
            style={({ pressed }) => [styles.cancelReplyButton, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Cancel reply"
            accessibilityRole="button"
            accessibilityHint="Stop replying to this message"
          >
            <View style={styles.cancelReplyCircle}>
              <Ionicons name="close" size={moderateScale(14)} color="#6B7280" />
            </View>
          </Pressable>
        </Animated.View>
      )}
      
      <View style={[styles.inputContainer, disabled && { opacity: 0.5 }]}>
        {/* Match button */}
        <Pressable
          style={({ pressed }) => [styles.attachmentButton, pressed && { opacity: 0.7 }]}
          onPress={handleMatch}
          accessibilityLabel={isGroupChat ? "Create match" : "Schedule friendly match"}
          accessibilityRole="button"
          accessibilityHint={isGroupChat ? "Schedule a league match" : "Send a friendly match request"}
        >
          {MatchIcon ? (
            <MatchIcon width={moderateScale(24)} height={moderateScale(24)} />
          ) : (
            <Ionicons name="calendar-clear-outline" size={moderateScale(24)} color="#6B7280" />
          )}
        </Pressable>

        <View style={styles.textInputWrapper}>
          <Pressable
            style={styles.textInputContainer}
            onPress={handleInputContainerPress}
            accessibilityLabel="Message input area"
          >
            {/* TODO(emoji-picker): Uses native keyboard emoji only. No dedicated emoji picker component.
                Consider adding emoji-mart or similar for richer emoji selection. */}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={message}
              onChangeText={handleTextChange}
              placeholder={disabled ? "This user's is no longer available" : placeholder}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={1000}
              textAlignVertical="center"
              editable={!disabled}
              accessibilityLabel="Type your message"
              accessibilityHint="Enter text to send a message"
            />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: sendButtonColor },
            pressed && { opacity: 0.7 }
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: !message.trim() || disabled }}
          accessibilityHint="Send your typed message"
        >
          <Ionicons
            name="send"
            size={moderateScale(18)}
            color={message.trim() ? '#FFFFFF' : '#9CA3AF'}
          />
        </Pressable>
      </View>
    </View>
  );
});

MessageInput.displayName = 'MessageInput';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: verticalScale(12),
    paddingHorizontal: scale(16),
  },
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: 0,
    marginBottom: verticalScale(8),
    marginHorizontal: scale(-16),
    paddingLeft: scale(20),
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  replyBar: {
    width: scale(4),
    alignSelf: 'stretch',
    borderRadius: moderateScale(2),
    marginRight: scale(12),
    minHeight: verticalScale(40),
  },
  replyTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  replyLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    marginBottom: verticalScale(4),
  },
  replyMessageText: {
    fontSize: moderateScale(14),
    color: '#4B5563',
    lineHeight: verticalScale(20),
  },
  cancelReplyButton: {
    padding: scale(4),
    marginLeft: scale(8),
  },
  cancelReplyCircle: {
    width: scale(24),
    height: verticalScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: scale(8),
  },
  attachmentButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(20),
    backgroundColor: '#F9FAFB',
    paddingRight: scale(12),
    minHeight: verticalScale(40),
  },
  textInput: {
    flex: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    maxHeight: verticalScale(100),
    fontSize: moderateScale(15),
    color: '#111827',
  },
  sendButton: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
});