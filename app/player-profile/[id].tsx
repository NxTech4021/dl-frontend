import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSession, authClient } from '@/lib/auth-client';
import { getBackendBaseURL } from '@/config/network';
import { toast } from 'sonner-native';
import { PairRequestModal } from '@/src/features/pairing/components';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isTablet = width > 768;

const SPORT_COLORS: { [key: string]: string } = {
  Tennis: '#A2E047',
  tennis: '#A2E047',
  Pickleball: '#A04DFE',
  pickleball: '#A04DFE',
  Padel: '#4DABFE',
  padel: '#4DABFE',
};

interface PlayerProfile {
  id: string;
  name: string;
  username: string;
  displayUsername: string | null;
  image: string | null;
  bio: string | null;
  area: string | null;
  gender: string | null;
  sports: string[];
  skillRatings: any;
  recentMatches: any[];
  isFavorited: boolean;
}

export default function PlayerProfileScreen() {
  const { id, seasonId, seasonName } = useLocalSearchParams();
  const { data: session } = useSession();
  const [profileData, setProfileData] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);

  // Check if viewing in pairing context
  const isPairingContext = !!seasonId;

  const fetchPlayerProfile = useCallback(async () => {
    try {
      if (!session?.user?.id || !id) {
        console.log('PlayerProfile: No session or player ID');
        return;
      }

      setIsLoading(true);
      const backendUrl = getBackendBaseURL();
      console.log('PlayerProfile: Fetching profile from:', `${backendUrl}/api/player/profile/public/${id}`);

      const authResponse = await authClient.$fetch(`${backendUrl}/api/player/profile/public/${id}`, {
        method: 'GET',
      });

      console.log('PlayerProfile: API response:', authResponse);

      if (authResponse && (authResponse as any).data) {
        const playerData = (authResponse as any).data.data || (authResponse as any).data;
        console.log('PlayerProfile: Setting profile data:', playerData);
        setProfileData(playerData);
        setIsFavorited(playerData.isFavorited || false);
      }
    } catch (error) {
      console.error('PlayerProfile: Error fetching profile:', error);
      toast.error('Error', {
        description: 'Failed to load player profile. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, id]);

  const toggleFavorite = useCallback(async () => {
    try {
      if (!session?.user?.id || !id) {
        return;
      }

      const backendUrl = getBackendBaseURL();
      const method = isFavorited ? 'DELETE' : 'POST';
      const endpoint = `${backendUrl}/api/player/favorites/${id}`;

      console.log(`PlayerProfile: ${isFavorited ? 'Removing' : 'Adding'} favorite:`, endpoint);

      await authClient.$fetch(endpoint, {
        method,
      });

      setIsFavorited(!isFavorited);
      toast.success('Success', {
        description: isFavorited ? 'Removed from favorites' : 'Added to favorites',
      });
    } catch (error) {
      console.error('PlayerProfile: Error toggling favorite:', error);
      toast.error('Error', {
        description: 'Failed to update favorites. Please try again.',
      });
    }
  }, [session?.user?.id, id, isFavorited]);

  useEffect(() => {
    if (session?.user?.id && id) {
      fetchPlayerProfile();
    }
  }, [session?.user?.id, id, fetchPlayerProfile]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('Chat with player:', profileData?.name);
    toast('Chat feature coming soon!');
  };

  const handleRequestToPair = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPairModal(true);
  };

  const handleSendPairRequest = async (message: string) => {
    try {
      if (!id || !seasonId) return;

      const backendUrl = getBackendBaseURL();
      const response = await authClient.$fetch(`${backendUrl}/api/pairing/request`, {
        method: 'POST',
        body: JSON.stringify({
          recipientId: id,
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FEA04D" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Player not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Player Profile</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image and Name */}
        <View style={styles.profileSection}>
          {profileData.image ? (
            <Image
              source={{ uri: profileData.image }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.defaultAvatar]}>
              <Text style={styles.defaultAvatarText}>
                {profileData.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.playerName}>{profileData.name}</Text>
          {profileData.displayUsername && (
            <Text style={styles.playerUsername}>@{profileData.displayUsername}</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isPairingContext ? (
            // Pairing context: Show Request to Pair button
            <TouchableOpacity
              style={[styles.actionButton, styles.pairButton]}
              onPress={handleRequestToPair}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Request to Pair</Text>
            </TouchableOpacity>
          ) : (
            // Normal context: Show Favorite and Chat buttons
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.favoriteButton]}
                onPress={toggleFavorite}
              >
                <Ionicons
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {isFavorited ? "Favorited" : "Favorite"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.chatButton]}
                onPress={handleChat}
              >
                <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Bio Section */}
        {profileData.bio && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profileData.bio}</Text>
          </View>
        )}

        {/* Location and Gender */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Info</Text>
          {profileData.area && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666666" />
              <Text style={styles.infoText}>{profileData.area}</Text>
            </View>
          )}
          {profileData.gender && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#666666" />
              <Text style={styles.infoText}>{profileData.gender}</Text>
            </View>
          )}
        </View>

        {/* Sports */}
        {profileData.sports && profileData.sports.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Sports</Text>
            <View style={styles.sportPills}>
              {profileData.sports.map((sport, index) => (
                <View
                  key={index}
                  style={[
                    styles.sportPill,
                    { backgroundColor: SPORT_COLORS[sport] || '#A2E047' }
                  ]}
                >
                  <Text style={styles.sportPillText}>{sport}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skill Ratings */}
        {profileData.skillRatings && Object.keys(profileData.skillRatings).length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Skill Ratings</Text>
            {Object.entries(profileData.skillRatings).map(([sport, ratings]: [string, any]) => (
              <View key={sport} style={styles.ratingCard}>
                <View
                  style={[
                    styles.ratingHeader,
                    { backgroundColor: SPORT_COLORS[sport] || '#A2E047' }
                  ]}
                >
                  <Text style={styles.ratingHeaderText}>{sport.toUpperCase()}</Text>
                </View>
                <View style={styles.ratingContent}>
                  {ratings.singles !== null && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>Singles:</Text>
                      <Text style={styles.ratingValue}>{ratings.singles.toFixed(2)}</Text>
                    </View>
                  )}
                  {ratings.doubles !== null && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingLabel}>Doubles:</Text>
                      <Text style={styles.ratingValue}>{ratings.doubles.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Matches */}
        {profileData.recentMatches && profileData.recentMatches.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Recent Matches</Text>
            {profileData.recentMatches.map((match: any, index: number) => (
              <View key={index} style={styles.matchCard}>
                <View style={styles.matchHeader}>
                  <Text style={styles.matchSport}>{match.sport}</Text>
                  <Text style={styles.matchDate}>
                    {new Date(match.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.matchContent}>
                  <Text style={styles.matchResult}>
                    {match.result === 'win' ? '✓ Win' : '✗ Loss'}
                  </Text>
                  <Text style={styles.matchScore}>{match.score}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Pair Request Modal */}
      {isPairingContext && (
        <PairRequestModal
          visible={showPairModal}
          onClose={() => setShowPairModal(false)}
          onSend={handleSendPairRequest}
          recipientName={profileData?.name || ''}
          seasonName={(seasonName as string) || ''}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  errorText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 18,
    color: '#666666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  profileImage: {
    width: isSmallScreen ? 100 : isTablet ? 140 : 120,
    height: isSmallScreen ? 100 : isTablet ? 140 : 120,
    borderRadius: isSmallScreen ? 50 : isTablet ? 70 : 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  defaultAvatar: {
    backgroundColor: '#6de9a0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#FFFFFF',
    fontSize: isSmallScreen ? 40 : isTablet ? 56 : 48,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  playerName: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 22 : isTablet ? 28 : 24,
    color: '#1a1a1a',
    marginTop: 16,
  },
  playerUsername: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#666666',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  favoriteButton: {
    backgroundColor: '#FEA04D',
  },
  chatButton: {
    backgroundColor: '#A04DFE',
  },
  pairButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  bioText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#666666',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
    color: '#666666',
  },
  sportPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sportPillText: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
    color: '#FFFFFF',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ratingHeader: {
    padding: 12,
  },
  ratingHeaderText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
  },
  ratingContent: {
    padding: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666666',
  },
  ratingValue: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: isSmallScreen ? 16 : 18,
    color: '#1a1a1a',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchSport: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#FEA04D',
  },
  matchDate: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 12 : 14,
    color: '#999999',
  },
  matchContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchResult: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1a1a1a',
  },
  matchScore: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666666',
  },
});
