import SearchIcon from "@/assets/icons/search-icon.svg";
import { NavBar } from "@/shared/components/layout";
import { LeagueCard, LeagueGrid, useLeagues } from "@/src/features/leagues";
import { SportDropdownHeader } from "@/src/shared/components/ui/SportDropdownHeader";
import { LeagueSkeletonLoader } from "@/src/components/LeagueCardSkeleton";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDashboard } from "../DashboardContext";

const { width, height } = Dimensions.get("window");

// Responsive design helpers
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const isTablet = width > 768;

export default function DashboardScreen() {
  const { userName } = useDashboard();
  const [activeTab, setActiveTab] = React.useState(2);
  const [locationFilterOpen, setLocationFilterOpen] = React.useState(false);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Fetch leagues data
  const { leagues, isLoading, error, refetch } = useLeagues({
    sportType: "TENNIS",
    autoFetch: true,
  });

  console.log(`DashboardScreen: Current activeTab is ${activeTab}`);

  const handleTabPress = (tabIndex: number) => {
    console.log(
      `Tab ${tabIndex} pressed - ${
        ["Favourite", "Friendly", "Leagues", "My Games", "Chat"][tabIndex]
      }`
    );
  };

  const handleJoinLeague = async (leagueId: string) => {
    // Navigate directly to league details where user can join specific seasons
    // Note: League membership has been removed - users join seasons directly
    const league = leagues.find((l) => l.id === leagueId);
    console.log("Navigating to league details:", leagueId);
    router.push({
      pathname: "/user-dashboard/league-details",
      params: {
        leagueId: leagueId,
        leagueName: league?.name || "League",
        sport: "tennis",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#B3CFBC", "#FFFFFF"]}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />

      <View style={styles.contentContainer}>
        <SportDropdownHeader
          currentSport="tennis"
          sportName="Tennis"
          sportColor="#008000"
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
          <View style={styles.recommendedHeaderRow}>
            <Text style={styles.sportSelectionText}>Recommended league:</Text>
            <TouchableOpacity
              style={styles.locationFilter}
              onPress={() => setLocationFilterOpen(!locationFilterOpen)}
            >
              <Text style={styles.locationFilterText}>
                Based on your location
              </Text>
              <Text style={styles.locationFilterChevron}>▾</Text>
            </TouchableOpacity>
          </View>

          {/* Featured League Card */}
          {isLoading ? (
            <LeagueSkeletonLoader />
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
              />
            </Animated.View>
          ) : (
            <View style={styles.noLeaguesContainer}>
              <Text style={styles.noLeaguesText}>
                No tennis leagues available
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
                <Text style={styles.sectionTitle}>Other leagues near you</Text>
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
                    placeholder="Search city or town..."
                    placeholderTextColor="#BABABA"
                  />
                </View>
              </View>

              <LeagueGrid
                leagues={leagues.slice(1)}
                onJoinPress={handleJoinLeague}
              />
            </>
          )}
        </Animated.ScrollView>
      </View>

      {/* Bottom Navigation Bar */}
      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sportSelectionText: {
    fontFamily: "Inter",
    fontStyle: "normal",
    fontWeight: "700",
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    color: "#1A1C1E",
  },
  locationFilter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  locationFilterText: {
    fontSize: 12,
    color: "#6B7280",
    marginRight: 6,
  },
  locationFilterChevron: {
    fontSize: 12,
    color: "#6B7280",
  },
  otherLeaguesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    color: "#333333",
    fontWeight: "bold",
    marginBottom: 16,
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
});
