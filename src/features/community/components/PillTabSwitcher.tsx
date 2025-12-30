import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  LayoutChangeEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface PillTabSwitcherProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ key: string; label: string; count?: number }>;
}

export const PillTabSwitcher: React.FC<PillTabSwitcherProps> = ({
  activeTab,
  onTabChange,
  tabs,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorPosition = useSharedValue(0);

  const tabWidth = containerWidth > 0 ? (containerWidth - 8) / tabs.length : 0;

  useEffect(() => {
    if (containerWidth > 0) {
      const targetIndex = tabs.findIndex((t) => t.key === activeTab);
      indicatorPosition.value = withSpring(targetIndex * tabWidth + 4, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });
    }
  }, [activeTab, containerWidth, tabWidth, tabs]);

  const handleTabPress = (tabKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tabKey);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: tabWidth,
  }));

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Animated indicator */}
      {containerWidth > 0 && (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      )}

      {/* Tab buttons */}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.key)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <Text style={[styles.countText, isActive && styles.countTextActive]}>
                  {' '}({tab.count})
                </Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#FEA04D',
    borderRadius: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: isSmallScreen ? 6 : isTablet ? 10 : 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    color: '#666666',
  },
  tabTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    color: '#666666',
  },
  countTextActive: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
