import { useNotifications } from '@/src/hooks/useNotifications';
import {
  Notification,
  NOTIFICATION_CATEGORIES,
  NotificationCategory
} from '@/src/shared/types/notification';
import SwipeableNotificationItem from '@/src/shared/components/SwipeableNotificationItem';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { isThisWeek, isToday, isYesterday, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types for flattened list with headers
type ListItem =
  | { type: 'header'; title: string; key: string }
  | { type: 'notification'; data: Notification; key: string };

// Group notifications by time and flatten for FlatList
const groupAndFlattenNotifications = (notifications: Notification[]): ListItem[] => {
  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    earlier: [] as Notification[],
  };

  notifications.forEach((notification) => {
    try {
      const date = parseISO(notification.createdAt);
      if (isToday(date)) {
        groups.today.push(notification);
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification);
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        groups.thisWeek.push(notification);
      } else {
        groups.earlier.push(notification);
      }
    } catch {
      groups.earlier.push(notification);
    }
  });

  const result: ListItem[] = [];
  let index = 0;

  if (groups.today.length > 0) {
    result.push({ type: 'header', title: 'Today', key: 'header-today' });
    groups.today.forEach(n => {
      result.push({ type: 'notification', data: n, key: `today-${n.id || index++}` });
    });
  }
  if (groups.yesterday.length > 0) {
    result.push({ type: 'header', title: 'Yesterday', key: 'header-yesterday' });
    groups.yesterday.forEach(n => {
      result.push({ type: 'notification', data: n, key: `yesterday-${n.id || index++}` });
    });
  }
  if (groups.thisWeek.length > 0) {
    result.push({ type: 'header', title: 'This Week', key: 'header-thisweek' });
    groups.thisWeek.forEach(n => {
      result.push({ type: 'notification', data: n, key: `thisweek-${n.id || index++}` });
    });
  }
  if (groups.earlier.length > 0) {
    result.push({ type: 'header', title: 'Earlier', key: 'header-earlier' });
    groups.earlier.forEach(n => {
      result.push({ type: 'notification', data: n, key: `earlier-${n.id || index++}` });
    });
  }

  return result;
};

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    loadMore,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Entry animation effect
  useEffect(() => {
    if (!loading && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Header slides down
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        // Content slides up
        Animated.parallel([
          Animated.spring(contentEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(contentEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    }
  }, [
    loading,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((n) => n.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.message.toLowerCase().includes(query) ||
          n.title?.toLowerCase().includes(query) ||
          n.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filter, categoryFilter, searchQuery]);

  // Flatten notifications with headers for FlatList
  const listData = useMemo(
    () => groupAndFlattenNotifications(filteredNotifications),
    [filteredNotifications]
  );

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsRead(id).catch((err) => console.error('Failed to mark as read:', err));
    },
    [markAsRead]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id).catch((err) => console.error('Failed to delete notification:', err));
    },
    [deleteNotification]
  );

  const handleMarkAllAsRead = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markAllAsRead().catch((err) => console.error('Failed to mark all as read:', err));
  }, [markAllAsRead]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.read) {
        handleMarkAsRead(notification.id);
      }

      // Navigate based on notification metadata
      // Using router.replace() so that when user presses back, they go to the logical parent screen
      // (e.g., My Games for matches, Chat list for threads) instead of back to notifications
      const metadata = notification.metadata || {};

      // Priority 1: Match notifications → go to match-details
      if (metadata.matchId) {
        router.replace({
          pathname: '/match/match-details',
          params: { matchId: metadata.matchId }
        } as any);
        return;
      }

      // Priority 2: Chat/Thread notifications → go directly to thread
      if (metadata.threadId) {
        router.replace(`/chat/${metadata.threadId}` as any);
        return;
      }

      // Priority 3: Season notifications → go to season details
      if (metadata.seasonId) {
        router.replace({
          pathname: '/user-dashboard/season-details',
          params: { seasonId: metadata.seasonId }
        } as any);
        return;
      }

      // Priority 4: Division notifications → go to division standings
      if (metadata.divisionId) {
        router.replace({
          pathname: '/match/divisionstandings',
          params: { divisionId: metadata.divisionId }
        } as any);
        return;
      }

      // Default: stay on notifications page (no navigation for PAYMENT, ADMIN, GENERAL)
    },
    [handleMarkAsRead]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setFilter('all');
  }, []);

  const handleCategorySelect = useCallback((category: NotificationCategory | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategoryFilter(category);
    setCategoryPickerVisible(false);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }
      return (
        <SwipeableNotificationItem
          notification={item.data}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDelete}
          onPress={handleNotificationPress}
        />
      );
    },
    [handleMarkAsRead, handleDelete, handleNotificationPress]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="notifications-off-outline" size={48} color="#8E8E93" />
        </View>
        <Text style={styles.emptyTitle}>
          {filter === 'unread' ? 'All caught up!' : 'No notifications'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {filter === 'unread'
            ? "You've read all your notifications."
            : "When you get notifications, they'll appear here."}
        </Text>
      </View>
    ),
    [filter]
  );

  const renderFooter = useCallback(() => {
    if (loading && notifications.length > 0) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#A04DFE" />
        </View>
      );
    }
    return null;
  }, [loading, notifications.length]);

  // Get current category config for display
  const currentCategoryConfig = categoryFilter === 'all'
    ? null
    : NOTIFICATION_CATEGORIES.find(c => c.value === categoryFilter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerEntryOpacity,
            transform: [{ translateY: headerEntryTranslateY }],
          }
        ]}
      >
        <View style={styles.headerLeft}>
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={styles.headerButton}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done" size={20} color="#1C1C1E" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={refresh}
            style={styles.headerButton}
            activeOpacity={0.7}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Filters + List */}
      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
      <View style={styles.filtersContainer}>
        {/* Quick filter buttons */}
        <View style={styles.quickFilters}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter('unread')}
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'unread' && styles.filterButtonTextActive,
              ]}
            >
              Unread
            </Text>
            {unreadCount > 0 && (
              <View style={[styles.filterBadge, filter === 'unread' && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, filter === 'unread' && styles.filterBadgeTextActive]}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Search and category filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              placeholder="Search notifications..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#8E8E93"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setCategoryPickerVisible(true)}
            style={[
              styles.categoryButton,
              categoryFilter !== 'all' && styles.categoryButtonActive
            ]}
            activeOpacity={0.7}
          >
            {currentCategoryConfig ? (
              <Ionicons
                name={currentCategoryConfig.icon as any}
                size={16}
                color={currentCategoryConfig.color}
              />
            ) : (
              <Ionicons name="filter" size={16} color="#8E8E93" />
            )}
            <Text style={[
              styles.categoryButtonText,
              categoryFilter !== 'all' && styles.categoryButtonTextActive
            ]}>
              {currentCategoryConfig?.label || 'All'}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Clear filters */}
        {(searchQuery || categoryFilter !== 'all' || filter !== 'all') && (
          <TouchableOpacity
            onPress={clearFilters}
            style={styles.clearFiltersButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={16} color="#A04DFE" />
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={listData}
        keyExtractor={(item: ListItem) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={loading ? null : renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#A04DFE" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setCategoryPickerVisible(false)}
        >
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Filter by Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
              {/* All Categories option */}
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  categoryFilter === 'all' && styles.pickerOptionActive
                ]}
                onPress={() => handleCategorySelect('all')}
                activeOpacity={0.7}
              >
                <View style={styles.pickerOptionLeft}>
                  <View style={[styles.pickerIconContainer, { backgroundColor: '#F2F2F7' }]}>
                    <Ionicons name="apps" size={20} color="#8E8E93" />
                  </View>
                  <Text style={styles.pickerOptionText}>All Categories</Text>
                </View>
                {categoryFilter === 'all' && (
                  <Ionicons name="checkmark-circle" size={24} color="#A04DFE" />
                )}
              </TouchableOpacity>

              {/* Each category */}
              {NOTIFICATION_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.pickerOption,
                    categoryFilter === cat.value && styles.pickerOptionActive
                  ]}
                  onPress={() => handleCategorySelect(cat.value)}
                  activeOpacity={0.7}
                >
                  <View style={styles.pickerOptionLeft}>
                    <View style={[styles.pickerIconContainer, { backgroundColor: `${cat.color}15` }]}>
                      <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                    </View>
                    <Text style={styles.pickerOptionText}>{cat.label}</Text>
                  </View>
                  {categoryFilter === cat.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#A04DFE" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.4,
  },
  headerBadge: {
    backgroundColor: '#A04DFE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FAFAFA',
  },
  quickFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#A04DFE',
    borderColor: '#A04DFE',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#A04DFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBadgeTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
    padding: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 6,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoryButtonActive: {
    borderColor: '#A04DFE',
    backgroundColor: 'rgba(160, 77, 254, 0.05)',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  categoryButtonTextActive: {
    color: '#A04DFE',
    fontWeight: '600',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(160, 77, 254, 0.1)',
    borderRadius: 14,
    gap: 4,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A04DFE',
  },
  listContent: {
    backgroundColor: '#F2F2F7',
    flexGrow: 1,
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  // Category Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  pickerScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(160, 77, 254, 0.08)',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
});
