import { getSportColors, SportType } from '@/constants/SportsColor';
import { endpoints } from '@/lib/endpoints';
import axiosInstance from '@/lib/endpoints';
import { useSession } from '@/lib/auth-client';
import { DivisionWithStandings, StandingEntry, StandingsService } from '@/src/features/leagues/services/StandingsService';
import { DivisionMatchResults } from '@/src/features/standings/components/DivisionMatchResults';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH * 0.88;
const CARD_GAP = 12;

// Table column widths - responsive based on screen width
const TABLE_PADDING = 32;
const AVAILABLE_WIDTH = width - TABLE_PADDING;

// Fixed widths for smaller columns
const RANK_WIDTH = isSmallScreen ? 35 : 40;
const STAT_WIDTH = isSmallScreen ? 32 : 38;
const POINTS_WIDTH = isSmallScreen ? 45 : 50;

// Calculate remaining width for player column
const FIXED_COLUMNS_WIDTH = RANK_WIDTH + (STAT_WIDTH * 3) + POINTS_WIDTH;
const PLAYER_WIDTH = AVAILABLE_WIDTH - FIXED_COLUMNS_WIDTH;

// Interfaces for match results
interface MatchPlayer {
  id: string;
  name: string;
  username?: string;
  image?: string | null;
}

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
  venue?: string;
}

// Extended DivisionWithStandings to include results
interface ExtendedDivisionWithStandings extends DivisionWithStandings {
  results?: MatchResult[];
  resultsLoading?: boolean;
  showResults?: boolean;
  scrollProgress?: number;
  scrollViewWidth?: number;
  contentWidth?: number;
}

export default function StandingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: session } = useSession();
  const params = useLocalSearchParams();
  
  // Extract params
  const seasonId = params.seasonId as string;
  const seasonName = params.seasonName as string;
  const leagueId = params.leagueId as string;
  const leagueName = params.leagueName as string;
  const categoryName = params.categoryName as string;
  const sportType = params.sportType as SportType;
  const startDate = params.startDate as string;
  const endDate = params.endDate as string;

  // Get sport colors
  const sportColors = getSportColors(sportType);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [divisionsWithStandings, setDivisionsWithStandings] = useState<ExtendedDivisionWithStandings[]>([]);
  const [userDivisionId, setUserDivisionId] = useState<string | null>(null);

  const userId = session?.user?.id;
  const isPickleball = sportType?.toLowerCase() === 'pickleball';

  useEffect(() => {
    fetchStandings();
  }, [seasonId, userId]);

  const fetchStandings = async () => {
    if (!seasonId) {
      console.log('❌ No seasonId provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await StandingsService.getSeasonDivisionsWithStandings(seasonId, userId);
      // console.log('📊 Got divisions with standings:', data.length, 'divisions');
      // console.log('📊 Divisions data:', JSON.stringify(data, null, 2));
      
      // Extend data with results-related fields
      const extendedData: ExtendedDivisionWithStandings[] = data.map(div => ({
        ...div,
        results: [],
        resultsLoading: false,
        showResults: false,
        scrollProgress: 0,
        scrollViewWidth: 0,
        contentWidth: 0,
      }));
      
      setDivisionsWithStandings(extendedData);

      // Find which division the user is in
      const userDiv = data.find(d => d.userStanding);
      if (userDiv) {
        setUserDivisionId(userDiv.division.id);
      }

      setDivisionsWithStandings((prevDivisions) =>
        prevDivisions.map((div) => ({ ...div, resultsLoading: true }))
      );

      // Then fetch results for all divisions
      extendedData.forEach((divisionData) => {
        fetchResultsForDivision(divisionData.division.id);
      });
    } catch (error) {
      console.error('Error fetching standings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResultsForDivision = async (divId: string) => {
    try {
      // Set loading for this specific division
      setDivisionsWithStandings((prevDivisions) =>
        prevDivisions.map((div) =>
          div.division.id === divId ? { ...div, resultsLoading: true } : div
        )
      );

      const response = await axiosInstance.get(
        endpoints.match.getDivisionResults(divId),
        { params: { limit: 10 } }
      );

      console.log(`🏆 Results response for division ${divId}:`, response.data);

      const matchesData = response.data.matches || response.data.data || [];
      
      // Update the specific division with results
      setDivisionsWithStandings((prevDivisions) =>
        prevDivisions.map((div) =>
          div.division.id === divId
            ? { ...div, results: matchesData, resultsLoading: false }
            : div
        )
      );
    } catch (error) {
      console.error(`Error fetching results for division ${divId}:`, error);
      setDivisionsWithStandings((prevDivisions) =>
        prevDivisions.map((div) =>
          div.division.id === divId
            ? { ...div, results: [], resultsLoading: false }
            : div
        )
      );
    }
  };

  const toggleShowResults = (divId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDivisionsWithStandings((prevDivisions) =>
      prevDivisions.map((div) => {
        if (div.division.id === divId) {
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

  const handlePlayerPress = (playerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/player-profile/[id]' as any,
      params: { id: playerId }
    });
  };

  const handleViewMatches = (divisionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to matches view filtered by division
    router.push({
      pathname: '/match-history' as any,
      params: { divisionId, seasonId }
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
            {match.isWalkover ? <Text style={styles.cardWalkover}>W/O</Text> : null}
        </View>

          {/* Team 2 */}
          <View style={styles.cardTeamSection}>
            {renderTeamPhotos(match.team2Players, isTeam2Winner)}
            {renderTeamNames(match.team2Players, isTeam2Winner)}
            </View>
        </View>

        {/* Set Scores Table */}
        {scores && scores.length > 0 ? (
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
                : (match.setScores || []).map((set, idx) => {
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
                          {set.hasTiebreak && set.team1Tiebreak != null ? (
                            <Text style={styles.cardTiebreakScore}>
                              ({set.team1Tiebreak})
                            </Text>
                          ) : null}
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
                : (match.setScores || []).map((set, idx) => {
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
                          {set.hasTiebreak && set.team2Tiebreak != null ? (
                            <Text style={styles.cardTiebreakScore}>
                              ({set.team2Tiebreak})
                            </Text>
                          ) : null}
                        </Text>
                      </View>
                    );
                  })}
            </View>
          </View>
        ) : null}

        {/* Comment Section */}
        {match.resultComment ? (
          <View style={styles.cardCommentSection}>
            <Ionicons name="thumbs-up" size={16} color="#868686" />
            <Text style={styles.cardCommentText} numberOfLines={2}>
              {match.resultComment}
          </Text>
        </View>
        ) : null}
      </View>
    );
  };

  const renderStandingRow = (standing: StandingEntry, index: number, isUserRow: boolean, isUserDivision: boolean) => {
    const playerId = standing.userId || standing.odlayerId || standing.user?.id;
    const playerName = standing.user?.name || standing.odlayerName || 'Unknown Player';
    const playerImage = standing.user?.image || standing.odlayerImage;
    const playerInitial = playerName.charAt(0).toUpperCase();

    return (
      <View
        key={standing.id || `standing-${index}`}
        style={styles.playerCard}
      >
        {/* Rank */}
        <View style={styles.rankCell}>
          <Text style={styles.rankText}>{standing.rank || index + 1}</Text>
        </View>

        {/* Player */}
        <View style={styles.playerCell}>
          <View style={styles.playerAvatar}>
            {playerImage ? (
              <Image source={{ uri: playerImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {playerInitial}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.playerName} numberOfLines={1}>
            {playerName}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statCell}>
          <Text style={styles.statText}>{standing.matchesPlayed}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{standing.wins}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statText}>{standing.losses}</Text>
        </View>
        <View style={styles.ptsCell}>
          <Text style={styles.ptsText}>{standing.totalPoints}pts</Text>
        </View>
      </View>
    );
  };

  const renderDivisionCard = (divisionData: ExtendedDivisionWithStandings) => {
    const { division, standings, userStanding, results, resultsLoading, showResults, scrollProgress, scrollViewWidth, contentWidth } = divisionData;
    const isUserDivision = userDivisionId === division.id;

    // Conditional styling for division container - matching divisionstandings.tsx
    const divisionContainerStyle = [
      styles.divisionContainer,
      { marginBottom: 20 },
      isUserDivision 
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
      <View 
        key={division.id} 
        style={divisionContainerStyle}
      >
        {/* Division Header - Sport themed */}
        <View style={[styles.divisionHeader, { backgroundColor: sportColors.background }]}>
          <Text style={styles.divisionName}>{division.name}</Text>
          {/* View Matches button commented out for now */}
          {/* <TouchableOpacity
            style={styles.viewMatchesButton}
                onPress={() => handleViewMatches(division.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewMatchesText}>View Matches</Text>
          </TouchableOpacity> */}
          </View>

        {/* Standings Table Container - Always show all divisions */}
        <View style={[
          styles.standingsTableContainer,
          isUserDivision 
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
            ) : (
              standings.map((standing, index) => {
                const isUserRow = userId && (
                  standing.userId === userId || 
                  standing.odlayerId === userId || 
                  standing.user?.id === userId
                );
                return renderStandingRow(standing, index, !!isUserRow, isUserDivision);
              })
            )}
          </View>
        </View>

        {/* View Results Toggle */}
            <TouchableOpacity 
          style={styles.viewResultsButton}
          onPress={() => toggleShowResults(divisionData.division.id)}
          activeOpacity={0.7}
            >
              <Text style={styles.viewResultsText}>View Results</Text>
          <Ionicons
            name={divisionData.showResults ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#F09433"
          />
            </TouchableOpacity>

        {/* Results Section - Horizontal Scroll */}
        {divisionData.showResults && (
          <View style={styles.resultsSectionNew}>
            {divisionData.resultsLoading ? (
              <View style={styles.resultsLoadingContainer}>
                <ActivityIndicator size="small" color={sportColors.background} />
                <Text style={styles.resultsLoadingText}>Loading results...</Text>
              </View>
            ) : !divisionData.results || divisionData.results.length === 0 ? (
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
                    setDivisionsWithStandings((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.division.id === divisionData.division.id
                          ? { ...div, scrollProgress: progress }
                          : div
                      )
                    );
                  }}
                  onContentSizeChange={(width) => {
                    setDivisionsWithStandings((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.division.id === divisionData.division.id
                          ? { ...div, contentWidth: width }
                          : div
                      )
                    );
                  }}
                  onLayout={(event) => {
                    const layoutWidth = event.nativeEvent.layout.width;
                    setDivisionsWithStandings((prevDivisions) =>
                      prevDivisions.map((div) =>
                        div.division.id === divisionData.division.id
                          ? { ...div, scrollViewWidth: layoutWidth }
                          : div
                      )
                    );
                  }}
                  scrollEventThrottle={16}
                >
                  {divisionData.results.map((match, index) => renderResultCard(match, index, divisionData.results!.length))}
                </ScrollView>
                {/* Progress Slider */}
                {divisionData.contentWidth && divisionData.scrollViewWidth && divisionData.contentWidth > divisionData.scrollViewWidth ? (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${(divisionData.scrollViewWidth / divisionData.contentWidth) * 100}%`,
                            left: `${(divisionData.scrollProgress || 0) * (100 - (divisionData.scrollViewWidth / divisionData.contentWidth) * 100)}%`,
                            backgroundColor: sportColors.background,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: sportColors.badgeColor }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#000000ff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.seasonTitle}>{seasonName || 'Season 1 (2025)'}</Text>
          <Text style={styles.leagueTitle}>{leagueName || 'League'}</Text>
          <View style={styles.dateRange}>
            {startDate && <Text style={styles.dateText}>Start date: {formatDate(startDate)}</Text>}
            {endDate && <Text style={styles.dateText}>End date: {formatDate(endDate)}</Text>}
            </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Standings Section */}
        <View style={styles.standingsSection}>
        <Text style={styles.standingsTitle}>Standings</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sportColors.background} />
              <Text style={styles.loadingText}>Loading divisions...</Text>
          </View>
        ) : divisionsWithStandings.length === 0 ? (
          <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Divisions Found</Text>
              <Text style={styles.emptyText}>
                No divisions available for this season
            </Text>
          </View>
        ) : (
            divisionsWithStandings.map(renderDivisionCard)
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
    paddingHorizontal: 20,
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
  },
  seasonTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  leagueTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateRange: {
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#000000',
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
    minWidth: 0,
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
  // Results section styles
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
  cardCommentText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#868686',
    lineHeight: 16,
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
