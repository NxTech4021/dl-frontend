import React from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SportSwitcher } from '@/shared/components/ui/SportSwitcher';
import { getBackendBaseURL } from '@/src/config/network';
import { authClient } from '@/lib/auth-client';
import { useSession } from '@/lib/auth-client';
import * as Haptics from 'expo-haptics';
import { SeasonService, Season } from '@/src/features/dashboard-user/services/SeasonService';
import { LeagueService } from '@/src/features/leagues/services/LeagueService';
import { PaymentOptionsBottomSheet } from '../components';
import { toast } from 'sonner-native';
import LeagueInfoIcon from '@/assets/icons/league-info.svg';
import BackButtonIcon from '@/assets/icons/back-button.svg';
import { getSeasonInfoIcons } from '../components/SeasonInfoIcons';
import { checkQuestionnaireStatus, getSeasonSport } from '../utils/questionnaireCheck';

const { width } = Dimensions.get('window');

const isSmallScreen = width < 375;
const isTablet = width > 768;

interface SeasonDetailsScreenProps {
  seasonId: string;
  seasonName?: string;
  leagueId?: string;
  sport?: 'pickleball' | 'tennis' | 'padel';
}

export default function SeasonDetailsScreen({
  seasonId,
  seasonName = 'Season',
  leagueId,
  sport = 'pickleball'
}: SeasonDetailsScreenProps) {
  const { data: session } = useSession();
  const [season, setSeason] = React.useState<Season | null>(null);
  const [league, setLeague] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profileData, setProfileData] = React.useState<any>(null);
  const [selectedSport, setSelectedSport] = React.useState<'pickleball' | 'tennis' | 'padel'>('pickleball');
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const insets = useSafeAreaInsets();
  const STATUS_BAR_HEIGHT = insets.top;

  const userId = session?.user?.id;

  // Animated scroll value for collapsing header
  const scrollY = React.useRef(new Animated.Value(0)).current;
  
  // Constants for header animation
  const TOP_HEADER_HEIGHT = STATUS_BAR_HEIGHT + (isSmallScreen ? 36 : isTablet ? 44 : 40);
  const HEADER_MAX_HEIGHT = 180; // Full header height
  const HEADER_MIN_HEIGHT = 80; // Collapsed header height
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;
  const COLLAPSE_START_THRESHOLD = 40; // Start collapsing after scrolling 40px
  const COLLAPSE_END_THRESHOLD = COLLAPSE_START_THRESHOLD + HEADER_SCROLL_DISTANCE; // End of collapse range
  
  const handleScroll = React.useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollYValue = contentOffset.y;
    
    const availableScrollSpace = contentSize.height - layoutMeasurement.height;
    
    const shouldAllowCollapse = availableScrollSpace >= COLLAPSE_END_THRESHOLD;
    
    let clampedValue = scrollYValue;
    if (!shouldAllowCollapse) {
      clampedValue = Math.min(scrollYValue, Math.max(0, COLLAPSE_START_THRESHOLD - 10));
    } else {
      clampedValue = Math.min(scrollYValue, availableScrollSpace);
    }
    
    scrollY.setValue(clampedValue);
  }, [scrollY]);

  React.useEffect(() => {
    fetchSeasonData();
  }, [seasonId]);

  React.useEffect(() => {
    const fetchProfileData = async () => {
      if (!session?.user?.id) return;
      try {
        const backendUrl = getBackendBaseURL();
        const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
          method: 'GET',
        });
        if (authResponse && (authResponse as any).data && (authResponse as any).data.data) {
          setProfileData((authResponse as any).data.data);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };
    fetchProfileData();
  }, [session?.user?.id]);

  React.useEffect(() => {
    setSelectedSport(sport);
  }, [sport]);

  const fetchSeasonData = async () => {
    if (!seasonId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const allSeasons = await SeasonService.fetchAllSeasons();
      const foundSeason = allSeasons.find(s => s.id === seasonId);

      if (foundSeason) {
        setSeason(foundSeason);
        
        // Fetch league data if leagueId is available
        if (leagueId) {
          try {
            const leagueData = await LeagueService.fetchLeagueById(leagueId);
            setLeague(leagueData);
          } catch (err) {
            console.error('Error fetching league data:', err);
          }
        }
      } else {
        setError('Season not found');
      }
    } catch (err) {
      console.error('Error fetching season data:', err);
      setError('Failed to load season details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPress = () => {
    if (!season) return;
    console.log('Register button pressed for season:', season.id);
    
    // Determine the season's sport type
    const seasonSport = getSeasonSport(season) || sport || 'pickleball';
    
    // Check if user has completed questionnaire for this sport
    if (profileData) {
      const questionnaireStatus = checkQuestionnaireStatus(profileData, seasonSport);
      
      if (!questionnaireStatus.hasSelectedSport || !questionnaireStatus.hasCompletedQuestionnaire) {
        // User hasn't selected/completed questionnaire for this sport
        // Navigate to complete questionnaire screen
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({
          pathname: '/user-dashboard/complete-questionnaire' as any,
          params: {
            sport: seasonSport,
            seasonId: season.id,
            leagueId: leagueId || '',
            returnPath: 'season-details'
          }
        });
        return;
      }
    }
    
    // Check if this is a doubles season by checking category name
    // Categories like "Men's Doubles", "Women's Doubles", "Mixed Doubles" should go to team pairing
    const doublesSeason = isDoublesSeason(season);
    const categories = getNormalizedCategories(season);
    
    console.log('Is doubles season?', doublesSeason, 'Categories:', categories.map(c => c.name));
    
    if (doublesSeason) {
      // Navigate to doubles team pairing screen
      router.push({
        pathname: '/user-dashboard/doubles-team-pairing' as any,
        params: {
          seasonId: season.id,
          seasonName: season.name,
          leagueId: leagueId || '',
          sport: seasonSport
        }
      });
    } else {
      // Show payment options for singles
      setShowPaymentOptions(true);
    }
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
  };

  const handlePayNow = () => {
    if (!season) return;
    console.log('Pay Now pressed for season:', season.id);
    toast.info('Payment gateway coming soon!');
  };

  const handlePayLater = async () => {
    if (!userId || !season) {
      toast.error('You must be logged in to register');
      return;
    }

    try {
      console.log('Registering user for season (Pay Later):', season.id);
      const success = await SeasonService.registerForSeason(season.id, userId, true);

      if (success) {
        console.log('User registered successfully');
        toast.success('Registered successfully!');
        fetchSeasonData(); // Refresh data
      } else {
        console.warn('Registration failed');
        toast.error('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Error registering:', err);
      toast.error('An error occurred while registering.');
    }
  };

  // Helper to convert Date | string | undefined to string for router params
  const dateToParamString = (date: string | Date | undefined): string | undefined => {
    if (!date) return undefined;
    return typeof date === 'string' ? date : date.toISOString();
  };

  const handleViewStandingsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('View Standings button pressed');
    
    if (!season) {
      toast.info('Season data not available');
      return;
    }
    
    // Get category info for display
    const category = (season as any).category;
    const categories = (season as any).categories || (category ? [category] : []);
    const normalizedCategories = Array.isArray(categories) ? categories : [categories].filter(Boolean);
    const seasonCategory = normalizedCategories && normalizedCategories.length > 0 
      ? normalizedCategories[0] 
      : null;
    const categoryDisplayName = seasonCategory ? seasonCategory.name || '' : '';
    
    router.push({
      pathname: '/standings' as any,
      params: {
        seasonId: season.id,
        seasonName: season.name,
        leagueId: leagueId || '',
        leagueName: league?.name || '',
        categoryName: categoryDisplayName,
        sportType: selectedSport?.toUpperCase() || sport?.toUpperCase() || 'PICKLEBALL',
        startDate: dateToParamString(season.startDate),
        endDate: dateToParamString(season.endDate),
      }
    });
  };

  const handleJoinWaitlistPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Join Waitlist button pressed');
    toast.info('Waitlist feature coming soon!');
  };

  const formatSeasonDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getSportConfig = () => {
    if (selectedSport === 'tennis') {
      return {
        gradient: ['#B3CFBC', '#FFFFFF'] as const,
        color: '#008000',
        name: 'Tennis'
      };
    }
    if (selectedSport === 'padel') {
      return {
        gradient: ['#4DABFE', '#FFFFFF'] as const,
        color: '#4DABFE',
        name: 'Padel'
      };
    }
    return {
      gradient: ['#B98FAF', '#FFFFFF'] as const,
      color: '#863A73',
      name: 'Pickleball'
    };
  };

  const sportConfig = getSportConfig();

  // Get sport-specific info icons based on selectedSport
  const InfoIcons = getSeasonInfoIcons(selectedSport);
  const InfoIcon1 = InfoIcons.Icon1;
  const InfoIcon2 = InfoIcons.Icon2;
  const InfoIcon3 = InfoIcons.Icon3;
  const InfoIcon4 = InfoIcons.Icon4;
  const InfoIcon5 = InfoIcons.Icon5;
  const InfoIcon6 = InfoIcons.Icon6;

  const getHeaderGradientColors = (sport: 'pickleball' | 'tennis' | 'padel'): [string, string] => {
    switch (sport) {
      case 'tennis':
        return ['#A2E047', '#587A27'];
      case 'padel':
        return ['#4DABFE', '#2E6698'];
      case 'pickleball':
      default:
        return ['#A04DFE', '#602E98'];
    }
  };

  const getBannerBackgroundColor = (sport: 'pickleball' | 'tennis' | 'padel'): string => {
    switch (sport) {
      case 'tennis':
        return '#314116';
      case 'padel':
        return '#1A3852';
      case 'pickleball':
      default:
        return '#331850';
    }
  };

  const getSubheadingGradientColors = (sport: 'pickleball' | 'tennis' | 'padel'): [string, string] => {
    switch (sport) {
      case 'tennis':
        return ['#A2E047', '#587A27'];
      case 'padel':
        return ['#4DABFE', '#2E6698'];
      case 'pickleball':
      default:
        return ['#602E98', '#A04DFE'];
    }
  };

  const getSubheadingTextColor = (sport: 'pickleball' | 'tennis' | 'padel'): string => {
    return getSubheadingGradientColors(sport)[0];
  };

  // Helper function to normalize categories (handle both singular and plural)
  const getNormalizedCategories = (season: Season | null): any[] => {
    if (!season) return [];
    const category = (season as any)?.category;
    const categories = (season as any)?.categories || (category ? [category] : []);
    const normalizedCategories = Array.isArray(categories) ? categories : [categories].filter(Boolean);
    return normalizedCategories;
  };

  // Helper function to check if season is doubles
  const isDoublesSeason = (season: Season | null): boolean => {
    if (!season) return false;
    const categories = getNormalizedCategories(season);
    return categories.some(cat =>
      cat.name?.toLowerCase().includes('doubles') ||
      cat.matchFormat?.toLowerCase().includes('doubles') ||
      (cat as any).game_type === 'DOUBLES'
    );
  };

  // Button configuration based on user registration status
  const getButtonConfig = () => {
    if (!season || !userId) {
      return {
        text: 'Loading...',
        color: '#B2B2B2',
        onPress: () => {},
        disabled: true
      };
    }

    const userMembership = season.memberships?.find((m: any) => m.userId === userId);
    const isUserRegistered = !!userMembership;

    // For doubles seasons, check if user needs to complete team registration/payment
    const doublesSeason = isDoublesSeason(season);

    // If doubles season and membership is PENDING (not paid), show Register Team
    if (doublesSeason && userMembership && userMembership.status === 'PENDING') {
      return {
        text: 'Register Team',
        color: '#FEA04D',
        onPress: handleRegisterPress,
        disabled: false
      };
    }

    if (isUserRegistered) {
      return {
        text: 'View Leaderboard',
        color: '#FEA04D',
        onPress: handleViewStandingsPress,
        disabled: false
      };
    }

    if (season.status === 'ACTIVE') {
      return {
        text: 'Join Season',
        color: '#FEA04D',
        onPress: handleRegisterPress,
        disabled: false
      };
    }

    if (season.status === 'UPCOMING') {
      return {
        text: 'Join Waitlist',
        color: '#000000',
        onPress: handleJoinWaitlistPress,
        disabled: false
      };
    }

    return {
      text: 'View Standings',
      color: '#B2B2B2',
      onPress: handleViewStandingsPress,
      disabled: false
    };
  };

  const buttonConfig = getButtonConfig();

  // Helper function to get available sports for SportSwitcher
  const getUserSelectedSports = () => {
    return ["pickleball", "tennis", "padel"];
  };

  // Animated styles for collapsing header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD, COLLAPSE_END_THRESHOLD],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const leagueNameOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD, COLLAPSE_START_THRESHOLD + (HEADER_SCROLL_DISTANCE * 0.7)],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const bannerContainerOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD, COLLAPSE_START_THRESHOLD + (HEADER_SCROLL_DISTANCE * 0.5)],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const bannerContainerTranslateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD, COLLAPSE_START_THRESHOLD + (HEADER_SCROLL_DISTANCE * 0.5)],
    outputRange: [0, 0, -20],
    extrapolate: 'clamp',
  });

  // Collapsed season name opacity
  const collapsedSeasonNameOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD + (HEADER_SCROLL_DISTANCE * 0.7), COLLAPSE_END_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  // Collapsed player count opacity
  const collapsedPlayerCountOpacity = scrollY.interpolate({
    inputRange: [0, COLLAPSE_START_THRESHOLD + (HEADER_SCROLL_DISTANCE * 0.5), COLLAPSE_END_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={[styles.headerContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
        <TouchableOpacity 
          style={styles.headerProfilePicture}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/profile');
          }}
        >
            {(profileData?.image || session?.user?.image) ? (
              <Image 
                source={{ uri: profileData?.image || session?.user?.image }}
                style={styles.headerProfileImage}
            />
          ) : (
            <View style={styles.defaultHeaderAvatarContainer}>
              <Text style={styles.defaultHeaderAvatarText}>
                {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <SportSwitcher
          currentSport={selectedSport}
          availableSports={getUserSelectedSports()}
          onSportChange={(newSport) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: '/user-dashboard' as any,
              params: { sport: newSport }
            });
          }}
        />
        
        <View style={styles.headerRight} />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.contentBox}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sportConfig.color} />
            <Text style={styles.loadingText}>Loading season details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSeasonData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Animated.View 
              style={[
                styles.gradientHeaderContainer,
                {
                  height: headerHeight,
                }
              ]}
            >
              <LinearGradient
                colors={getHeaderGradientColors(sport)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.seasonHeaderGradient, { flex: 1 }]}
              >
                <View style={styles.seasonHeaderContent}>
                  <View style={styles.topRow}>
                    <View style={styles.backButtonContainer}>
                      <TouchableOpacity 
                        style={styles.backButtonIcon}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          router.back();
                        }}
                      >
                        <BackButtonIcon width={12} height={19} />
                      </TouchableOpacity>
                    </View>
                    <Animated.View 
                      style={[
                        styles.leagueNameContainer,
                        {
                          opacity: leagueNameOpacity,
                        }
                      ]}
                    >
                      <Text style={styles.leagueName} numberOfLines={2}>{league?.name || 'League'}</Text>
                    </Animated.View>
                    {/* Collapsed header content */}
                    <Animated.View 
                      style={[
                        styles.collapsedHeaderContent,
                        {
                          opacity: collapsedSeasonNameOpacity,
                        }
                      ]}
                    >
                      <Text style={styles.collapsedSeasonName} numberOfLines={1}>
                        {(() => {
                          const categories = getNormalizedCategories(season);
                          const categoryName = categories?.[0]?.name;
                          return categoryName ? `${categoryName} | ` : '';
                        })()}
                        <Text style={styles.collapsedSeasonNameHighlight}>{season?.name || seasonName}</Text>
                      </Text>
                      <Animated.View 
                        style={[
                          styles.collapsedPlayerCountContainer,
                          {
                            opacity: collapsedPlayerCountOpacity,
                          }
                        ]}
                      >
                        <View style={styles.statusCircle} />
                        <Text style={styles.collapsedPlayerCount}>
                          {`${season?._count?.memberships || season?.memberships?.length || 0} players`}
                        </Text>
                      </Animated.View>
                    </Animated.View>
                  </View>
                  <Animated.View 
                    style={[
                      styles.bannerContainer,
                      {
                        opacity: bannerContainerOpacity,
                        transform: [{ translateY: bannerContainerTranslateY }],
                      }
                    ]}
                  >
                    <View style={[styles.nameBanner, { backgroundColor: getBannerBackgroundColor(sport) }]}>
                      <Text style={styles.seasonName}>
                        {(() => {
                          const categories = getNormalizedCategories(season);
                          const categoryName = categories?.[0]?.name;
                          return categoryName ? `${categoryName} | ` : '';
                        })()}
                        <Text style={styles.seasonNameHighlight}>{season?.name || seasonName}</Text>
                      </Text>
                    </View>
                    <View style={styles.playerCountContainer}>
                      <View style={styles.statusCircle} />
                      <Text style={styles.playerCount}>
                        {`${season?._count?.memberships || season?.memberships?.length || 0} players`}
                      </Text>
                    </View>
                    
                    {season?.memberships && season.memberships.length > 0 && (
                      <View style={styles.profilePicturesContainer}>
                        {season.memberships.slice(0, 6).map((membership: any, index: number) => (
                          <View key={membership.id} style={[styles.memberProfilePicture, index > 0 && styles.memberProfilePictureOverlap]}>
                            {membership.user?.image ? (
                              <Image
                                source={{ uri: membership.user.image }}
                                style={styles.memberProfileImage}
                              />
                            ) : (
                              <View style={styles.defaultMemberProfileImage}>
                                <Text style={styles.defaultMemberProfileText}>
                                  {membership.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                        {season._count?.memberships && season._count.memberships > 6 && (
                          <View style={[styles.remainingCount, styles.memberProfilePictureOverlap]}>
                            <Text style={styles.remainingCountText}>
                              +{season._count.memberships - 6}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Animated.View>
                </View>
              </LinearGradient>
            </Animated.View>

            <Animated.ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={handleScroll}
            >
              <View style={styles.scrollTopSpacer} />
              
              <View style={styles.seasonInfoCard}>
                <View style={styles.seasonInfoContent}>
                  <LeagueInfoIcon width={43} height={43} style={styles.seasonInfoIcon} />
                  <View style={styles.seasonInfoTextContainer}>
                    <Text style={styles.seasonInfoTitle}>Season Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Players Registered: </Text>
                      <Text style={styles.detailValue}>{season?._count?.memberships || season?.memberships?.length || 0}</Text>
                    </View>
                    
                    {season?.startDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Start date: </Text>
                        <Text style={styles.detailValue}>{formatSeasonDate(season.startDate)}</Text>
                      </View>
                    )}
                    
                    {season?.endDate && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>End date: </Text>
                        <Text style={styles.detailValue}>{formatSeasonDate(season.endDate)}</Text>
                      </View>
                    )}
                    
                    {season?.regiDeadline && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Last registration: </Text>
                        <Text style={styles.detailValue}>{formatSeasonDate(season.regiDeadline)}</Text>
                      </View>
                    )}
                    
                    {season?.paymentRequired && season?.entryFee !== undefined && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Entry fee: </Text>
                        <Text style={styles.detailValue}>
                          RM{typeof season.entryFee === 'string' ? parseFloat(season.entryFee).toFixed(2) : season.entryFee.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.howItWorksCard}>
                <View style={styles.howItWorksContent}>
                  <Text style={styles.howItWorksTitle}>How <Text style={styles.howItWorksTitleItalic}>DEUCE</Text> League Works?</Text>
                  <Text style={styles.howItWorksDescription}>
                    Friendly yet competitive, our Flex League gives every player real match play – on your schedule, at your pace.
                  </Text>
                  <Text style={[styles.howItWorksSubheadingGradient, { color: getSubheadingTextColor(selectedSport) }]}>
                    Here's how it goes:
                  </Text>
                  
                  <View style={styles.infoItem}>
                    <InfoIcon1 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>You're in Control</Text>
                      <Text style={styles.infoItemDescription}>Players are responsible for scheduling their own matches and booking courts. 
                        Coordinate with opponents easily through in-app chat.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <InfoIcon2 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>Court Fees</Text>
                      <Text style={styles.infoItemDescription}>Court rental fees aren’t included in registration – just split the cost for each match with your opponent.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <InfoIcon3 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>Fair Play</Text>
                      <Text style={styles.infoItemDescription}>All matches are self-umpired. We count on you to keep things respectful, fair, and fun for everyone.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <InfoIcon4 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>League Goal</Text>
                      <Text style={styles.infoItemDescription}>The season lasts 8 weeks – aim to play at least 7 matches to stay in the race for the top spot.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <InfoIcon5 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>Track Your Progress</Text>
                      <Text style={styles.infoItemDescription}>Your <Text style={styles.infoItemDescriptionItalic}>DEUCE</Text> Match Rating (DMR) updates in real time as you report scores. A performance chart helps you track your DMR journey.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <InfoIcon6 width={43} height={43} />
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.infoItemTitle}>Prizes for Winners</Text>
                      <Text style={styles.infoItemDescription}>Bragging rights are great – but league champions also earn prizes.</Text>
                    </View>
                  </View>

                  <View style={styles.infoItem}>
                    <View style={styles.infoItemTextContainer}>
                      <Text style={styles.endTitle}>Ready to hit the Court?</Text>
                      <Text style={styles.endDescription}>Let's get started.</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.ScrollView>
          </>
        )}
        </View>
      </View>
      
      {/* Sticky Button */}
      {!isLoading && !error && season && (
        <View style={[styles.stickyButtonContainer, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={[styles.stickyButton, { backgroundColor: buttonConfig.color }]}
            onPress={buttonConfig.onPress}
            disabled={buttonConfig.disabled}
            activeOpacity={0.8}
          >
            <Text style={styles.stickyButtonText}>{buttonConfig.text}</Text>
          </TouchableOpacity>
        </View>
      )}

      <PaymentOptionsBottomSheet
        visible={showPaymentOptions}
        onClose={handleClosePaymentOptions}
        season={season}
        onPayNow={handlePayNow}
        onPayLater={handlePayLater}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    paddingBottom: 100,
  },
  scrollTopSpacer: {
    height: 20,
  },
  gradientHeaderContainer: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonHeaderGradient: {
    borderRadius: 0,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  seasonHeaderContent: {
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 0,
    gap: 12,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueNameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 52, // Offset to balance the back button width + gap
  },
  collapsedHeaderContent: {
    position: 'absolute',
    left: 52,
    right: 0,
    alignItems: 'flex-start',
    top: 0,
    bottom: 20,
    paddingLeft: 12,
  },
  collapsedSeasonName: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#FDFDFD',
    textAlign: 'left',
  },
  collapsedSeasonNameHighlight: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#FEA04D',
  },
  collapsedPlayerCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  collapsedPlayerCount: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#FDFDFD',
    fontWeight: '600',
  },
  bannerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameBanner: {
    backgroundColor: '#331850',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 0,
    width: Dimensions.get('window').width,
    marginHorizontal: -20,
    marginBottom: 20,
    alignItems: 'center',
  },
  leagueName: {
    fontSize: isSmallScreen ? 18 : isTablet ? 22 : 20,
    fontWeight: '700',
    color: '#FDFDFD',
    textAlign: 'center',
  },
  seasonName: {
    fontSize: isSmallScreen ? 14 : isTablet ? 16 : 15,
    fontWeight: '600',
    color: '#FEA04D',
    textAlign: 'center',
  },
  seasonNameHighlight: {
    fontSize: isSmallScreen ? 14 : isTablet ? 16 : 15,
    fontWeight: '600',
    color: '#FEA04D',
    textAlign: 'center',
  },
  playerCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6EC531',
    marginRight: 8,
  },
  playerCount: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#FDFDFD',
    fontWeight: '600',
    textAlign: 'center',
  },
  profilePicturesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  headerProfilePicture: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  headerProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultHeaderAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultHeaderAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  memberProfilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  memberProfilePictureOverlap: {
    marginLeft: -10,
  },
  memberProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultMemberProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultMemberProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  remainingCount: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  remainingCountText: {
    color: '#1C1A1A',
    fontSize: 11,
    fontWeight: '700',
  },
  seasonInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  seasonInfoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  seasonInfoIcon: {
    flexShrink: 0,
  },
  seasonInfoTextContainer: {
    flex: 1,
  },
  seasonInfoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#747477',
  },
  detailValue: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  howItWorksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  howItWorksContent: {
    gap: 16,
  },
  howItWorksTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#212427',
  },
  howItWorksTitleItalic: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#212427',
    fontStyle: 'italic',
  },
  howItWorksDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#555555',
    lineHeight: 20,
  },
  howItWorksSubheading: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    color: '#A04DFE',
    marginTop: 8,
  },
  howItWorksSubheadingGradient: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '600',
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 12,
  },
  infoItemTextContainer: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  infoItemDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#747477',
    lineHeight: 20,
  },
  infoItemDescriptionItalic: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#747477',
    fontStyle: 'italic',
  },
  endTitle: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#555555',
    textAlign: 'center',
    marginBottom: 6,
  },
  endDescription: {
    fontWeight: '600',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#FEA04D',
    textAlign: 'center',
  },
  endButton: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingVertical: isSmallScreen ? 4 : isTablet ? 8 : 6,
    minHeight: isSmallScreen ? 36 : isTablet ? 44 : 40,
  },
  headerRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBox: {
    flex: 1,
    backgroundColor: '#F6FAFC',
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 24 : 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  stickyButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2929',
  },
});
