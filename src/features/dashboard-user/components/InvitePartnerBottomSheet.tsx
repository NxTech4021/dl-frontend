import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetView,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/src/config/network';
import { PlayerInviteListItem } from './PlayerInviteListItem';
import { toast } from 'sonner-native';
import EmptyPartnerIcon from '@/assets/icons/empty_partner.svg';
import { useVideoPlayer, VideoView } from 'expo-video';

interface Player {
  id: string;
  name: string;
  username?: string;
  displayUsername?: string;
  image: string | null;
  skillRatings?: any;
  bio?: string | null;
  area?: string | null;
  gender?: 'MALE' | 'FEMALE' | null;
  questionnaireStatus?: {
    hasSelectedSport: boolean;
    hasCompletedQuestionnaire: boolean;
    startedAt: string | null;
    completedAt: string | null;
  };
  hasIncompletePartnership?: boolean; // Player is captain of an INCOMPLETE partnership
}

interface InvitePartnerBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  seasonId: string;
  season?: any;  // Season object (optional for backward compatibility)
  seasonSport?: string;  // Pre-calculated season sport
  onPlayerSelect: (player: Player) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const InvitePartnerBottomSheet: React.FC<InvitePartnerBottomSheetProps> = ({
  visible,
  onClose,
  seasonId,
  season,
  seasonSport = 'pickleball',  // Default fallback
  onPlayerSelect,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  // Create video player for empty state
  const videoPlayer = useVideoPlayer(require('@/assets/videos/connect_partner.mp4'), player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Use percentage-based snap points for better iOS compatibility
  const snapPoints = useMemo(() => ['85%'], []);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
      setSearchQuery('');
    }
  }, [onClose]);

  const fetchPlayers = useCallback(async (query: string = '') => {
    try {
      console.log('🔄 fetchPlayers called with seasonId:', seasonId, '| search query:', query);
      if (!seasonId) {
        console.log('❌ No seasonId provided, aborting fetch');
        return;
      }

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();
      const url = query.trim()
        ? `${backendUrl}/api/player/discover/${seasonId}?q=${encodeURIComponent(query)}`
        : `${backendUrl}/api/player/discover/${seasonId}`;
      console.log('📡 Fetching players from:', url);
      const response = await authClient.$fetch(url, {
        method: 'GET',
      });
      console.log('✅ API Response received:', response);

      if (response && (response as any).data) {
        const responseData = (response as any).data;
        console.log('📦 Response data structure:', responseData);

        let actualData = responseData;
        
        if (responseData.success && responseData.data) {
          actualData = responseData.data;
          console.log('📦 Unwrapped response data:', actualData);
        }

        // Backend returns { players: [...], friendsCount, totalCount, usedFallback }
        // Extract the players array from the data object
        let playersArray: Player[] = [];

        if (Array.isArray(actualData.players)) {
          // Direct players array
          playersArray = actualData.players;
        } else if (actualData.data && Array.isArray(actualData.data.players)) {
          // Nested in data.players
          playersArray = actualData.data.players;
        } else if (Array.isArray(actualData.data)) {
          // data is the array itself
          playersArray = actualData.data;
        } else if (Array.isArray(actualData)) {
          // actualData is the array
          playersArray = actualData;
        }

        console.log('👥 Players array extracted:', playersArray);
        setPlayers(playersArray);
        console.log('✅ Players state updated with', playersArray.length, 'players');

        // Show info toast if fallback was used
        if (actualData.usedFallback) {
          // toast.info('No Friends Available', {
          //   description: 'Showing all eligible players since you have no friends to pair with',
          // });
        }
      } else if (response && (response as any).error) {
        // Handle error response
        const errorData = (response as any).error;
        console.error('❌ API Error:', errorData);
        toast.error('Error', {
          description: errorData.message || 'Failed to load available players',
        });
      } else {
        console.log('⚠️ Unexpected response format:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching players:', error);
      toast.error('Error', {
        description: 'Failed to load available players',
      });
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // If search is empty, fetch friends only
      // If search has text, fetch all eligible non-friends
      console.log('🔍 Search query changed to:', text);
      fetchPlayers(text);
    }, 500);
  }, [fetchPlayers]);

  const handlePlayerSelect = useCallback((player: Player) => {
    // If player has an INCOMPLETE partnership, show warning dialog
    if (player.hasIncompletePartnership) {
      Alert.alert(
        'Join Existing Team',
        `${player.name} already has a team with preserved standings from a previous partner.\n\nIf you join, ${player.name} will remain the team captain and you will become their partner.\n\nWould you like to send an invitation?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Request to Join',
            onPress: () => {
              onPlayerSelect(player);
              onClose();
            },
          },
        ]
      );
      return;
    }

    onPlayerSelect(player);
    onClose();
  }, [onPlayerSelect, onClose]);

  const handleConnectPress = useCallback(() => {
    onClose();
    router.push({ pathname: '/user-dashboard', params: { view: 'connect' } });
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
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

  useEffect(() => {
    console.log('🎬 Bottom sheet effect triggered - visible:', visible, 'seasonId:', seasonId);
    if (visible && seasonId) {
      console.log('✅ Opening bottom sheet and fetching players');
      // Use requestAnimationFrame for iOS to ensure proper rendering
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            bottomSheetModalRef.current?.present();
          }, 50);
        });
      } else {
        bottomSheetModalRef.current?.present();
      }
      fetchPlayers();
    } else {
      console.log('❌ Closing bottom sheet');
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, seasonId, fetchPlayers]);

  // Render header content
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={24} color="#86868B" />
      </TouchableOpacity>
      <View style={styles.header}>
        <Text style={styles.title}>Invite Your Doubles Partner</Text>
        <Text style={styles.description}>
          Send an invitation to one of your friends to pair up and join the league together.
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#86868B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends..."
          placeholderTextColor="#86868B"
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>
    </View>
  );

  // Render empty/loading state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#A04DFE" />
          <Text style={styles.emptyStateText}>Loading players...</Text>
        </View>
      );
    }

    if (players.length === 0) {
      return (
        <View style={styles.emptyState}>
          {/* <Ionicons name="people-outline" size={48} color="#BABABA" /> */}
          <View style={styles.videoContainer}>
            <VideoView
              player={videoPlayer}
              contentFit="contain"
              nativeControls={false}
              style={styles.video}
            />
          </View>
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'No players found' : 'Oops, looks a little empty here!'}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery 
              ? 'Try a different search term' 
              : (
                <>
                  Only your friends show up here. Head to{' '}
                  <Text style={styles.connectLinkText}>Connect</Text>
                  {' '}to find and add friends before inviting them to your doubles team.
                </>
              )}
          </Text>
          {!searchQuery && (
            <>
              {/* <EmptyPartnerIcon width={82} height={46} style={styles.emptyPartnerIcon} /> */}
              <TouchableOpacity 
                style={styles.connectButton} 
                onPress={handleConnectPress}
                activeOpacity={0.7}
              >
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      );
    }

    return null;
  };

  // Use a placeholder item for empty state to ensure consistent layout
  const listData = isLoading || players.length === 0 ? [{ id: 'empty' }] : players;
  const isEmpty = isLoading || players.length === 0;

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      handleComponent={(props) => (
        <View style={styles.handleContainer}>
          <BottomSheetHandle {...props} />
        </View>
      )}
      backgroundStyle={styles.bottomSheetBackground}
      style={styles.bottomSheetContainer}
      enablePanDownToClose={true}
      enableDismissOnClose={true}
      enableHandlePanningGesture={true}
      enableContentPanningGesture={true}
      android_keyboardInputMode="adjustResize"
      keyboardBlurBehavior="restore"
      keyboardBehavior="interactive"
      detached={false}
      enableDynamicSizing={false}
    >
      <BottomSheetFlatList
        data={listData}
        renderItem={({ item }: { item: Player | { id: string } }) => {
          if (item.id === 'empty') {
            return renderEmptyState();
          }
          return (
            <PlayerInviteListItem
              player={item as Player}
              onPress={handlePlayerSelect}
              seasonSport={seasonSport}
            />
          );
        }}
        keyExtractor={(item: Player | { id: string }) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
          { paddingBottom: 20 + insets.bottom },
        ]}
        style={styles.listStyle}
      />
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    paddingTop: 8,
  },
  closeButton: {
    position: 'absolute',
    top: -4,
    right: 0,
    zIndex: 1,
    padding: 4,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1C1E',
    padding: 0,
  },
  listStyle: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  emptyStateText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#86868B',
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  connectLinkText: {
    color: '#FEA04D',
    textDecorationLine: 'underline',
  },
  emptyPartnerIcon: {
    marginTop: 48,
    marginBottom: 8,
  },
  connectButton: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FEA04D',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  videoContainer: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: 300,
    height: 300,
  },
});
