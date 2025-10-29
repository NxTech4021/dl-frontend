import CalendarIcon from '@/assets/icons/calendar-icon.svg';
import ClockIcon from '@/assets/icons/clock-icon.svg';
import DollarSignIcon from '@/assets/icons/dollarsign-icon.svg';
import { useActivePartnership } from '@/features/pairing/hooks';
import { useSession } from '@/lib/auth-client';
import { NavBar } from '@/shared/components/layout';
import { SportDropdownHeader } from '@/shared/components/ui/SportDropdownHeader';
import { Season, SeasonService } from '@/src/features/dashboard-user/services/SeasonService';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { PaymentOptionsBottomSheet } from '../components';



PaymentOptionsBottomSheet
const { width, height } = Dimensions.get('window');

interface SeasonsScreenProps {
  category?: string;
  categoryId?: string;
  leagueName?: string;
  leagueId?: string;
  sport?: 'pickleball' | 'tennis';
  seasonId?: string;
  currentUserId?: string;
}

export default function SeasonsScreen({
  category = 'Men\'s Single',
  categoryId,
  leagueName = 'PJ League',
  leagueId,
  sport = 'pickleball',
  seasonId = 'season_123',
  currentUserId
}: SeasonsScreenProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(0); 
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState<Season | null>(null);
  
  // Check for active partnership for doubles categories
  const isDoublesCategory = category.toLowerCase().includes('double');
  const { data: session } = useSession();
  const userId = session?.user.id


  
  const handleTabPress = (tabIndex: number) => {
    console.log(`Tab ${tabIndex} pressed - ${['In Progress', 'Upcoming', 'Past'][tabIndex]}`);
    setActiveTab(tabIndex);
  };

  React.useEffect(() => {
  const fetchSeasons = async () => {
    try {
      setLoading(true);
      console.log('SeasonsScreen: Fetching seasons for categoryId:', categoryId);

      // If categoryId is provided, fetch filtered seasons; otherwise fetch all
      const fetchedSeasons = categoryId
        ? await SeasonService.fetchSeasonsByCategory(categoryId)
        : await SeasonService.fetchAllSeasons();

      console.log('SeasonsScreen: Fetched seasons count:', fetchedSeasons.length);
      setSeasons(fetchedSeasons);
    } catch (err) {
      setError('Failed to load seasons');
      console.error('Error fetching seasons:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchSeasons();
}, [categoryId]);


  const handleRegisterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Register button pressed for category:', category);

    if (isDoublesCategory) {
      // Check if user already has an active partnership, will fix later
      if (partnership) {
        const partnerName = partnership.player1Id === currentUserId
          ? partnership.player2.name
          : partnership.player1.name;

        Alert.alert(
          'Already Paired',
          `You are already paired with ${partnerName}. You cannot register for another doubles season while in a partnership.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Navigate to Find Partner screen
      console.log('Doubles category detected - navigating to Find Partner');
      router.push(`/pairing/find-partner/${seasonId}`);
    } else {
      // For singles categories, navigate to regular registration
      console.log('Singles category detected - navigating to registration');
      // TODO: Navigate to regular registration screen
      // router.push(`/registration/${seasonId}`);
    }
  };

  const handleJoinWaitlistPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Join Waitlist button pressed');
    // TODO: Navigate to waitlist screen
  };

  const handleViewStandingsPress = (season: Season) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('View Standings button pressed');
    // TODO: Navigate to standings screen
    // router.push(`/standings/${season.id}`);
  };

  const handlePayNow = (season: Season) => {
    console.log('Pay Now pressed for season:', season.name);
    // TODO: implement payment gateway integration (fiuupayment)
    // this will redirect users to the payment gateway
    console.log('Payment gateway integration not yet implemented');
  };

  const handlePayLater = async (season: Season) => {
    if (!session?.user?.id) {
    console.warn('No user ID found in session');
    toast.error('You must be logged in to register');
    return;
  }

  try {
    console.log('Registering user for season (Pay Later):', season.id);
    const success = await SeasonService.registerForSeason(season.id, session.user.id);

    if (success) {
      console.log('User registered successfully for season:', season.id);
      toast.success('Registered successfully!');
   
    } else {
      console.warn('Registration failed for Pay Later:', season.id);
      // toast.error('Registration failed. Please try again.');
    }
  } catch (err) {
    console.error('Error registering for Pay Later:', err);
    toast.error('An error occurred while registering.');
  }
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
    setSelectedSeason(null);
  };

  const tabs = ['In Progress', 'Upcoming', 'Past'];

  //  Mock Season Card by Ken 

  // const renderSeasonCard = () => {
  //   const getSeasonData = () => {
  //     switch (activeTab) {
  //       case 0: // In Progress
  //         return {
  //           title: 'Winter Season 2025',
  //           badge: '🏆 S1',
  //           playerCount: '+95',
  //           duration: 'Duration: 1 Dec 2025 – 31 Jan 2026',
  //           lastRegistration: 'Last Registration: 27 Nov 2025',
  //           entryFee: 'RM59.90',
  //           buttonText: 'Register',
  //           buttonColor: '#863A73',
  //           buttonHandler: handleRegisterPress
  //         };
  //       case 1: // Upcoming
  //         return {
  //           title: 'Spring Season 2025',
  //           badge: '🌱 S2',
  //           playerCount: '+67',
  //           duration: 'Duration: 1 Mar 2025 – 30 Apr 2025',
  //           lastRegistration: 'Registration Opens: 15 Feb 2025',
  //           entryFee: 'RM59.90',
  //           buttonText: 'Join Waitlist',
  //           buttonColor: '#000000',
  //           buttonHandler: handleJoinWaitlistPress
  //         };
  //       case 2: // Past
  //         return {
  //           title: 'Fall Season 2024',
  //           badge: '🍂 S4',
  //           playerCount: '+89',
  //           duration: 'Duration: 1 Sep 2024 – 30 Nov 2024',
  //           lastRegistration: 'Season Ended: 30 Nov 2024',
  //           entryFee: 'RM59.90',
  //           buttonText: 'View Standings',
  //           buttonColor: '#B2B2B2',
  //           buttonHandler: handleViewStandingsPress
  //         };
  //       default:
  //         return null;
  //     }
  //   };

  //   const seasonData = getSeasonData();
  //   if (!seasonData) return null;

  //   return (
  //     <View style={styles.seasonCard}>
  //       <View style={styles.seasonCardHeader}>
  //         <Text style={styles.seasonTitle}>{seasonData.title}</Text>
  //         <View style={styles.seasonBadge}>
  //           <Text style={styles.seasonBadgeText}>{seasonData.badge}</Text>
  //         </View>
  //       </View>
        
  //       <View style={styles.playerCountRow}>
  //         <View style={styles.playerAvatars}>
  //           <View style={styles.playerAvatar} />
  //           <View style={styles.playerAvatar} />
  //           <View style={styles.playerAvatar} />
  //           <View style={styles.playerAvatar} />
  //           <View style={styles.playerAvatar} />
  //         </View>
  //         <Text style={styles.playerCountText}>
  //           <Text style={styles.playerCountNumber}>{seasonData.playerCount}</Text> players registered
  //         </Text>
  //       </View>

  //       <View style={styles.seasonDetails}>
  //         <View style={styles.detailRow}>
  //           <CalendarIcon width={16} height={16} style={styles.detailIcon} />
  //           <Text style={styles.detailText}>{seasonData.duration}</Text>
  //         </View>
  //         <View style={styles.detailRow}>
  //           <ClockIcon width={16} height={16} style={styles.detailIcon} />
  //           <Text style={styles.detailText}>{seasonData.lastRegistration}</Text>
  //         </View>
  //         <View style={styles.detailRow}>
  //           <DollarSignIcon width={16} height={16} style={styles.detailIcon} />
  //           <Text style={styles.detailText}>
  //             Entry Fee: <Text style={styles.highlightText}>{seasonData.entryFee}</Text>
  //           </Text>
  //         </View>
  //       </View>

  //       <TouchableOpacity 
  //         style={[styles.registerButton, { backgroundColor: seasonData.buttonColor }]}
  //         onPress={seasonData.buttonHandler}
  //         activeOpacity={0.8}
  //       >
  //         <Text style={styles.registerButtonText}>{seasonData.buttonText}</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // };

  // Replace the renderSeasonCard function with this:

  const renderSeasonCard = () => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#863A73" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const groupedSeasons = SeasonService.groupSeasonsByStatus(seasons);
  const currentSeasons =
    activeTab === 0
      ? groupedSeasons.active
      : activeTab === 1
      ? groupedSeasons.upcoming
      : groupedSeasons.finished;

  if (currentSeasons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No seasons available</Text>
      </View>
    );
  }

  return currentSeasons.map((season) => (
    <SeasonCard
      key={season.id}
      season={season}
      userId={userId}
      isDoublesCategory={isDoublesCategory}
      setSelectedSeason={setSelectedSeason}
      setShowPaymentOptions={setShowPaymentOptions}
      handleJoinWaitlistPress={handleJoinWaitlistPress}
      handleViewStandingsPress={handleViewStandingsPress}
    />
  ));
};

// Separate component to properly use hooks
interface SeasonCardProps {
  season: Season;
  userId: string | undefined;
  isDoublesCategory: boolean;
  setSelectedSeason: (season: Season | null) => void;
  setShowPaymentOptions: (show: boolean) => void;
  handleJoinWaitlistPress: () => void;
  handleViewStandingsPress: (season: Season) => void;
}

const SeasonCard: React.FC<SeasonCardProps> = ({
  season,
  userId,
  isDoublesCategory,
  setSelectedSeason,
  setShowPaymentOptions,
  handleJoinWaitlistPress,
  handleViewStandingsPress,
}) => {
  const isUserRegistered = season.memberships?.some(
    (m: any) => m.userId === userId
  );

  // Check partnership for this specific season
  const { partnership } = useActivePartnership(
    isDoublesCategory ? season.id : null,
    userId
  );

  function handleViewDivisionPress(season: Season) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  console.log('View button pressed for season:', season.id);
  toast.info('Division Chat coming soon!');
}

    return (
      <View key={season.id} style={styles.seasonCard}>
        <View style={styles.seasonCardHeader}>
          <Text style={styles.seasonTitle}>{season.name}</Text>
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonBadgeText}>
              {SeasonService.getSeasonBadge(season.status, season.name)}
            </Text>
          </View>
        </View>

        <View style={styles.playerCountRow}>
          <View style={styles.playerAvatars}>
            <View style={styles.playerAvatar} />
            <View style={styles.playerAvatar} />
            <View style={styles.playerAvatar} />
          </View>
          <Text style={styles.playerCountText}>
            <Text style={styles.playerCountNumber}>+{season.registeredUserCount}</Text> players registered
          </Text>
        </View>

        <View style={styles.seasonDetails}>
          {season.startDate && season.endDate && (
            <View style={styles.detailRow}>
              <CalendarIcon width={16} height={16} style={styles.detailIcon} />
              <Text style={styles.detailText}>
                Duration: {SeasonService.formatDateRange(
                  typeof season.startDate === 'string' ? season.startDate : season.startDate.toISOString(),
                  typeof season.endDate === 'string' ? season.endDate : season.endDate.toISOString()
                )}
              </Text>
            </View>
          )}

          {season.regiDeadline && (
            <View style={styles.detailRow}>
              <ClockIcon width={16} height={16} style={styles.detailIcon} />
              <Text style={styles.detailText}>
                Last Registration: {SeasonService.formatDate(
                  typeof season.regiDeadline === 'string' 
                    ? season.regiDeadline 
                    : season.regiDeadline.toISOString()
                )}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <DollarSignIcon width={16} height={16} style={styles.detailIcon} />
            <Text style={styles.detailText}>
              Entry Fee:{" "}
              <Text style={styles.highlightText}>
                RM
                {typeof season.entryFee === "number"
                  ? season.entryFee.toFixed(2)
                  : parseFloat(season.entryFee.toString()).toFixed(2)}
              </Text>
            </Text>
          </View>

          {season.paymentRequired && (
            <Text style={styles.paymentRequiredText}>
              * Payment required for registration
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.registerButton,
            { backgroundColor: SeasonService.getButtonColor(season.status) },
          ]}
          onPress={() => {
            if (isUserRegistered) {
              handleViewDivisionPress(season);
            } else if (season.status === "ACTIVE") {
              // Check if this is doubles category and user doesn't have a partnership yet
              if (isDoublesCategory && !partnership) {
                // Navigate to Find Partner screen
                router.push(`/pairing/find-partner/${season.id}`);
              } else {
                // Either has partnership (doubles) or is singles - show payment
                setSelectedSeason(season);
                setShowPaymentOptions(true);
              }
            } else if (season.status === "UPCOMING") {
              handleJoinWaitlistPress();
            } else if (season.status === "FINISHED") {
              handleViewStandingsPress(season);
            }
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.registerButtonText}>
            {isUserRegistered
              ? "View"
              : isDoublesCategory && !partnership
              ? "Find Partner"
              : isDoublesCategory && partnership
              ? "Pay"
              : SeasonService.getButtonText(season.status)}
          </Text>
        </TouchableOpacity>
      </View>
    );
};


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={sport === 'pickleball' ? ['#B98FAF', '#FFFFFF'] : ['#B3CFBC', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.contentContainer}>
        {/* Header Section */}
        <SportDropdownHeader 
          currentSport={sport}
          sportName={sport === 'pickleball' ? 'Pickleball' : 'Tennis'}
          sportColor={sport === 'pickleball' ? '#863A73' : '#008000'}
        />
        
        {/* Category Title */}
        <View style={styles.categoryTitleContainer}>
          <Text style={styles.categoryTitleText}>{category}</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === index && styles.activeTab]}
              onPress={() => handleTabPress(index)}
            >
              <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                {tab}
              </Text>
              {activeTab === index && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Dynamic Season Card */}
          {renderSeasonCard()}

          <PaymentOptionsBottomSheet
            visible={showPaymentOptions}
            onClose={handleClosePaymentOptions}
            season={selectedSeason}
            onPayNow={handlePayNow}
            onPayLater={handlePayLater}
          />
        </ScrollView>
      </View>
      
      <NavBar activeTab={2} onTabPress={() => {}} />
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
  categoryTitleContainer: {
    marginTop: 30,
    alignItems: 'flex-start',
    paddingHorizontal: 24,
  },
  categoryTitleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'left',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    justifyContent: 'flex-start',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    position: 'relative',
    marginRight: 24,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeTab: {
    // Active tab styling - can be empty or add specific styles
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#863A73',
    borderRadius: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  seasonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    borderColor: '#E3E3E3',
    borderWidth: 1,
  },
  seasonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seasonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  seasonBadge: {
    backgroundColor: '#863A73',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#863A73',
  },
  seasonBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  playerCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  playerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  playerCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  playerCountNumber: {
    color: '#863A73',
    fontWeight: '600',
  },
  seasonDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  highlightText: {
    color: '#863A73',
    fontWeight: '600',
  },
  registerButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
  },
  paymentRequiredText: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
