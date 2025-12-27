import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface Friend {
  friendshipId: string;
  friend: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
  friendsSince: string;
}

interface ChoosePartnerBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  friends: Friend[];
  currentUserId: string;
  seasonId: string;
  isLoading?: boolean;
  onSendInvitation: (friendshipId: string, friendId: string) => Promise<void>;
}

export const ChoosePartnerBottomSheet: React.FC<ChoosePartnerBottomSheetProps> = ({
  bottomSheetRef,
  friends,
  currentUserId,
  seasonId,
  isLoading = false,
  onSendInvitation,
}) => {
  const [sendingId, setSendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    console.log('🔵 ChoosePartnerBottomSheet received props:', {
      friends: friends.length,
      currentUserId,
      seasonId,
      isLoading,
      friendsData: friends
    });
  }, [friends, currentUserId, seasonId, isLoading]);

  const handleSendInvitation = useCallback(async (friendshipId: string, friendId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSendingId(friendshipId);
      await onSendInvitation(friendshipId, friendId);
    } catch (error) {
      console.error('Error sending season invitation:', error);
    } finally {
      setSendingId(null);
    }
  }, [onSendInvitation]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isSending = sendingId === item.friendshipId;

    return (
      <View style={styles.partnershipItem}>
        <View style={styles.partnerInfo}>
          {item.friend.image ? (
            <Image source={{ uri: item.friend.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {item.friend.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.partnerDetails}>
            <Text style={styles.partnerName}>{item.friend.name}</Text>
            <View style={styles.partnerMeta}>
              <Text style={styles.locationText}>
                Friends since {new Date(item.friendsSince).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.inviteButton, isSending && styles.inviteButtonDisabled]}
          onPress={() => handleSendInvitation(item.friendshipId, item.friend.id)}
          disabled={isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.inviteButtonText}>Send Invitation</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['75%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose a Partner</Text>
          <Text style={styles.subtitle}>
            Select a friend to invite to this season
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FEA04D" />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#BABABA" />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Go to Community → All Players to add friends first
            </Text>
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.friendshipId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handleIndicator: {
    backgroundColor: '#BABABA',
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: isSmallScreen ? 20 : isTablet ? 26 : 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isSmallScreen ? 13 : isTablet ? 16 : 14,
    fontWeight: '400',
    color: '#666666',
    fontFamily: 'Inter',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Inter',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    fontWeight: '400',
    color: '#999999',
    fontFamily: 'Inter',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  partnershipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: isSmallScreen ? 48 : isTablet ? 60 : 52,
    height: isSmallScreen ? 48 : isTablet ? 60 : 52,
    borderRadius: isSmallScreen ? 24 : isTablet ? 30 : 26,
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  partnerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  partnerName: {
    fontSize: isSmallScreen ? 15 : isTablet ? 18 : 16,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    marginBottom: 4,
  },
  partnerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dmrBadge: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dmrText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'Inter',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEA04D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minWidth: 140,
    justifyContent: 'center',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter',
  },
});
