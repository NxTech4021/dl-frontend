import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
  PillTabSwitcher,
  FriendRequestCard,
  SeasonInvitationCard,
  InvitationsEmptyState,
} from '../components';
import { SeasonInvitationsData, FriendRequestsData } from '../types';

interface InvitationsViewProps {
  friendRequests: FriendRequestsData;
  seasonInvitations: SeasonInvitationsData;
  friendActionLoading: string | null;
  invitationActionLoading: string | null;
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  onAcceptInvitation: (invitationId: string) => void;
  onDenyInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
}

export const InvitationsView: React.FC<InvitationsViewProps> = ({
  friendRequests,
  seasonInvitations,
  friendActionLoading,
  invitationActionLoading,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  onAcceptInvitation,
  onDenyInvitation,
  onCancelInvitation,
}) => {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const totalReceived = friendRequests.received.length + seasonInvitations.received.length;
  const totalSent = friendRequests.sent.length + seasonInvitations.sent.length;

  const tabs = [
    { key: 'received', label: 'Received', count: totalReceived },
    { key: 'sent', label: 'Sent', count: totalSent },
  ];

  const receivedFriendRequests = friendRequests.received;
  const receivedSeasonInvitations = seasonInvitations.received;
  const sentFriendRequests = friendRequests.sent;
  const sentSeasonInvitations = seasonInvitations.sent;

  const hasReceivedItems =
    activeTab === 'received' &&
    (receivedFriendRequests.length > 0 || receivedSeasonInvitations.length > 0);
  const hasSentItems =
    activeTab === 'sent' &&
    (sentFriendRequests.length > 0 || sentSeasonInvitations.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <PillTabSwitcher
          activeTab={activeTab}
          onTabChange={(tab: string) => setActiveTab(tab as 'received' | 'sent')}
          tabs={tabs}
        />
      </View>

      {!hasReceivedItems && !hasSentItems ? (
        <InvitationsEmptyState type={activeTab} />
      ) : (
        <View style={styles.content}>
          {activeTab === 'received' ? (
            <>
              {/* Friend Requests */}
              {receivedFriendRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  {receivedFriendRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="received"
                      actionLoading={friendActionLoading}
                      onAccept={onAcceptFriendRequest}
                      onReject={onRejectFriendRequest}
                    />
                  ))}
                </View>
              )}

              {/* Season Invitations */}
              {receivedSeasonInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Season Invitations</Text>
                  {receivedSeasonInvitations.map((invitation) => (
                    <SeasonInvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      type="received"
                      actionLoading={invitationActionLoading}
                      onAccept={onAcceptInvitation}
                      onDeny={onDenyInvitation}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Sent Friend Requests */}
              {sentFriendRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Friend Requests</Text>
                  {sentFriendRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      type="sent"
                      actionLoading={friendActionLoading}
                      onCancel={onRejectFriendRequest}
                    />
                  ))}
                </View>
              )}

              {/* Sent Season Invitations */}
              {sentSeasonInvitations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Season Invitations</Text>
                  {sentSeasonInvitations.map((invitation) => (
                    <SeasonInvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      type="sent"
                      actionLoading={invitationActionLoading}
                      onCancel={onCancelInvitation}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  content: {
    paddingTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: -0.2,
  },
});
