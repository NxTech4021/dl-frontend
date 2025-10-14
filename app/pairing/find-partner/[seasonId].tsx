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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';
import { PairRequestModal } from '@/src/features/pairing/components';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

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
  favoritedId: string;
  favorited: {
    id: string;
    name: string;
    username: string;
    displayUsername: string | null;
    image: string | null;
    sports?: string[];
    skillRatings?: any;
  };
}

interface SeasonData {
  id: string;
  name: string;
  sportType: string;
  seasonType: string;
  league?: {
    name: string;
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

export default function FindPartnerScreen() {
  const { seasonId } = useLocalSearchParams();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [seasonData, setSeasonData] = useState<SeasonData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const fetchSeasonData = useCallback(async () => {
    try {
      if (!seasonId) return;

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/season/${seasonId}`, {
        method: 'GET',
      });

      if (response && (response as any).data) {
        setSeasonData((response as any).data);
      }
    } catch (error) {
      console.error('Error fetching season data:', error);
      toast.error('Error', {
        description: 'Failed to load season information',
      });
    }
  }, [seasonId]);

  const fetchAvailablePlayers = useCallback(async () => {
    try {
      if (!session?.user?.id || !seasonId) return;

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();

      console.log('FindPartner: Fetching available players for season:', seasonId);

      const response = await authClient.$fetch(`${backendUrl}/api/player/discover/${seasonId}`, {
        method: 'GET',
      });

      console.log('FindPartner: Available players response:', response);

      if (response && (response as any).data) {
        const playersData = (response as any).data.data || (response as any).data;
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error fetching available players:', error);
      toast.error('Error', {
        description: 'Failed to load available players',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, seasonId]);

  const fetchFavorites = useCallback(async () => {
    try {
      if (!session?.user?.id) return;

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/player/favorites`, {
        method: 'GET',
      });

      if (response && (response as any).data) {
        const favoritesData = (response as any).data.data || (response as any).data;
        setFavorites(favoritesData);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [session?.user?.id]);

  const searchPlayers = useCallback(async (query: string) => {
    try {
      if (!session?.user?.id || query.trim().length < 2) {
        fetchAvailablePlayers();
        return;
      }

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();

      const response = await authClient.$fetch(
        `${backendUrl}/api/player/search?q=${encodeURIComponent(query)}`,
        { method: 'GET' }
      );

      if (response && (response as any).data) {
        const playersData = (response as any).data.data || (response as any).data;
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error searching players:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, fetchAvailablePlayers]);

  useEffect(() => {
    if (session?.user?.id && seasonId) {
      fetchSeasonData();
      fetchAvailablePlayers();
      fetchFavorites();
    }
  }, [session?.user?.id, seasonId, fetchSeasonData, fetchAvailablePlayers, fetchFavorites]);

  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (activeTab === 'search') {
      if (searchQuery.trim().length >= 2) {
        const timeout = setTimeout(() => {
          searchPlayers(searchQuery);
        }, 500);
        setSearchTimeout(timeout);
      } else if (searchQuery.trim().length === 0) {
        fetchAvailablePlayers();
      }
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery, activeTab]);

  const handlePlayerPress = (player: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlayer(player);
    setModalVisible(true);
  };

  const handleSendRequest = async (message: string) => {
    try {
      if (!selectedPlayer || !seasonId) return;

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/request`, {
        method: 'POST',
        body: JSON.stringify({
          recipientId: selectedPlayer.id,
          seasonId,
          message: message || undefined,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response && (response as any).success) {
        toast.success('Success', {
          description: 'Pair request sent successfully!',
        });
        router.push('/pairing/requests');
      } else {
        toast.error('Error', {
          description: (response as any).message || 'Failed to send pair request',
        });
      }
    } catch (error) {
      console.error('Error sending pair request:', error);
      toast.error('Error', {
        description: 'Failed to send pair request',
      });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const displayedPlayers = activeTab === 'search'
    ? players
    : favorites.map(fav => ({
        ...fav.favorited,
        sports: fav.favorited.sports || [],
        skillRatings: fav.favorited.skillRatings || {},
      } as Player));

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Find Partner</Text>
          {seasonData && (
            <Text style={styles.headerSubtitle}>{seasonData.name}</Text>
          )}
        </View>
        <View style={styles.headerButton} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'search' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('search');
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'search' && styles.tabButtonTextActive]}>
            Search Players
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('favorites');
          }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
            Favorites ({favorites.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar (only show in search tab) */}
      {activeTab === 'search' && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="rgba(60, 60, 67, 0.6)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or username"
              placeholderTextColor="rgba(60, 60, 67, 0.6)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#FEA04D" />
            <Text style={styles.emptyStateText}>Loading players...</Text>
          </View>
        ) : displayedPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'favorites' ? "heart-outline" : "search-outline"}
              size={64}
              color="#BABABA"
            />
            <Text style={styles.emptyStateText}>
              {activeTab === 'favorites' ? 'No favorite players' : 'No players found'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'favorites'
                ? 'Add players to favorites to see them here'
                : 'Try adjusting your search'}
            </Text>
          </View>
        ) : (
          displayedPlayers.map((player, index) => (
            <React.Fragment key={player.id}>
              <TouchableOpacity
                style={styles.playerCard}
                onPress={() => handlePlayerPress(player)}
                activeOpacity={0.7}
              >
                {player.image ? (
                  <Image source={{ uri: player.image }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.defaultAvatar]}>
                    <Text style={styles.defaultAvatarText}>
                      {player.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {player.displayUsername && (
                    <Text style={styles.playerUsername}>@{player.displayUsername}</Text>
                  )}
                  {player.sports && player.sports.length > 0 && (
                    <View style={styles.sportPills}>
                      {player.sports.slice(0, 2).map((sport, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.sportPill,
                            { backgroundColor: SPORT_COLORS[sport] || '#A2E047' }
                          ]}
                        >
                          <Text style={styles.sportPillText}>{sport}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#BABABA" />
              </TouchableOpacity>
              {index < displayedPlayers.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))
        )}
      </ScrollView>

      {/* Pair Request Modal */}
      <PairRequestModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSend={handleSendRequest}
        recipientName={selectedPlayer?.name || ''}
        seasonName={seasonData?.name || ''}
        leagueName={seasonData?.league?.name}
      />
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 16 : 18,
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666666',
    marginTop: 2,
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingBottom: 12,
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
  searchSection: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isSmallScreen ? 6 : 8,
    height: isSmallScreen ? 32 : 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
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
    fontSize: isSmallScreen ? 15 : 17,
    lineHeight: isSmallScreen ? 20 : 22,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'System',
    fontWeight: '400',
    padding: 0,
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
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 10 : 12,
  },
  avatar: {
    width: isSmallScreen ? 50 : 56,
    height: isSmallScreen ? 50 : 56,
    borderRadius: isSmallScreen ? 25 : 28,
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
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
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666666',
    marginTop: 2,
  },
  sportPills: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  sportPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sportPillText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 10,
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E2E2',
    marginLeft: isSmallScreen ? 62 : 68,
  },
});
