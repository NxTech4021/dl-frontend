/**
 * StandingsScoreCard
 * A compact match-result card designed specifically for the standings /
 * divisionstandings horizontal scroll list.  It is completely independent of
 * the main ScoreCard component and its PREVIEW constants.
 */

import SportIcon from '@/components/SportIcon';
import { format, isValid } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MatchResult, SportColors } from '../types';

interface StandingsScoreCardProps {
  match: MatchResult;
  sportColors: SportColors;
}

type CardPlayer = { name?: string | null; image?: string | null };

const fallbackPlayer = (label: string): CardPlayer => ({ name: label, image: null });

const StandingsScoreCard: React.FC<StandingsScoreCardProps> = ({ match, sportColors }) => {
  const rawT1 = Array.isArray(match.team1Players) ? match.team1Players.filter(Boolean) : [];
  const rawT2 = Array.isArray(match.team2Players) ? match.team2Players.filter(Boolean) : [];
  const isSingles = Math.max(rawT1.length, rawT2.length) <= 1;

  const t1: [CardPlayer, CardPlayer] = [
    rawT1[0] ?? fallbackPlayer('P1'),
    rawT1[1] ?? fallbackPlayer('P2'),
  ];
  const t2: [CardPlayer, CardPlayer] = [
    rawT2[0] ?? fallbackPlayer('P1'),
    rawT2[1] ?? fallbackPlayer('P2'),
  ];

  const isT1Winner = match.outcome === 'team1';
  const isT2Winner = match.outcome === 'team2';

  const scores =
    (match.gameScores?.length ?? 0) > 0 ? match.gameScores : match.setScores ?? [];
  const displayScores = scores.length === 2 ? [...scores, { __placeholder: true }] : scores;

  const parsedDate = new Date(match.matchDate);
  const dateStr = isValid(parsedDate) ? format(parsedDate, 'd MMM yyyy, h:mm a') : 'Date TBD';

  const divisionName =
    (match as any).division?.name ?? (match as any).divisionName ?? '';
  const isFriendly = match.isFriendly ?? false;
  const matchTypeLabel = isFriendly ? 'Friendly' : 'League';
  const matchTypeBorderColor = isFriendly ? '#83CFF9' : '#FEA04D';
  const matchTypeTextColor = isFriendly ? '#83CFF9' : '#FEA04D';

  const renderAvatar = (player: CardPlayer, size = 28) => {
    if (player.image) {
      return (
        <Image
          source={{ uri: player.image }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    return (
      <View style={[styles.avatarDefault, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarLetter, { fontSize: size * 0.42 }]}>
          {player.name?.charAt(0).toUpperCase() ?? 'P'}
        </Text>
      </View>
    );
  };

  const firstName = (name: string | null | undefined) => {
    if (!name) return 'Player';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[0] : name;
  };

  // gradient colour derived from sportColors
  const r = parseInt(sportColors.background.slice(1, 3), 16);
  const g = parseInt(sportColors.background.slice(3, 5), 16);
  const b = parseInt(sportColors.background.slice(5, 7), 16);

  return (
    <View style={styles.card}>
      {/* ── Header ─────────────────────────────────────── */}
      <LinearGradient
        colors={[`rgba(${r},${g},${b},0.10)`, '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <SportIcon
              sport={match.sport ?? ''}
              size={16}
              color={sportColors.background}
            />
            <View style={styles.headerText}>
              <Text style={styles.leagueName} numberOfLines={1}>
                {match.leagueName ?? 'Match'}
              </Text>
              {divisionName ? (
                <Text style={styles.divisionName} numberOfLines={1}>
                  {divisionName}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={[styles.badge, { borderColor: matchTypeBorderColor }]}>
            <Text style={[styles.badgeText, { color: matchTypeTextColor }]}>
              {matchTypeLabel}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Match location ─────────────────────────────── */}
      <Text style={styles.venue} numberOfLines={1}>
        {match.location ?? 'Venue TBD'}
      </Text>

      {/* ── Main score row ─────────────────────────────── */}
      <View style={styles.scoreRow}>
        {/* Team 1 */}
        <View style={styles.teamCol}>
          {isSingles ? (
            <View style={styles.playerRow}>
              {renderAvatar(t1[0])}
              <Text
                style={[styles.playerName, isT1Winner ? styles.winner : styles.loser]}
                numberOfLines={1}
              >
                {firstName(t1[0].name)}
              </Text>
            </View>
          ) : (
            <View style={styles.doublesCol}>
              <View style={styles.doublesAvatars}>
                {renderAvatar(t1[0], 22)}
                <View style={{ marginLeft: -8 }}>{renderAvatar(t1[1], 22)}</View>
              </View>
              <Text
                style={[styles.doublesName, isT1Winner ? styles.winner : styles.loser]}
                numberOfLines={1}
              >
                {firstName(t1[0].name)} / {firstName(t1[1].name)}
              </Text>
            </View>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreNum}>{match.team1Score ?? 0}</Text>
          <Text style={styles.scoreDash}>–</Text>
          <Text style={styles.scoreNum}>{match.team2Score ?? 0}</Text>
        </View>

        {/* Team 2 */}
        <View style={[styles.teamCol, styles.teamColRight]}>
          {isSingles ? (
            <View style={[styles.playerRow, { flexDirection: 'row-reverse' }]}>
              {renderAvatar(t2[0])}
              <Text
                style={[styles.playerName, { textAlign: 'right' }, isT2Winner ? styles.winner : styles.loser]}
                numberOfLines={1}
              >
                {firstName(t2[0].name)}
              </Text>
            </View>
          ) : (
            <View style={styles.doublesCol}>
              <View style={styles.doublesAvatars}>
                {renderAvatar(t2[0], 22)}
                <View style={{ marginLeft: -8 }}>{renderAvatar(t2[1], 22)}</View>
              </View>
              <Text
                style={[styles.doublesName, { textAlign: 'right' }, isT2Winner ? styles.winner : styles.loser]}
                numberOfLines={1}
              >
                {firstName(t2[0].name)} / {firstName(t2[1].name)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Date ───────────────────────────────────────── */}
      <Text style={styles.date}>{dateStr}</Text>

      {/* ── Sets breakdown ─────────────────────────────── */}
      {scores.length > 0 && (
        <View style={styles.setsSection}>
          {/* Header row */}
          <View style={[styles.setsHeaderRow, { backgroundColor: sportColors.background }]}>
            <Text style={[styles.setsHeaderCell, styles.setsNameCell]}>Sets</Text>
            {displayScores.map((_, i) => (
              <Text key={i} style={[styles.setsHeaderCell, styles.setsNumCell]}>
                {['1st', '2nd', '3rd', '4th', '5th'][i] ?? `${i + 1}th`}
              </Text>
            ))}
          </View>
          {/* Team rows */}
          {[
            { players: t1, isWinner: isT1Winner, scoreKey: 'team1' as const },
            { players: t2, isWinner: isT2Winner, scoreKey: 'team2' as const },
          ].map(({ players, isWinner, scoreKey }, rowIdx) => {
            const oppKey = scoreKey === 'team1' ? 'team2' : 'team1';
            return (
              <View key={rowIdx} style={styles.setsDataRow}>
                <Text style={[styles.setsNameCell, styles.setsDataNameText]} numberOfLines={1}>
                  {isSingles
                    ? firstName(players[0].name)
                    : `${firstName(players[0].name)}, ${firstName(players[1].name)}`}
                </Text>
                {displayScores.map((s: any, i) => {
                  const isPlaceholder = !!s.__placeholder;
                  const myScore = isPlaceholder ? '-' : (s[`${scoreKey}Games`] ?? s[`${scoreKey}Points`] ?? '-');
                  const oppScore = isPlaceholder ? '-' : (s[`${oppKey}Games`] ?? s[`${oppKey}Points`] ?? '-');
                  const isHigher = !isPlaceholder && Number(myScore) > Number(oppScore);
                  return (
                    <Text
                      key={i}
                      style={[
                        styles.setsNumCell,
                        styles.setsDataNumText,
                        isHigher && { color: sportColors.background, fontWeight: '800' },
                      ]}
                    >
                      {isPlaceholder ? '-' : myScore}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  // Header
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  headerText: {
    flex: 1,
  },
  leagueName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  divisionName: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7280',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  // Venue
  venue: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginTop: 2,
  },
  // Score row
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  teamCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamColRight: {
    alignItems: 'flex-end',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  playerName: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  doublesCol: {
    alignItems: 'flex-start',
    gap: 2,
  },
  doublesAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doublesName: {
    fontSize: 9,
    fontWeight: '600',
  },
  winner: {
    color: '#111827',
    fontWeight: '800',
  },
  loser: {
    color: '#6B7280',
    fontWeight: '500',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  scoreNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  scoreDash: {
    fontSize: 22,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  // Date
  date: {
    fontSize: 9,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
  // Sets
  setsSection: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  setsDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  setsHeaderCell: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  setsNameCell: {
    flex: 1,
    textAlign: 'left',
  },
  setsNumCell: {
    width: 28,
    textAlign: 'center',
  },
  setsDataNameText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
  },
  setsDataNumText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  // Avatars
  avatarDefault: {
    backgroundColor: '#6DE9A0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default StandingsScoreCard;
