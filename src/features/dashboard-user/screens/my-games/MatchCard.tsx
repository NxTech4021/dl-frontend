import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from './types';
import { matchCardStyles as styles } from './styles';
import { ParticipantsRow } from './ParticipantsRow';
import { formatTimeRange, getMatchTime } from './utils';
import { resolveMatchStatus } from './statusResolver';
import { FriendlyBadge } from '@/src/features/friendly/components/FriendlyBadge';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const matchTime = getMatchTime(match);
  const resolvedStatus = resolveMatchStatus({ match, matchTime });
  const statusInfo = resolvedStatus.primary;

  const renderFeeText = () => {
    if (match.fee === 'FREE') return 'Free';
    if (!match.fee || !match.feeAmount) return 'Fee TBD';
    const totalAmount = Number(match.feeAmount);
    if (match.fee === 'SPLIT') {
      const numPlayers = match.matchType === 'DOUBLES' ? 4 : 2;
      const perPlayer = (totalAmount / numPlayers).toFixed(2);
      return `Split · RM${perPlayer} per player`;
    }
    return `Fixed · RM${totalAmount.toFixed(2)} per player`;
  };

  return (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => onPress(match)}
      activeOpacity={0.7}
    >
      {/* Players Row with LEAGUE/FRIENDLY Badge */}
      <View style={styles.cardTopSection}>
        <ParticipantsRow participants={match.participants} matchType={match.matchType} />
        {match.isFriendly ? (
          <FriendlyBadge />
        ) : (
        <View style={styles.leagueBadgeCard}>
          <Text style={styles.leagueBadgeCardText}>LEAGUE</Text>
        </View>
        )}
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Match Info Section */}
      <View style={styles.cardInfoSection}>
        <Text style={styles.matchTitleText}>
          {match.matchType === 'DOUBLES' ? 'Doubles' : 'Singles'} {match.isFriendly ? 'Friendly' : 'League'} Match
        </Text>

        <View style={styles.cardInfoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>
            {formatTimeRange(matchTime) || 'Time TBD'}
          </Text>
        </View>

        <View style={styles.cardInfoRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>{match.location || 'Location TBD'}</Text>
        </View>

        {/* Fee Info */}
        <View style={styles.cardInfoRow}>
          <Text style={styles.feeIcon}>$</Text>
          <Text style={styles.cardInfoText}>{renderFeeText()}</Text>
        </View>

        {/* Status Badge */}
        <View style={styles.cardFooterRow}>
          {resolvedStatus.secondary && (
            <Text style={styles.secondaryStatusText}>{resolvedStatus.secondary}</Text>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.cardStatusBadge, { backgroundColor: statusInfo.bg }]}>
            {resolvedStatus.icon && (
              <Ionicons
                name={resolvedStatus.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={statusInfo.text}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.cardStatusText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
