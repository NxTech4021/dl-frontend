import { getBackendBaseURL } from '@/config/network';
import { authClient, useSession } from '@/lib/auth-client';
import { chatLogger } from '@/utils/logger';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// User API response type from getAvailableUsers endpoint
interface UserApiResponse {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
}

interface FetchResponse {
  data?: {
    success: boolean;
    data: UserApiResponse[];
    count: number;
  };
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
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Player[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const insets = useSafeAreaInsets();

  const snapPoints = useMemo(() => ['90%'], []);

  // Present/dismiss sheet based on visibility
  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            bottomSheetModalRef.current?.present();
          }, 50);
        });
      } else {
        bottomSheetModalRef.current?.present();
      }
      fetchUsers();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) ||
          user.username?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const backendUrl = getBackendBaseURL();

      // Fetch all available users (excludes admins and existing DM partners)
      const response = await authClient.$fetch(
        `${backendUrl}/api/chat/threads/users/available/${session.user.id}`,
        { method: 'GET' }
      );

      const typedResponse = response as FetchResponse | null;
      if (typedResponse?.data?.data) {
        const usersData = typedResponse.data.data;

        // Transform users to player format
        const usersList: Player[] = usersData.map((item: UserApiResponse) => ({
          id: item.id,
          name: item.name || 'Unknown',
          username: item.username || undefined,
          image: item.image,
        }));

        setUsers(usersList);
        setFilteredUsers(usersList);
      }
    } catch (error) {
      chatLogger.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = useCallback((user: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectUser(user.id, user.name);
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
        pressBehavior="close"
      />
    ),
    []
  );

  const renderUserItem = useCallback(({ item }: { item: Player }) => (
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
        onPress={() => handleSelectUser(item)}
      >
        <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
        <Text style={styles.chatButtonText}>Chat</Text>
      </Pressable>
    </View>
  ), [handleSelectUser]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={56} color="#BABABA" />
      <Text style={styles.emptyText}>
        {searchQuery.trim() ? 'No users found' : 'No users available'}
      </Text>
      <Text style={styles.emptySubtext}>
        {searchQuery.trim()
          ? 'Try adjusting your search'
          : 'You have already messaged all available users'}
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
            placeholder="Search users"
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
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      enablePanDownToClose
      enableDismissOnClose
      enableDynamicSizing={false}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {renderHeader()}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FEA04D" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item: Player) => item.id}
            contentContainerStyle={[
              filteredUsers.length === 0
                ? styles.emptyListContainer
                : styles.listContent,
              { paddingBottom: 20 + insets.bottom },
            ]}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
          />
        )}
      </BottomSheetView>
    </BottomSheetModal>
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
