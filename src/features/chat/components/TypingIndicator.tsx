import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { moderateScale, scale, verticalScale } from '@/core/utils/responsive';

interface TypingIndicatorProps {
  typingUsers: { userId: string; name: string }[];
}

/**
 * Shows "User is typing..." below the message list.
 * Standard pattern: 1 user = "Alice is typing...",
 * 2 users = "Alice, Bob are typing...",
 * 3+ = "Several people are typing..."
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  let text: string;
  if (typingUsers.length === 1) {
    text = `${typingUsers[0].name} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0].name}, ${typingUsers[1].name} are typing...`;
  } else {
    text = 'Several people are typing...';
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
