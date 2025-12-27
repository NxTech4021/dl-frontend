import {
  Notification,
  NOTIFICATION_CATEGORIES,
  NotificationCategory,
} from '@/src/shared/types/notification';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Helper to get icon name for category
const getNotificationIcon = (category: NotificationCategory): keyof typeof Ionicons.glyphMap => {
  const config = NOTIFICATION_CATEGORIES.find(c => c.value === category);
  return (config?.icon as keyof typeof Ionicons.glyphMap) || 'notifications-outline';
};

// Helper to get color for category
const getNotificationColor = (category: NotificationCategory): string => {
  const config = NOTIFICATION_CATEGORIES.find(c => c.value === category);
  return config?.color || '#6B7280';
};

export const SwipeableNotificationItem: React.FC<NotificationItemProps> = React.memo(({
  notification,
  onPress,
}) => {
  const iconColor = getNotificationColor(notification.category);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(notification);
  }, [notification, onPress]);

  const formattedTime = notification.createdAt && !isNaN(new Date(notification.createdAt).getTime())
    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
    : 'Recently';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.container,
        !notification.read && styles.containerUnread,
      ]}
    >
      {/* Unread indicator bar */}
      {!notification.read && <View style={[styles.unreadBar, { backgroundColor: '#EF4444' }]} />}

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
        <Ionicons
          name={getNotificationIcon(notification.category)}
          size={20}
          color="#FFFFFF"
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {notification.title && (
          <Text style={[styles.title, !notification.read && styles.titleUnread]} numberOfLines={1}>
            {notification.title}
          </Text>
        )}
        <Text style={[styles.message, !notification.read && styles.messageUnread]} numberOfLines={3}>
          {notification.message}
        </Text>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formattedTime}</Text>
          {!notification.read && (
            <View style={[styles.unreadDot, { backgroundColor: '#EF4444' }]} />
          )}
        </View>
      </View>

      {/* Chevron for navigation hint */}
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );
});

SwipeableNotificationItem.displayName = 'SwipeableNotificationItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 88,
  },
  containerUnread: {
    backgroundColor: '#F8F9FF',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: '700',
    color: '#000000',
  },
  message: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 18,
    opacity: 0.6,
  },
  messageUnread: {
    opacity: 0.8,
    color: '#1C1C1E',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
});

export default SwipeableNotificationItem;
