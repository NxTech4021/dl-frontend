import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface PlayerInfo {
  id: string;
  name: string;
  username: string;
  displayUsername: string | null;
  image: string | null;
}

interface SeasonInfo {
  id: string;
  name: string;
  sport: string;
  registrationStart: Date;
  registrationEnd: Date;
}

interface PairRequest {
  id: string;
  requesterId: string;
  recipientId: string;
  seasonId: string;
  message: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DENIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  respondedAt: string | null;
  expiresAt: string;
  requester?: PlayerInfo;
  recipient?: PlayerInfo;
  season: SeasonInfo;
}

interface PairRequestsData {
  sent: PairRequest[];
  received: PairRequest[];
}

const STATUS_COLORS = {
  PENDING: '#FEA04D',
  ACCEPTED: '#4CAF50',
  DENIED: '#F44336',
  EXPIRED: '#9E9E9E',
  CANCELLED: '#9E9E9E',
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DENIED: 'Denied',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export default function PairRequestsScreen() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [requests, setRequests] = useState<PairRequestsData>({ sent: [], received: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async (showLoader = true) => {
    try {
      if (!session?.user?.id) return;

      if (showLoader) setIsLoading(true);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/requests`, {
        method: 'GET',
      });

      console.log('Pair requests response:', response);

      if (response && (response as any).data) {
        const requestsData = (response as any).data.data || (response as any).data;
        setRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching pair requests:', error);
      toast.error('Error', {
        description: 'Failed to load pair requests',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchRequests();
    }
  }, [session?.user?.id, fetchRequests]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRequests(false);
  };

  const handleAccept = async (requestId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActionLoading(requestId);

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/request/${requestId}/accept`,
        {
          method: 'POST',
        }
      );

      if (response && (response as any).success) {
        toast.success('Success', {
          description: 'Pair request accepted! Waiting for payment...',
        });
        // Refresh the list
        await fetchRequests(false);
      } else {
        toast.error('Error', {
          description: (response as any).message || 'Failed to accept request',
        });
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Error', {
        description: 'Failed to accept pair request',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = (requestId: string, requesterName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Deny Pair Request',
      `Are you sure you want to deny the pair request from ${requesterName}? They will not be notified.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(requestId);

              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/request/${requestId}/deny`,
                {
                  method: 'POST',
                }
              );

              if (response && (response as any).success) {
                toast.success('Request denied');
                await fetchRequests(false);
              } else {
                toast.error('Error', {
                  description: (response as any).message || 'Failed to deny request',
                });
              }
            } catch (error) {
              console.error('Error denying request:', error);
              toast.error('Error', {
                description: 'Failed to deny pair request',
              });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = (requestId: string, recipientName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Alert.alert(
      'Cancel Pair Request',
      `Are you sure you want to cancel your request to ${recipientName}?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(requestId);

              const backendUrl = getBackendBaseURL();
              const response = await authClient.$fetch(
                `${backendUrl}/api/pairing/request/${requestId}`,
                {
                  method: 'DELETE',
                }
              );

              if (response && (response as any).success) {
                toast.success('Request cancelled');
                await fetchRequests(false);
              } else {
                toast.error('Error', {
                  description: (response as any).message || 'Failed to cancel request',
                });
              }
            } catch (error) {
              console.error('Error cancelling request:', error);
              toast.error('Error', {
                description: 'Failed to cancel pair request',
              });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderRequestCard = (request: PairRequest, isReceived: boolean) => {
    const player = isReceived ? request.requester : request.recipient;
    if (!player) return null;

    const isPending = request.status === 'PENDING';
    const isActionLoading = actionLoading === request.id;

    return (
      <View key={request.id} style={styles.requestCard}>
        <View style={styles.requestHeader}>
          {player.image ? (
            <Image source={{ uri: player.image }} style={styles.playerAvatar} />
          ) : (
            <View style={[styles.playerAvatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {player.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.requestInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            {player.displayUsername && (
              <Text style={styles.playerUsername}>@{player.displayUsername}</Text>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[request.status] },
            ]}
          >
            <Text style={styles.statusText}>{STATUS_LABELS[request.status]}</Text>
          </View>
        </View>

        <View style={styles.seasonInfo}>
          <Ionicons name="trophy" size={14} color="#666666" />
          <Text style={styles.seasonText}>{request.season.name}</Text>
        </View>

        {request.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message:</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>
        )}

        <View style={styles.requestFooter}>
          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>{getTimeAgo(request.createdAt)}</Text>
            {isPending && (
              <Text style={styles.expiryText}>{getTimeRemaining(request.expiresAt)}</Text>
            )}
          </View>

          {isPending && (
            <View style={styles.actionButtons}>
              {isReceived ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.denyButton]}
                    onPress={() => handleDeny(request.id, player.name)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color="#F44336" />
                    ) : (
                      <Text style={styles.denyButtonText}>Deny</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(request.id)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancel(request.id, player.name)}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <ActivityIndicator size="small" color="#666666" />
                  ) : (
                    <Text style={styles.cancelButtonText}>Cancel Request</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const displayedRequests = activeTab === 'received' ? requests.received : requests.sent;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDEDE0', '#FFFFFF']}
        locations={[0, 0.3]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={28} color="#FEA04D" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pair Requests</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'received' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('received');
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'received' && styles.tabButtonTextActive]}>
            Received ({requests.received.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sent' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('sent');
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'sent' && styles.tabButtonTextActive]}>
            Sent ({requests.sent.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#FEA04D" />
            <Text style={styles.emptyStateText}>Loading requests...</Text>
          </View>
        ) : displayedRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#BABABA" />
            <Text style={styles.emptyStateText}>
              No {activeTab === 'received' ? 'received' : 'sent'} requests
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'received'
                ? 'Pair requests you receive will appear here'
                : 'Find a partner to send a pair request'}
            </Text>
          </View>
        ) : (
          displayedRequests.map((request) => renderRequestCard(request, activeTab === 'received'))
        )}
      </ScrollView>
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
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 16 : 18,
    color: '#1a1a1a',
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingBottom: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: isSmallScreen ? 8 : 10,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FEA04D',
  },
  tabButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666666',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 16 : 18,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1a1a1a',
  },
  playerUsername: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 11,
    color: '#FFFFFF',
  },
  seasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  seasonText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: isSmallScreen ? 12 : 13,
    color: '#666666',
  },
  messageContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  messageLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  messageText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#999999',
  },
  expiryText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 12,
    color: '#FEA04D',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  denyButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#F44336',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  acceptButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  cancelButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 13,
    color: '#666666',
  },
});
