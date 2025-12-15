import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBackendBaseURL } from '@/src/config/network';
import { useSession } from '@/lib/auth-client';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 64; // Account for padding
const CARD_MARGIN = 8;

interface Player {
  id: string;
  name: string;
  image?: string;
}

interface SetScore {
  setNumber: number;
  team1Games: number;
  team2Games: number;
}

interface MatchResult {
  id: string;
  matchDate: string;
  matchType: 'SINGLES' | 'DOUBLES';
  status: string;
  location?: string;
  team1Score: number;
  team2Score: number;
  setScores: SetScore[];
  team1Players: Player[];
  team2Players: Player[];
  comments?: { playerId: string; playerName: string; comment: string }[];
  winner: 'team1' | 'team2' | null;
}

interface DivisionMatchResultsProps {
  divisionId: string;
  seasonId: string;
  themeColor?: string;
  limit?: number;
}

export const DivisionMatchResults: React.FC<DivisionMatchResultsProps> = ({
  divisionId,
  seasonId,
  themeColor = '#F09433',
  limit = 3,
}) => {
  const { data: session } = useSession();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchDivisionMatches();
  }, [divisionId, seasonId]);

  const fetchDivisionMatches = async () => {
    try {
      setLoading(true);
      const backendUrl = getBackendBaseURL();
      
      // Use the new division-specific endpoint that doesn't require user participation
      const url = `${backendUrl}/api/match/division/${divisionId}/results?limit=${limit}${seasonId ? `&seasonId=${seasonId}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session?.user?.id || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const processedMatches = processMatchData(data.matches || []);
        setMatches(processedMatches);
      }
    } catch (error) {
      console.error('Error fetching division matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMatchData = (rawMatches: any[]): MatchResult[] => {
    return rawMatches.map((match: any) => {
      // Check if data is already pre-processed (from new endpoint)
      let team1Players: Player[] = [];
      let team2Players: Player[] = [];

      // New endpoint returns team1Players/team2Players directly
      if (match.team1Players && Array.isArray(match.team1Players)) {
        team1Players = match.team1Players.map((p: any) => ({
          id: p.id || '',
          name: p.name || 'Unknown',
          image: p.image,
        }));
      }
      if (match.team2Players && Array.isArray(match.team2Players)) {
        team2Players = match.team2Players.map((p: any) => ({
          id: p.id || '',
          name: p.name || 'Unknown',
          image: p.image,
        }));
      }

      // Fallback: process participants if teams not pre-processed
      if (team1Players.length === 0 && team2Players.length === 0 && match.participants) {
        match.participants.forEach((p: any) => {
          const player: Player = {
            id: p.userId || p.user?.id || '',
            name: p.user?.name || p.name || 'Unknown',
            image: p.user?.image || p.image,
          };

          if (p.team === 'team1' || p.team === 'TEAM_A') {
            team1Players.push(player);
          } else {
            team2Players.push(player);
          }
        });

        // If still no team info, split evenly
        if (team1Players.length === 0 && team2Players.length === 0) {
          const half = Math.ceil(match.participants.length / 2);
          match.participants.forEach((p: any, index: number) => {
            const player: Player = {
              id: p.userId || p.user?.id || '',
              name: p.user?.name || p.name || 'Unknown',
              image: p.user?.image || p.image,
            };
            if (index < half) {
              team1Players.push(player);
            } else {
              team2Players.push(player);
            }
          });
        }
      }

      // Process set scores
      let setScores: SetScore[] = [];
      if (match.setScores && Array.isArray(match.setScores)) {
        setScores = match.setScores.map((s: any, i: number) => ({
          setNumber: s.setNumber || i + 1,
          team1Games: s.team1Games ?? s.team1Points ?? s.player1Games ?? 0,
          team2Games: s.team2Games ?? s.team2Points ?? s.player2Games ?? 0,
        }));
      } else if (match.scores) {
        const parsed = typeof match.scores === 'string' 
          ? JSON.parse(match.scores) 
          : match.scores;
        setScores = parsed.map((s: any, i: number) => ({
          setNumber: s.setNumber || i + 1,
          team1Games: s.team1Games ?? s.player1Games ?? 0,
          team2Games: s.team2Games ?? s.player2Games ?? 0,
        }));
      }

      // Determine winner
      let winner: 'team1' | 'team2' | null = null;
      if (match.outcome === 'team1' || match.outcome === 'TEAM_A') {
        winner = 'team1';
      } else if (match.outcome === 'team2' || match.outcome === 'TEAM_B') {
        winner = 'team2';
      } else if (match.team1Score !== null && match.team2Score !== null) {
        winner = match.team1Score > match.team2Score ? 'team1' : 'team2';
      }

      // Process comments
      const comments: { playerId: string; playerName: string; comment: string }[] = [];
      if (match.resultComment) {
        comments.push({
          playerId: match.resultSubmittedBy?.id || '',
          playerName: match.resultSubmittedBy?.name || 'Player',
          comment: match.resultComment,
        });
      }

      return {
        id: match.id,
        matchDate: match.matchDate,
        matchType: match.matchType,
        status: match.status,
        location: match.location || match.venue,
        team1Score: match.team1Score ?? 0,
        team2Score: match.team2Score ?? 0,
        setScores,
        team1Players,
        team2Players,
        comments,
        winner,
      };
    });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (CARD_WIDTH + CARD_MARGIN * 2));
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handleMatchPress = (matchId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to match details
    router.push({
      pathname: '/match/match-details' as any,
      params: { matchId },
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const renderPlayerAvatar = (player: Player, size: number = 40) => {
    const initial = player.name?.charAt(0)?.toUpperCase() || '?';
    
    return player.image ? (
      <Image source={{ uri: player.image }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />
    ) : (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>{initial}</Text>
      </View>
    );
  };

  const renderSinglesMatch = (match: MatchResult) => {
    const player1 = match.team1Players[0];
    const player2 = match.team2Players[0];
    const isPlayer1Winner = match.winner === 'team1';
    const isPlayer2Winner = match.winner === 'team2';

    return (
      <View style={styles.matchPlayersRow}>
        {/* Player 1 */}
        <View style={styles.playerSide}>
          {renderPlayerAvatar(player1, 48)}
          <Text style={[styles.playerName, isPlayer1Winner && styles.winnerName]} numberOfLines={1}>
            {player1?.name?.split(' ')[0] || 'Player 1'} {player1?.name?.split(' ')[1]?.charAt(0) || ''}.
          </Text>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, isPlayer1Winner && styles.winnerScore]}>
            {match.team1Score}
          </Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={[styles.scoreText, isPlayer2Winner && styles.winnerScore]}>
            {match.team2Score}
          </Text>
          <Text style={styles.dateText}>{formatDate(match.matchDate)}</Text>
        </View>

        {/* Player 2 */}
        <View style={styles.playerSide}>
          {renderPlayerAvatar(player2, 48)}
          <Text style={[styles.playerName, isPlayer2Winner && styles.winnerName]} numberOfLines={1}>
            {player2?.name?.split(' ')[0] || 'Player 2'} {player2?.name?.split(' ')[1]?.charAt(0) || ''}.
          </Text>
        </View>
      </View>
    );
  };

  const renderDoublesMatch = (match: MatchResult) => {
    const isTeam1Winner = match.winner === 'team1';
    const isTeam2Winner = match.winner === 'team2';

    return (
      <View style={styles.matchPlayersRow}>
        {/* Team 1 */}
        <View style={styles.teamSide}>
          <View style={styles.doublesAvatars}>
            {match.team1Players.slice(0, 2).map((player, idx) => (
              <View key={player.id || idx} style={[styles.doublesAvatarWrapper, idx === 1 && styles.doublesAvatarOverlap]}>
                {renderPlayerAvatar(player, 36)}
              </View>
            ))}
          </View>
          <View style={styles.doublesNames}>
            {match.team1Players.slice(0, 2).map((player, idx) => (
              <Text 
                key={player.id || idx} 
                style={[styles.doublesName, isTeam1Winner && styles.winnerName]} 
                numberOfLines={1}
              >
                {player?.name?.split(' ')[0] || 'Player'} {player?.name?.split(' ')[1]?.charAt(0) || ''}.
              </Text>
            ))}
          </View>
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, isTeam1Winner && styles.winnerScore]}>
            {match.team1Score}
          </Text>
          <Text style={styles.scoreSeparator}>-</Text>
          <Text style={[styles.scoreText, isTeam2Winner && styles.winnerScore]}>
            {match.team2Score}
          </Text>
          <Text style={styles.dateText}>{formatDate(match.matchDate)}</Text>
        </View>

        {/* Team 2 */}
        <View style={styles.teamSide}>
          <View style={styles.doublesAvatars}>
            {match.team2Players.slice(0, 2).map((player, idx) => (
              <View key={player.id || idx} style={[styles.doublesAvatarWrapper, idx === 1 && styles.doublesAvatarOverlap]}>
                {renderPlayerAvatar(player, 36)}
              </View>
            ))}
          </View>
          <View style={styles.doublesNames}>
            {match.team2Players.slice(0, 2).map((player, idx) => (
              <Text 
                key={player.id || idx} 
                style={[styles.doublesName, isTeam2Winner && styles.winnerName]} 
                numberOfLines={1}
              >
                {player?.name?.split(' ')[0] || 'Player'} {player?.name?.split(' ')[1]?.charAt(0) || ''}.
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderSetScores = (match: MatchResult) => {
    const isTeam1Winner = match.winner === 'team1';
    const isTeam2Winner = match.winner === 'team2';
    const player1Name = match.matchType === 'DOUBLES' 
      ? `${match.team1Players[0]?.name?.split(' ')[0] || 'Team 1'}` 
      : `${match.team1Players[0]?.name?.split(' ')[0] || 'Player 1'} ${match.team1Players[0]?.name?.split(' ')[1]?.charAt(0) || ''}.`;
    const player2Name = match.matchType === 'DOUBLES' 
      ? `${match.team2Players[0]?.name?.split(' ')[0] || 'Team 2'}`
      : `${match.team2Players[0]?.name?.split(' ')[0] || 'Player 2'} ${match.team2Players[0]?.name?.split(' ')[1]?.charAt(0) || ''}.`;

    return (
      <View style={styles.setScoresContainer}>
        {/* Header Row */}
        <View style={styles.setScoreHeader}>
          <View style={[styles.setBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.setBadgeText}>Best of 3</Text>
          </View>
          {match.setScores.slice(0, 3).map((_, idx) => (
            <Text key={idx} style={styles.setHeaderText}>{idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}</Text>
          ))}
        </View>

        {/* Player 1 Scores */}
        <View style={styles.setScoreRow}>
          <Text style={[styles.setPlayerName, isTeam1Winner && styles.winnerName]} numberOfLines={1}>
            {player1Name}
          </Text>
          {match.setScores.slice(0, 3).map((set, idx) => (
            <Text 
              key={idx} 
              style={[
                styles.setScore, 
                set.team1Games > set.team2Games && styles.winningSetScore
              ]}
            >
              {set.team1Games}
            </Text>
          ))}
          {isTeam1Winner && (
            <Ionicons name="trophy" size={14} color="#F09433" style={styles.trophyIcon} />
          )}
        </View>

        {/* Player 2 Scores */}
        <View style={styles.setScoreRow}>
          <Text style={[styles.setPlayerName, isTeam2Winner && styles.winnerName]} numberOfLines={1}>
            {player2Name}
          </Text>
          {match.setScores.slice(0, 3).map((set, idx) => (
            <Text 
              key={idx} 
              style={[
                styles.setScore, 
                set.team2Games > set.team1Games && styles.winningSetScore
              ]}
            >
              {set.team2Games}
            </Text>
          ))}
          {isTeam2Winner && (
            <Ionicons name="trophy" size={14} color="#F09433" style={styles.trophyIcon} />
          )}
        </View>
      </View>
    );
  };

  const renderComments = (match: MatchResult) => {
    if (!match.comments || match.comments.length === 0) return null;

    return (
      <View style={styles.commentsContainer}>
        {match.comments.map((comment, idx) => (
          <View key={idx} style={styles.commentRow}>
            <Ionicons name="chatbubble" size={12} color={themeColor} style={styles.commentIcon} />
            <Text style={styles.commentText}>
              <Text style={styles.commentAuthor}>{comment.playerName}: </Text>
              {comment.comment}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderMatchCard = (match: MatchResult, index: number) => {
    return (
      <TouchableOpacity
        key={match.id}
        style={styles.matchCard}
        onPress={() => handleMatchPress(match.id)}
        activeOpacity={0.9}
      >
        {/* Location Header */}
        <View style={styles.matchHeader}>
          <Text style={styles.locationText}>{match.location || 'Unknown Venue'}</Text>
        </View>

        {/* Players and Score */}
        {match.matchType === 'DOUBLES' 
          ? renderDoublesMatch(match) 
          : renderSinglesMatch(match)
        }

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: themeColor }]} />

        {/* Set Scores */}
        {match.setScores.length > 0 && renderSetScores(match)}

        {/* Comments */}
        {renderComments(match)}
      </TouchableOpacity>
    );
  };

  const renderPaginationDots = () => {
    if (matches.length <= 1) return null;

    return (
      <View style={styles.pagination}>
        {matches.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && [styles.paginationDotActive, { backgroundColor: themeColor }],
            ]}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={themeColor} />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="tennisball-outline" size={32} color="#9CA3AF" />
        <Text style={styles.emptyText}>No completed matches yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {matches.map((match, index) => renderMatchCard(match, index))}
      </ScrollView>
      {renderPaginationDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: CARD_MARGIN,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  matchCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  matchHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  matchPlayersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  playerSide: {
    alignItems: 'center',
    flex: 1,
  },
  teamSide: {
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginBottom: 6,
  },
  avatarPlaceholder: {
    backgroundColor: '#FEA04D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    maxWidth: 80,
  },
  winnerName: {
    fontWeight: '700',
    color: '#111827',
  },
  doublesAvatars: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  doublesAvatarWrapper: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 20,
  },
  doublesAvatarOverlap: {
    marginLeft: -12,
  },
  doublesNames: {
    alignItems: 'center',
  },
  doublesName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  winnerScore: {
    color: '#111827',
  },
  scoreSeparator: {
    fontSize: 20,
    color: '#D1D5DB',
    marginVertical: -4,
  },
  dateText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  divider: {
    height: 3,
    borderRadius: 2,
    marginVertical: 12,
  },
  setScoresContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  setScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  setBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 'auto',
  },
  setBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    width: 36,
    textAlign: 'center',
  },
  setScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  setPlayerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  setScore: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    width: 36,
    textAlign: 'center',
  },
  winningSetScore: {
    fontWeight: '700',
    color: '#F09433',
  },
  trophyIcon: {
    marginLeft: 4,
  },
  commentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  commentText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  commentAuthor: {
    fontWeight: '600',
    color: '#374151',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  paginationDotActive: {
    width: 18,
    backgroundColor: '#F09433',
  },
});

export default DivisionMatchResults;
