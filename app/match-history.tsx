import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@core/theme/theme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Default Profile Icon Component (reused from profile)
const DefaultProfileIcon = () => (
  <View style={styles.profileIcon}>
    <Svg width="20" height="20" viewBox="0 0 24 24">
      <Path 
        fill="#FFFFFF" 
        fillRule="evenodd" 
        d="M8 7a4 4 0 1 1 8 0a4 4 0 0 1-8 0m0 6a5 5 0 0 0-5 5a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3a5 5 0 0 0-5-5z" 
        clipRule="evenodd" 
      />
    </Svg>
  </View>
);


type MatchStatus = 'completed' | 'ongoing' | 'upcoming';

interface MatchScore {
  player1: number | null;
  player2: number | null;
}

interface Match {
  id: string;
  league: string;
  status: MatchStatus;
  player1: string;
  player2: string;
  date: string;
  time: string;
  scores: {
    set1: MatchScore;
    set2: MatchScore;
    set3: MatchScore;
  };
}

// Real match data - currently empty until match system is implemented
const matches: Match[] = []; // Will be populated from API when match system is ready

interface MatchCardProps {
  match: Match;
}

const formatScore = (value: number | null): string =>
  value !== null && value !== undefined ? String(value) : '-';

type Styles = {
  container: ViewStyle;
  headerGradient: ViewStyle;
  safeHeader: ViewStyle;
  header: ViewStyle;
  backButton: ViewStyle;
  headerTitle: TextStyle;
  headerSpacer: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  matchCard: ViewStyle;
  leagueNameContainer: ViewStyle;
  leagueName: TextStyle;
  scoreboardContainer: ViewStyle;
  playerColumn: ViewStyle;
  playerRow: ViewStyle;
  profileIcon: ViewStyle;
  setColumn: ViewStyle;
  playerName: TextStyle;
  setHeader: TextStyle;
  score: TextStyle;
  divider: ViewStyle;
  bottomSection: ViewStyle;
  dateTimeContainer: ViewStyle;
  dateText: TextStyle;
  timeText: TextStyle;
  statusContainer: ViewStyle;
  statusText: TextStyle;
  scoreContainer: ViewStyle;
  winnerText: TextStyle;
  noDataContainer: ViewStyle;
  noDataTitle: TextStyle;
  noDataText: TextStyle;
};

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  // Determine winner based on sets won
  const addSetResult = (player1Score: number | null, player2Score: number | null, tally: { p1: number; p2: number }) => {
    const p1 = player1Score ?? 0;
    const p2 = player2Score ?? 0;
    if (p1 > p2) {
      tally.p1 += 1;
    } else if (p2 > p1) {
      tally.p2 += 1;
    }
  };

  const getWinner = (): 'player1' | 'player2' | null => {
    if (match.status !== 'completed') return null;
    
    const tally = { p1: 0, p2: 0 };
    addSetResult(match.scores.set1.player1, match.scores.set1.player2, tally);
    addSetResult(match.scores.set2.player1, match.scores.set2.player2, tally);
    addSetResult(match.scores.set3.player1, match.scores.set3.player2, tally);

    if (tally.p1 > tally.p2) return 'player1';
    if (tally.p2 > tally.p1) return 'player2';
    return null;
  };
  
  const winner = getWinner();
  const getStatusBackgroundColor = (status: MatchStatus): string => {
    switch (status) {
      case 'completed':
        return '#eeeeee';
      case 'ongoing':
        return `${theme.colors.primary}20`;
      case 'upcoming':
        return `${theme.colors.neutral.gray[500]}20`;
      default:
        return `${theme.colors.neutral.gray[500]}20`;
    }
  };

  const getStatusTextColor = (status: MatchStatus): string => {
    switch (status) {
      case 'completed':
        return '#fda04d';
      case 'ongoing':
        return theme.colors.primary;
      case 'upcoming':
        return theme.colors.neutral.gray[500];
      default:
        return theme.colors.neutral.gray[500];
    }
  };

  const getStatusText = (status: MatchStatus): string => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'ongoing':
        return 'Ongoing';
      case 'upcoming':
        return 'Upcoming';
      default:
        return status;
    }
  };

  return (
    <Pressable 
      style={styles.matchCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to match details
      }}
    >
      {/* League Name with Container */}
      <View style={styles.leagueNameContainer}>
        <Text style={styles.leagueName}>{match.league}</Text>
      </View>
      
      {/* Scoreboard */}
      <View style={styles.scoreboardContainer}>
        {/* Player Names Column with Profile Icons */}
        <View style={styles.playerColumn}>
          <View style={styles.playerRow}>
            <DefaultProfileIcon />
            <Text style={[styles.playerName, winner === 'player1' && styles.winnerText]}>{match.player1}</Text>
          </View>
          <View style={styles.playerRow}>
            <DefaultProfileIcon />
            <Text style={[styles.playerName, winner === 'player2' && styles.winnerText]}>{match.player2}</Text>
          </View>
        </View>
        
        {/* Set 1 */}
        <View style={styles.setColumn}>
          <Text style={styles.setHeader}>Set 1</Text>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player1' && styles.winnerText]}>
              {formatScore(match.scores.set1.player1)}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player2' && styles.winnerText]}>
              {formatScore(match.scores.set1.player2)}
            </Text>
          </View>
        </View>
        
        {/* Set 2 */}
        <View style={styles.setColumn}>
          <Text style={styles.setHeader}>Set 2</Text>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player1' && styles.winnerText]}>
              {formatScore(match.scores.set2.player1)}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player2' && styles.winnerText]}>
              {formatScore(match.scores.set2.player2)}
            </Text>
          </View>
        </View>
        
        {/* Set 3 */}
        <View style={styles.setColumn}>
          <Text style={styles.setHeader}>Set 3</Text>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player1' && styles.winnerText]}>
              {formatScore(match.scores.set3.player1)}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, winner === 'player2' && styles.winnerText]}>
              {formatScore(match.scores.set3.player2)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{match.date}</Text>
          <Text style={styles.timeText}>{match.time}</Text>
        </View>
        
        {/* Status */}
        <View style={[styles.statusContainer, { backgroundColor: getStatusBackgroundColor(match.status) }]}>
          <Text style={[styles.statusText, { color: getStatusTextColor(match.status), fontWeight: (match.status === 'completed' || match.status === 'ongoing') ? 'bold' : 'normal' }]}>
            {getStatusText(match.status)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default function MatchHistoryScreen() {
  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Orange Header */}
      <LinearGradient
        colors={[theme.colors.primary, '#FFA366']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeHeader}>
          <View style={styles.header}>
            <Pressable 
              style={styles.backButton}
              onPress={handleBackPress}
              accessible={true}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>Match History</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      </LinearGradient>
      
      {/* White Background Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {matches.length > 0 ? (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="tennisball-outline" size={64} color="#E5E7EB" />
            <Text style={styles.noDataTitle}>No Match History</Text>
            <Text style={styles.noDataText}>
              You haven't played any matches yet.{'\n'}
              Start playing to see your match history here!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50], // Gray background like profile
  },
  headerGradient: {
    // Remove paddingBottom to fix visibility
  },
  safeHeader: {
    // Remove flex: 1 to fix header height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.neutral.gray[50], // Gray background
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  matchCard: {
    backgroundColor: '#FFFFFF', // White containers
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.neutral.black,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leagueNameContainer: {
    backgroundColor: '#feecdb',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  leagueName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scoreboardContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  playerColumn: {
    flex: 2,
    justifyContent: 'flex-end',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    height: 32,
    marginBottom: theme.spacing.xs,
  },
  profileIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.neutral.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  setColumn: {
    flex: 0.8,
    alignItems: 'center',
  },
  playerName: {
    fontSize: theme.typography.fontSize.base, // Bigger font
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  setHeader: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.typography.fontWeight.medium,
  },
  score: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.bold,
    height: 32,
    lineHeight: 32,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral.gray[200],
    marginVertical: theme.spacing.md,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'column',
  },
  dateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  timeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.neutral.gray[500],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: 2,
  },
  statusContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily.primary,
    textTransform: 'uppercase',
  },
  scoreContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  winnerText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 3,
    paddingHorizontal: theme.spacing.xl,
  },
  noDataTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral.gray[700],
    fontFamily: theme.typography.fontFamily.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  noDataText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.neutral.gray[600],
    fontFamily: theme.typography.fontFamily.primary,
    textAlign: 'center',
    lineHeight: theme.typography.lineHeight.relaxed,
  },
});
