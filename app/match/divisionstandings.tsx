import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';
import { getSportColors, SportType } from '@/constants/SportsColor';
import { endpoints } from '@/lib/endpoints';
import axiosInstance from '@/lib/endpoints';
import { useSession } from '@/lib/auth-client';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface StandingsPlayer {
  rank: number;
  playerId: string;
  name: string;
  image?: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
}

interface StandingsTeam {
  rank: number;
  players: StandingsPlayer[];
  played: number;
  wins: number;
  losses: number;
  points: number;
}

interface Division {
  id: string;
  name: string;
  gameType: string;
  genderCategory?: string;
  standings?: StandingsPlayer[];
  groupedStandings?: StandingsTeam[];
  results?: MatchResult[];
  resultsLoading?: boolean;
  showResults?: boolean;
  scrollProgress?: number;
  scrollViewWidth?: number;
  contentWidth?: number;
}

interface MatchPlayer {
  id: string;
  name: string;
  username?: string;
  image?: string | null;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.88;
const CARD_GAP = 12;
const CARD_PADDING_H = 16;

interface SetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
  team1Tiebreak?: number | null;
  team2Tiebreak?: number | null;
  hasTiebreak: boolean;
}

interface GameScore {
  gameNumber: number;
  team1Points: number;
  team2Points: number;
}

interface MatchResultComment {
  id: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image?: string | null;
  };
}

interface MatchResult {
  id: string;
  matchType: string;
  matchDate: string;
  team1Score: number;
  team2Score: number;
  outcome: string;
  setScores: SetScore[];
  gameScores?: GameScore[];
  team1Players: MatchPlayer[];
  team2Players: MatchPlayer[];
  isWalkover: boolean;
  resultComment?: string;
  comments?: MatchResultComment[];
  venue?: string;
}

export default function DivisionStandingsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || '';
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonId, setSeasonId] = useState<string>('');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Get params from parent
  const divisionId = params.divisionId as string;
  const sportType = (params.sportType as string) as SportType;
  const leagueName = (params.leagueName as string) || 'Petaling Jaya Padel League';
  const seasonName = (params.seasonName as string) || 'Season 1 (2025)';
  const seasonStartDate = params.seasonStartDate as string;
  const seasonEndDate = params.seasonEndDate as string;
  const gameType = (params.gameType as string) || '';
  const genderCategory = (params.genderCategory as string) || '';

  // Format dates
  const formatDate = (dateString: string | null | undefined, fallback: string) => {
    if (!dateString) return fallback;
    try {
      return format(new Date(dateString), 'd MMMM yyyy');
    } catch {
      return fallback;
    }
  };

  const startDate = formatDate(seasonStartDate, '');
  const endDate = formatDate(seasonEndDate, '');

  // Get sport-specific icon
  const getSportIcon = () => {
    const sport = sportType?.toUpperCase();
    if (sport?.includes('TENNIS')) return TennisIcon;
    if (sport?.includes('PADEL')) return PadelIcon;
    if (sport?.includes('PICKLEBALL')) return PickleballIcon;
    return PickleballIcon;
  };

  // Get game type label with gender category
  const getGameTypeLabel = (): string => {
    if (!gameType) return '';

    const gameTypeUpper = gameType?.toUpperCase();
    const genderCategoryUpper = genderCategory?.toUpperCase();

    let genderPrefix = '';
    if (genderCategoryUpper === 'MALE') {
      genderPrefix = "Men's ";
    } else if (genderCategoryUpper === 'FEMALE') {
      genderPrefix = "Women's ";
    } else if (genderCategoryUpper === 'MIXED') {
      genderPrefix = 'Mixed ';
    }

    if (gameTypeUpper === 'SINGLES') {
      return `${genderPrefix}Singles`;
    } else if (gameTypeUpper === 'DOUBLES') {
      return `${genderPrefix}Doubles`;
    }

    return '';
  };

  // Format game type badge text with gender category
  const formatGenderCategory = (gender: string) => {
    const upperGender = gender.toUpperCase();
    if (upperGender === 'MALE' || upperGender === 'MENS' || upperGender === 'MEN') return "Men's";
    if (upperGender === 'FEMALE' || upperGender === 'WOMENS' || upperGender === 'WOMEN') return "Women's";
    if (upperGender === 'MIXED') return 'Mixed';
    return gender;
  };

  // Fetch all divisions for the season
  useEffect(() => {
    if (divisionId) {
      fetchDivisionsForSeason();
    }
  }, [divisionId]);


  const fetchDivisionsForSeason = async () => {
    try {
      setLoading(true);
      
      // First, get the division details to obtain the seasonId
      const divisionResponse = await axiosInstance.get(
        endpoints.division.getById(divisionId)
      );
      
      console.log('📊 Division response:', divisionResponse.data);
      
      // Handle response structure: {data: {...}, success: true} or {division: {...}}
      const divisionData = divisionResponse.data.data || divisionResponse.data.division || divisionResponse.data;
      const fetchedSeasonId = divisionData.seasonId;
      
      console.log('📊 Extracted seasonId:', fetchedSeasonId);
      
      if (!fetchedSeasonId) {
        console.error('No seasonId found for division', divisionData);
        setLoading(false);
        return;
      }
      
      setSeasonId(fetchedSeasonId);
      
      // Now fetch all divisions for this season
      const divisionsResponse = await axiosInstance.get(
        endpoints.division.getbySeasionId(fetchedSeasonId)
      );
      
      const divisionsData = divisionsResponse.data.data || divisionsResponse.data || [];
      
      // Initialize divisions with basic data
      const initializedDivisions: Division[] = divisionsData.map((div: any) => ({
        id: div.id,
        name: div.name,
        gameType: div.gameType,
        genderCategory: div.genderCategory,
        standings: [],
        groupedStandings: [],
        results: [],
        resultsLoading: false,
        showResults: false,
      }));
      
      setDivisions(initializedDivisions);
      
      // Fetch standings for each division
      await Promise.all(
        initializedDivisions.map((division) => fetchStandingsForDivision(division.id))
      );
      
      // Pre-fetch results for all divisions so they're ready when users click "View Results"
      // Set resultsLoading to true immediately for all divisions
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) => ({ ...div, resultsLoading: true }))
      );
      
      // Then fetch results for all divisions
      initializedDivisions.forEach((division) => {
        fetchResultsForDivision(division.id);
      });
      
    } catch (error) {
      console.error('Error fetching divisions for season:', error);
      setDivisions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandingsForDivision = async (divId: string) => {
    try {
      const response = await axiosInstance.get(
        endpoints.standings.getDivisionStandings(divId)
      );

      console.log(`📊 Standings response for division ${divId}:`, response.data);

      // Handle response structure: {data: [], success: true}
      const standingsData = response.data.data || response.data || [];
      
      // Transform backend data to match our interface
      const transformedStandings: StandingsPlayer[] = standingsData.map((standing: any, index: number) => ({
        rank: standing.rank || index + 1,
        playerId: standing.odlayerId || standing.userId || standing.playerId,
        name: standing.odlayerName || standing.user?.name || standing.userName || 'Unknown Player',
        image: standing.odlayerImage || standing.user?.image || standing.userImage || null,
        played: standing.matchesPlayed || 0,
        wins: standing.wins || 0,
        losses: standing.losses || 0,
        points: standing.totalPoints || 0,
      }));

      // Update the specific division
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) => {
          if (div.id === divId) {
            const isDoubles = div.gameType?.toLowerCase().includes('doubles') || false;
            const grouped = isDoubles ? groupPlayersByTeam(transformedStandings) : [];
            
            return {
              ...div,
              standings: transformedStandings,
              groupedStandings: grouped,
            };
          }
          return div;
        })
      );
    } catch (error) {
      console.error(`Error fetching standings for division ${divId}:`, error);
    }
  };

  // Group players by matching stats (same points, wins, losses, played = same team)
  // Only group pairs (exactly 2 players) together
  const groupPlayersByTeam = (players: StandingsPlayer[]): StandingsTeam[] => {
    if (players.length === 0) return [];
    
    const groups = new Map<string, StandingsPlayer[]>();
    
    // Group by stats key (points-wins-losses-played)
    players.forEach(player => {
      const key = `${player.points}-${player.wins}-${player.losses}-${player.played}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(player);
    });

    // Convert to StandingsTeam array, sorted by rank
    const teams: StandingsTeam[] = [];
    groups.forEach((teamPlayers, key) => {
      // Sort players by rank first
      const sortedPlayers = teamPlayers.sort((a, b) => a.rank - b.rank);
      
      // Only create pairs (exactly 2 players per team)
      // If there are more than 2 players with same stats, create separate teams
      for (let i = 0; i < sortedPlayers.length; i += 2) {
        const pair = sortedPlayers.slice(i, i + 2);
        teams.push({
          rank: Math.min(...pair.map(p => p.rank)),
          players: pair,
          played: pair[0].played,
          wins: pair[0].wins,
          losses: pair[0].losses,
          points: pair[0].points,
        });
      }
    });

    // Sort by rank
    return teams.sort((a, b) => a.rank - b.rank);
  };

  const fetchResultsForDivision = async (divId: string) => {
    try {
      // Set loading for this specific division
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId ? { ...div, resultsLoading: true } : div
        )
      );

      const response = await axiosInstance.get(
        endpoints.match.getDivisionResults(divId),
        { params: { limit: 10 } }
      );

      console.log(`🏆 Results response for division ${divId}:`, response.data);

      const matchesData = response.data.matches || response.data.data || [];
      
      // Update the specific division with results
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId
            ? { ...div, results: matchesData, resultsLoading: false }
            : div
        )
      );
    } catch (error) {
      console.error(`Error fetching results for division ${divId}:`, error);
      setDivisions((prevDivisions) =>
        prevDivisions.map((div) =>
          div.id === divId
            ? { ...div, results: [], resultsLoading: false }
            : div
        )
      );
    }
  };

  const toggleShowResults = (divId: string) => {
    setDivisions((prevDivisions) =>
      prevDivisions.map((div) => {
        if (div.id === divId) {
          const newShowResults = !div.showResults;
          // Fetch results if expanding and no results yet and not already loading
          if (newShowResults && (!div.results || div.results.length === 0) && !div.resultsLoading) {
            fetchResultsForDivision(divId);
          }
          return { ...div, showResults: newShowResults };
        }
        return div;
      })
    );
  };

  const sportColors = getSportColors(sportType);

  const handleViewMatches = (divId: string) => {
    router.push({
      pathname: '/match/all-matches',
      params: {
        divisionId: divId,
        sportType,
        leagueName,
        seasonName,
      },
    });
  };

  const renderPlayerRow = (player: StandingsPlayer, index: number) => {
    return (
      <View
        key={player.playerId}
        style={styles.playerCard}
      >
        {/* Rank */}
        <View style={styles.rankCell}>
          <Text style={styles.rankText}>{player.rank}</Text>
        </View>

        {/* Player */}
        <View style={styles.playerCell}>
          <View style={styles.playerAvatar}>
            {player.image ? (
              <Image source={{ uri: player.image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {player.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.playerName}>{player.name}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statCell}>
          <Text style={styles.statText}>{player.played}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{player.wins}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{player.losses}</Text>
        </View>
        <View style={styles.ptsCell}>
          <Text style={styles.ptsText}>{player.points}pts</Text>
        </View>
      </View>
    );
  };

  const renderTeamRow = (team: StandingsTeam, displayRank: number) => {
    const isTeam = team.players.length > 1;
    
    return (
      <View
        key={`team-${team.rank}-${displayRank}`}
        style={styles.playerCard}
      >
        {/* Rank */}
        <View style={styles.rankCell}>
          <Text style={styles.rankText}>{displayRank}</Text>
        </View>

        {/* Players */}
        <View style={styles.playerCell}>
          {isTeam ? (
            // Doubles team - overlapping avatars
            <View style={styles.teamAvatarsContainer}>
              <View style={styles.teamAvatars}>
                {team.players[0] && (
                  <View style={styles.teamAvatar}>
                    {team.players[0].image ? (
                      <Image source={{ uri: team.players[0].image }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.defaultTeamAvatar}>
                        <Text style={styles.defaultTeamAvatarText}>
                          {team.players[0].name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {team.players[1] && (
                  <View style={[styles.teamAvatar, styles.teamAvatarOverlap]}>
                    {team.players[1].image ? (
                      <Image source={{ uri: team.players[1].image }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.defaultTeamAvatar}>
                        <Text style={styles.defaultTeamAvatarText}>
                          {team.players[1].name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.teamPlayerName} numberOfLines={1}>
                {team.players.map(p => {
                  const parts = p.name.split(' ');
                  return `${parts[0]} ${parts[1]?.[0] || ''}`;
                }).join(', ')}
              </Text>
            </View>
          ) : (
            // Single player
            <>
              <View style={styles.playerAvatar}>
                {team.players[0]?.image ? (
                  <Image source={{ uri: team.players[0].image }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <Text style={styles.defaultAvatarText}>
                      {team.players[0]?.name.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.playerName}>{team.players[0]?.name || 'Unknown'}</Text>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statCell}>
          <Text style={styles.statText}>{team.played}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{team.wins}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{team.losses}</Text>
        </View>
        <View style={styles.ptsCell}>
          <Text style={styles.ptsText}>{team.points}pts</Text>
        </View>
      </View>
    );
  };

  const renderPlayerPhoto = (player: MatchPlayer, size: number = 30) => {
    if (player.image) {
      return (
        <Image
          source={{ uri: player.image }}
          style={[styles.cardPlayerPhoto, { width: size, height: size, borderRadius: size / 2 }]}
        />
      );
    }
    return (
      <View style={[styles.cardPlayerPhotoDefault, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.cardPlayerPhotoDefaultText, { fontSize: size * 0.4 }]}>
          {player.name.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderTeamPhotos = (players: MatchPlayer[], isWinner: boolean) => {
    const isSingles = players.length === 1;

    if (isSingles) {
      return (
        <View style={styles.cardTeamPhotosContainer}>
          {renderPlayerPhoto(players[0], 38)}
        </View>
      );
    }

    // Doubles - overlapping photos
    return (
      <View style={styles.cardTeamPhotosContainer}>
        <View style={styles.cardDoublesPhotos}>
          {renderPlayerPhoto(players[0], 38)}
          <View style={styles.cardDoublesPhotoOverlap}>
            {renderPlayerPhoto(players[1], 38)}
          </View>
        </View>
      </View>
    );
  };

  const renderTeamNames = (players: MatchPlayer[], isWinner: boolean) => {
    const isSingles = players.length === 1;
    const nameStyle = isWinner 
      ? [styles.cardPlayerName, { color: sportColors.background }]
      : styles.cardPlayerName;

    if (isSingles) {
      return (
        <Text style={nameStyle} numberOfLines={1}>
          {players[0].name.split(' ')[0]} {players[0].name.split(' ')[1]?.[0] || ''}.
        </Text>
      );
    }

    // Doubles - comma-separated first names
    const names = players.map(p => {
      const parts = p.name.split(' ');
      return `${parts[0]} ${parts[1]?.[0] || ''}.`;
    }).join(', ');

    return (
      <Text style={nameStyle} numberOfLines={2}>
        {names}
      </Text>
    );
  };

  const isPickleball = sportType?.toLowerCase() === 'pickleball';

  // Check if current user is in a division's standings
  const isUserInDivision = (division: Division): boolean => {
    if (!currentUserId) return false;
    const standings = division.standings || [];
    const groupedStandings = division.groupedStandings || [];
    
    // Check individual standings
    const inIndividualStandings = standings.some(player => player.playerId === currentUserId);
    
    // Check grouped standings (for doubles teams)
    const inGroupedStandings = groupedStandings.some(team => 
      team.players.some(player => player.playerId === currentUserId)
    );
    
    return inIndividualStandings || inGroupedStandings;
  };

  const renderDivisionCard = (division: Division) => {
    const isDoubles = division.gameType?.toLowerCase().includes('doubles') || false;
    const standings = division.standings || [];
    const groupedStandings = division.groupedStandings || [];
    const results = division.results || [];
    const resultsLoading = division.resultsLoading || false;
    const showResults = division.showResults || false;
    const userInDivision = isUserInDivision(division);

    // Format division name with gender category
    const gameTypeBadgeText = division.genderCategory 
      ? `${formatGenderCategory(division.genderCategory)} ${division.gameType}`
      : division.gameType;

    // Conditional styling for division container
    const divisionContainerStyle = [
      styles.divisionContainer,
      { marginBottom: 20 },
      userInDivision 
        ? {
            backgroundColor: '#E9F3F8',
            borderWidth: 1,
            borderColor: '#C7E3F2',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }
        : {
            backgroundColor: '#F6FAFC',
          },
    ];

    return (
      <View key={division.id} style={divisionContainerStyle}>
        {/* Division Header - Sport themed */}
        <View style={[styles.divisionHeader, { backgroundColor: sportColors.background }]}>
          <Text style={styles.divisionName}>{division.name}</Text>
          <TouchableOpacity
            style={styles.viewMatchesButton}
            onPress={() => handleViewMatches(division.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewMatchesText}>View Matches</Text>
          </TouchableOpacity>
        </View>

        {/* Standings Table Container */}
        <View style={[
          styles.standingsTableContainer,
          userInDivision 
            ? { backgroundColor: '#E9F3F8' }
            : { backgroundColor: '#F6FAFC' }
        ]}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.rankHeaderCell}>
              <Text style={styles.headerText}>#</Text>
            </View>
            <View style={styles.playerHeaderCell}>
              <Text style={styles.headerText}>Player</Text>
            </View>
            <View style={styles.statHeaderCell}>
              <Text style={styles.headerText}>P</Text>
            </View>
            <View style={styles.statHeaderCell}>
              <Text style={styles.headerText}>W</Text>
            </View>
            <View style={styles.statHeaderCell}>
              <Text style={styles.headerText}>L</Text>
            </View>
            <View style={styles.ptsHeaderCell}>
              <Text style={styles.headerText}>Pts</Text>
            </View>
          </View>

          {/* Table Body - Individual player cards */}
          <View style={styles.tableBody}>
            {standings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Standings Yet</Text>
                <Text style={styles.emptyText}>
                  Standings will appear once matches are completed
                </Text>
              </View>
            ) : isDoubles ? (
              // Render grouped teams for doubles
              groupedStandings.length > 0 ? (
                groupedStandings.map((team, index) => renderTeamRow(team, index + 1))
              ) : (
                // Fallback: if grouping failed, show individual players
                standings.map((player, index) => renderPlayerRow(player, index))
              )
            ) : (
              // Render individual players for singles
              standings.map((player, index) => renderPlayerRow(player, index))
            )}
          </View>
        </View>

        {/* View Results Toggle */}
        <TouchableOpacity
          style={styles.viewResultsButton}
          onPress={() => toggleShowResults(division.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewResultsText}>View Results</Text>
          <Ionicons
            name={showResults ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#F09433"
          />
        </TouchableOpacity>

        {/* Results Section - Horizontal Scroll */}
        {showResults && (
          <View style={styles.resultsSectionNew}>
            {resultsLoading ? (
              <View style={styles.resultsLoadingContainer}>
                <ActivityIndicator size="small" color={sportColors.background} />
                <Text style={styles.resultsLoadingText}>Loading results...</Text>
              </View>
            ) : results.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="document-text-outline" size={32} color="#D1D5DB" />
                <Text style={styles.noResultsText}>No completed matches yet</Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={CARD_WIDTH + CARD_GAP}
                  snapToAlignment="start"
                  contentContainerStyle={styles.resultsScrollContent}
                  onScroll={(event) => {
                    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                    const scrollX = contentOffset.x;
                    const maxScrollX = contentSize.width - layoutMeasurement.width;
                    const progress = maxScrollX > 0 ? scrollX / maxScrollX : 0;
                    setDivisions((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.id === division.id
                          ? { ...div, scrollProgress: progress }
                          : div
                      )
                    );
                  }}
                  onContentSizeChange={(width) => {
                    setDivisions((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.id === division.id
                          ? { ...div, contentWidth: width }
                          : div
                      )
                    );
                  }}
                  onLayout={(event) => {
                    const layoutWidth = event.nativeEvent.layout.width;
                    setDivisions((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.id === division.id
                          ? { ...div, scrollViewWidth: layoutWidth }
                          : div
                      )
                    );
                  }}
                  scrollEventThrottle={16}
                >
                  {results.map((match, index) => renderResultCard(match, index, results.length))}
                </ScrollView>
                {/* Progress Slider */}
                {division.contentWidth && division.scrollViewWidth && division.contentWidth > division.scrollViewWidth && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${(division.scrollViewWidth / division.contentWidth) * 100}%`,
                            left: `${(division.scrollProgress || 0) * (100 - (division.scrollViewWidth / division.contentWidth) * 100)}%`,
                            backgroundColor: sportColors.background,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderResultCard = (match: MatchResult, index: number, totalResults: number) => {
    const isTeam1Winner = match.outcome === 'team1';
    const isTeam2Winner = match.outcome === 'team2';
    const scores = isPickleball ? match.gameScores : match.setScores;
    const totalSets = scores?.length || 0;

    return (
      <View
        key={match.id}
        style={[
          styles.resultCardNew,
          { width: CARD_WIDTH, marginLeft: index === 0 ? 0 : CARD_GAP },
          index === totalResults - 1 && { marginRight: 0 },
        ]}
      >
        {/* Venue Name */}
        <Text style={styles.cardVenueName}>{match.venue || 'Venue TBD'}</Text>

        {/* Score Display with Photos */}
        <View style={styles.cardScoreSection}>
          {/* Team 1 */}
          <View style={styles.cardTeamSection}>
            {renderTeamPhotos(match.team1Players, isTeam1Winner)}
            {renderTeamNames(match.team1Players, isTeam1Winner)}
          </View>

          {/* Center Score */}
          <View style={styles.cardCenterSection}>
            <View style={styles.cardScoreRow}>
              <Text style={styles.cardScoreNumber}>{match.team1Score}</Text>
              <Text style={styles.cardScoreDash}> - </Text>
              <Text style={styles.cardScoreNumber}>{match.team2Score}</Text>
            </View>
            <Text style={styles.cardMatchDate}>
              {format(new Date(match.matchDate), 'd MMM yyyy')}
            </Text>
            {match.isWalkover && <Text style={styles.cardWalkover}>W/O</Text>}
          </View>

          {/* Team 2 */}
          <View style={styles.cardTeamSection}>
            {renderTeamPhotos(match.team2Players, isTeam2Winner)}
            {renderTeamNames(match.team2Players, isTeam2Winner)}
          </View>
        </View>

        {/* Set Scores Table */}
        {scores && scores.length > 0 && (
          <View style={styles.cardScoresTable}>
            {/* Table Header */}
            <View style={[styles.cardTableHeader, { backgroundColor: sportColors.background }]}>
              <View style={styles.cardTableHeaderLabelCell}>
                <Text style={styles.cardTableHeaderText}>
                  Best of {totalSets}
                </Text>
              </View>
              {scores.map((_, idx) => (
                <View key={idx} style={styles.cardTableHeaderCell}>
                  <Text style={styles.cardTableHeaderText}>
                    {isPickleball ? idx + 1 : `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'}`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Team 1 Row */}
            <View style={styles.cardTableRow}>
              <View style={styles.cardTableLabelCell}>
                <Text
                  style={[
                    styles.cardTablePlayerName,
                    isTeam1Winner && styles.cardTablePlayerNameWinner,
                  ]}
                  numberOfLines={1}
                >
                  {match.team1Players[0].name.split(' ')[0]} {match.team1Players[0].name.split(' ')[1]?.[0] || ''}.
                </Text>
              </View>
              {isPickleball
                ? (match.gameScores || []).map((game, idx) => {
                    const isWinningScore = game.team1Points > game.team2Points;
                    return (
                      <View key={idx} style={styles.cardTableScoreCell}>
                        <Text
                          style={[
                            styles.cardTableScore,
                            isWinningScore
                              ? [styles.cardTableScoreWinner, { color: sportColors.background }]
                              : styles.cardTableScoreLoser,
                          ]}
                        >
                          {game.team1Points}
                        </Text>
                      </View>
                    );
                  })
                : match.setScores.map((set, idx) => {
                    const isWinningScore = set.team1Games > set.team2Games;
                    return (
                      <View key={idx} style={styles.cardTableScoreCell}>
                        <Text
                          style={[
                            styles.cardTableScore,
                            isWinningScore
                              ? [styles.cardTableScoreWinner, { color: sportColors.background }]
                              : styles.cardTableScoreLoser,
                          ]}
                        >
                          {set.team1Games}
                          {set.hasTiebreak && set.team1Tiebreak != null && (
                            <Text style={styles.cardTiebreakScore}>
                              ({set.team1Tiebreak})
                            </Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
            </View>

            {/* Team 2 Row */}
            <View style={[styles.cardTableRow, styles.cardTableRowLast]}>
              <View style={styles.cardTableLabelCell}>
                <Text
                  style={[
                    styles.cardTablePlayerName,
                    isTeam2Winner && styles.cardTablePlayerNameWinner,
                  ]}
                  numberOfLines={1}
                >
                  {match.team2Players[0].name.split(' ')[0]} {match.team2Players[0].name.split(' ')[1]?.[0] || ''}.
                </Text>
              </View>
              {isPickleball
                ? (match.gameScores || []).map((game, idx) => {
                    const isWinningScore = game.team2Points > game.team1Points;
                    return (
                      <View key={idx} style={styles.cardTableScoreCell}>
                        <Text
                          style={[
                            styles.cardTableScore,
                            isWinningScore
                              ? [styles.cardTableScoreWinner, { color: sportColors.background }]
                              : styles.cardTableScoreLoser,
                          ]}
                        >
                          {game.team2Points}
                        </Text>
                      </View>
                    );
                  })
                : match.setScores.map((set, idx) => {
                    const isWinningScore = set.team2Games > set.team1Games;
                    return (
                      <View key={idx} style={styles.cardTableScoreCell}>
                        <Text
                          style={[
                            styles.cardTableScore,
                            isWinningScore
                              ? [styles.cardTableScoreWinner, { color: sportColors.background }]
                              : styles.cardTableScoreLoser,
                          ]}
                        >
                          {set.team2Games}
                          {set.hasTiebreak && set.team2Tiebreak != null && (
                            <Text style={styles.cardTiebreakScore}>
                              ({set.team2Tiebreak})
                            </Text>
                          )}
                        </Text>
                      </View>
                    );
                  })}
            </View>
          </View>
        )}

        {/* Comments Section - Show max 2 comments, expandable */}
        {match.comments && match.comments.length > 0 && (
          <View style={styles.cardCommentsContainer}>
            {(expandedComments.has(match.id) ? match.comments : match.comments.slice(0, 2)).map((commentItem) => (
              <View key={commentItem.id} style={styles.cardCommentItem}>
                <Ionicons name="thumbs-up" size={14} color={sportColors.background} style={styles.cardCommentThumb} />
                {commentItem.user.image ? (
                  <Image
                    source={{ uri: commentItem.user.image }}
                    style={styles.cardCommentAvatar}
                  />
                ) : (
                  <View style={[styles.cardCommentAvatar, styles.cardCommentDefaultAvatar]}>
                    <Text style={styles.cardCommentDefaultAvatarText}>
                      {commentItem.user.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={styles.cardCommentText} numberOfLines={2}>
                  <Text style={styles.cardCommentAuthor}>{commentItem.user.name.split(' ')[0]}:</Text>
                  {' '}{commentItem.comment}
                </Text>
              </View>
            ))}
            {match.comments.length > 2 && !expandedComments.has(match.id) && (
              <TouchableOpacity
                style={styles.viewMoreCommentsButton}
                onPress={() => {
                  setExpandedComments(prev => new Set(prev).add(match.id));
                }}
              >
                <Text style={[styles.viewMoreCommentsText, { color: sportColors.background }]}>
                  View {match.comments.length - 2} more comment{match.comments.length - 2 > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
            {match.comments.length > 2 && expandedComments.has(match.id) && (
              <TouchableOpacity
                style={styles.viewMoreCommentsButton}
                onPress={() => {
                  setExpandedComments(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(match.id);
                    return newSet;
                  });
                }}
              >
                <Text style={[styles.viewMoreCommentsText, { color: sportColors.background }]}>
                  View less
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Fallback to old resultComment if no comments array */}
        {(!match.comments || match.comments.length === 0) && match.resultComment && (
          <View style={styles.cardCommentSection}>
            <Ionicons name="thumbs-up" size={16} color={sportColors.background} />
            <Text style={styles.cardCommentText} numberOfLines={2}>
              {match.resultComment}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const SportIcon = getSportIcon();
  const categoryLabel = getGameTypeLabel();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: sportColors.badgeColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          {/* Category title - big and black, aligned with back button */}
          {categoryLabel ? (
            <Text style={styles.categoryTitle}>{categoryLabel}</Text>
          ) : null}

          {/* League name - smaller, gray */}
          <Text style={styles.leagueTitle}>{leagueName}</Text>

          {/* Season info box - compact */}
          <View style={[styles.seasonInfoBox, { backgroundColor: sportColors.buttonColor, borderColor: sportColors.badgeColor }]}>
            {/* Sport icon on the left */}
            <View style={styles.seasonInfoIcon}>
              <SportIcon width={40} height={40} fill="#FFFFFF" />
            </View>

            {/* Season details in the middle */}
            <View style={styles.seasonInfoDetails}>
              <Text style={styles.seasonInfoTitle}>{seasonName}</Text>
              <Text style={styles.seasonInfoDate}>Start date: {startDate}</Text>
              <Text style={styles.seasonInfoDate}>End date: {endDate}</Text>
            </View>

            {/* Info button on the right */}
            <TouchableOpacity style={styles.seasonInfoButton} activeOpacity={0.7}>
              <Text style={[styles.seasonInfoButtonText, { color: sportColors.buttonColor }]}>Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Standings Section */}
        <View style={styles.standingsSection}>
          <Text style={styles.standingsTitle}>Standings</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={sportColors.background} />
              <Text style={styles.loadingText}>Loading divisions...</Text>
            </View>
          ) : divisions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Divisions Found</Text>
              <Text style={styles.emptyText}>
                No divisions available for this season
              </Text>
            </View>
          ) : (
            divisions.map((division) => renderDivisionCard(division))
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 4,
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0E0E10',
    marginBottom: 2,
    textAlign: 'center',
    alignSelf: 'center',
  },
  leagueTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  seasonInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
    width: '100%',
    borderWidth: 3,
  },
  seasonInfoIcon: {
    marginRight: 12,
  },
  seasonInfoDetails: {
    flex: 1,
  },
  seasonInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  seasonInfoDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    lineHeight: 15,
  },
  seasonInfoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 8,
  },
  seasonInfoButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  standingsSection: {
    padding: 16,
  },
  standingsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  divisionContainer: {
    backgroundColor: '#E9F3F8',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#863A73',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  divisionName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewMatchesButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewMatchesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FEA04D',
  },
  standingsTableContainer: {
    backgroundColor: '#E9F3F8',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rankHeaderCell: {
    width: 35,
    alignItems: 'center',
  },
  playerHeaderCell: {
    flex: 1,
    paddingLeft: 0,
    minWidth: 0, // Allow flex to shrink
  },
  statHeaderCell: {
    width: 25,
    alignItems: 'center',
  },
  ptsHeaderCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
    textTransform: 'uppercase',
  },
  tableBody: {
    paddingHorizontal: 0,
    gap: 4,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#DCE1E4',
  },
  rankCell: {
    width: 35,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  playerCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  teamAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  teamAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  teamAvatarOverlap: {
    marginLeft: -7,
  },
  teamPlayerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  defaultTeamAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultTeamAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  statCell: {
    width: 25,
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  ptsCell: {
    width: 40,
    alignItems: 'flex-end',
  },
  ptsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
  },
  viewResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingLeft: 12,
    gap: 6,
  },
  viewResultsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F09433',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Results section styles
  resultsSection: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  resultsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  resultsLoadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  resultDate: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultTeamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTeam: {
    flex: 1,
  },
  resultPlayersContainer: {
    gap: 4,
  },
  resultPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultPlayerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultAvatarImage: {
    width: '100%',
    height: '100%',
  },
  resultDefaultAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FEA04D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultDefaultAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resultPlayerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  winnerText: {
    fontWeight: '600',
    color: '#F09433',
  },
  resultScoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  resultScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  resultScoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  winnerScoreText: {
    color: '#F09433',
    fontWeight: '700',
  },
  resultScoreDivider: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  walkoverText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 4,
  },
  setScoressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  setScoreBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  setScoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  tiebreakText: {
    fontSize: 10,
    color: '#6B7280',
  },
  commentContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  commentText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6B7280',
    lineHeight: 18,
  },
  // New horizontal scroll results styles
  resultsSectionNew: {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 8,
    paddingBottom: 12,
  },
  resultsScrollContent: {
    paddingVertical: 4,
    paddingLeft: 12,
    paddingRight: 12,
  },
  resultCardNew: {
    backgroundColor: '#FEFEFE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(186, 186, 186, 0.4)',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  cardVenueName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#86868B',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardScoreSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTeamSection: {
    flex: 1,
    alignItems: 'center',
  },
  cardTeamPhotosContainer: {
    marginBottom: 6,
  },
  cardDoublesPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDoublesPhotoOverlap: {
    marginLeft: -8,
  },
  cardPlayerPhoto: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardPlayerPhotoDefault: {
    backgroundColor: '#FEA04D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cardPlayerPhotoDefaultText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cardPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    textAlign: 'center',
  },
  cardCenterSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardScoreNumber: {
    fontSize: 36,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  cardScoreDash: {
    fontSize: 34,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  cardMatchDate: {
    fontSize: 10,
    fontWeight: '400',
    color: '#86868B',
    marginTop: 4,
  },
  cardWalkover: {
    fontSize: 8,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 2,
  },
  cardScoresTable: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardTableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  cardTableHeaderLabelCell: {
    flex: 1,
  },
  cardTableHeaderCell: {
    width: 40,
    alignItems: 'center',
  },
  cardTableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cardTableRowLast: {
    borderBottomWidth: 0,
  },
  cardTableLabelCell: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTablePlayerName: {
    fontSize: 14,
    fontWeight: '400',
    color: '#1D1D1F',
  },
  cardTablePlayerNameWinner: {
    fontWeight: '600',
  },
  cardTableScoreCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTableScore: {
    fontSize: 12,
    fontWeight: '400',
    color: '#868686',
  },
  cardTableScoreWinner: {
    fontWeight: '600',
  },
  cardTableScoreLoser: {
    fontWeight: '400',
    color: '#868686',
  },
  cardTiebreakScore: {
    fontSize: 8,
    color: '#868686',
  },
  cardCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardCommentsContainer: {
    marginTop: 12,
    gap: 10,
  },
  cardCommentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardCommentThumb: {
    marginTop: 2,
  },
  cardCommentAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  cardCommentDefaultAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCommentDefaultAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardCommentAuthor: {
    fontWeight: '700',
    color: '#374151',
  },
  cardCommentText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#868686',
    lineHeight: 16,
  },
  viewMoreCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 4,
  },
  viewMoreCommentsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
  },
});
