import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StandingsPlayer, StandingsTeam } from '../types';
import { formatTeamNames } from '../utils';
import { PlayerAvatar } from './PlayerAvatar';
import { TeamAvatars } from './TeamAvatars';
import { theme } from '@/src/core/theme/theme';

// LIGHT THEME (active)
const COLORS = {
  background: '#F6FAFC',
  cardBackground: '#FFFFFF',
  cardBackgroundHover: '#F9FAFB',
  cardBorder: 'rgba(0, 0, 0, 0.06)',
  gold: '#FFD700',
  goldDark: '#D4A800',
  goldGlow: 'rgba(255, 215, 0, 0.08)',
  silver: '#C0C0C0',
  silverDark: '#A8A8A8',
  silverGlow: 'rgba(192, 192, 192, 0.08)',
  bronze: '#CD7F32',
  bronzeDark: '#A66628',
  bronzeGlow: 'rgba(205, 127, 50, 0.08)',
  accent: '#FEA04D',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  highlightBorder: 'rgba(254, 160, 77, 0.4)',
  highlightBackground: 'rgba(254, 160, 77, 0.06)',
};

// DARK THEME — reserved for future dark mode
// const COLORS = {
//   background: '#0A0C10',
//   cardBackground: 'rgba(30, 35, 45, 0.9)',
//   cardBackgroundHover: 'rgba(40, 45, 55, 0.95)',
//   cardBorder: 'rgba(255, 255, 255, 0.06)',
//   gold: '#FFD700',
//   goldDark: '#D4A800',
//   goldGlow: 'rgba(255, 215, 0, 0.15)',
//   silver: '#C0C0C0',
//   silverDark: '#A8A8A8',
//   silverGlow: 'rgba(192, 192, 192, 0.12)',
//   bronze: '#CD7F32',
//   bronzeDark: '#A66628',
//   bronzeGlow: 'rgba(205, 127, 50, 0.12)',
//   accent: '#00D4FF',
//   textPrimary: '#FFFFFF',
//   textSecondary: '#9CA3AF',
//   textMuted: '#6B7280',
//   highlightBorder: 'rgba(0, 212, 255, 0.4)',
//   highlightBackground: 'rgba(0, 212, 255, 0.08)',
// };

interface StandingsRowProps {
  player?: StandingsPlayer;
  team?: StandingsTeam;
  rank: number;
  isDoubles?: boolean;
  isHighlighted?: boolean;
  isTop3?: boolean;
  medalGradient?: readonly [string, string];
  onPress?: (playerId: string) => void;
  accentColor?: string;
}

export const StandingsRow: React.FC<StandingsRowProps> = ({
  player,
  team,
  rank,
  isDoubles = false,
  isHighlighted = false,
  isTop3 = false,
  medalGradient = ['transparent', 'transparent'],
  onPress,
  accentColor = '#AB47BC',
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const isTeamRender = isDoubles && team && team.players.length > 1;

  // Get glow color based on rank
  const getGlowColor = (): string => {
    switch (rank) {
      case 1:
        return COLORS.goldGlow;
      case 2:
        return COLORS.silverGlow;
      case 3:
        return COLORS.bronzeGlow;
      default:
        return 'transparent';
    }
  };

  // Get rank icon or number
  const renderRankBadge = () => {
    if (isTop3) {
      return (
        <LinearGradient
          colors={medalGradient}
          style={styles.medalBadge}
        >
          {rank === 1 && <Ionicons name="trophy" size={14} color="#1A1A1A" />}
          {rank === 2 && <Text style={styles.medalNumber}>2</Text>}
          {rank === 3 && <Text style={styles.medalNumber}>3</Text>}
        </LinearGradient>
      );
    }

    return (
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{rank}</Text>
      </View>
    );
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (isTeamRender && team) {
        onPress(team.players[0]?.playerId);
      } else if (player) {
        onPress(player.playerId);
      }
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  // Get player data for rendering
  const playerData = player || team?.players[0];
  const played = isTeamRender ? team?.played : playerData?.played;
  const wins = isTeamRender ? team?.wins : playerData?.wins;
  const losses = isTeamRender ? team?.losses : playerData?.losses;
  const points = isTeamRender ? team?.points : playerData?.points;

  if (!playerData && !isTeamRender) return null;

  // Calculate win rate for visual indicator
  const totalMatches = (played || 0);
  const winRate = totalMatches > 0 ? ((wins || 0) / totalMatches) * 100 : 0;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress
    ? {
        onPress: handlePress,
        onPressIn: handlePressIn,
        onPressOut: handlePressOut,
        activeOpacity: 1,
      }
    : {};

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <Container {...containerProps}>
        <View
          style={[
            styles.rowContainer,
            isTop3 && styles.rowContainerTop3,
            isHighlighted && styles.rowContainerHighlighted,
            { backgroundColor: isTop3 ? getGlowColor() : COLORS.cardBackground },
          ]}
        >
          {/* Left Accent Bar for Top 3 */}
          {isTop3 && (
            <LinearGradient
              colors={medalGradient}
              style={styles.accentBar}
            />
          )}

          {/* Highlighted User Bar */}
          {isHighlighted && !isTop3 && (
            <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
          )}

          {/* Rank */}
          <View style={styles.rankCell}>
            {renderRankBadge()}
          </View>

          {/* Player/Team Info */}
          <View style={styles.playerCell}>
            {isTeamRender && team ? (
              <View style={styles.teamContainer}>
                <TeamAvatars
                  players={team.players.map((p) => ({ name: p.name, image: p.image }))}
                  size={36}
                  overlap={10}
                />
                <View style={styles.playerTextContainer}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {formatTeamNames(team.players)}
                  </Text>
                  {isTop3 && (
                    <View style={styles.winRateContainer}>
                      <View style={styles.winRateBar}>
                        <View
                          style={[
                            styles.winRateFill,
                            { width: `${winRate}%`, backgroundColor: rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : COLORS.bronze },
                          ]}
                        />
                      </View>
                      <Text style={styles.winRateText}>{winRate.toFixed(0)}%</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.playerContainer}>
                <PlayerAvatar
                  image={playerData?.image}
                  name={playerData?.name || '?'}
                  size={isTop3 ? 42 : 36}
                  showBorder={isTop3}
                  borderColor={rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : rank === 3 ? COLORS.bronze : undefined}
                />
                <View style={styles.playerTextContainer}>
                  <Text
                    style={[
                      styles.playerName,
                      isTop3 && styles.playerNameTop3,
                      isHighlighted && styles.playerNameHighlighted,
                    ]}
                    numberOfLines={1}
                  >
                    {playerData?.name}
                  </Text>
                  {isTop3 && (
                    <View style={styles.winRateContainer}>
                      <View style={styles.winRateBar}>
                        <View
                          style={[
                            styles.winRateFill,
                            { width: `${winRate}%`, backgroundColor: rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : COLORS.bronze },
                          ]}
                        />
                      </View>
                      <Text style={styles.winRateText}>{winRate.toFixed(0)}% WR</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCell}>
              <Text style={[styles.statText, isTop3 && styles.statTextTop3]}>{played}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statText, styles.statTextWin, isTop3 && styles.statTextTop3]}>{wins}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statText, styles.statTextLoss, isTop3 && styles.statTextTop3]}>{losses}</Text>
            </View>
            <View style={styles.ptsCell}>
              <LinearGradient
                colors={isTop3 ? [COLORS.gold + '30', COLORS.goldDark + '20'] : ['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.02)']}
                style={styles.ptsBadge}
              >
                <Text style={[styles.ptsText, isTop3 && styles.ptsTextTop3]}>
                  {points}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  rowContainerTop3: {
    paddingVertical: 14,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  rowContainerHighlighted: {
    borderColor: COLORS.highlightBorder,
    backgroundColor: COLORS.highlightBackground,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  rankCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  playerCell: {
    flex: 1,
    marginRight: 8,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerTextContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  playerNameTop3: {
    fontSize: 15,
    fontWeight: '700',
  },
  playerNameHighlighted: {
    color: COLORS.accent,
  },
  winRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  winRateBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 60,
  },
  winRateFill: {
    height: '100%',
    borderRadius: 2,
  },
  winRateText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: {
    width: 32,
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statTextTop3: {
    color: COLORS.textPrimary,
  },
  statTextWin: {
    color: '#4ADE80',
  },
  statTextLoss: {
    color: '#F87171',
  },
  ptsCell: {
    width: 50,
    alignItems: 'flex-end',
  },
  ptsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 44,
    alignItems: 'center',
  },
  ptsText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ptsTextTop3: {
    color: theme.colors.primary,
    fontSize: 15,
  },
});

export default StandingsRow;
