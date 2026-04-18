// src/features/feed/components/FeedHeader.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { feedTheme } from "../theme";

type TabKey = "activity" | "friends";
const TAB_ORDER: TabKey[] = ["activity", "friends"];
const TAB_LABELS: Record<TabKey, string> = {
  activity: "Activity",
  friends: "Friends",
};

interface FeedHeaderProps {
  selectedSport?: string;
  userFilter?: "all" | "friends";
  onFilterPress?: () => void;
  onFriendListPress: () => void;
  onUserFilterToggle?: () => void;
  activeTab: "activity" | "friends";
  onTabChange: (tab: "activity" | "friends") => void;
  onAddFriendPress?: () => void;
  pendingFriendRequests?: number;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  selectedSport,
  userFilter = "all",
  onFilterPress,
  onFriendListPress,
  onUserFilterToggle,
  activeTab,
  onTabChange,
  onAddFriendPress,
  pendingFriendRequests = 0,
}) => {
  const underlineX = useSharedValue(0);
  const underlineWidth = useSharedValue(0);
  const underlineOpacity = useSharedValue(0); // hidden until first layout fires
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  // Track whether the underline has been positioned at least once so that
  // subsequent re-layout events (triggered by loading-state re-renders) don't
  // snap the underline mid-animation and interrupt withTiming.
  const isUnderlineInitialized = useRef(false);

  const handleTabLayout = useCallback(
    (index: number, e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      tabLayouts.current[index] = { x, width };
      // Only snap on the very first measurement — after that the layout cache is
      // kept fresh for handleTabPress but the underline animation is left alone.
      if (!isUnderlineInitialized.current) {
        const activeIndex = TAB_ORDER.indexOf(activeTabRef.current);
        if (index === activeIndex) {
          underlineX.value = x;
          underlineWidth.value = width;
          underlineOpacity.value = withTiming(1, { duration: 150 });
          isUnderlineInitialized.current = true;
        }
      }
    },
    [underlineX, underlineWidth, underlineOpacity],
  );

  const handleTabPress = useCallback(
    (tab: TabKey) => {
      const index = TAB_ORDER.indexOf(tab);
      const layout = tabLayouts.current[index];
      if (layout) {
        underlineX.value = withTiming(layout.x, { duration: 220 });
        underlineWidth.value = withTiming(layout.width, { duration: 220 });
      }
      onTabChange(tab);
    },
    [onTabChange, underlineX, underlineWidth],
  );

  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineWidth.value,
    opacity: underlineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        {TAB_ORDER.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
            onLayout={(e) => handleTabLayout(index, e)}
            activeOpacity={0.7}
          >
            <View style={styles.tabLabelRow}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {TAB_LABELS[tab]}
              </Text>
              {tab === "friends" && pendingFriendRequests > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {pendingFriendRequests > 9
                      ? "9+"
                      : String(pendingFriendRequests)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
        {/* Sliding animated underline */}
        <Animated.View style={[styles.tabUnderline, underlineStyle]} />

        {/* Add Friend button — visible only on Friends tab */}
        {activeTab === "friends" && onAddFriendPress && (
          <TouchableOpacity
            style={styles.addFriendButton}
            onPress={onAddFriendPress}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#555555" />
            {pendingFriendRequests > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {pendingFriendRequests > 9
                    ? "9+"
                    : String(pendingFriendRequests)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Row — hidden on Friends tab */}
      {activeTab !== "friends" && (
        <View style={styles.filtersRow}>
          {/* Sport Filter */}
          {onFilterPress && (
            <TouchableOpacity
              style={styles.filterButton}
              onPress={onFilterPress}
              activeOpacity={0.7}
            >
              <Text style={styles.filterText}>
                {selectedSport
                  ? selectedSport.charAt(0).toUpperCase() +
                    selectedSport.slice(1)
                  : "All Sports"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={feedTheme.colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          {/* User Filter Toggle */}
          {onUserFilterToggle && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                userFilter === "friends" && styles.filterButtonActive,
              ]}
              onPress={onUserFilterToggle}
              activeOpacity={0.7}
            >
              <Ionicons
                name={userFilter === "friends" ? "people" : "globe-outline"}
                size={16}
                color={
                  userFilter === "friends"
                    ? feedTheme.colors.primary
                    : feedTheme.colors.textSecondary
                }
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.filterText,
                  userFilter === "friends" && styles.filterTextActive,
                ]}
              >
                {userFilter === "friends" ? "Friends" : "All Users"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  addFriendButton: {
    marginLeft: "auto",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFEFEF",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: feedTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
    lineHeight: 11,
  },
  tab: {
    paddingVertical: 8,
    paddingBottom: 12,
  },
  tabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  tabText: {
    fontSize: 20,
    fontWeight: "600",
    color: feedTheme.colors.textSecondary,
  },
  tabTextActive: {
    color: feedTheme.colors.textPrimary,
    fontWeight: "700",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: feedTheme.colors.primary,
    borderRadius: 2,
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: feedTheme.colors.border,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: feedTheme.colors.primary + "15",
    borderWidth: 1,
    borderColor: feedTheme.colors.primary,
  },
  filterText: {
    ...feedTheme.typography.filterText,
    color: feedTheme.colors.textPrimary,
    marginRight: 4,
  },
  filterTextActive: {
    color: feedTheme.colors.primary,
    fontWeight: "600",
  },
});
