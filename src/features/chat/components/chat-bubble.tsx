import { getSportColors, SportType } from '@/constants/SportsColor';
import { format } from 'date-fns';
import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar: boolean;
  isLastInGroup?: boolean;
  isGroupChat?: boolean;
  sportType?: SportType | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  isCurrentUser,
  showAvatar,
  isLastInGroup = true,
  isGroupChat = false,
  sportType,
}) => {
  const senderName = message.metadata?.sender?.name ||
                    message.metadata?.sender?.username ||
                    'Unknown';

  // Get sender's avatar/image - check both 'avatar' and 'image' properties
  const senderAvatar = message.metadata?.sender?.avatar ||
                       message.metadata?.sender?.image ||
                       null;
  const senderInitial = senderName.charAt(0).toUpperCase();

  // Memoized sport-specific color for current user messages
  const bubbleColor = useMemo(() => {
    if (!isCurrentUser) return '#F3F4F6'; // Gray for received messages

    // Use sport color for sent messages (both group and direct chats)
    const colors = getSportColors(sportType);
    return colors.background;
  }, [isCurrentUser, sportType]);
  
  return (
    <View style={[
      styles.container, 
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {!isCurrentUser && isLastInGroup && isGroupChat && (
        <View style={styles.avatarContainer}>
          {senderAvatar ? (
            <Image 
              source={{ uri: senderAvatar }} 
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {senderInitial}
              </Text>
            </View>
          )}
        </View>
      )}
      {!isCurrentUser && !isLastInGroup && isGroupChat && (
        <View style={styles.avatarSpacer} />
      )}
      
      <View style={styles.messageContainer}>
        {/* Sender name for GROUP chats only*/}
        {!isCurrentUser && showAvatar && isGroupChat && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        
        <View style={[
          styles.bubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          isCurrentUser && { backgroundColor: bubbleColor },
          isCurrentUser ? {
            borderBottomRightRadius: isLastInGroup ? 6 : 18,
            borderTopRightRadius: showAvatar ? 18 : 6,
          } : {
            borderBottomLeftRadius: isLastInGroup ? 6 : 18,
            borderTopLeftRadius: showAvatar ? 18 : 6,
          }
        ]}>
          <Text style={[
            styles.messageText,
            isCurrentUser ? styles.currentUserText : styles.otherUserText,
          ]}>
            {message.content}
          </Text>
          
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp,
            ]}>
              {format(new Date(message.timestamp), 'HH:mm')}
            </Text>
            
            {isCurrentUser && (
              <View style={styles.statusContainer}>
                {message.isDelivered && (
                  <Text style={styles.deliveryStatus}>✓</Text>
                )}
                {message.isRead && (
                  <Text style={styles.readStatus}>✓</Text>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 1,
    paddingHorizontal: 4,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  avatarSpacer: {
    width: 40,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  messageContainer: {
    maxWidth: '75%',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    marginLeft: 4,
    fontWeight: '500',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  currentUserBubble: {
    backgroundColor: '#863A73',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  currentUserTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherUserTimestamp: {
    color: '#9CA3AF',
  },
  statusContainer: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  deliveryStatus: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readStatus: {
    fontSize: 10,
    color: '#34D399',
    marginLeft: -2,
  },
});