import React from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, Image, TouchableOpacity, ImageBackground, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useDashboard } from '../DashboardContext';
import { NavBar } from '@/shared/components/layout';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SportDropdownHeader } from '@/src/shared/components/ui/SportDropdownHeader';
import { useLeagues, LeagueCard } from '@/src/features/leagues';

const { width, height } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const isTablet = width > 768;

export default function DashboardScreen() {
  const { userName } = useDashboard();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(2);
  const [locationFilterOpen, setLocationFilterOpen] = React.useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Fetch leagues data
  const { leagues, isLoading, error, refetch, joinLeague } = useLeagues({
    sportType: 'PICKLEBALL',
    autoFetch: true
  });

  console.log('🔍 PickleballDashboard: Component state:', {
    leaguesCount: leagues.length,
    isLoading,
    error,
    leagues: leagues
  });

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

  const handleJoinLeague = async (leagueId: string) => {
    const success = await joinLeague(leagueId);
    if (success) {
      console.log('Successfully joined league:', leagueId);
      // You could show a success toast here
    } else {
      console.log('Failed to join league:', leagueId);
      // You could show an error toast here
    }
  };

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
        <SportDropdownHeader 
          currentSport="pickleball"
          sportName="Pickleball"
          sportColor="#863A73"
        />

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
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load leagues</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refetch}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : leagues.length > 0 ? (
              <Animated.View style={[styles.parallaxWrapper, {
                transform: [
                  { translateY: scrollY.interpolate({ inputRange: [-100, 0, 200], outputRange: [-30, 0, 20], extrapolate: 'clamp' }) },
                  { scale: scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.05, 1], extrapolate: 'clamp' }) }
                ]
              }]}>
                <LeagueCard 
                  league={leagues[0]} 
                  variant="featured"
                  onJoinPress={handleJoinLeague}
                />
              </Animated.View>
            ) : (
              <View style={styles.noLeaguesContainer}>
                <Text style={styles.noLeaguesText}>No pickleball leagues available</Text>
                <Text style={styles.noLeaguesSubtext}>Check back later for new leagues!</Text>
              </View>
            )}

            {/* Other leagues near you */}
            {leagues.length > 1 && (
              <>
                <View style={styles.otherLeaguesHeaderRow}>
                  <Text style={styles.sectionTitle}>Other leagues near you</Text>
                  <Text style={styles.arrowText}>→</Text>
                </View>

                {leagues.slice(1).map((league) => (
                  <LeagueCard
                    key={league.id}
                    league={league}
                    variant="regular"
                    onJoinPress={handleJoinLeague}
                  />
                ))}
              </>
            )}

           

        </Animated.ScrollView>
      </View>
      
      
      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
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
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
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
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    color: '#333333',
    fontWeight: 'bold',
    marginBottom: 16,
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
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noLeaguesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  noLeaguesText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  noLeaguesSubtext: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});