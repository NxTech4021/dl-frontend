import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { PartnershipCard } from '../components/PartnershipCard';
import { PartnershipStatusBanner } from '../components/PartnershipStatusBanner';
import { IncompletePartnershipCard } from '../components/IncompletePartnershipCard';
import { IncomingPairRequestCard } from '../components/IncomingPairRequestCard';
import { IncomingSeasonInvitationCard } from '../components/IncomingSeasonInvitationCard';
import { InvitePartnerBottomSheet } from '@/src/features/dashboard-user/components/InvitePartnerBottomSheet';
import { usePartnershipMonitor } from '../hooks/usePartnershipMonitor';
import { usePartnershipStatus } from '../hooks/usePartnershipStatus';
import { useIncomingPairRequests } from '../hooks/useIncomingPairRequests';
import { useIncomingSeasonInvitations } from '../hooks/useIncomingSeasonInvitations';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface ManagePartnershipScreenProps {
  seasonId: string;
}

export default function ManagePartnershipScreen({ seasonId }: ManagePartnershipScreenProps) {
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();
  const [showInvitePartnerSheet, setShowInvitePartnerSheet] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Monitor partnership for dissolution by partner
  // This hook also fetches and manages partnership data, so we don't need separate state
  const { partnership, loading, refresh, isMonitoring: isMonitoringPartnership } = usePartnershipMonitor({
    seasonId: seasonId,
    enabled: true, // Always enabled - hook handles null partnership
    pollingInterval: 30000, // Poll every 30 seconds
  });

  // Monitor partnership status (pending requests from both partners)
  const partnershipStatus = usePartnershipStatus({
    partnershipId: partnership?.id || null,
    enabled: !!partnership?.id,
    pollingInterval: 30000, // Poll every 30 seconds
  });

  // Derive error state from partnership being null after loading
  const error = !loading && !partnership ? 'No active partnership found for this season' : null;

  // Check if partnership is INCOMPLETE (partner has left)
  const isIncomplete = partnership?.status === 'INCOMPLETE';

  // Fetch incoming pair requests for INCOMPLETE partnerships
  const {
    requests: incomingRequests,
    loading: loadingRequests,
    refresh: refreshRequests,
  } = useIncomingPairRequests(isIncomplete ? seasonId : null);

  // Fetch incoming season invitations for INCOMPLETE partnerships
  // (These are from players without partnerships who want to join this team)
  const {
    invitations: incomingSeasonInvitations,
    loading: loadingSeasonInvitations,
    refresh: refreshSeasonInvitations,
  } = useIncomingSeasonInvitations(isIncomplete ? seasonId : null);

  // Entry animation effect - triggers when partnership data is loaded
  useEffect(() => {
    if (!loading && partnership && !hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        // Header slides down
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
        // Content slides up
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
  }, [
    loading,
    partnership,
    headerEntryOpacity,
    headerEntryTranslateY,
    contentEntryOpacity,
    contentEntryTranslateY,
  ]);

  const handleDissolve = () => {
    // Refresh partnership status to update UI (disable buttons if request was submitted)
    partnershipStatus.refetch();
    // PartnershipCard handles navigation to find-partner when dissolving,
    // but for Request Change, we just need to refresh to show disabled state
  };

  const handleInvitePartner = () => {
    setShowInvitePartnerSheet(true);
  };

  const handlePlayerSelect = useCallback(async (player: any) => {
    if (!partnership?.id || isInviting) return;

    setIsInviting(true);
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/partnership/${partnership.id}/invite-replacement`,
        {
          method: 'POST',
          body: JSON.stringify({ recipientId: player.id }),
        }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success('Invitation Sent', {
          description: `Waiting for ${player.name} to accept`,
        });
        setShowInvitePartnerSheet(false);
        refresh(); // Refresh partnership data
      } else {
        toast.error('Error', {
          description: responseData.message || 'Failed to send invitation',
        });
      }
    } catch (error) {
      console.error('Error inviting replacement partner:', error);
      toast.error('Error', {
        description: 'Failed to send invitation',
      });
    } finally {
      setIsInviting(false);
    }
  }, [partnership?.id, isInviting, refresh]);

  // Handle accepting an incoming pair request
  const handleAcceptRequest = useCallback(async (requestId: string) => {
    setProcessingRequestId(requestId);
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/request/${requestId}/accept`,
        { method: 'POST' }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success('Partner Added!', {
          description: 'Your team is complete. Ready to play!',
        });
        refresh(); // Refresh partnership data - it should now be ACTIVE
        refreshRequests(); // Refresh incoming requests
      } else {
        toast.error('Error', {
          description: responseData.message || 'Failed to accept request',
        });
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Error', {
        description: 'Failed to accept request',
      });
    } finally {
      setProcessingRequestId(null);
    }
  }, [refresh, refreshRequests]);

  // Handle denying an incoming pair request
  const handleDenyRequest = useCallback((requestId: string, requesterName: string) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the partner request from ${requesterName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequestId(requestId);
            try {
              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/request/${requestId}/deny`,
                { method: 'POST' }
              );

              const responseData = (response as any).data || response;
              if (responseData && responseData.success) {
                toast.success('Request declined');
                refreshRequests();
              } else {
                toast.error('Error', {
                  description: responseData.message || 'Failed to decline request',
                });
              }
            } catch (error) {
              console.error('Error denying request:', error);
              toast.error('Error', {
                description: 'Failed to decline request',
              });
            } finally {
              setProcessingRequestId(null);
            }
          },
        },
      ]
    );
  }, [refreshRequests]);

  // Handle accepting an incoming season invitation
  const handleAcceptSeasonInvitation = useCallback(async (invitationId: string) => {
    setProcessingRequestId(invitationId);
    try {
      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/season/invitation/${invitationId}/accept`,
        { method: 'POST' }
      );

      const responseData = (response as any).data || response;
      if (responseData && responseData.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success('Partner Added!', {
          description: 'Your team is complete. Ready to play!',
        });
        refresh(); // Refresh partnership data - it should now be ACTIVE
        refreshSeasonInvitations(); // Refresh incoming invitations
      } else {
        toast.error('Error', {
          description: responseData.message || 'Failed to accept invitation',
        });
      }
    } catch (error) {
      console.error('Error accepting season invitation:', error);
      toast.error('Error', {
        description: 'Failed to accept invitation',
      });
    } finally {
      setProcessingRequestId(null);
    }
  }, [refresh, refreshSeasonInvitations]);

  // Handle denying an incoming season invitation
  const handleDenySeasonInvitation = useCallback((invitationId: string, senderName: string) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline the partner request from ${senderName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequestId(invitationId);
            try {
              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/season/invitation/${invitationId}/deny`,
                { method: 'POST' }
              );

              const responseData = (response as any).data || response;
              if (responseData && responseData.success) {
                toast.success('Request declined');
                refreshSeasonInvitations();
              } else {
                toast.error('Error', {
                  description: responseData.message || 'Failed to decline request',
                });
              }
            } catch (error) {
              console.error('Error denying season invitation:', error);
              toast.error('Error', {
                description: 'Failed to decline request',
              });
            } finally {
              setProcessingRequestId(null);
            }
          },
        },
      ]
    );
  }, [refreshSeasonInvitations]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#A04DFE', '#602E98']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Partnership</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A04DFE" />
          <Text style={styles.loadingText}>Loading partnership details...</Text>
        </View>
      </View>
    );
  }

  if (error || !partnership) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#A04DFE', '#602E98']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Partnership</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Partnership Not Found</Text>
          <Text style={styles.errorText}>
            {error || 'No active partnership found for this season'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refresh();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <LinearGradient
          colors={['#A04DFE', '#602E98']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Partnership</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: contentEntryOpacity,
            transform: [{ translateY: contentEntryTranslateY }],
          }}
        >
          {/* Status Banner - Shows alerts for pending requests or partner actions */}
          <PartnershipStatusBanner
            hasMyPendingRequest={partnershipStatus.hasMyPendingRequest}
            hasPartnerPendingRequest={partnershipStatus.hasPartnerPendingRequest}
            partnerHasLeft={partnershipStatus.partnerHasLeft}
            isIncomplete={isIncomplete}
          />

        {/* Show incoming pair requests FIRST for INCOMPLETE partnerships */}
        {isIncomplete && incomingRequests.length > 0 && (
          <>
            {incomingRequests.map((request) => (
              <IncomingPairRequestCard
                key={request.id}
                request={request}
                onAccept={handleAcceptRequest}
                onDeny={handleDenyRequest}
                isLoading={processingRequestId === request.id}
              />
            ))}
          </>
        )}

        {/* Show incoming season invitations for INCOMPLETE partnerships */}
        {isIncomplete && incomingSeasonInvitations.length > 0 && (
          <>
            {incomingSeasonInvitations.map((invitation) => (
              <IncomingSeasonInvitationCard
                key={invitation.id}
                invitation={invitation}
                onAccept={handleAcceptSeasonInvitation}
                onDeny={handleDenySeasonInvitation}
                isLoading={processingRequestId === invitation.id}
              />
            ))}
          </>
        )}

        {/* Show different card based on partnership status */}
        {isIncomplete ? (
          /* INCOMPLETE Partnership Card - Partner has left */
          <IncompletePartnershipCard
            partnership={partnership as any}
            currentUserId={session?.user?.id}
            onInvitePartner={handleInvitePartner}
            incomingRequestCount={incomingRequests.length + incomingSeasonInvitations.length}
          />
        ) : (
          /* Active Partnership Card */
          <PartnershipCard
            partnership={partnership}
            currentUserId={session?.user?.id}
            onDissolve={handleDissolve}
            showActions={true}
            hasPartnerPendingRequest={partnershipStatus.hasPartnerPendingRequest}
            hasMyPendingRequest={partnershipStatus.hasMyPendingRequest}
          />
        )}

        {/* Division Information Card - Show for both ACTIVE and INCOMPLETE */}
        {partnership.division && !isIncomplete && (
          <View style={styles.divisionCard}>
            <View style={styles.divisionHeader}>
              <View style={styles.divisionIconContainer}>
                <Ionicons name="trophy" size={18} color="#FE9F4D" />
              </View>
              <Text style={styles.divisionTitle}>Division Assignment</Text>
            </View>
            <Text style={styles.divisionText}>
              You and your partner are assigned to <Text style={styles.divisionName}>{partnership.division.name}</Text>
            </Text>
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Invite Partner Bottom Sheet - For INCOMPLETE partnerships */}
      <InvitePartnerBottomSheet
        visible={showInvitePartnerSheet}
        onClose={() => setShowInvitePartnerSheet(false)}
        seasonId={seasonId}
        onPlayerSelect={handlePlayerSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  retryButton: {
    backgroundColor: '#A04DFE',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  divisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  divisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  divisionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divisionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },
  divisionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontFamily: 'Inter',
  },
  divisionName: {
    fontWeight: '600',
    color: '#374151',
  },
});
