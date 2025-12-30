import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const CARD_WIDTH = SCREEN_WIDTH * 0.88;
export const CARD_GAP = 12;

export const standingsStyles = StyleSheet.create({
  // ============================================
  // Division Container
  // ============================================
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
  divisionContainerHighlighted: {
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
  },
  divisionContainerDefault: {
    backgroundColor: '#F6FAFC',
  },

  // ============================================
  // Division Header
  // ============================================
  divisionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#A04DFE',
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

  // ============================================
  // Standings Table Container
  // ============================================
  standingsTableContainer: {
    backgroundColor: '#E9F3F8',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  standingsTableContainerHighlighted: {
    backgroundColor: '#E9F3F8',
  },
  standingsTableContainerDefault: {
    backgroundColor: '#F6FAFC',
  },

  // ============================================
  // Table Header
  // ============================================
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

  // ============================================
  // Table Body
  // ============================================
  tableBody: {
    paddingHorizontal: 0,
    gap: 4,
  },

  // ============================================
  // Player Card (Row)
  // ============================================
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

  // ============================================
  // Team Avatars (Doubles)
  // ============================================
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

  // ============================================
  // View Results Button
  // ============================================
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

  // ============================================
  // Empty State
  // ============================================
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

  // ============================================
  // Loading State
  // ============================================
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // ============================================
  // Results Section
  // ============================================
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

  // ============================================
  // Result Card
  // ============================================
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

  // ============================================
  // Scores Table (inside Result Card)
  // ============================================
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

  // ============================================
  // Comments Section (inside Result Card)
  // ============================================
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

  // ============================================
  // Progress Bar
  // ============================================
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
