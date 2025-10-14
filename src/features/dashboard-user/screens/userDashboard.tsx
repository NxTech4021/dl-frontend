import React, { useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, Image, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useDashboard } from '../DashboardContext';
import { NavBar } from '@/shared/components/layout';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import * as Haptics from 'expo-haptics';
import TennisIcon from '@/assets/images/033-TENNIS 1.svg';
import PadelIcon from '@/assets/images/036-PADEL 1.svg';
import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';

const SPORT_CONFIG = {
  Pickleball: {
    color: '#A04DFE',
    Icon: PickleballIcon,
    route: '/user-dashboard/pickleball' as const,
    displayName: 'Pickleball'
  },
  Tennis: {
    color: '#A2E047',
    Icon: TennisIcon,
    route: '/user-dashboard/tennis' as const,
    displayName: 'Tennis'
  },
  Padel: {
    color: '#4DABFE',
    Icon: PadelIcon,
    route: '/user-dashboard/pickleball' as const, // using pickleball route for now until padel route is created
    displayName: 'Padel'
  }
} as const;

const { width, height } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const isTablet = width > 768;

export default function DashboardScreen() {
  const { userName } = useDashboard();
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(2);
  const [refreshing, setRefreshing] = React.useState(false);
  const [profileData, setProfileData] = React.useState<any>(null);
  // Use safe area insets for proper status bar handling across platforms
  const STATUS_BAR_HEIGHT = insets.top;

  // Helper function to get user's selected sports
  const getUserSelectedSports = () => {
    if (!profileData?.sports) return [];
    
    const sports = profileData.sports.map((sport: string) => 
      sport.charAt(0).toUpperCase() + sport.slice(1)
    );
    
    // Define the order of sports
    const preferredOrder = ['Pickleball', 'Tennis', 'Padel'];
    
    // Filter to only include sports that are configured and sort by order
    const configuredSports = sports.filter((sport: string) => sport in SPORT_CONFIG);
    
    // Sort by preferred order
    return configuredSports.sort((a: string, b: string) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      
      // If both sports are in the preferred order, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one sport is in the preferred order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // If neither sport is in the preferred order, maintain original order
      return 0;
    });
  };

  // Helper function to get button label for a sport
  const getSportButtonLabel = (sport: string) => {
    // Check if questionnaire is completed for this sport
    const sportLower = sport.toLowerCase();
    const questionnaireStatus = profileData?.questionnaireStatus?.[sportLower];
    
    if (questionnaireStatus?.isCompleted) {
      return 'Enter League';
    } else {
      return 'Complete Questionnaire';
    }
  };

  // Helper function to handle sport button press
  const handleSportButtonPress = (sport: string, route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const sportLower = sport.toLowerCase();
    const questionnaireStatus = profileData?.questionnaireStatus?.[sportLower];
    
    if (questionnaireStatus?.isCompleted) {
      // Navigate to league dashboard
      router.push(route as any);
    } else {
      // Navigate to questionnaire for this sport
      router.push(`/onboarding/skill-assessment?sport=${sportLower}&sportIndex=0&fromDashboard=true` as any);
    }
  };

  console.log(`DashboardScreen: Current activeTab is ${activeTab}`);
  
  // Debug logging for safe area insets in parent component
  useEffect(() => {
    console.log('=== Dashboard Safe Area Debug Info ===');
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
    console.log('====================================');
  }, [insets, width, height]);

  // Debug logging for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      console.log('=== Screen Dimension Change Debug ===');
      console.log(`New screen dimensions:`, {
        width: window.width,
        height: window.height
      });
      console.log(`Safe area insets (unchanged):`, {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right
      });
      console.log(`New available content height: ${window.height - insets.top - insets.bottom}px`);
      console.log(`New NavBar position: bottom ${window.height - insets.bottom}px`);
      console.log('====================================');
    });

    return () => subscription?.remove();
  }, [insets]);

  // Basic session protection only - let login.tsx handle onboarding flow
  useEffect(() => {
    if (!session?.user?.id) {
      console.log('DashboardScreen: No session, redirecting to login');
      router.replace('/login');
      return;
    }

    // DON'T redirect unverified users - they might be on verifyEmail page
    // Let the natural flow handle email verification
    if (!session.user.emailVerified) {
      console.log('DashboardScreen: Email not verified, but allowing access (user might be verifying)');
      return;
    }

    console.log('DashboardScreen: User has valid session, allowing access');
  }, [session]);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileData();
    }
  }, [session?.user?.id]);

  const handleTabPress = (tabIndex: number) => {
    console.log(`DashboardScreen: Setting activeTab to ${tabIndex}`);
    setActiveTab(tabIndex);
    console.log(`Tab ${tabIndex} pressed - ${['Connect', 'Friendly', 'Leagues', 'My Games', 'Chat'][tabIndex]}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);


    // Navigate to Connect screen when tab 0 is pressed
    if (tabIndex === 0) {
      router.push('/user-dashboard/connect');
    }
  };

  const fetchProfileData = async () => {
    try {
      if (!session?.user?.id) {
        console.log('DashboardScreen: No session user ID available for profile data');
        return;
      }
      
      const backendUrl = getBackendBaseURL();
      console.log('DashboardScreen: Fetching profile data from:', `${backendUrl}/api/player/profile/me`);
      
      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
        method: 'GET',
      });
      
      console.log('DashboardScreen: Profile API response:', authResponse);
      
      if (authResponse && (authResponse as any).data && (authResponse as any).data.data) {
        console.log('DashboardScreen: Setting profile data:', (authResponse as any).data.data);
        setProfileData((authResponse as any).data.data);
      } else if (authResponse && (authResponse as any).data) {
        console.log('DashboardScreen: Setting profile data (direct):', (authResponse as any).data);
        setProfileData((authResponse as any).data);
      } else {
        console.error('DashboardScreen: No profile data received from authClient');
      }
    } catch (error) {
      console.error('DashboardScreen: Error fetching profile data:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    console.log('DashboardScreen: Refreshing dashboard data...');
    setRefreshing(true);
    
    try {
      // Add haptic feedback for refresh
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Fetch fresh profile data
      await fetchProfileData();
      
      console.log('DashboardScreen: Dashboard data refreshed successfully');
      
    } catch (error) {
      console.error('DashboardScreen: Error refreshing dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  // handleLogout removed - logout functionality moved to settings page

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
          const { x, y, width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
          console.log('=== Container Layout Debug ===');
          console.log(`Container layout:`, {
            x,
            y,
            width: layoutWidth,
            height: layoutHeight
          });
          console.log(`Container top position: ${y}px`);
          console.log(`Container bottom position: ${y + layoutHeight}px`);
          console.log(`Available space for content: ${layoutHeight}px`);
          console.log(`NavBar space reserved: 83px`);
          console.log(`Actual content space: ${layoutHeight - 83}px`);
          console.log('==============================');
        }}
      >
              <LinearGradient
          colors={['#FDEDE0', '#FFFFFF']}
          locations={[0, 1]}
          style={styles.backgroundGradient}
        />


      <View style={[styles.contentContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
         <View style={styles.headerSection}>
           <View style={styles.headerContainer}>
             <Text style={styles.logoText}>DEUCE</Text>
             <View style={styles.headerRight}>
               {/* Logout button removed - now available in settings page */}
               <TouchableOpacity 
                 style={styles.profilePicture}
                 onPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                   router.push('/profile');
                 }}
               >
                 {(profileData?.image || session?.user?.image) ? (
                   <Image 
                     source={{ uri: profileData?.image || session?.user?.image }}
                     style={styles.profileImage}
                     onError={() => {
                       console.log('Profile image failed to load:', profileData?.image || session?.user?.image);
                     }}
                   />
                 ) : (
                   <View style={styles.defaultAvatarContainer}>
                     <Text style={styles.defaultAvatarText}>
                       {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                     </Text>
                   </View>
                 )}
               </TouchableOpacity>
             </View>
           </View>
         </View>

       
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6de9a0"
              colors={["#6de9a0"]}
              progressBackgroundColor="#ffffff"
            />
          }
        >
            
            <View style={styles.sportSelectionHeader}>
              <Text style={styles.sportSelectionText}>Select a Sport</Text>
            </View>

            <View style={styles.sportCardsContainer}>
              {getUserSelectedSports().length > 0 ? (
                getUserSelectedSports().map((sport: string) => {
                  const sportConfig = SPORT_CONFIG[sport as keyof typeof SPORT_CONFIG];
                  if (!sportConfig) return null;

                  return (
                    <View key={sport} style={styles.sportCard}>
                      <View style={styles.sportCardHeader}>
                      <View style={styles.sportIconContainer}>
                        <View style={[styles.sportIcon, { backgroundColor: '#FFFFFF' }]}>
                          <sportConfig.Icon 
                            width={isSmallScreen ? 24 : isTablet ? 36 : 30} 
                            height={isSmallScreen ? 24 : isTablet ? 36 : 30} 
                          />
                        </View>
                      </View>
                        <View style={styles.sportInfo}>
                          <Text style={[styles.sportName, { color: sportConfig.color }]}>
                            {sportConfig.displayName}
                          </Text>
                        </View>
                        <View style={styles.playerCount}>
                          <View style={styles.playerDot} />
                          <Text style={styles.playerCountText}>1 players joined</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.sportButton, { backgroundColor: sportConfig.color }]}
                        onPress={() => handleSportButtonPress(sport, sportConfig.route)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.sportButtonText}>{getSportButtonLabel(sport)}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              ) : (
                <View style={styles.noSportsCard}>
                  <Text style={styles.noSportsText}>No sports selected yet</Text>
                  <Text style={styles.noSportsSubtext}>Complete your profile to see your sports</Text>
                </View>
              )}
            </View>

          <View style={styles.newsSection}>
            <Text style={styles.sectionTitle}>Latest News</Text>
            
            <View style={styles.newsCard}>
              <View style={styles.newsCardHeader}>
                <View style={styles.newsIconContainer}>
                  <Text style={styles.newsIconText}>📰</Text>
                </View>
                <View style={styles.newsInfo}>
                  <Text style={styles.newsTitle}>Tournament Updates</Text>
                  <Text style={styles.newsSubtitle}>New season starting soon</Text>
                </View>
                <View style={styles.newsTime}>
                  <Text style={styles.newsTimeText}>2h ago</Text>
                </View>
              </View>
              <Text style={styles.newsPlaceholder}>News content will appear here</Text>
            </View>

            <View style={styles.newsCard}>
              <View style={styles.newsCardHeader}>
                <View style={styles.newsIconContainer}>
                  <Text style={styles.newsIconText}>🏆</Text>
                </View>
                <View style={styles.newsInfo}>
                  <Text style={styles.newsTitle}>Championship Results</Text>
                  <Text style={styles.newsSubtitle}>Final standings announced</Text>
                </View>
                <View style={styles.newsTime}>
                  <Text style={styles.newsTimeText}>1d ago</Text>
                </View>
              </View>
              <Text style={styles.newsPlaceholder}>Championship details will appear here</Text>
            </View>

            <View style={styles.newsCard}>
              <View style={styles.newsCardHeader}>
                <View style={styles.newsIconContainer}>
                  <Text style={styles.newsIconText}>🎯</Text>
                </View>
                <View style={styles.newsInfo}>
                  <Text style={styles.newsTitle}>Training Tips</Text>
                  <Text style={styles.newsSubtitle}>Improve your game</Text>
                </View>
                <View style={styles.newsTime}>
                  <Text style={styles.newsTimeText}>3d ago</Text>
                </View>
              </View>
              <Text style={styles.newsPlaceholder}>Training content will appear here</Text>
            </View>
          </View>
        </ScrollView>

      </View>
      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
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
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: isSmallScreen ? 20 : 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: isSmallScreen ? 20 : isTablet ? 28 : 24,
    lineHeight: isSmallScreen ? 20 : isTablet ? 28 : 24,
    color: '#FE9F4D',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // logoutButton styles removed - logout now in settings page
  profilePicture: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
  },
  defaultAvatarContainer: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
    paddingBottom: 120,
  },
  sportSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    gap: 12,
    width: 156,
    height: 21,
    marginBottom: 20,
  },
  sportSelectionText: {
    fontFamily: 'Inter',
    fontStyle: 'normal',
    fontWeight: '700',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: '#1A1C1E',
  },
  sportCardsContainer: {
    marginBottom: 20,
  },
  sportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : isTablet ? 24 : 20,
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
  sportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sportIconContainer: {
    marginRight: 16,
  },
  sportIcon: {
    width: isSmallScreen ? 40 : isTablet ? 56 : 48,
    height: isSmallScreen ? 40 : isTablet ? 56 : 48,
    borderRadius: isSmallScreen ? 20 : isTablet ? 28 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportIconText: {
    fontSize: 24,
  },
  sportInfo: {
    flex: 1,
  },
  sportName: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '700',
  },
  playerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  playerCountText: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#6B7280',
  },
  sportButton: {
    borderRadius: 12,
    paddingVertical: isSmallScreen ? 12 : isTablet ? 16 : 14,
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    alignItems: 'center',
  },
  sportButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    fontWeight: '600',
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
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
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
    padding: isSmallScreen ? 16 : isTablet ? 24 : 20,
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
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  newsSubtitle: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  newsTime: {
    alignItems: 'flex-end',
  },
  newsTimeText: {
    fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  newsPlaceholder: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  noSportsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 32 : isTablet ? 48 : 40,
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
  noSportsText: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  noSportsSubtext: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});


