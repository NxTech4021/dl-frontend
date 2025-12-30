import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const isSmallScreen = width < 375;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 12,
  },
  matchListWrapper: {
    flex: 1,
  },
  // Search styles - compact, above filters
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  // Controls container
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  // Chip styles
  chipsContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Filter button - compact circular style
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Loading styles
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
  // List styles
  listContent: {
    flexGrow: 1,
    padding: isSmallScreen ? 16 : 20,
    paddingBottom: 100,
  },
  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export const matchCardStyles = StyleSheet.create({
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallScreen ? 16 : 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  playerColumn: {
    alignItems: 'center',
    gap: 4,
  },
  playerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  playerImageLarge: {
    width: '100%',
    height: '100%',
  },
  defaultPlayerAvatarLarge: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8B4BC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPlayerTextLarge: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1C1E',
    maxWidth: 60,
    textAlign: 'center',
  },
  emptySlotColumn: {
    alignItems: 'center',
    gap: 4,
  },
  emptySlotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptySlotCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  leagueBadgeCard: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  leagueBadgeCardText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  cardInfoSection: {
    gap: 8,
  },
  matchTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  feeIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 16,
    textAlign: 'center',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cardStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  secondaryStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#9CA3AF',
  },
  secondaryStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  // Pending player styles
  playerAvatarWrapper: {
    position: 'relative',
  },
  playerAvatarPending: {
    opacity: 0.5,
  },
  playerNamePending: {
    opacity: 0.5,
  },
  pendingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Team divider for doubles matches
  teamDivider: {
    width: 1,
    height: 72,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
});

export const invitationCardStyles = StyleSheet.create({
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inviterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  inviterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  inviterAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  defaultInviterAvatar: {
    backgroundColor: '#FEA04D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviterInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  inviterTextContainer: {
    flex: 1,
  },
  inviterName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  inviterNameSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  invitationSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  sportBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sportBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Participants section
  participantsSection: {
    marginTop: 12,
  },
  participantsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatarContainer: {
    marginRight: -8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  defaultParticipantAvatar: {
    backgroundColor: '#E8B4BC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  moreParticipants: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreParticipantsText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  // Body section
  invitationBody: {
    gap: 8,
  },
  matchTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 2,
  },
  matchTypeSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 2,
  },
  divisionSeasonInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FEA04D',
    marginBottom: 4,
  },
  divisionInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FEA04D',
    marginBottom: 6,
  },
  // Chips container for division/season in header
  headerChipsContainer: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  headerChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  invitationDetails: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  infoTextSmall: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  feeIcon: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: 16,
    textAlign: 'center',
  },
  // Court booking badges
  courtBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
  },
  courtBookedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  courtNotBookedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
  },
  courtNotBookedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  // Expiry warning
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
  },
  expiryWarningText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  // Action buttons
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  invitationActionsCompact: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  declineButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineButtonCompact: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  declineButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  acceptButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FEA04D',
  },
  acceptButtonCompact: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FEA04D',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  acceptButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export const filterModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: '#A04DFE',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#A04DFE',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
