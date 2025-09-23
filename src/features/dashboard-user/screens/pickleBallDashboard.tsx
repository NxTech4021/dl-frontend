import React from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, Image, TouchableOpacity, ImageBackground, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useDashboard } from '../DashboardContext';
import { NavBar } from '@/shared/components/layout';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function DashboardScreen() {
  const { userName } = useDashboard();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(2);
  const [locationFilterOpen, setLocationFilterOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = React.useState(false);
  const [headerTitleLayout, setHeaderTitleLayout] = React.useState<{ x: number; y: number; width: number; height: number } | null>(null);

  console.log(`PickleballDashboard: Current activeTab is ${activeTab}`);
  
  // Debug logging for safe area insets in pickleball dashboard
  React.useEffect(() => {
    console.log('=== Pickleball Dashboard Safe Area Debug Info ===');
    console.log(`Platform: ${Platform.OS}`);
    console.log(`Screen dimensions:`, {
      width: width,
      height: height
    });
    console.log(`Safe area insets:`, {
      top: insets.top,
      bottom: insets.bottom,
      left: insets.left,
      right: insets.right
    });
    console.log(`Available content height: ${height - insets.top - insets.bottom}px`);
    console.log(`NavBar will be positioned at bottom: ${height - insets.bottom}px`);
    console.log(`Content should end at: ${height - insets.bottom - 83}px (NavBar height: 83px)`);
    console.log('===============================================');
  }, [insets, width, height]);

  const handleTabPress = (tabIndex: number) => {
    console.log(`Tab ${tabIndex} pressed - ${['Favourite', 'Friendly', 'Leagues', 'My Games', 'Chat'][tabIndex]}`);
    setActiveTab(tabIndex);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  React.useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView 
      style={styles.container}
      onLayout={(event) => {
        const { x, y, width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
        console.log('=== Pickleball SafeAreaView Layout Debug ===');
        console.log(`SafeAreaView layout:`, {
          x,
          y,
          width: layoutWidth,
          height: layoutHeight
        });
        console.log(`SafeAreaView top position: ${y}px`);
        console.log(`SafeAreaView bottom position: ${y + layoutHeight}px`);
        console.log(`Available space for content: ${layoutHeight}px`);
        console.log(`NavBar space reserved: 83px`);
        console.log(`Actual content space: ${layoutHeight - 83}px`);
        console.log('==========================================');
      }}
    >
              <LinearGradient
          colors={['#B98FAF', '#FFFFFF']}
          locations={[0, 1]}
          style={styles.backgroundGradient}
        />
      
      
      <View style={styles.contentContainer}>
                 {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/user-dashboard'); }} activeOpacity={0.7}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerTitleRow}
              activeOpacity={0.7}
              onPress={() => setIsHeaderMenuOpen((v) => !v)}
              onLayout={(e) => setHeaderTitleLayout(e.nativeEvent.layout)}
            >
              <Text style={styles.headerTitleText}>Pickleball</Text>
              <Text style={styles.headerTitleCaret}>▾</Text>
            </TouchableOpacity>
          </View>
          
        </View>

        
        
        <Animated.ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
                  >
          
            {/* Recommended League Header with filter */}
            <View style={styles.recommendedHeaderRow}>
              <Text style={styles.sportSelectionText}>Recommended league:</Text>
              <TouchableOpacity style={styles.locationFilter} onPress={() => setLocationFilterOpen(!locationFilterOpen)}>
                <Text style={styles.locationFilterText}>Based on your location</Text>
                <Text style={styles.locationFilterChevron}>▾</Text>
              </TouchableOpacity>
            </View>

            {/* Featured League Card */}
            {isLoading ? (
              <View style={styles.featuredSkeleton} />
            ) : (
            <TouchableOpacity activeOpacity={0.9} style={styles.featuredCard}>
              <Animated.View style={[styles.parallaxWrapper, {
                transform: [
                  { translateY: scrollY.interpolate({ inputRange: [-100, 0, 200], outputRange: [-30, 0, 20], extrapolate: 'clamp' }) },
                  { scale: scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.05, 1], extrapolate: 'clamp' }) }
                ]
              }]}>
                <ImageBackground
                  source={require('@/assets/images/leaguepickleball3.png')}
                  style={styles.featuredImage}
                  imageStyle={styles.featuredImageRadius}
                >
                  <View style={styles.featuredOverlay} />
                  <View style={styles.featuredContent}>
                    <View style={styles.featuredTopRow}>
                      <Text style={styles.featuredLeagueName}>PJ League</Text>
                      <View style={styles.trophyBadge}>
                        <Text style={styles.trophyText}>🏆 S1</Text>
                      </View>
                    </View>
                    <View style={styles.featuredMetaRow}>
                      <View style={styles.avatarsRow}>
                        <Image
                          source={require('@/assets/images/icon1.png')}
                          style={[styles.avatarImage, { zIndex: 3 }]}
                        />
                        <Image
                          source={require('@/assets/images/icon2.png')}
                          style={[styles.avatarImage, { marginLeft: -10, zIndex: 2 }]}
                        />
                        <Image
                          source={require('@/assets/images/icon3.png')}
                          style={[styles.avatarImage, { marginLeft: -10, zIndex: 1 }]}
                        />
                        <Text style={styles.moreCountText}>+23</Text>
                      </View>
                      <TouchableOpacity style={styles.featuredCta} onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/league-registration',
                          params: {
                            leagueName: 'PJ League',
                            sport: 'Pickleball',
                            playersJoined: '26 players joined'
                          }
                        });
                      }}>
                        <Text style={styles.featuredCtaText}>Join Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ImageBackground>
              </Animated.View>
            </TouchableOpacity>
            )}

            {/* Other leagues near you */}
            <View style={styles.otherLeaguesHeaderRow}>
              <Text style={styles.sectionTitle}>Other leagues near you</Text>
              <Text style={styles.arrowText}>→</Text>
            </View>

            <View style={styles.otherLeagueCard}>
              <ImageBackground
                source={require('@/assets/images/leaguepickleball1.png')}
                style={styles.otherLeagueImage}
                imageStyle={styles.otherLeagueImageRadius}
              />
              <View style={styles.otherLeagueInfoRow}>
                <View>
                  <Text style={styles.otherLeagueName}>KL League</Text>
                  <Text style={styles.otherLeagueSub}>120 players joined</Text>
                </View>
                <TouchableOpacity style={styles.otherLeagueCta} onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/league-registration',
                    params: {
                      leagueName: 'KL League',
                      sport: 'Pickleball',
                      playersJoined: '120 players joined'
                    }
                  });
                }}>
                  <Text style={styles.otherLeagueCtaText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.otherLeagueCard}>
              <ImageBackground
                source={require('@/assets/images/leaguepickleball2.png')}
                style={styles.otherLeagueImage}
                imageStyle={styles.otherLeagueImageRadius}
              />
              <View style={styles.otherLeagueInfoRow}>
                <View>
                  <Text style={styles.otherLeagueName}>Subang League</Text>
                  <Text style={styles.otherLeagueSub}>96 players joined</Text>
                </View>
                <TouchableOpacity style={styles.otherLeagueCta} onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/league-registration',
                    params: {
                      leagueName: 'Subang League',
                      sport: 'Pickleball',
                      playersJoined: '96 players joined'
                    }
                  });
                }}>
                  <Text style={styles.otherLeagueCtaText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>

           

        </Animated.ScrollView>
      </View>
      
      
      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />

      {isHeaderMenuOpen && (
        <View style={styles.dropdownOverlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setIsHeaderMenuOpen(false)}
          />
          <View
            style={[
              styles.dropdownMenu,
              headerTitleLayout
                ? {
                    top: headerTitleLayout.y + headerTitleLayout.height + 40,
                    left: headerTitleLayout.x + 100,
                  }
                : undefined,
            ]}
          >
            <View style={styles.dropdownCard}>
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => { setIsHeaderMenuOpen(false); router.push('/user-dashboard/pickleball')}}
              >
                <Text style={styles.dropdownIconPickleball}>🏓</Text>
                <Text style={styles.dropdownLabelPickleball}>Pickleball</Text>
                <Text style={styles.dropdownCheckPickle}>✓</Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.dropdownRow}
                onPress={() => { setIsHeaderMenuOpen(false); router.push('/user-dashboard/tennis'); }}
              >
                <Text style={styles.dropdownIconTennis}>🎾</Text>
                <Text style={styles.dropdownLabelTennis}>Tennis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerExpanded: {
    marginBottom: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: 10, 
  },
  backIcon: {
    fontSize: 35,
    fontWeight: '600',
    color: '#111827',
    marginRight: 5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10, 
  },
  headerTitleText: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontStyle: 'italic',
    fontWeight: '800',
    fontSize: 24,
    lineHeight: 24,
    color: '#863A73',
    marginRight: 6,
  },
  headerTitleCaret: {
    fontSize: 16,
    color: '#111827',
    marginTop: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 20,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 9999,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
    elevation: 30,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  dropdownCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dropdownIconPickleball: {
    fontSize: 16,
  },
  dropdownIconTennis: {
    fontSize: 16,
  },
  dropdownLabelPickleball: {
    fontSize: 14,
    fontWeight: '700',
    color: '#863A73',
    flex: 1,
  },
  dropdownLabelTennis: {
    fontSize: 14,
    fontWeight: '700',
    color: '#008000',
    flex: 1,
  },
  dropdownCheckPickle: {
    fontSize: 14,
    color: '#863A73',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  recommendedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportSelectionText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    color: '#1A1C1E',
  },
  locationFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  locationFilterText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
  },
  locationFilterChevron: {
    fontSize: 12,
    color: '#6B7280',
  },
  featuredCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 180,
    justifyContent: 'flex-end',
  },
  featuredImageRadius: {
    borderRadius: 16,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  featuredContent: {
    padding: 16,
  },
  featuredTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredLeagueName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  trophyBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)'
  },
  trophyText: {
    fontSize: 12,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredCta: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)'
  },
  featuredCtaText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  otherLeaguesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowText: {
    fontSize: 18,
    color: '#9CA3AF',
  },
  otherLeagueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  otherLeagueImage: {
    width: '100%',
    height: 140,
  },
  otherLeagueImageRadius: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  otherLeagueInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  otherLeagueName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  otherLeagueSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  otherLeagueCta: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  otherLeagueCtaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    color: '#FF6B35',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#999999',
  },
  quickActionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recentActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#333333',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  tabIndicator: {
    backgroundColor: '#F8F0F5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#863A73',
  },
  tabIndicatorText: {
    fontSize: 14,
    color: '#863A73',
    fontWeight: '600',
    textAlign: 'center',
  },
  newsSection: {
    marginBottom: 20,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  newsIconContainer: {
    marginRight: 16,
  },
  newsIconText: {
    fontSize: 24,
  },
  newsInfo: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  newsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  newsTime: {
    alignItems: 'flex-end',
  },
  newsTimeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  newsPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  parallaxWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredSkeleton: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
});


