import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HandshakeIcon } from '@/shared/components/icons';

const { width } = Dimensions.get('window');

interface NavBarProps {
  activeTab?: number;
  onTabPress?: (tabIndex: number) => void;
}

export default function NavBar({ activeTab = 2, onTabPress }: NavBarProps) {
  // Get safe area insets
  const insets = useSafeAreaInsets();

  // Detect if Android device has gesture navigation
  // Gesture navigation typically has bottom insets > 0 on Android
  // Button navigation typically has bottom insets = 0 on Android
  const hasAndroidGestureNav = Platform.OS === 'android' && insets.bottom > 0;

  // Only apply safe area adjustments if Android has gesture navigation
  const shouldApplySafeArea = hasAndroidGestureNav;

  // Debug log to show what activeTab prop is received
  console.log(`NavBar: Received activeTab prop: ${activeTab}`);

  const tabs = [
    { icon: 'handshake', iconFilled: 'handshake', label: 'Connect', index: 0 },
    { icon: 'people-outline', iconFilled: 'people', label: 'Friendly', index: 1 },
    { icon: 'trophy-outline', iconFilled: 'trophy', label: 'Leagues', index: 2 },
    { icon: 'game-controller-outline', iconFilled: 'game-controller', label: 'My Games', index: 3 },
    { icon: 'chatbubble-outline', iconFilled: 'chatbubble', label: 'Chat', index: 4 },
  ];

  const handleTabPress = (tabIndex: number) => {
    // Placeholder function that doesn't return anything
    // You can add actual navigation logic here later
    console.log(`NavBar: Tab ${tabIndex} pressed`);

    if (onTabPress) {
      onTabPress(tabIndex);
    }
  };

  // Debug logging for render
  console.log(`NavBar: Rendering with activeTab: ${activeTab}, safe area bottom: ${insets.bottom}px, gesture nav: ${hasAndroidGestureNav}`);

  return (
    <View
      style={[
        styles.navBar,
        shouldApplySafeArea && {
          // Apply safe area adjustments only for Android gesture navigation
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
        }
      ]}
      onLayout={(event) => {
        const { x, y, width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
        console.log('=== NavBar Layout Debug ===');
        console.log(`NavBar layout:`, {
          x,
          y,
          width: layoutWidth,
          height: layoutHeight
        });
        console.log(`NavBar actual bottom position: ${y + layoutHeight}px`);
        console.log(`Screen height: ${Dimensions.get('window').height}px`);
        console.log(`Distance from screen bottom: ${Dimensions.get('window').height - (y + layoutHeight)}px`);
        console.log('========================');
      }}
    >
      {/* Tabs Container */}
      <View
        style={styles.tabsContainer}
        onLayout={(event) => {
          const { x, y, width: tabsWidth, height: tabsHeight } = event.nativeEvent.layout;
          console.log('=== Tabs Container Layout Debug ===');
          console.log(`Tabs container layout:`, {
            x,
            y,
            width: tabsWidth,
            height: tabsHeight
          });
          console.log('==================================');
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.index === activeTab;
          // console.log(`NavBar: Tab ${tab.index} (${tab.label}) isActive: ${isActive}`); // Commented out to reduce console spam
          return (
            <TouchableOpacity
              key={tab.index}
              style={styles.tab}
              onPress={() => handleTabPress(tab.index)}
              onPressIn={() => console.log(`Tab ${tab.index} pressed IN`)}
              onPressOut={() => console.log(`Tab ${tab.index} pressed OUT`)}
              activeOpacity={0.3}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.iconContainer}>
                {tab.icon === 'handshake' ? (
                  <HandshakeIcon size={24} color={isActive ? '#FEA04D' : '#BABABA'} />
                ) : (
                  <Ionicons
                    name={isActive ? (tab.iconFilled as any) : (tab.icon as any)}
                    size={24}
                    color={isActive ? '#863A73' : '#BABABA'}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: tab.icon === 'handshake' ? (isActive ? '#FEA04D' : '#BABABA') : (isActive ? '#863A73' : '#BABABA'),
                    fontWeight: isActive ? '700' : '500'
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Home Indicator */}
      {/* <View style={styles.homeIndicator}>
        <View style={styles.homeIndicatorBar} />
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: width,
    height: 83,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -0.5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
    zIndex: 9999,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 49,
    zIndex: 10000, // High z-index for tabs container
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 0,
    height: 49,
    position: 'relative',
    zIndex: 10000, // Ensure individual tabs are above everything
  },


  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  tabLabel: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  homeIndicator: {
    width: '100%',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIndicatorBar: {
    width: 134,
    height: 5,
    backgroundColor: '#000000',
    borderRadius: 100,
  },
});
