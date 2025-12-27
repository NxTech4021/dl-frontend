import { getBackendBaseURL } from '@/config/network';
import { authClient, useSession } from '@/lib/auth-client';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Friend API response type
interface FriendApiResponse {
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

interface FetchResponse {
  data?: {
    data?: FriendApiResponse[];
  } | FriendApiResponse[];
}

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

interface Player {
  id: string;
  name: string;
  username?: string;
  image?: string | null;
}

interface NewMessageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectUser: (userId: string, userName: string) => void;
}

export const NewMessageBottomSheet: React.FC<NewMessageBottomSheetProps> = ({
  visible,
  onClose,
  onSelectUser,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<Player[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const snapPoints = useMemo(() => ['90%'], []);

  // Fetch friends when component mounts (it only mounts when visible)
  useEffect(() => {
    fetchFriends();
  }, []);

  // Filter friends based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = friends.filter(
        (friend) =>
          friend.name?.toLowerCase().includes(query) ||
          friend.username?.toLowerCase().includes(query)
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);

  const fetchFriends = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const backendUrl = getBackendBaseURL();

      // Fetch friends using the pairing/friends endpoint
      const response = await authClient.$fetch(
        `${backendUrl}/api/pairing/friends`,
        { method: 'GET' }
      );

      const typedResponse = response as FetchResponse | null;
      if (typedResponse?.data) {
        const responseData = typedResponse.data;
        const friendsData = Array.isArray(responseData)
          ? responseData
          : (responseData as { data?: FriendApiResponse[] }).data || [];

        // Transform friends to player format
        const friendsList: Player[] = friendsData.map((item: FriendApiResponse) => ({
          id: item.friend.id,
          name: item.friend.name || 'Unknown',
          username: item.friend.username || item.friend.displayUsername || undefined,
          image: item.friend.image,
        }));

        setFriends(friendsList);
        setFilteredFriends(friendsList);
      }
    } catch (error) {
      chatLogger.error('Error fetching friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFriend = useCallback((friend: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectUser(friend.id, friend.name);
  }, [onSelectUser]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
      setSearchQuery('');
    }
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const renderFriendItem = useCallback(({ item }: { item: Player }) => (
    <View style={styles.playerItem}>
      <View style={styles.playerLeft}>
        <View style={styles.avatarContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {item.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          {item.username && (
            <Text style={styles.playerUsername}>@{item.username}</Text>
          )}
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.chatButton, pressed && { opacity: 0.7 }]}
        onPress={() => handleSelectFriend(item)}
      >
        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
        <Text style={styles.chatButtonText}>Chat</Text>
      </Pressable>
    </View>
  ), [handleSelectFriend]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={56} color="#BABABA" />
      <Text style={styles.emptyText}>
        {searchQuery.trim() ? 'No friends found' : 'No friends yet'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery.trim()
          ? 'Try adjusting your search'
          : 'Add friends from the Community tab to message them'}
      </Text>
    </View>
  ), [searchQuery]);

  const renderHeader = useCallback(() => (
    <View style={styles.headerSection}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>New Message</Text>
        <View style={styles.cancelButton} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <BottomSheetTextInput
            style={styles.searchInput}
            placeholder="Search friends"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  ), [searchQuery, onClose]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      {renderHeader()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FEA04D" />
          <Text style={styles.loadingText}>Loading friends...</Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={filteredFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item: Player) => item.id}
          contentContainerStyle={
            filteredFriends.length === 0
              ? styles.emptyListContainer
              : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerSection: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    width: 60,
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    paddingVertical: isSmallScreen ? 6 : isTablet ? 10 : 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#111827',
    paddingVertical: Platform.OS === 'android' ? 8 : 4,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 4,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  emptyListContainer: {
    flex: 1,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
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
    fontSize: 18,
    fontWeight: '600',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  playerUsername: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEA04D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
