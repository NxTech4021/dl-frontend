import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Text, View, StyleSheet, Dimensions, Platform, Image, TouchableOpacity, TextInput, StatusBar, Modal, Pressable } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive design helpers
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const isTablet = width > 768;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { NavBar } from '@/shared/components/layout';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface ProfileData {
  image?: string;
  name?: string;
}

interface Player {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string;
  image: string | null;
  sports: string[];
  skillRatings?: any;
  bio?: string | null;
  area?: string | null;
  gender?: string | null;
}

interface Favorite {
  id: string;
  userId: string;
  favoritedId: string;
  createdAt: string;
  favorited: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
  };
}

const SPORT_COLORS: { [key: string]: string } = {
  Tennis: '#A2E047',
  tennis: '#A2E047',
  Pickleball: '#A04DFE',
  pickleball: '#A04DFE',
  Padel: '#4DABFE',
  padel: '#4DABFE',
};

export default function ConnectScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'favorites'>('all');
  const [players, setPlayers] = useState<Player[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoritedPlayerIds, setFavoritedPlayerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  // Use safe area insets for proper status bar handling across platforms
  const STATUS_BAR_HEIGHT = insets.top;

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedPlayers = viewMode === 'favorites'
    ? filteredPlayers.filter(player => favoritedPlayerIds.includes(player.id))
    : filteredPlayers;

  const fetchProfileData = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        console.log('ConnectScreen: No session user ID available for profile data');
        return;
      }

      const backendUrl = getBackendBaseURL();
      console.log('ConnectScreen: Fetching profile data from:', `${backendUrl}/api/player/profile/me`);

      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/me`, {
        method: 'GET',
      });

      console.log('ConnectScreen: Profile API response:', authResponse);

      if (authResponse && (authResponse as any).data && (authResponse as any).data.data) {
        console.log('ConnectScreen: Setting profile data:', (authResponse as any).data.data);
        setProfileData((authResponse as any).data.data);
      } else if (authResponse && (authResponse as any).data) {
        console.log('ConnectScreen: Setting profile data (direct):', (authResponse as any).data);
        setProfileData((authResponse as any).data);
      } else {
        console.error('ConnectScreen: No profile data received from authClient');
      }
    } catch (error) {
      console.error('ConnectScreen: Error fetching profile data:', error);
    }
  }, [session?.user?.id]);

  const fetchPlayers = useCallback(async (query: string = '') => {
    try {
      if (!session?.user?.id) {
        console.log('ConnectScreen: No session user ID available for searching players');
        return;
      }

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();
      const searchParam = query.trim().length >= 2 ? `?q=${encodeURIComponent(query)}` : '';

      console.log('ConnectScreen: Fetching players from:', `${backendUrl}/api/player/search${searchParam}`);

      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/search${searchParam}`, {
        method: 'GET',
      });

      console.log('ConnectScreen: Search API response:', authResponse);

      if (authResponse && (authResponse as any).data) {
        const playersData = (authResponse as any).data.data || (authResponse as any).data;
        console.log('ConnectScreen: Setting players data:', playersData);
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('ConnectScreen: Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const fetchFavorites = useCallback(async () => {
    try {
      if (!session?.user?.id) {
        console.log('ConnectScreen: No session user ID available for favorites');
        return;
      }

      const backendUrl = getBackendBaseURL();
      console.log('ConnectScreen: Fetching favorites from:', `${backendUrl}/api/player/favorites`);

      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/favorites`, {
        method: 'GET',
      });

      console.log('ConnectScreen: Favorites API response:', authResponse);

      if (authResponse && (authResponse as any).data) {
        const favoritesData = (authResponse as any).data.data || (authResponse as any).data;
        console.log('ConnectScreen: Setting favorites data:', favoritesData);
        setFavorites(favoritesData);
        setFavoritedPlayerIds(favoritesData.map((fav: Favorite) => fav.favoritedId));
      }
    } catch (error) {
      console.error('ConnectScreen: Error fetching favorites:', error);
    }
  }, [session?.user?.id]);

  const toggleFavorite = useCallback(async (playerId: string) => {
    try {
      if (!session?.user?.id) {
        console.log('ConnectScreen: No session user ID available for toggling favorite');
        return;
      }

      const backendUrl = getBackendBaseURL();
      const isFavorited = favoritedPlayerIds.includes(playerId);
      const method = isFavorited ? 'DELETE' : 'POST';
      const endpoint = `${backendUrl}/api/player/favorites/${playerId}`;

      console.log(`ConnectScreen: ${isFavorited ? 'Removing' : 'Adding'} favorite:`, endpoint);

      const authResponse = await authClient.$fetch(endpoint, {
        method,
      });

      console.log('ConnectScreen: Toggle favorite API response:', authResponse);

      // Refresh favorites list
      await fetchFavorites();
    } catch (error) {
      console.error('ConnectScreen: Error toggling favorite:', error);
    }
  }, [session?.user?.id, favoritedPlayerIds, fetchFavorites]);

  // Fetch profile data when component mounts
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfileData();
    }
  }, [session?.user?.id, fetchProfileData]);

  // Fetch initial players and favorites
  useEffect(() => {
    if (session?.user?.id) {
      fetchPlayers();
      fetchFavorites();
    }
  }, [session?.user?.id, fetchPlayers, fetchFavorites]);

  // Handle search query changes with debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim().length >= 2) {
      const timeout = setTimeout(() => {
        fetchPlayers(searchQuery);
      }, 500); // Debounce for 500ms
      setSearchTimeout(timeout);
    } else if (searchQuery.trim().length === 0) {
      fetchPlayers();
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const handleTabPress = useCallback((tabIndex: number) => {
    console.log(`ConnectScreen: Setting activeTab to ${tabIndex}`);
    setActiveTab(tabIndex);
    console.log(`Tab ${tabIndex} pressed - ${['Connect', 'Friendly', 'Leagues', 'My Games', 'Chat'][tabIndex]}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Navigate to user-dashboard when Leagues tab (index 2) is pressed
    if (tabIndex === 2) {
      router.push('/user-dashboard');
    }
  }, []);

  const handlePlayerPress = useCallback((player: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlayer(player);
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setTimeout(() => setSelectedPlayer(null), 300);
  }, []);

  const handleChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Chat with:', selectedPlayer?.name);
    closeModal();
  }, [selectedPlayer, closeModal]);

  const handleFavorite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedPlayer?.id) {
      await toggleFavorite(selectedPlayer.id);
      console.log('Toggled favorite for:', selectedPlayer?.name);
    }
    closeModal();
  }, [selectedPlayer, closeModal, toggleFavorite]);

  const handleViewProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('View profile:', selectedPlayer?.id);
    closeModal();
    router.push(`/player-profile/${selectedPlayer?.id}` as any);
  }, [selectedPlayer, closeModal]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FDEDE0', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />

      <View style={[styles.contentContainer, { paddingTop: STATUS_BAR_HEIGHT }]}>
        <View style={styles.headerSection}>
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>DEUCE</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.profilePicture}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/profile');
                }}
              >
                {(profileData?.image || session?.user?.image) ? (
                  <Image
                    source={{ uri: profileData?.image || session?.user?.image || '' }}
                    style={styles.profileImage}
                    onError={() => {
                      console.log('Profile image failed to load:', profileData?.image || session?.user?.image);
                    }}
                  />
                ) : (
                  <View style={styles.defaultAvatarContainer}>
                    <Text style={styles.defaultAvatarText}>
                      {(profileData?.name || session?.user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(60, 60, 67, 0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="rgba(60, 60, 67, 0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'favorites' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('favorites');
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'favorites' && styles.tabButtonTextActive]}>
              Favorites ({favoritedPlayerIds.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, viewMode === 'all' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('all');
            }}
          >
            <Text style={[styles.tabButtonText, viewMode === 'all' && styles.tabButtonTextActive]}>
              All Players
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading players...</Text>
            </View>
          ) : displayedPlayers.length === 0 && viewMode === 'favorites' ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={64} color="#BABABA" />
              <Text style={styles.emptyStateText}>No favorites yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the heart icon on any player to add them to favorites
              </Text>
            </View>
          ) : displayedPlayers.length === 0 && searchQuery.trim().length >= 2 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#BABABA" />
              <Text style={styles.emptyStateText}>No players found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try adjusting your search query
              </Text>
            </View>
          ) : (
            displayedPlayers.map((player, index) => (
              <React.Fragment key={player.id}>
                <TouchableOpacity
                  style={styles.connectionItem}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                  {player.image ? (
                    <Image
                      source={{ uri: player.image }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.defaultAvatarContainer]}>
                      <Text style={styles.defaultAvatarText}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.connectionContent}>
                    <Text style={styles.connectionName}>{player.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#BABABA" />
                </TouchableOpacity>
                {index < displayedPlayers.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))
          )}
        </ScrollView>
      </View>

      <NavBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Player Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {selectedPlayer && (
              <>
                {/* Close Button */}
                <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>

                {/* Player Avatar */}
                <View style={styles.modalAvatarSection}>
                  {selectedPlayer.image ? (
                    <Image
                      source={{ uri: selectedPlayer.image }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={[styles.modalAvatar, styles.defaultAvatarContainer]}>
                      <Text style={[styles.defaultAvatarText, { fontSize: 40 }]}>
                        {selectedPlayer.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Player Name */}
                <Text style={styles.modalPlayerName}>{selectedPlayer.name}</Text>

                {/* Sport Pills */}
                {selectedPlayer.sports && selectedPlayer.sports.length > 0 && (
                  <View style={styles.modalSportPills}>
                    {selectedPlayer.sports.map((sport, index) => (
                      <View
                        key={index}
                        style={[
                          styles.modalSportPill,
                          { backgroundColor: SPORT_COLORS[sport] || '#A2E047' }
                        ]}
                      >
                        <Text style={styles.modalSportPillText}>{sport}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity style={styles.modalActionButton} onPress={handleChat}>
                    <Ionicons name="chatbubble" size={20} color="#FEA04D" />
                    <Text style={styles.modalActionButtonText}>Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalActionButton} onPress={handleFavorite}>
                    <Ionicons
                      name={favoritedPlayerIds.includes(selectedPlayer.id) ? "heart" : "heart-outline"}
                      size={20}
                      color="#FEA04D"
                    />
                    <Text style={styles.modalActionButtonText}>
                      {favoritedPlayerIds.includes(selectedPlayer.id) ? "Unfavorite" : "Favorite"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalActionButton} onPress={handleViewProfile}>
                    <Ionicons name="person" size={20} color="#FEA04D" />
                    <Text style={styles.modalActionButtonText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
  headerSection: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: isSmallScreen ? 16 : 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: isSmallScreen ? 20 : isTablet ? 28 : 24,
    lineHeight: isSmallScreen ? 20 : isTablet ? 28 : 24,
    color: '#FE9F4D',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profilePicture: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
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
  profileImage: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
  },
  defaultAvatarContainer: {
    width: isSmallScreen ? 36 : isTablet ? 48 : 40,
    height: isSmallScreen ? 36 : isTablet ? 48 : 40,
    borderRadius: isSmallScreen ? 18 : isTablet ? 24 : 20,
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  searchSection: {
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    paddingBottom: 16,
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 24 : 16,
    paddingBottom: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: isSmallScreen ? 8 : isTablet ? 12 : 10,
    paddingHorizontal: isSmallScreen ? 12 : isTablet ? 20 : 16,
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
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#666666',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 6 : isTablet ? 10 : 8,
    height: isSmallScreen ? 32 : isTablet ? 40 : 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallScreen ? 15 : isTablet ? 19 : 17,
    lineHeight: isSmallScreen ? 20 : isTablet ? 24 : 22,
    letterSpacing: -0.408,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '400',
    padding: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : isTablet ? 32 : 20,
    paddingBottom: 120,
  },
  contentPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : isTablet ? 16 : 12,
  },
  avatar: {
    width: isSmallScreen ? 40 : isTablet ? 56 : 48,
    height: isSmallScreen ? 40 : isTablet ? 56 : 48,
    borderRadius: isSmallScreen ? 20 : isTablet ? 28 : 24,
  },
  connectionContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  connectionName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    letterSpacing: -0.3,
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginLeft: isSmallScreen ? 52 : isTablet ? 68 : 60,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 20 : isTablet ? 28 : 24,
    width: '90%',
    maxWidth: isTablet ? 420 : 380,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
  },
  modalAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: isSmallScreen ? 80 : isTablet ? 120 : 100,
    height: isSmallScreen ? 80 : isTablet ? 120 : 100,
    borderRadius: isSmallScreen ? 40 : isTablet ? 60 : 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalPlayerName: {
    fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'Inter',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  modalSportPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#A2E047',
    alignItems: 'center',
  },
  modalSportPillText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 9 : isTablet ? 12 : 10,
    fontFamily: 'Inter',
    fontWeight: '600',
    opacity: 0.95,
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalActionButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 10 : isTablet ? 13 : 11,
    color: '#6b7280',
    marginTop: 4,
  },
});
