import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Image, StatusBar, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SportSwitcher } from '@/shared/components/ui/SportSwitcher';
import { authClient } from '@/lib/auth-client';
import { useSession } from '@/lib/auth-client';
import * as Haptics from 'expo-haptics';
import { getBackendBaseURL } from '@/src/config/network';
import { SeasonService, Season } from '@/src/features/dashboard-user/services/SeasonService';
import { LeagueService } from '@/src/features/leagues/services/LeagueService';
import { PaymentOptionsBottomSheet, InvitePartnerBottomSheet } from '../components';
import { toast } from 'sonner-native';
import { SocketService } from '@/lib/socket-service';
import BackButtonIcon from '@/assets/icons/back-button.svg';
import TeamPlusIcon from '@/assets/icons/teamp_plus.svg';
import TeamUpBulbIcon from '@/assets/icons/teamup_bulb.svg';
import { checkQuestionnaireStatus, getSeasonSport } from '../utils/questionnaireCheck';
import { getSeasonSport as getSeasonSportFromUtil, getDoublesDMR, getTeamDMR } from '@/utils/dmrCalculator';
import { FiuuPaymentService } from '@/src/features/payments/services/FiuuPaymentService';

const { width } = Dimensions.get('window');

const isSmallScreen = width < 375;
const isTablet = width > 768;

interface DoublesTeamPairingScreenProps {
  seasonId: string;
  seasonName?: string;
  leagueId?: string;
  sport?: 'pickleball' | 'tennis';
}

interface Player {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string;
  image: string | null;
  skillRatings?: any;
  questionnaireStatus?: {
    hasSelectedSport: boolean;
    hasCompletedQuestionnaire: boolean;
    startedAt: string | null;
    completedAt: string | null;
  };
}

export default function DoublesTeamPairingScreen({
  seasonId,
  seasonName = 'Season',
  leagueId,
  sport = 'pickleball'
}: DoublesTeamPairingScreenProps) {
  const { data: session } = useSession();
  const [season, setSeason] = React.useState<Season | null>(null);
  const [league, setLeague] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profileData, setProfileData] = React.useState<any>(null);
  const [selectedPartner, setSelectedPartner] = React.useState<Player | null>(null);
  const [selectedSport, setSelectedSport] = React.useState<'pickleball' | 'tennis' | 'padel'>('pickleball');
  const [showInvitePartnerSheet, setShowInvitePartnerSheet] = React.useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = React.useState(false);

  // Season invitation/partnership state
  const [invitationStatus, setInvitationStatus] = React.useState<'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'declined' | 'expired'>('none');
  const [partnershipStatus, setPartnershipStatus] = React.useState<'none' | 'active'>('none');
  const [currentInvitation, setCurrentInvitation] = React.useState<any>(null);
  const [currentPartnership, setCurrentPartnership] = React.useState<any>(null);
  const [isPairingLoading, setIsPairingLoading] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  const insets = useSafeAreaInsets();
  const STATUS_BAR_HEIGHT = insets.top;

  const userId = session?.user?.id;

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Trigger entry animation when data loads
  useEffect(() => {
    if (!isLoading && season && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.spring(contentEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(contentEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    }
  }, [isLoading, season]);

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

  // Debug: Log state changes
  React.useEffect(() => {
    console.log('🔍 DoublesTeamPairing State:', {
      invitationStatus,
      partnershipStatus,
      selectedPartner: selectedPartner?.name || 'none',
      isPairingLoading,
      disabled: invitationStatus !== 'none' || partnershipStatus === 'active'
    });
  }, [invitationStatus, partnershipStatus, selectedPartner, isPairingLoading]);

  const checkPairingStatus = React.useCallback(async () => {
    if (!seasonId || !userId) return;

    try {
      setIsPairingLoading(true);
      const backendUrl = getBackendBaseURL();

      // Check for active partnership
      const partnershipResponse = await authClient.$fetch(
        `${backendUrl}/api/pairing/partnership/active/${seasonId}`,
        { method: 'GET' }
      );

      // Extract partnership data correctly from nested structure
      const rawData = (partnershipResponse as any)?.data?.data;
      const partnershipData = rawData !== null && typeof rawData === 'object' && rawData.id ? rawData : null;
      
      console.log('🔎 Partnership response:', {
        partnershipData,
        hasData: !!partnershipData,
        rawResponse: partnershipResponse,
        responseData: (partnershipResponse as any)?.data,
      });

      if (partnershipData && partnershipData.id) {
        // Active partnership exists
        setPartnershipStatus('active');
        setCurrentPartnership(partnershipData);
        setInvitationStatus('accepted');

        // Debug: Check captain and partner before extraction
        console.log('🔍 Partnership data structure:', {
          hasCaptain: !!partnershipData.captain,
          hasPartner: !!partnershipData.partner,
          captainId: partnershipData.captain?.id,
          partnerId: partnershipData.partner?.id,
          captainName: partnershipData.captain?.name,
          partnerName: partnershipData.partner?.name,
          captainHasSkillRatings: !!partnershipData.captain?.skillRatings,
          partnerHasSkillRatings: !!partnershipData.partner?.skillRatings,
          captainSkillRatings: partnershipData.captain?.skillRatings,
          partnerSkillRatings: partnershipData.partner?.skillRatings,
          captainSkillRatingsKeys: partnershipData.captain?.skillRatings ? Object.keys(partnershipData.captain.skillRatings) : [],
          partnerSkillRatingsKeys: partnershipData.partner?.skillRatings ? Object.keys(partnershipData.partner.skillRatings) : [],
        });

        // Set partner based on role
        let partner = partnershipData.captainId === userId
          ? partnershipData.partner
          : partnershipData.captain;

        // Ensure partner has skillRatings (always an object, even if empty)
        if (partner) {
          partner = {
            ...partner,
            skillRatings: partner.skillRatings || {},
          };
        }

        // Debug logging for partner data
        console.log('🔍 Setting partner from partnership:', {
          partnerId: partner?.id,
          partnerName: partner?.name,
          hasSkillRatings: !!partner?.skillRatings,
          skillRatingsKeys: partner?.skillRatings ? Object.keys(partner.skillRatings) : [],
          skillRatings: partner?.skillRatings,
          seasonSport: season ? getSeasonSport(season) : 'unknown',
          fullPartnerObject: partner,
        });

        setSelectedPartner(partner);
        return;
      }

      // No partnership, check for pending invitation
      const invitationResponse = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/pending/${seasonId}`,
        { method: 'GET' }
      );

      // Extract invitation data correctly from nested structure
      const rawInvData = (invitationResponse as any)?.data?.data;
      const invitationData = rawInvData !== null && typeof rawInvData === 'object' && rawInvData.id ? rawInvData : null;
      
      console.log('🔎 Invitation response:', { invitationData, hasData: !!invitationData });

      if (invitationData && invitationData.id) {
        setCurrentInvitation(invitationData);

        // Determine invitation status based on direction
        if (invitationData.direction === 'sent') {
          setInvitationStatus('pending_sent');
          setSelectedPartner(invitationData.recipient);
        } else {
          setInvitationStatus('pending_received');
          setSelectedPartner(invitationData.sender);
        }
      } else {
        // No invitation or partnership
        setInvitationStatus('none');
        setPartnershipStatus('none');
      }
    } catch (error) {
      console.error('Error checking pairing status:', error);
    } finally {
      setIsPairingLoading(false);
    }
  }, [seasonId, userId, season]);

  const fetchSeasonData = React.useCallback(async (showLoading: boolean = true) => {
    if (!seasonId) {
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      const allSeasons = await SeasonService.fetchAllSeasons();
      const foundSeason = allSeasons.find(s => s.id === seasonId);

      if (foundSeason) {
        setSeason(foundSeason);
        
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
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [seasonId, leagueId]);

  // Check pairing status when screen loads
  React.useEffect(() => {
    if (seasonId && userId) {
      checkPairingStatus();
    }
  }, [seasonId, userId, checkPairingStatus]);

  // Setup Socket.IO listeners for real-time updates
  React.useEffect(() => {
    const socketService = SocketService.getInstance();

    // Handler for when user receives a new season invitation
    const handleInvitationReceived = (data: any) => {
      console.log('DoublesTeamPairing: Received invitation:', data);
      if (data.season?.id === seasonId) {
        toast.info('New season invitation!', {
          description: `${data.sender?.name} invited you to join this season.`,
        });
        checkPairingStatus(); // Refresh status
      }
    };

    // Handler for when sent invitation is accepted
    const handleInvitationAccepted = (data: any) => {
      console.log('DoublesTeamPairing: Invitation accepted:', data);
      if (data.partnership?.season?.id === seasonId) {
        // Don't show toast here - partnership_created event will handle it
        // Just refresh status
        checkPairingStatus(); // Refresh status
      }
    };

    // Handler for partnership creation
    const handlePartnershipCreated = (data: any) => {
      console.log('DoublesTeamPairing: Partnership created:', data);
      if (data.partnership?.season?.id === seasonId) {
        toast.success('Partnership created!', {
          description: 'You can now register your team.',
        });
        checkPairingStatus(); // Refresh status
      }
    };

    // Handler for team registration completion
    const handleTeamRegistrationCompleted = (data: any) => {
      console.log('🎉 DoublesTeamPairing: Team registration completed event received:', data);
      console.log('🎉 Current seasonId:', seasonId, 'Event seasonId:', data.partnership?.season?.id);
      
      if (data.partnership?.season?.id === seasonId) {
        const isCaptain = data.partnership.captainId === userId;
        console.log('🎉 User is captain:', isCaptain, 'userId:', userId, 'captainId:', data.partnership.captainId);
        
        toast.success('Team registered successfully!', {
          description: isCaptain 
            ? 'Your team has been registered for this season.'
            : 'Your team captain has completed the registration.',
        });
        
        // Refresh pairing status and season data to update UI
        console.log('🎉 Refreshing pairing status and season data...');
        checkPairingStatus();
        fetchSeasonData(false); // Refresh season data without showing loading
        
        // If user is the partner (not captain), redirect to league details page
        if (!isCaptain && leagueId) {
          console.log('🎉 Partner detected, redirecting to league details in 500ms...');
          setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace({
              pathname: '/user-dashboard/league-details' as any,
              params: {
                leagueId: leagueId,
                leagueName: league?.name || 'League',
                sport: sport || 'pickleball'
              }
            });
          }, 500);
        } else if (!isCaptain && !leagueId) {
          console.warn('🎉 Partner detected but no leagueId available for redirect');
        }
      } else {
        console.log('🎉 Event season ID does not match current season ID, ignoring');
      }
    };

    // Register listeners
    socketService.on('season_invitation_received', handleInvitationReceived);
    socketService.on('season_invitation_accepted', handleInvitationAccepted);
    socketService.on('partnership_created', handlePartnershipCreated);
    socketService.on('team_registration_completed', handleTeamRegistrationCompleted);

    // Cleanup listeners on unmount
    return () => {
      socketService.off('season_invitation_received', handleInvitationReceived);
      socketService.off('season_invitation_accepted', handleInvitationAccepted);
      socketService.off('partnership_created', handlePartnershipCreated);
      socketService.off('team_registration_completed', handleTeamRegistrationCompleted);
    };
  }, [seasonId, userId, leagueId, league, sport, checkPairingStatus, fetchSeasonData]);

  const handleInvitePartner = () => {
    console.log('🎯 Invite Partner tapped!', { invitationStatus, partnershipStatus });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Small delay to prevent immediate backdrop tap
    setTimeout(() => {
      setShowInvitePartnerSheet(true);
    }, 100);
  };

  const handlePartnerSelected = async (player: Player) => {
    console.log('🎯 handlePartnerSelected called with player:', player.name, 'userId:', userId, 'seasonId:', seasonId);

    if (!userId || !seasonId) {
      console.log('❌ Missing userId or seasonId, aborting');
      return;
    }

    // Check if player is eligible (has selected and completed questionnaire for season sport)
    const isEligible = !player.questionnaireStatus || 
                      (player.questionnaireStatus.hasSelectedSport && 
                       player.questionnaireStatus.hasCompletedQuestionnaire);
    
    if (!isEligible) {
      const message = !player.questionnaireStatus?.hasSelectedSport
        ? 'This player needs to complete a questionnaire to join'
        : 'This player has not completed their questionnaire';
      
      toast.error('Cannot send invitation', {
        description: message,
      });
      return;
    }

    try {
      console.log('✅ Setting selected partner:', player.name);
      setSelectedPartner(player);

      // Send season invitation
      const backendUrl = getBackendBaseURL();
      const invitationPayload = {
        recipientId: player.id,
        seasonId: seasonId,
        message: null
      };
      console.log('📤 Sending invitation with payload:', invitationPayload);

      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation`,
        {
          method: 'POST',
          body: invitationPayload
        }
      );

      console.log('✅ Invitation API response:', response);
      const responseData = (response as any)?.data || response;
      
      // Check if response contains an error
      if ((response as any)?.error) {
        const errorObj = (response as any).error;
        const errorMessage = errorObj?.error || errorObj?.message || 'Failed to send invitation';
        toast.error('Failed to send invitation', {
          description: errorMessage,
        });
        setSelectedPartner(null);
        return;
      }
      
      if (responseData) {
        toast.success('Invitation sent!', {
          description: `Season invitation sent to ${player.name}.`,
        });

        // Refresh pairing status to show pending state
        await checkPairingStatus();
      }
    } catch (error: any) {
      console.error('Error sending season invitation:', error);
      // Extract error message from response if available
      const errorMessage = error?.data?.error || error?.data?.message || error?.error?.error || error?.message || 'Failed to send invitation';
      toast.error('Failed to send invitation', {
        description: errorMessage,
      });
      setSelectedPartner(null);
    }
  };

  const handleRegisterTeam = () => {
    if (!selectedPartner) {
      toast.error('Please select a partner first');
      return;
    }
    
    if (!season) return;
    
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
            returnPath: 'league-details'
          }
        });
        return;
      }
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPaymentOptions(true);
  };

  const handleClosePaymentOptions = () => {
    setShowPaymentOptions(false);
  };

  const handlePayNow = async () => {
    if (!userId || !season) {
      toast.error('Missing required information');
      return;
    }

    if (isProcessingPayment) return;

    try {
      setIsProcessingPayment(true);
      console.log('Starting FIUU payment for doubles season:', season.id);

      const checkout = await FiuuPaymentService.createCheckout(season.id, userId);
      const payload = encodeURIComponent(JSON.stringify({
        ...checkout,
        returnTo: {
          pathname: '/user-dashboard/league-details',
          params: {
            leagueId: leagueId,
            leagueName: league?.name || 'League',
            sport: sport || 'pickleball'
          },
          dismissCount: 2 // Go back 2 screens: fiuu-checkout -> doubles-team-pairing -> league-details
        }
      }));

      // Close payment options sheet before navigating
      setShowPaymentOptions(false);

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

  const handlePayLater = async () => {
    if (!userId || !season || !selectedPartner) {
      toast.error('Missing required information');
      return;
    }

    try {
      console.log('Registering team for season (Pay Later):', season.id);
      // Backend automatically registers both captain and partner when partnership exists
      // payLater=true sets payment status to COMPLETED in dev mode (for testing)
      // In production, this should set payment status to PENDING (requires admin approval)
      const success = await SeasonService.registerForSeason(season.id, userId, true);

      if (success) {
        console.log('Team registered successfully');
        // Don't show toast here - socket event will handle it to avoid duplicate

        // Close payment bottomsheet
        setShowPaymentOptions(false);

        // Navigate back to LeagueDetailsScreen after a short delay
        // Socket event 'team_registration_completed' will show the toast
        // The useFocusEffect in LeagueDetailsScreen will refresh the data automatically
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }, 500);
      } else {
        console.warn('Registration failed');
        toast.error('Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Error registering team:', err);
      toast.error('An error occurred while registering.');
    }
  };

  const handleUnlink = () => {
    if (!currentPartnership || !selectedPartner) {
      toast.error('Missing partnership information');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Unlink Partnership',
      `Are you sure you want to unlink from ${selectedPartner.name} for this season? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            try {
              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/partnership/${currentPartnership.id}/dissolve`,
                {
                  method: 'POST',
                }
              );

              const responseData = (response as any).data || response;
              if (responseData && responseData.success) {
                toast.success('Partnership Unlinked', {
                  description: 'You can now find a new partner',
                });

                // Reset partnership state
                setPartnershipStatus('none');
                setCurrentPartnership(null);
                setSelectedPartner(null);
                setInvitationStatus('none');

                // Refresh partnership status
                await checkPairingStatus();
              } else {
                toast.error('Error', {
                  description: responseData.message || 'Failed to unlink partnership',
                });
              }
            } catch (error) {
              console.error('Error unlinking partnership:', error);
              toast.error('Error', {
                description: 'Failed to unlink partnership',
              });
            }
          },
        },
      ]
    );
  };

  // Get season sport for DMR calculations
  const seasonSport = React.useMemo(() => {
    return getSeasonSportFromUtil(season);
  }, [season]);

  // Calculate DMR values using season-specific sport
  const userDMR = React.useMemo(() => {
    return getDoublesDMR(profileData?.skillRatings, seasonSport);
  }, [profileData?.skillRatings, seasonSport]);

  const partnerDMR = React.useMemo(() => {
    if (!selectedPartner) return 'N/A';
    return getDoublesDMR(selectedPartner.skillRatings, seasonSport);
  }, [selectedPartner, seasonSport]);

  const teamDMR = React.useMemo(() => {
    if (!selectedPartner || partnershipStatus !== 'active') {
      return '-';
    }
    return getTeamDMR(profileData?.skillRatings, selectedPartner.skillRatings, seasonSport);
  }, [profileData?.skillRatings, selectedPartner, partnershipStatus, seasonSport]);

  // Helper function to get available sports for SportSwitcher
  const getUserSelectedSports = () => {
    return ["pickleball", "tennis", "padel"];
  };

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
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
      </Animated.View>

      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
        <View style={styles.contentContainer}>
          <View style={styles.contentBox}>
          {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A04DFE" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchSeasonData()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.gradientHeaderContainer}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.back();
                }}
              >
                <BackButtonIcon width={12} height={19} />
              </TouchableOpacity>
              <LinearGradient
                colors={getHeaderGradientColors(selectedSport)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.seasonHeaderGradient}
                pointerEvents="none"
              >
                  <View style={styles.seasonHeaderContent}>
                  <View style={styles.topRow}>
                    <View style={styles.backButtonContainer}>
                      <View />
                    </View>
                    <View style={styles.leagueNameContainer}>
                      <Text style={styles.leagueName} numberOfLines={2}>{league?.name || 'League'}</Text>
                    </View>
                  </View>
                  <View style={styles.bannerContainer}>
                    <View style={[styles.nameBanner, { backgroundColor: getBannerBackgroundColor(selectedSport) }]}>
                      <Text style={styles.seasonName}>
                        {(() => {
                          const category = (season as any)?.category;
                          const categories = (season as any)?.categories || (category ? [category] : []);
                          const normalizedCategories = Array.isArray(categories) ? categories : [categories].filter(Boolean);
                          const categoryName = normalizedCategories?.[0]?.name;
                          return categoryName ? `${categoryName} | ` : '';
                        })()}
                        <Text style={styles.seasonNameHighlight}>{season?.name || seasonName}</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onTouchStart={() => console.log('📜 ScrollView touch detected')}
            >
              <View style={styles.teamUpCard}>
                <Text style={styles.teamUpTitle}>Team up!</Text>
                <View style={styles.descriptionContainer}>
                  <TeamUpBulbIcon width={43} height={43} />
                  <Text style={styles.teamUpDescription}>
                    Only one player needs to register and pay the entry fee for your team. The player who sends the invite (Team Captain) completes the registration.
                  </Text>
                </View>

                <View
                  style={styles.playerPairContainer}
                  onLayout={(event) => {
                    const { x, y, width, height } = event.nativeEvent.layout;
                    console.log('📦 playerPairContainer layout:', { x, y, width, height });
                  }}
                >
                  {/* Current Player */}
                  <View style={styles.playerCard}>
                    {profileData?.image || session?.user?.image ? (
                      <Image
                        source={{ uri: profileData?.image || session?.user?.image }}
                        style={styles.playerAvatar}
                      />
                    ) : (
                      <View style={styles.defaultAvatar}>
                        <Text style={styles.defaultAvatarText}>
                          {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.playerName} numberOfLines={1}>
                      {profileData?.name || session?.user?.name || 'You'}
                    </Text>
                    <Text style={styles.playerDMR}>DMR: {userDMR}</Text>

                    {/* Show role label during pending invitations */}
                    {invitationStatus === 'pending_sent' && (
                      <Text style={styles.roleLabel}>Team Captain</Text>
                    )}
                    {invitationStatus === 'pending_received' && (
                      <Text style={styles.roleLabel}>Team Member</Text>
                    )}
                    {/* Show role label during active partnership */}
                    {partnershipStatus === 'active' && currentPartnership?.captainId === userId && (
                      <Text style={styles.roleLabel}>Team Captain</Text>
                    )}
                  </View>

                  {/* Plus Icon */}
                  <View style={styles.plusContainer}>
                    <TeamPlusIcon width={34} height={34} />
                  </View>

                  {/* Partner Placeholder or Selected Partner */}
                  <TouchableOpacity
                    style={styles.partnerCard}
                    onPress={() => {
                      console.log('👆 Partner card tapped!', {
                        disabled: invitationStatus !== 'none' || partnershipStatus === 'active',
                        invitationStatus,
                        partnershipStatus
                      });
                      handleInvitePartner();
                    }}
                    onPressIn={() => console.log('🖐️ TouchableOpacity PressIn detected')}
                    onPressOut={() => console.log('🖐️ TouchableOpacity PressOut detected')}
                    onLayout={(event) => {
                      const { x, y, width, height } = event.nativeEvent.layout;
                      console.log('📐 Partner card layout:', { x, y, width, height });
                    }}
                    activeOpacity={0.7}
                    disabled={invitationStatus !== 'none' || partnershipStatus === 'active'}
                  >
                    {selectedPartner ? (
                      <>
                        <View
                          style={[
                            invitationStatus === 'pending_sent' && styles.pendingAvatarContainer,
                            invitationStatus === 'pending_received' && styles.pendingAvatarContainer,
                            { opacity: invitationStatus === 'pending_sent' || invitationStatus === 'pending_received' ? 0.5 : 1 }
                          ]}
                        >
                          {selectedPartner.image ? (
                            <Image
                              source={{ uri: selectedPartner.image }}
                              style={styles.playerAvatar}
                            />
                          ) : (
                            <View style={styles.defaultAvatar}>
                              <Text style={styles.defaultAvatarText}>
                                {selectedPartner.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.playerName,
                            { opacity: invitationStatus === 'pending_sent' || invitationStatus === 'pending_received' ? 0.6 : 1 }
                          ]}
                          numberOfLines={1}
                        >
                          {selectedPartner.name}
                        </Text>

                        {/* Show "Pending..." during pending states, DMR when active */}
                        {(invitationStatus === 'pending_sent' || invitationStatus === 'pending_received') && (
                          <Text style={[styles.playerDMR, { opacity: 0.6 }]}>Pending...</Text>
                        )}

                        {partnershipStatus === 'active' && (
                          <>
                            <Text style={styles.playerDMR}>DMR: {partnerDMR}</Text>
                            {currentPartnership?.captainId !== userId && (
                              <Text style={styles.roleLabel}>Team Captain</Text>
                            )}
                            <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
                              <Text style={styles.unlinkButtonText}>Unlink</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <View style={styles.placeholderCircle}>
                          <Ionicons name="person-outline" size={32} color="#BABABA" />
                        </View>
                        <Text style={styles.inviteText}>Tap to invite partner</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.teamDMRChipContainer}>
                  <LinearGradient
                    colors={getHeaderGradientColors(selectedSport)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.teamDMRChip}
                  >
                    <Text style={styles.teamDMRText}>Team DMR: {teamDMR}</Text>
                  </LinearGradient>
                </View>
              </View>
            </ScrollView>
          </>
        )}
          </View>
        </View>
      </Animated.View>

      {/* Sticky Button */}
      {!isLoading && !error && season && (() => {
        const isCaptain = currentPartnership?.captainId === userId;
        
        return (
          <View style={[styles.stickyButtonContainer, { paddingBottom: insets.bottom }]}>
            <TouchableOpacity
              style={[
                styles.stickyButton,
                {
                  backgroundColor:
                    partnershipStatus === 'active' && isCaptain
                      ? '#FEA04D'
                      : partnershipStatus === 'active' && !isCaptain
                      ? '#B2B2B2'
                      : invitationStatus === 'pending_sent' || invitationStatus === 'pending_received'
                      ? '#B2B2B2'
                      : selectedPartner
                      ? '#B2B2B2'
                      : '#B2B2B2',
                },
              ]}
              onPress={handleRegisterTeam}
              disabled={partnershipStatus !== 'active' || !isCaptain}
              activeOpacity={0.8}
            >
              <Text style={styles.stickyButtonText}>
                {partnershipStatus === 'active' && isCaptain
                  ? 'Register Team'
                  : partnershipStatus === 'active' && !isCaptain
                  ? 'Waiting for Team Captain'
                  : invitationStatus === 'pending_sent'
                  ? 'Waiting for Partner'
                  : invitationStatus === 'pending_received'
                  ? 'Accept in Invitations Tab'
                  : 'Select a Partner First'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      <InvitePartnerBottomSheet
        visible={showInvitePartnerSheet}
        onClose={() => setShowInvitePartnerSheet(false)}
        seasonId={seasonId}
        season={season}
        seasonSport={seasonSport}
        onPlayerSelect={handlePartnerSelected}
      />

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
  headerRight: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
  gradientHeaderContainer: {
    width: '100%',
    marginBottom: -40,
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
    paddingBottom: 56,
  },
  seasonHeaderContent: {
    gap: 12,
  },
  bannerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  nameBanner: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 0,
    width: Dimensions.get('window').width,
    marginHorizontal: -20,
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
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
  backButton: {
    position: 'absolute',
    top: 24,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leagueNameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 52,
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
  contentBox: {
    flex: 1,
    backgroundColor: '#F6FAFC',
    borderWidth: 1,
    borderColor: '#D5D5D5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  teamUpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 20 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  teamUpTitle: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: '700',
    color: '#1D1D1F',
    textAlign: 'center',
    marginBottom: 12,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 24,
  },
  teamUpDescription: {
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14,
    color: '#86868B',
    textAlign: 'left',
    lineHeight: 16,
  },
  playerPairContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  playerCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'flex-start',
  },
  partnerCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'flex-start',
  },
  pendingAvatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 42,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFA500',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  defaultAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  placeholderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#BABABA',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  playerName: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 12,
    textAlign: 'center',
  },
  playerDMR: {
    fontSize: isSmallScreen ? 15 : 16,
    color: '#1D1D1F',
    marginTop: 4,
  },
  inviteText: {
    fontSize: isSmallScreen ? 13 : 14,
    fontWeight: '600',
    color: '#BABABA',
    marginTop: 8,
    textAlign: 'center',
  },
  partnerLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#86868B',
    marginTop: 4,
  },
  roleLabel: {
    fontSize: isSmallScreen ? 12 : 13,
    color: '#86868B',
    marginTop: 6,
    fontWeight: '400',
  },
  unlinkButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7525CF',
  },
  unlinkButtonText: {
    color: '#7525CF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#FFA500',
    marginTop: 4,
    fontWeight: '600',
  },
  statusLabelReceived: {
    fontSize: isSmallScreen ? 11 : 12,
    color: '#A04DFE',
    marginTop: 4,
    fontWeight: '600',
  },
  plusContainer: {
    width: 56,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -100,
  },
  teamDMRChipContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 28,
  },
  teamDMRChip: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  teamDMRText: {
    color: '#FDFDFD',
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '600',
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
