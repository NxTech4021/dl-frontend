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
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { PaymentOptionsBottomSheet } from '../components';
import BottomSheet from '@gorhom/bottom-sheet';
import { ChoosePartnerBottomSheet, WaitingForPartnerBottomSheet, PartnershipDetailsBottomSheet } from '@/features/pairing/components';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { FiuuPaymentService } from '@/src/features/payments/services/FiuuPaymentService';
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
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState<Season | null>(null);

  // Bottom sheet refs and state
  const choosePartnerBottomSheetRef = React.useRef<BottomSheet>(null);
  const waitingForPartnerBottomSheetRef = React.useRef<BottomSheet>(null);
  const partnershipDetailsBottomSheetRef = React.useRef<BottomSheet>(null);

  const [friends, setFriends] = React.useState<any[]>([]);
  const [pendingInvitation, setPendingInvitation] = React.useState<any>(null);
  const [seasonPartnership, setSeasonPartnership] = React.useState<any>(null);
  const [bottomSheetLoading, setBottomSheetLoading] = React.useState(false);
  const [currentSeasonForBottomSheet, setCurrentSeasonForBottomSheet] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    if (!showPaymentOptions) {
      setIsProcessingPayment(false);
    }
  }, [showPaymentOptions]);


  const handleRegisterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Register button pressed for category:', category);

    if (isDoublesCategory) {
      // TODO: Check if user already has an active partnership
      // This feature is not yet implemented - partnership check will be added later

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

  // Fetch friends
  const fetchFriends = React.useCallback(async () => {
    console.log('🔵🔵🔵 fetchFriends called, userId:', userId);
    if (!userId) {
      console.log('❌ No userId, returning early');
      return;
    }
    try {
      console.log('🔵 Fetching friends...');
      const backendUrl = getBackendBaseURL();
      console.log('🔵 Backend URL:', backendUrl);
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/friends`, {
        method: 'GET',
      });
      console.log('📦 Friends API response:', response);
      const data = (response as any).data?.data || (response as any).data || [];
      console.log('✅ Friends data:', data);
      console.log('📊 Friends count:', data.length);
      setFriends(data);
    } catch (error) {
      console.error('❌ Error fetching friends:', error);
    }
  }, [userId]);

  // Fetch pending season invitation for a specific season
  const fetchPendingInvitation = React.useCallback(async (seasonId: string) => {
    if (!userId) return null;
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/pending/${seasonId}`,
        { method: 'GET' }
      );
      return (response as any).data?.data || (response as any).data;
    } catch (error) {
      console.error('Error fetching pending invitation:', error);
      return null;
    }
  }, [userId]);

  // Handle choose partner button press
  const handleChoosePartner = async (seasonId: string) => {
    console.log('🔵 Choose Partner clicked for season:', seasonId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentSeasonForBottomSheet(seasonId);
    setBottomSheetLoading(true);
    await fetchFriends();
    setBottomSheetLoading(false);
    console.log('🔵 Opening bottom sheet...');
    choosePartnerBottomSheetRef.current?.snapToIndex(0);
  };

  // Handle waiting for partner button press
  const handleWaitingForPartner = async (seasonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentSeasonForBottomSheet(seasonId);
    setBottomSheetLoading(true);
    const invitation = await fetchPendingInvitation(seasonId);
    setPendingInvitation(invitation);
    setBottomSheetLoading(false);
    waitingForPartnerBottomSheetRef.current?.snapToIndex(0);
  };

  // Handle view partnership details button press
  const handleViewPartnership = async (partnership: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeasonPartnership(partnership);
    partnershipDetailsBottomSheetRef.current?.snapToIndex(0);
  };

  // Send season invitation
  const handleSendSeasonInvitation = React.useCallback(async (partnershipId: string, partnerId: string) => {
    if (!userId || !currentSeasonForBottomSheet) return;
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/season/invitation`, {
        method: 'POST',
        body: {
          recipientId: partnerId,
          generalPartnershipId: partnershipId,
          seasonId: currentSeasonForBottomSheet,
        },
      });
      const data = (response as any).data || response;
      if (data && data.message) {
        toast.success('Season invitation sent!');
        choosePartnerBottomSheetRef.current?.close();
        // Refresh to show "Waiting for Partner" button
        const invitation = await fetchPendingInvitation(currentSeasonForBottomSheet);
        setPendingInvitation(invitation);
      }
    } catch (error) {
      console.error('Error sending season invitation:', error);
      toast.error('Failed to send invitation');
    }
  }, [userId, currentSeasonForBottomSheet, fetchPendingInvitation]);

  // Cancel season invitation
  const handleCancelSeasonInvitation = React.useCallback(async (invitationId: string) => {
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/${invitationId}`,
        { method: 'DELETE' }
      );
      const data = (response as any).data || response;
      if (data && data.message) {
        toast.success('Invitation cancelled');
        waitingForPartnerBottomSheetRef.current?.close();
        setPendingInvitation(null);
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  }, []);

  // Unlink season partnership
  const handleUnlinkPartnership = React.useCallback(async (partnershipId: string) => {
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/partnership/${partnershipId}/dissolve`,
        { method: 'POST' }
      );
      const data = (response as any).data || response;
      if (data && data.success) {
        toast.success('Partnership unlinked');
        partnershipDetailsBottomSheetRef.current?.close();
        setSeasonPartnership(null);
      }
    } catch (error) {
      console.error('Error unlinking partnership:', error);
      toast.error('Failed to unlink partnership');
    }
  }, []);

  const handlePayNow = async (season: Season) => {
    if (!userId) {
      toast.error('You must be logged in to continue');
      return;
    }

    if (isProcessingPayment) return;

    try {
      setIsProcessingPayment(true);
      console.log('Starting FIUU payment for season:', season.id);
      const checkout = await FiuuPaymentService.createCheckout(season.id, userId);
      const payload = encodeURIComponent(JSON.stringify(checkout));

      router.push({
        pathname: '/payments/fiuu-checkout',
        params: { payload },
      });
    } catch (error: any) {
      console.error('Error launching FIUU payment:', error);
      const message = error?.message || 'Unable to start payment. Please try again.';
      toast.error(message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayLater = async (season: Season) => {
    if (!session?.user?.id) {
    console.warn('No user ID found in session');
    toast.error('You must be logged in to register');
    return;
  }

  try {
    console.log('Registering user for season (Pay Later):', season.id);
    const success = await SeasonService.registerForSeason(season.id, session.user.id, true);

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
          onPress={async () => {
            console.log('🔴🔴🔴 BUTTON CLICKED!', {
              seasonId: season.id,
              seasonName: season.name,
              isUserRegistered,
              status: season.status,
              isDoublesCategory,
              partnership: partnership?.id
            });

            if (isUserRegistered) {
              console.log('→ Path: View Division');
              handleViewDivisionPress(season);
            } else if (season.status === "ACTIVE") {
              // Doubles category: New three-state flow
              if (isDoublesCategory) {
                console.log('→ Path: Doubles Category Flow');
                if (partnership) {
                  console.log('→ State 3: Has Partnership');
                  // State 3: Partnership confirmed - show details
                  handleViewPartnership(partnership);
                } else {
                  console.log('→ Checking for pending invitation...');
                  // Check for pending invitation
                  const pendingInvite = await fetchPendingInvitation(season.id);
                  console.log('→ Pending invite result:', pendingInvite);
                  // Check if pendingInvite has actual data (not just {data: null})
                  const hasInvite = pendingInvite && pendingInvite.data !== null && pendingInvite.data !== undefined;
                  console.log('→ Has valid invite?', hasInvite);
                  if (hasInvite) {
                    console.log('→ State 2: Has Pending Invite');
                    // State 2: Waiting for partner
                    handleWaitingForPartner(season.id);
                  } else {
                    console.log('→ State 1: Choose a Partner - Calling handleChoosePartner');
                    // State 1: Choose a partner
                    handleChoosePartner(season.id);
                  }
                }
              } else {
                console.log('→ Path: Singles Payment');
                // Singles category - show payment
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
              : isDoublesCategory && partnership
              ? "View"
              : isDoublesCategory
              ? "Choose a Partner"
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
            isProcessingPayment={isProcessingPayment}
          />
        </ScrollView>
      </View>

      {/* Bottom Sheets for Partner Selection Flow */}
      <ChoosePartnerBottomSheet
        bottomSheetRef={choosePartnerBottomSheetRef}
        friends={friends}
        currentUserId={userId || ''}
        seasonId={currentSeasonForBottomSheet || ''}
        isLoading={bottomSheetLoading}
        onSendInvitation={handleSendSeasonInvitation}
      />

      <WaitingForPartnerBottomSheet
        bottomSheetRef={waitingForPartnerBottomSheetRef}
        invitation={pendingInvitation}
        currentUserId={userId || ''}
        isLoading={bottomSheetLoading}
        onCancelInvitation={handleCancelSeasonInvitation}
      />

      <PartnershipDetailsBottomSheet
        bottomSheetRef={partnershipDetailsBottomSheetRef}
        partnership={seasonPartnership}
        currentUserId={userId || ''}
        isLoading={bottomSheetLoading}
        onUnlink={handleUnlinkPartnership}
      />

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
