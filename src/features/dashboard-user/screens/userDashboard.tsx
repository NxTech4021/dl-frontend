import PadelLocationIcon from "@/assets/icons/padel-location.svg";
import PickleballLocationIcon from "@/assets/icons/pickleball-location.svg";
import SearchIcon from "@/assets/icons/search-icon.svg";
import TennisLocationIcon from "@/assets/icons/tennis-location.svg";
import { getBackendBaseURL } from "@/config/network";
import { authClient, useSession } from "@/lib/auth-client";
import { NavBar } from "@/shared/components/layout";
import { SportSwitcher } from "@/shared/components/ui/SportSwitcher";
import { ChatScreen } from "@/src/features/chat/ChatScreen";
import { useUnreadCount } from "@/src/features/chat/hooks/useUnreadCount";
import { useChatSocketEvents } from "@/src/features/chat/hooks/useChatSocketEvents";
import CommunityScreen from "@/src/features/community/screens/CommunityScreen";
import { LeagueCard, LeagueGrid, useLeagues, useUserActiveLeagues, ActiveLeaguesCarousel } from "@/src/features/leagues";
import { useNotifications } from "@/src/hooks/useNotifications";
import NotificationBell from "@/src/shared/components/NotificationBell";
import MyGamesScreen from "./MyGamesScreen";
import { FilterTab } from './my-games';
import { FriendlyScreen } from "@/src/features/friendly/screens";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { default as React, useCallback, useEffect } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SPORT_CONFIG = {
  pickleball: {
    color: "#A04DFE",
    gradientColors: ["#B98FAF", "#FFFFFF"],
    apiType: "PICKLEBALL" as const,
    displayName: "Pickleball",
  },
  tennis: {
    color: "#A2E047",
    gradientColors: ["#A2E047", "#FFFFFF"],
    apiType: "TENNIS" as const,
    displayName: "Tennis",
  },
  padel: {
    color: "#4DABFE",
    gradientColors: ["#4DABFE", "#FFFFFF"],
    apiType: "PADEL" as const,
    displayName: "Padel",
  },
} as const;

const { width, height } = Dimensions.get("window");

// Responsive design helpers
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const isTablet = width > 768;

export default function DashboardScreen() {
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();
  const { sport: routeSport, view: routeView, tab: routeTab } = useLocalSearchParams<{ sport?: string; view?: string; tab?: string }>();
  const [activeTab, setActiveTab] = React.useState(2);
  const [currentView, setCurrentView] = React.useState<
    "dashboard" | "connect" | "friendly" | "myGames" | "chat"
  >("dashboard");
  const [refreshing, setRefreshing] = React.useState(false);
  const [profileData, setProfileData] = React.useState<any>(null);
  const [selectedSport, setSelectedSport] = React.useState<
    "pickleball" | "tennis" | "padel"
  >("pickleball");
  const [locationFilterOpen, setLocationFilterOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // State for navigating directly to a specific tab in MyGames
  const [myGamesInitialTab, setMyGamesInitialTab] = React.useState<FilterTab | undefined>(undefined);
  const initialTabConsumedRef = React.useRef(false);
 
  
  // Notification hook
  const { unreadCount, refreshUnreadCount } = useNotifications();

  // Refresh unread count when dashboard gains focus (e.g., after returning from notifications page)
  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
    }, [refreshUnreadCount])
  );
  
  // Chat unread count hook
  const chatUnreadCount = useUnreadCount();

  // Register socket event listeners at dashboard level for real-time updates
  // This ensures unread counts update even when not on the chat tab
  useChatSocketEvents(null, session?.user?.id || '');
  
  // Use safe area insets for proper status bar handling across platforms
  const STATUS_BAR_HEIGHT = insets.top;  // Helper function to get available sports for SportSwitcher
  const getUserSelectedSports = () => {
    return ["pickleball", "tennis", "padel"];
  };

  // Set sport from route param if provided
  React.useEffect(() => {
    if (routeSport && ['pickleball', 'tennis', 'padel'].includes(routeSport)) {
      setSelectedSport(routeSport as "pickleball" | "tennis" | "padel");
    }
  }, [routeSport]);

  // Set default selected sport - default to pickleball if not set via route param
  React.useEffect(() => {
    // If no route sport is provided, default to pickleball
    if (!routeSport) {
      setSelectedSport("pickleball");
    }
  }, [routeSport]);

  React.useEffect(() => {
    if (routeView && ['dashboard', 'connect', 'friendly', 'myGames', 'chat'].includes(routeView)) {
      setCurrentView(routeView as "dashboard" | "connect" | "friendly" | "myGames" | "chat");
      // Set activeTab based on view
      const viewToTab: Record<string, number> = {
        'connect': 0,
        'friendly': 1,
        'dashboard': 2,
        'myGames': 3,
        'chat': 4,
      };
      if (viewToTab[routeView] !== undefined) {
        setActiveTab(viewToTab[routeView]);
      }
    }
  }, [routeView]);

  // Handle tab param for navigating directly to a specific tab in MyGames
  React.useEffect(() => {
    if (routeTab && routeView === 'myGames' && !initialTabConsumedRef.current) {
      const validTabs = ['ALL', 'UPCOMING', 'PAST', 'INVITES'];
      if (validTabs.includes(routeTab.toUpperCase())) {
        setMyGamesInitialTab(routeTab.toUpperCase() as FilterTab);
        initialTabConsumedRef.current = true;
      }
    }
    // Reset when leaving myGames view
    if (routeView !== 'myGames') {
      initialTabConsumedRef.current = false;
    }
  }, [routeTab, routeView]);

  // Get current sport configuration
  const currentSportConfig = SPORT_CONFIG[selectedSport];

  // Fetch leagues data for current sport
  const { leagues, isLoading, error, refetch } = useLeagues({
    sportType: currentSportConfig?.apiType,
    autoFetch: true,
  });

  // Fetch user's active leagues (leagues they've joined)
  const {
    activeLeagues,
    isLoading: isLoadingActiveLeagues,
    hasActiveLeagues,
    refetch: refetchActiveLeagues
  } = useUserActiveLeagues({
    sportType: currentSportConfig?.apiType,
    autoFetch: true,
  });

  const handleJoinLeague = async (leagueId: string) => {
    // Navigate directly to league details where user can join specific seasons
    // Note: League membership has been removed - users join seasons directly
    const league = leagues.find(l => l.id === leagueId);
    router.push({
      pathname: '/user-dashboard/league-details',
      params: { 
        leagueId: leagueId,
        leagueName: league?.name || 'League',
        sport: selectedSport
      }
    });
  };

  // console.log(`DashboardScreen: Current activeTab is ${activeTab}`);

  // Debug logging for safe area insets in parent component
  // useEffect(() => {
  //   console.log("=== Dashboard Safe Area Debug Info ===");
  //   console.log(`Platform: ${Platform.OS}`);
  //   console.log(`Screen dimensions:`, {
  //     width: width,
  //     height: height,
  //   });
  //   console.log(`Safe area insets:`, {
  //     top: insets.top,
  //     bottom: insets.bottom,
  //     left: insets.left,
  //     right: insets.right,
  //   });
  //   console.log(
  //     `Available content height: ${height - insets.top - insets.bottom}px`
  //   );
  //   console.log(
  //     `NavBar will be positioned at bottom: ${height - insets.bottom}px`
  //   );
  //   console.log(
  //     `Content should end at: ${
  //       height - insets.bottom - 83
  //     }px (NavBar height: 83px)`
  //   );
  //   console.log("====================================");
  // }, [insets, width, height]);

  // Debug logging for screen dimension changes
  // useEffect(() => {
  //   const subscription = Dimensions.addEventListener("change", ({ window }) => {
  //     console.log("=== Screen Dimension Change Debug ===");
  //     console.log(`New screen dimensions:`, {
  //       width: window.width,
  //       height: window.height,
  //     });
  //     console.log(`Safe area insets (unchanged):`, {
  //       top: insets.top,
  //       bottom: insets.bottom,
  //       left: insets.left,
  //       right: insets.right,
  //     });
  //     console.log(
  //       `New available content height: ${
  //         window.height - insets.top - insets.bottom
  //       }px`
  //     );
  //     console.log(
  //       `New NavBar position: bottom ${window.height - insets.bottom}px`
  //     );
  //     console.log("====================================");
  //   });

  //   return () => subscription?.remove();
  // }, [insets]);

  // Basic session protection only - let login.tsx handle onboarding flow
  useEffect(() => {
    if (!session?.user?.id) {
      console.log("DashboardScreen: No session, redirecting to login");
      router.replace("/login");
      return;
    }

    // DON'T redirect unverified users - they might be on verifyEmail page
    // Let the natural flow handle email verification
    if (!session.user.emailVerified) {
      console.log(
        "DashboardScreen: Email not verified, but allowing access (user might be verifying)"
      );
      return;
    }

    console.log("DashboardScreen: User has valid session, allowing access");
  }, [session]);

  // Disable Android hardware back when not on main dashboard view
  useEffect(() => {
    const onBackPress = () => {
      if (currentView !== "dashboard") {
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => subscription.remove();
  }, [currentView]);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileData();
    }
  }, [session?.user?.id]);

  const handleTabPress = (tabIndex: number) => {
    setActiveTab(tabIndex);
    // Absolute in-app view switching per tab
    if (tabIndex === 0) {
      setCurrentView("connect");
    } else if (tabIndex === 1) {
      setCurrentView("friendly");
    } else if (tabIndex === 2) {
      setCurrentView("dashboard");
    } else if (tabIndex === 3) {
      setCurrentView("myGames");
    } else if (tabIndex === 4) {
      setCurrentView("chat");
    }
  };

  const fetchProfileData = async () => {
    try {
      if (!session?.user?.id) {
        console.log(
          "DashboardScreen: No session user ID available for profile data"
        );
        return;
      }

      const backendUrl = getBackendBaseURL();
      // console.log(
      //   "DashboardScreen: Fetching profile data from:",
      //   `${backendUrl}/api/player/profile/me`
      // );

      const authResponse = await authClient.$fetch(
        `${backendUrl}/api/player/profile/me`,
        {
          method: "GET",
        }
      );

      // console.log("DashboardScreen: Profile API response:", authResponse);

      if (
        authResponse &&
        (authResponse as any).data &&
        (authResponse as any).data.data
      ) {
        // console.log(
        //   "DashboardScreen: Setting profile data:",
        //   (authResponse as any).data.data
        // );
        setProfileData((authResponse as any).data.data);
      } else if (authResponse && (authResponse as any).data) {
        // console.log(
        //   "DashboardScreen: Setting profile data (direct):",
        //   (authResponse as any).data
        // );
        setProfileData((authResponse as any).data);
      } else {
        console.error(
          "DashboardScreen: No profile data received from authClient"
        );
      }
    } catch (error) {
      console.error("DashboardScreen: Error fetching profile data:", error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    try {
      // Add haptic feedback for refresh
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fetch fresh profile data, leagues, and active leagues
      await Promise.all([fetchProfileData(), refetch(), refetchActiveLeagues()]);

      console.log("DashboardScreen: Dashboard data refreshed successfully");
    } catch (error) {
      console.error("DashboardScreen: Error refreshing dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [session?.user?.id, refetch, refetchActiveLeagues]);

  // use this for swtiching between tabs
  if (currentView === "connect") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <TouchableOpacity
            style={styles.profilePicture}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/profile");
            }}
          >
            {profileData?.image || session?.user?.image ? (
              <Image
                source={{ uri: profileData?.image || session?.user?.image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.defaultAvatarContainer}>
                <Text style={styles.defaultAvatarText}>
                  {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <SportSwitcher
            currentSport={selectedSport}
            availableSports={getUserSelectedSports()}
            onSportChange={setSelectedSport}
          />
          <View style={styles.headerRight}>
            <NotificationBell unreadCount={unreadCount} />
          </View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.contentBox}>
            <CommunityScreen onTabPress={handleTabPress} sport={selectedSport} />
          </View>
        </View>
        <NavBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          sport={selectedSport}
          badgeCounts={{ chat: chatUnreadCount }}
        />
      </View>
    );
  }

  if (currentView === "chat") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ChatScreen
          activeTab={activeTab}
          onTabPress={handleTabPress}
          sport={selectedSport}
          chatUnreadCount={chatUnreadCount}
        />
      </View>
    );
  }
    
    if (currentView === "myGames") {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
            <TouchableOpacity
              style={styles.profilePicture}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/profile");
              }}
            >
              {profileData?.image || session?.user?.image ? (
                <Image
                  source={{ uri: profileData?.image || session?.user?.image }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.defaultAvatarContainer}>
                  <Text style={styles.defaultAvatarText}>
                    {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <SportSwitcher
              currentSport={selectedSport}
              availableSports={getUserSelectedSports()}
              onSportChange={setSelectedSport}
            />
            <View style={styles.headerRight}>
              <NotificationBell unreadCount={unreadCount} />
            </View>
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.contentBox}>
              <MyGamesScreen sport={selectedSport} initialTab={myGamesInitialTab} />
            </View>
          </View>
          <NavBar
            activeTab={activeTab}
            onTabPress={handleTabPress}
            sport={selectedSport}
            badgeCounts={{ chat: chatUnreadCount }}
          />
        </View>
      );
    }

  if (currentView === "friendly") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
          <TouchableOpacity
            style={styles.profilePicture}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/profile");
            }}
          >
            {profileData?.image || session?.user?.image ? (
              <Image
                source={{ uri: profileData?.image || session?.user?.image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.defaultAvatarContainer}>
                <Text style={styles.defaultAvatarText}>
                  {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <SportSwitcher
            currentSport={selectedSport}
            availableSports={getUserSelectedSports()}
            onSportChange={setSelectedSport}
          />
          <View style={styles.headerRight}>
            <NotificationBell unreadCount={unreadCount} />
          </View>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.contentBox}>
            <FriendlyScreen sport={selectedSport} />
          </View>
        </View>
        <NavBar
          activeTab={activeTab}
          onTabPress={handleTabPress}
          sport={selectedSport}
          badgeCounts={{ chat: chatUnreadCount }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
        {/* Profile picture moved to left */}
        <TouchableOpacity
          style={styles.profilePicture}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile");
          }}
        >
          {profileData?.image || session?.user?.image ? (
            <Image
              source={{ uri: profileData?.image || session?.user?.image }}
              style={styles.profileImage}
              onError={() => {
                console.log(
                  "Profile image failed to load:",
                  profileData?.image || session?.user?.image
                );
              }}
            />
          ) : (
            <View style={styles.defaultAvatarContainer}>
              <Text style={styles.defaultAvatarText}>
                {(profileData?.name || session?.user?.name)
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Sports switcher in center */}
        <SportSwitcher
          currentSport={selectedSport}
          availableSports={getUserSelectedSports()}
          onSportChange={setSelectedSport}
        />

        <View style={styles.headerRight}>
          <NotificationBell unreadCount={unreadCount} />
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.contentBox}>
          <Animated.ScrollView
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
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
          >
            {/* Conditionally show Active Leagues or Recommended League */}
            {hasActiveLeagues ? (
              <>
                {/* User has active leagues - show "Your active league(s)" */}
                <View style={styles.activeLeaguesHeaderRow}>
                  <Text style={styles.activeLeaguesHeaderText}>
                    Your active league(s)
                  </Text>
                </View>

                {isLoadingActiveLeagues ? (
                  <View style={styles.featuredSkeleton} />
                ) : (
                  <ActiveLeaguesCarousel
                    leagues={activeLeagues}
                    sport={selectedSport}
                  />
                )}

                {/* Show recommended leagues below if available */}
                {leagues.length > 0 && (
                  <>
                    <View style={styles.otherLeaguesHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        Other leagues near you
                      </Text>
                      <Text style={styles.arrowText}>→</Text>
                    </View>

                    {/* Search field */}
                    <View style={styles.searchContainer}>
                      <View style={styles.searchInputContainer}>
                        <SearchIcon
                          width={20}
                          height={20}
                          style={styles.searchIcon}
                        />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search leagues..."
                          placeholderTextColor="#BABABA"
                          value={searchTerm}
                          onChangeText={setSearchTerm}
                        />
                      </View>
                    </View>

                    <LeagueGrid
                      leagues={leagues.filter((league) => {
                        // Filter out leagues user is already in
                        const isActiveLeague = activeLeagues.some(al => al.id === league.id);
                        if (isActiveLeague) return false;
                        if (!searchTerm.trim()) return true;
                        const search = searchTerm.toLowerCase();
                        return (
                          league.name?.toLowerCase().includes(search) ||
                          league.location?.toLowerCase().includes(search)
                        );
                      })}
                      onJoinPress={handleJoinLeague}
                      sport={selectedSport}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* User has no active leagues - show "Recommended league" */}
                <View style={styles.recommendedHeaderRow}>
                  <Text style={styles.recommendedLeagueText}>
                    Recommended league
                  </Text>
                  <View style={styles.locationRow}>
                    {selectedSport === 'pickleball' ? (
                      <PickleballLocationIcon
                      width={11}
                      height={10}
                      style={styles.locationIcon}
                      fill={selectedSport === 'pickleball' ? '#A04DFE' : undefined}
                    />
                    ) : selectedSport === 'tennis' ? (
                      <TennisLocationIcon
                      width={11}
                      height={10}
                      style={styles.locationIcon}
                      fill={selectedSport === 'tennis' ? '#84B43F' : undefined}
                    />
                    ) : (
                      <PadelLocationIcon
                      width={11}
                      height={10}
                      style={styles.locationIcon}
                      fill={selectedSport === 'padel' ? '#1B72C0' : undefined}
                    />
                    )}
                    <Text style={[
                      styles.locationFilterText,
                      selectedSport === 'tennis' && { color: '#4A7D00' },
                      selectedSport === 'padel' && { color: '#1B72C0' }
                    ]}>
                      Based on your location
                    </Text>
                  </View>
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
                  <Animated.View
                    style={[
                      styles.parallaxWrapper,
                      {
                        transform: [
                          {
                            translateY: scrollY.interpolate({
                              inputRange: [-100, 0, 200],
                              outputRange: [-30, 0, 20],
                              extrapolate: "clamp",
                            }),
                          },
                          {
                            scale: scrollY.interpolate({
                              inputRange: [-100, 0],
                              outputRange: [1.05, 1],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LeagueCard
                      league={leagues[0]}
                      variant="featured"
                      onJoinPress={handleJoinLeague}
                      sport={selectedSport}
                    />
                  </Animated.View>
                ) : (
                  <View style={styles.noLeaguesContainer}>
                    <Text style={styles.noLeaguesText}>
                      No {currentSportConfig?.displayName.toLowerCase()} leagues
                      available
                    </Text>
                    <Text style={styles.noLeaguesSubtext}>
                      Check back later for new leagues!
                    </Text>
                  </View>
                )}

                {/* Other leagues near you */}
                {leagues.length > 1 && (
                  <>
                    <View style={styles.otherLeaguesHeaderRow}>
                      <Text style={styles.sectionTitle}>
                        Other leagues near you
                      </Text>
                      <Text style={styles.arrowText}>→</Text>
                    </View>

                    {/* Search field */}
                    <View style={styles.searchContainer}>
                      <View style={styles.searchInputContainer}>
                        <SearchIcon
                          width={20}
                          height={20}
                          style={styles.searchIcon}
                        />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search leagues..."
                          placeholderTextColor="#BABABA"
                          value={searchTerm}
                          onChangeText={setSearchTerm}
                        />
                      </View>
                    </View>

                    <LeagueGrid
                      leagues={leagues.slice(1).filter((league) => {
                        if (!searchTerm.trim()) return true;
                        const search = searchTerm.toLowerCase();
                        return (
                          league.name?.toLowerCase().includes(search) ||
                          league.location?.toLowerCase().includes(search)
                        );
                      })}
                      onJoinPress={handleJoinLeague}
                      sport={selectedSport}
                    />
                  </>
                )}
              </>
            )}
          </Animated.ScrollView>
        </View>
      </View>
      <NavBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        sport={selectedSport}
        badgeCounts={{ chat: chatUnreadCount }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    zIndex: 1,
  },
  contentBox: {
    flex: 1,
    backgroundColor: "#F6FAFC",
    borderWidth: 1,
    borderColor: "#D5D5D5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // marginTop: 0,
    overflow: "hidden",
  },
  headerSection: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 24,
    paddingTop: Platform.OS === "ios" ? 16 : 20,
    paddingBottom: isSmallScreen ? 20 : 30,
    backgroundColor: "#FFFFFF",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    minHeight: isSmallScreen ? 36 : isTablet ? 44 : 40,
  },
  headerRight: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  profilePicture: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6de9a0",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "System",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
    paddingBottom: 120,
  },
  sportSelectionText: {
    fontFamily: "Inter",
    fontStyle: "normal",
    fontWeight: "700",
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: "#1A1C1E",
  },
  cardContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
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
    color: "#666666",
    fontWeight: "500",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    color: "#FF6B35",
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: "#999999",
  },
  quickActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recentActivityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
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
    color: "#333333",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 2,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999999",
    fontStyle: "italic",
    textAlign: "center",
  },
  tabIndicator: {
    backgroundColor: "#F8F0F5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#A04DFE",
  },
  tabIndicatorText: {
    fontSize: 14,
    color: "#A04DFE",
    fontWeight: "600",
    textAlign: "center",
  },
  newsSection: {
    marginBottom: 20,
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: isSmallScreen ? 16 : isTablet ? 24 : 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  newsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  newsSubtitle: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  newsTime: {
    alignItems: "flex-end",
  },
  newsTimeText: {
    fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  newsPlaceholder: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  recommendedHeaderRow: {
    alignItems: "center",
    marginBottom: 12,
    marginTop: 20,
  },
  recommendedLeagueText: {
    fontFamily: "Inter",
    fontStyle: "normal",
    fontWeight: "700",
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: "#1A1C1E",
    textAlign: "center",
    marginBottom: 8,
  },
  activeLeaguesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    marginTop: 20,
  },
  activeLeaguesHeaderText: {
    fontFamily: "Inter",
    fontStyle: "normal",
    fontWeight: "700",
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: "#1A1C1E",
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  locationIcon: {
    marginRight: 6,
  },
  locationFilterText: {
    fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
    color: "#A04DFE",
    textAlign: "center",
    fontWeight: "500",
  },
  otherLeaguesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 20,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BABABA",
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 48,
    minHeight: 48,
    maxHeight: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  arrowText: {
    fontSize: 18,
    color: "#9CA3AF",
  },
  parallaxWrapper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  featuredSkeleton: {
    height: 180,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  noLeaguesContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  noLeaguesText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  noLeaguesSubtext: {
    color: "#6B7280",
    fontSize: 12,
    textAlign: "center",
  },
  sideBySideContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  halfWidthCard: {
    flex: 1,
  },
});
