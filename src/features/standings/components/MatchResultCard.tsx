import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { MatchPlayer, MatchResult, SportColors } from '../types';
import { formatPlayerName, getOrdinalSuffix } from '../utils';

interface MatchResultCardProps {
  match: MatchResult;
  index: number;
  totalResults: number;
  sportColors: SportColors;
  isPickleball: boolean;
  cardWidth: number;
  cardGap: number;
  expandedComments: Set<string>;
  onToggleComments: (matchId: string) => void;
}

export const MatchResultCard: React.FC<MatchResultCardProps> = ({
  match,
  index,
  totalResults,
  sportColors,
  isPickleball,
  cardWidth,
  cardGap,
  expandedComments,
  onToggleComments,
}) => {
  const isTeam1Winner = match.outcome === 'team1';
  const isTeam2Winner = match.outcome === 'team2';
  const scores = isPickleball ? match.gameScores : match.setScores;
  const totalSets = scores?.length || 0;
  const isExpanded = expandedComments.has(match.id);

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

  const renderTeamPhotos = (players: MatchPlayer[]) => {
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
          {formatPlayerName(players[0].name, true)}
        </Text>
      );
    }

    // Doubles - comma-separated first names
    const names = players.map((p) => formatPlayerName(p.name, true)).join(', ');

    return (
      <Text style={nameStyle} numberOfLines={2}>
        {names}
      </Text>
    );
  };

  const renderScoresTable = () => {
    if (!scores || scores.length === 0) return null;

    return (
      <View style={styles.cardScoresTable}>
        {/* Table Header */}
        <View style={[styles.cardTableHeader, { backgroundColor: sportColors.background }]}>
          <View style={styles.cardTableHeaderLabelCell}>
            <Text style={styles.cardTableHeaderText}>Best of {totalSets}</Text>
          </View>
          {scores.map((_, idx) => (
            <View key={idx} style={styles.cardTableHeaderCell}>
              <Text style={styles.cardTableHeaderText}>
                {isPickleball ? idx + 1 : getOrdinalSuffix(idx + 1)}
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
              {formatPlayerName(match.team1Players[0].name, true)}
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
                        <Text style={styles.cardTiebreakScore}>({set.team1Tiebreak})</Text>
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
              {formatPlayerName(match.team2Players[0].name, true)}
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
                        <Text style={styles.cardTiebreakScore}>({set.team2Tiebreak})</Text>
                      )}
                    </Text>
                  </View>
                );
              })}
        </View>
      </View>
    );
  };

  const renderComments = () => {
    if (!match.comments || match.comments.length === 0) {
      // Fallback to old resultComment if no comments array
      if (match.resultComment) {
        return (
          <View style={styles.cardCommentSection}>
            <Ionicons name="thumbs-up" size={16} color={sportColors.background} />
            <Text style={styles.cardCommentText} numberOfLines={2}>
              {match.resultComment}
            </Text>
          </View>
        );
      }
      return null;
    }

    const displayedComments = isExpanded ? match.comments : match.comments.slice(0, 2);

    return (
      <View style={styles.cardCommentsContainer}>
        {displayedComments.map((commentItem) => (
          <View key={commentItem.id} style={styles.cardCommentItem}>
            <Ionicons
              name="thumbs-up"
              size={14}
              color={sportColors.background}
              style={styles.cardCommentThumb}
            />
            {commentItem.user.image ? (
              <Image source={{ uri: commentItem.user.image }} style={styles.cardCommentAvatar} />
            ) : (
              <View style={[styles.cardCommentAvatar, styles.cardCommentDefaultAvatar]}>
                <Text style={styles.cardCommentDefaultAvatarText}>
                  {commentItem.user.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <Text style={styles.cardCommentText} numberOfLines={2}>
              <Text style={styles.cardCommentAuthor}>
                {commentItem.user.name.split(' ')[0]}:
              </Text>{' '}
              {commentItem.comment}
            </Text>
          </View>
        ))}
        {match.comments.length > 2 && (
          <TouchableOpacity
            style={styles.viewMoreCommentsButton}
            onPress={() => onToggleComments(match.id)}
          >
            <Text style={[styles.viewMoreCommentsText, { color: sportColors.background }]}>
              {isExpanded
                ? 'View less'
                : `View ${match.comments.length - 2} more comment${match.comments.length - 2 > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const cardStyle: ViewStyle = {
    width: cardWidth,
    marginLeft: index === 0 ? 0 : cardGap,
    ...(index === totalResults - 1 && { marginRight: 0 }),
  };

  return (
    <View style={[styles.resultCardNew, cardStyle]}>
      {/* Venue Name */}
      <Text style={styles.cardVenueName}>{match.venue || 'Venue TBD'}</Text>

      {/* Score Display with Photos */}
      <View style={styles.cardScoreSection}>
        {/* Team 1 */}
        <View style={styles.cardTeamSection}>
          {renderTeamPhotos(match.team1Players)}
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
          {renderTeamPhotos(match.team2Players)}
          {renderTeamNames(match.team2Players, isTeam2Winner)}
        </View>
      </View>

      {/* Set Scores Table */}
      {renderScoresTable()}

      {/* Comments Section */}
      {renderComments()}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default MatchResultCard;
