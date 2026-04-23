// src/features/feed/components/GlassScoreCard.tsx

import SportIcon from "@/components/SportIcon";
import { MatchResult, SportColors } from "@/features/standings/types";
import { theme } from "@/src/core/theme/theme";
import { format, isValid } from "date-fns";
import { BlurView } from "expo-blur";
import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";

interface GlassScoreCardProps {
  match: MatchResult;
  sportColors: SportColors;
  isFriendly?: boolean;
  containerStyle?: ViewStyle;
  scoreHeaderRowStyle?: ViewStyle;
  previewScale?: number;
}



const PHOTO_SIZE = 80;
const NAME_COLUMN_WIDTH = 350;

type ScoreCardPlayer = {
  name?: string | null;
  image?: string | null;
};

const createFallbackPlayer = (label: string): ScoreCardPlayer => ({
  name: label,
  image: null,
});

// ─── Preview fixed sizes ──────────────────────────────────────────────────────
const PREVIEW = {
  iconSize: 20,
  photoSize: 20,
  nameColWidth: 70,
  boxHeight: 15,
  doublesPhotoOverlap: -6,
  setColumnWidth: 20,
  headerPadding: 1,
  headerRadius: 100,
  mainSectionPaddingV: 0,
  mainSectionPaddingH: 5,
  mainSectionGap: 3,
  scoresSectionPaddingV: 10,
  scoresSectionPaddingH: 0,
  scoreHeaderPaddingV: 0,
  scoreHeaderPaddingH: 5,
  scoreHeaderMarginLeft: 0,
  scoreHeaderMaxWidth: 160,
  scoresColumnsPaddingH: 4,
  scoresColumnsMarginLeft: 0,
  scoresGroupGap: 10,
  doublesNamesMarginLeft: 2,
  titleContainerMarginLeft: 2,
  sportIconMarginRight: 1,
  singlesRowGap: 4,
  matchTypeBadgeMinWidth: 24,
  // matchTypeBadgePaddingH: 0,
  // matchTypeBadgePaddingV: 0,
  // Font sizes
  leagueText: 10,
  seasonDivisionText: 9,
  matchTypeText: 8,
  cardVenueName: 8,
  scoreText: 14,
  scoreDivider: 14,
  teamName: 6,
  winnerName: 9,
  loserName: 6,
  doublesPlayerName: 6,
  cardMatchDate: 6,
  setHeaderText: 8,
  nameColumnText: 8,
  setScoreText: 8,
  winningScoreText: 10,
};
// ─────────────────────────────────────────────────────────────────────────────

export const GlassScoreCard: React.FC<GlassScoreCardProps> = ({
  match,
  sportColors,
  isFriendly = false,
  containerStyle,
  scoreHeaderRowStyle,
  previewScale,
}) => {
  const isPreview = previewScale !== undefined;

  const rawTeam1Players = Array.isArray(match.team1Players)
    ? match.team1Players.filter(Boolean)
    : [];
  const rawTeam2Players = Array.isArray(match.team2Players)
    ? match.team2Players.filter(Boolean)
    : [];
  const isSingles =
    Math.max(rawTeam1Players.length, rawTeam2Players.length) <= 1;
  const team1Players = [
    rawTeam1Players[0] ?? createFallbackPlayer("Player 1"),
    rawTeam1Players[1] ?? createFallbackPlayer("Player 2"),
  ];
  const team2Players = [
    rawTeam2Players[0] ?? createFallbackPlayer("Player 1"),
    rawTeam2Players[1] ?? createFallbackPlayer("Player 2"),
  ];

  console.log("match info ", match);
  const parsedMatchDate = new Date(match.matchDate);
  const formattedMatchDate = isValid(parsedMatchDate)
    ? format(parsedMatchDate, "d MMM yyyy, h:mm a")
    : "Date TBD";

  const renderPlayerPhoto = (
    player: ScoreCardPlayer | undefined,
    size: number = isPreview ? PREVIEW.photoSize : PHOTO_SIZE,
  ) => {
    if (player?.image) {
      return (
        <Image
          source={{ uri: player.image }}
          style={[
            styles.playerPhoto,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      );
    }
    return (
      <View
        style={[
          styles.playerPhotoDefault,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <Text style={[styles.playerPhotoText, { fontSize: size * 0.4 }]}>
          {player?.name?.charAt(0).toUpperCase() || "P"}
        </Text>
      </View>
    );
  };

  const formatPlayerName = (
    name: string | null,
    firstNameOnly: boolean = false,
  ) => {
    if (!name) return "Player";
    const parts = name.split(" ");
    if (firstNameOnly && parts.length > 1) return parts[0];
    return name;
  };

  const isTeam1Winner = match.outcome === "team1";
  const isTeam2Winner = match.outcome === "team2";

  const scores =
    (match.gameScores?.length ?? 0) > 0
      ? match.gameScores
      : match.setScores || [];
  // const matchTypeLabel = isFriendly ? "Friendly" : "League";

  const seasonName =
    (match as any).division?.season?.name || (match as any).seasonName || "";
  const divisionName =
    (match as any).division?.name || (match as any).divisionName || "";

  return (
    <View
      style={[
        styles.cardContainer,
        containerStyle,
        isPreview && { maxWidth: 165, maxHeight: 160, borderRadius: 16, padding: 0 },
      ]}
    >
      {/* Header - Centered Pill Style */}
      <View
        style={[
          styles.headerWrapper,
          isPreview && { width: '100%', maxWidth: '100%', padding: 0, margin: 0 },
        ]}
      >
        <BlurView
          intensity={65}
          tint="dark"
          style={[
            styles.header,
            isPreview && {
              width: '100%',
              maxWidth: '100%',
              paddingVertical: 4,
              paddingHorizontal: 0,
              margin: 0,
            },
          ]}
        >
          <View style={[styles.headerContent, isPreview && { gap: 10, padding: 0, margin: 0 }]}> 
          
              <SportIcon
                sport={match.sport ?? ""}
                width={isPreview ? PREVIEW.iconSize : 24}
                height={isPreview ? PREVIEW.iconSize : 24}
              />
          
            <View style={[styles.titleContainer, isPreview && { marginLeft: 2 }]}> 
              <Text style={[styles.leagueText, isPreview && { fontSize: PREVIEW.leagueText, lineHeight: 12, marginBottom: 0, padding: 0 }]}> 
                {match.leagueName || "League Name Unavailable"}
              </Text>
              {!isFriendly && (seasonName || divisionName) && (
                <Text style={[styles.seasonDivisionText, isPreview && { fontSize: PREVIEW.seasonDivisionText, lineHeight: 8, marginTop: 0, padding: 0 }]}> 
                  {seasonName}{seasonName && divisionName && " • "}{divisionName}
                </Text>
              )}
            </View>
          </View>
        </BlurView>
      </View>

      {/* Venue Name */}
      <Text
        style={[
          styles.cardVenueName,
          isPreview && {
            fontSize: PREVIEW.cardVenueName,
            marginTop: 2,
            paddingHorizontal: 4,
          },
        ]}
      >
        {match.location || "Venue TBD"}
      </Text>

      {/* Main Score Section */}
      <View
        style={[
          styles.mainScoreSection,
          isPreview && {
            paddingVertical: PREVIEW.mainSectionPaddingV,
            paddingHorizontal: PREVIEW.mainSectionPaddingH,
            gap: PREVIEW.mainSectionGap,
          },
        ]}
      >
        {/* Team 1 */}
        <View style={styles.teamContainer}>
          {isSingles ? (
            <View
              style={[
                styles.singlesRow,
                isPreview && { gap: PREVIEW.singlesRowGap },
              ]}
            >
              {renderPlayerPhoto(team1Players[0])}
              <Text
                style={[
                  styles.teamName,
                  isTeam1Winner ? styles.winnerName : styles.loserName,
                  { flex: 1, textAlign: "left" },
                  isPreview && {
                    fontSize: isTeam1Winner
                      ? PREVIEW.winnerName
                      : PREVIEW.loserName,
                    marginTop: 0,
                  },
                ]}
                numberOfLines={1}
              >
                {formatPlayerName(team1Players[0].name ?? null, true)}
              </Text>
            </View>
          ) : (
            <View style={styles.doublesContainer}>
              <View style={styles.doublesPhotos}>
                {renderPlayerPhoto(team1Players[0])}
                <View
                  style={{
                    marginLeft: isPreview ? PREVIEW.doublesPhotoOverlap : -30,
                  }}
                >
                  {renderPlayerPhoto(team1Players[1])}
                </View>
              </View>
              <View
                style={[
                  styles.doublesNames,
                  isPreview && { marginLeft: PREVIEW.doublesNamesMarginLeft },
                ]}
              >
                <Text
                  style={[
                    styles.doublesPlayerName,
                    {
                      color: isTeam1Winner ? "#FFFFFF" : "#FFFFFF",
                    },
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team1Players[0].name ?? null, true)}
                </Text>
                <Text
                  style={[
                    styles.doublesPlayerName,
                    {
                      color: isTeam1Winner ? "#FFFFFF" : "#FFFFFF",
                    },
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team1Players[1].name ?? null, true)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Score Display */}
        <View style={styles.scoreDisplay}>
          <Text
            style={[
              styles.scoreText,
              isPreview && { fontSize: PREVIEW.scoreText },
            ]}
          >
            {match.team1Score || 0}
          </Text>
          <Text
            style={[
              styles.scoreDivider,
              isPreview && { fontSize: PREVIEW.scoreDivider },
            ]}
          >
            -
          </Text>
          <Text
            style={[
              styles.scoreText,
              isPreview && { fontSize: PREVIEW.scoreText },
            ]}
          >
            {match.team2Score || 0}
          </Text>
        </View>

        {/* Team 2 */}
        <View style={styles.teamContainer}>
          {isSingles ? (
            <View
              style={[
                styles.singlesRow,
                { flexDirection: "row-reverse" },
                isPreview && { gap: PREVIEW.singlesRowGap },
              ]}
            >
              {renderPlayerPhoto(team2Players[0])}
              <Text
                style={[
                  styles.teamName,
                  isTeam2Winner ? styles.winnerName : styles.loserName,
                  { flex: 1, textAlign: "right" },
                  isPreview && {
                    fontSize: isTeam2Winner
                      ? PREVIEW.winnerName
                      : PREVIEW.loserName,
                    marginTop: 0,
                  },
                ]}
                numberOfLines={1}
              >
                {formatPlayerName(team2Players[0].name ?? null, true)}
              </Text>
            </View>
          ) : (
            <View style={styles.doublesContainer}>
              <View style={styles.doublesPhotos}>
                {renderPlayerPhoto(team2Players[0])}
                <View
                  style={{
                    marginLeft: isPreview ? PREVIEW.doublesPhotoOverlap : -30,
                  }}
                >
                  {renderPlayerPhoto(team2Players[1])}
                </View>
              </View>
              <View
                style={[
                  styles.doublesNames,
                  isPreview && { marginLeft: PREVIEW.doublesNamesMarginLeft },
                ]}
              >
                <Text
                  style={[
                    styles.doublesPlayerName,
                    {
                      color: isTeam2Winner ? "#FFFFFF" : "#FFFFFF",
                    },
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team2Players[0].name ?? null, true)}
                </Text>
                <Text
                  style={[
                    styles.doublesPlayerName,
                    {
                      color: isTeam2Winner ? "#FFFFFF" : "#FFFFFF",
                    },
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team2Players[1].name ?? null, true)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Match Date */}
      <Text
        style={[
          styles.cardMatchDate,
          isPreview && { fontSize: PREVIEW.cardMatchDate, marginTop: 1 },
        ]}
      >
        {formattedMatchDate}
      </Text>
      {match.isWalkover && <Text style={styles.cardWalkover}>W/O</Text>}

      {/* Scores Columns */}
      {scores && scores.length > 0 && (
        <View
          style={[
            styles.scoresSection,
            isPreview && {
              paddingVertical: PREVIEW.scoresSectionPaddingV,
              paddingHorizontal: PREVIEW.scoresSectionPaddingH,
              marginTop: 2,
            },
          ]}
        >
          {(() => {
            const displayScores =
              scores.length === 2
                ? [...scores, { __placeholder: true }]
                : scores;
            return (
              <>
                {/* Header Row */}
                <View
                  style={[
                    styles.scoreHeaderRow,
                    { backgroundColor: "transparent" },
                    scoreHeaderRowStyle,
                    isPreview && {
                      paddingVertical: PREVIEW.scoreHeaderPaddingV,
                      paddingHorizontal: PREVIEW.scoreHeaderPaddingH,
                      marginBottom: 4,
                      marginLeft: PREVIEW.scoreHeaderMarginLeft,
                      maxWidth: PREVIEW.scoreHeaderMaxWidth,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.nameColumnHeaderBox,
                      isPreview && {
                        width: PREVIEW.nameColWidth,
                        paddingLeft: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.setHeaderText,
                        isPreview && { fontSize: PREVIEW.setHeaderText },
                      ]}
                    >
                      Sets
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.scoresHeaderGroup,
                      isPreview && { gap: PREVIEW.scoresGroupGap },
                    ]}
                  >
                    {displayScores.map((_, idx) => (
                      <View
                        key={`header-${idx}`}
                        style={[
                          styles.setColumnHeaderBox,
                          isPreview && { minWidth: PREVIEW.setColumnWidth },
                        ]}
                      >
                        <Text
                          style={[
                            styles.setHeaderText,
                            isPreview && { fontSize: PREVIEW.setHeaderText },
                          ]}
                        >
                          {["1st", "2nd", "3rd", "4th", "5th"][idx] ||
                            `${idx + 1}th`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Score Rows */}
                <View
                  style={[
                    styles.scoresColumns,
                    isPreview && {
                      paddingHorizontal: PREVIEW.scoresColumnsPaddingH,
                      marginLeft: PREVIEW.scoresColumnsMarginLeft,
                    },
                  ]}
                >
                  {/* Names Column */}
                  <View
                    style={[
                      styles.nameColumn,
                      isPreview && {
                        width: PREVIEW.nameColWidth,
                        paddingLeft: 2,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nameColumnText,
                        isTeam1Winner && styles.nameColumnWinnerText,
                        isPreview && {
                          fontSize: PREVIEW.nameColumnText,
                          height: PREVIEW.boxHeight,
                          lineHeight: PREVIEW.boxHeight,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isSingles
                        ? formatPlayerName(team1Players[0].name ?? null, true)
                        : `${formatPlayerName(team1Players[0].name ?? null, true)}, ${formatPlayerName(team1Players[1].name ?? null, true)}`}
                    </Text>
                    <Text
                      style={[
                        styles.nameColumnText,
                        isTeam2Winner && styles.nameColumnWinnerText,
                        isPreview && {
                          fontSize: PREVIEW.nameColumnText,
                          height: PREVIEW.boxHeight,
                          lineHeight: PREVIEW.boxHeight,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {isSingles
                        ? formatPlayerName(team2Players[0].name ?? null, true)
                        : `${formatPlayerName(team2Players[0].name ?? null, true)}, ${formatPlayerName(team2Players[1].name ?? null, true)}`}
                    </Text>
                  </View>

                  {/* Scores Group */}
                  <View
                    style={[
                      styles.scoresGroup,
                      isPreview && { gap: PREVIEW.scoresGroupGap },
                    ]}
                  >
                    {displayScores.map((score, idx) => {
                      const isPlaceholder = !!(score as any).__placeholder;
                      const team1Score = isPlaceholder
                        ? "-"
                        : ((score as any).team1Points ??
                          (score as any).team1Games ??
                          0);
                      const team2Score = isPlaceholder
                        ? "-"
                        : ((score as any).team2Points ??
                          (score as any).team2Games ??
                          0);
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.setColumn,
                            isPreview && { minWidth: PREVIEW.setColumnWidth },
                          ]}
                        >
                          <View
                            style={[
                              styles.setScoreBox,
                              isPreview && { height: PREVIEW.boxHeight },
                            ]}
                          >
                            <Text
                              style={[
                                styles.setScoreText,
                                !isPlaceholder &&
                                  (team1Score as number) >
                                    (team2Score as number) &&
                                  styles.winningScoreText,
                                isPreview && {
                                  fontSize:
                                    !isPlaceholder &&
                                    (team1Score as number) >
                                      (team2Score as number)
                                      ? PREVIEW.winningScoreText
                                      : PREVIEW.setScoreText,
                                },
                              ]}
                            >
                              {team1Score}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.setScoreBox,
                              isPreview && { height: PREVIEW.boxHeight },
                            ]}
                          >
                            <Text
                              style={[
                                styles.setScoreText,
                                !isPlaceholder &&
                                  (team2Score as number) >
                                    (team1Score as number) &&
                                  styles.winningScoreText,
                                isPreview && {
                                  fontSize:
                                    !isPlaceholder &&
                                    (team2Score as number) >
                                      (team1Score as number)
                                      ? PREVIEW.winningScoreText
                                      : PREVIEW.setScoreText,
                                },
                              ]}
                            >
                              {team2Score}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </>
            );
          })()}
        </View>
      )}
      {/* Deuce branding */}
      <Text
        style={[
          styles.deuceBranding,
          isPreview && { fontSize: 12, paddingVertical: 3 },
        ]}
      >
        DEUCE
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    maxWidth: 600,
    height: "100%",
    maxHeight: 600,
    backgroundColor: "transparent",
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: 'space-between',
    alignSelf: 'center',
  },
  headerWrapper: {
     alignItems: 'center',
     width: '100%',
  },
  header: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: .5,
    borderColor: 'rgba(255,255,255,0.02)', 
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6, // Matches the Auto Layout gap in Figma
  },
  titleContainer: {
    alignItems: 'flex-start', // Keeps text aligned left relative to the icon
  },
  leagueText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  seasonDivisionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  matchTypeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    minWidth: 160,
    maxHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 40,
    borderWidth: 1,
  },
  matchTypeText: {
    fontSize: 24,
    fontWeight: "700",
  },
  cardVenueName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 12,
  },
  mainScoreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  teamContainer: {
    flex: 1,
    alignItems: "center",
  },
  singlesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamName: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    color: "#FFFFFF",
  },
  winnerName: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 24,
  },
  loserName: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 22,
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  scoreText: {
    fontSize: 72,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  scoreDivider: {
    fontSize: 72,
    color: "#FFFFFF",
    marginHorizontal: 4,
  },
  cardMatchDate: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    marginTop: 2,
    textAlign: "center",
  },
  cardWalkover: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 2,
    textAlign: "center",
  },
  scoresSection: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  scoreHeaderRow: {
    flexDirection: "row",
    borderRadius: 22,
    maxWidth: 754,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginBottom: 16,
    marginLeft: 0,
    alignItems: "center",
  },
  nameColumnHeaderBox: {
    width: NAME_COLUMN_WIDTH,
    paddingLeft: 0,
  },
  setHeaderText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scoresColumns: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 0,
    marginLeft: 3,
  },
  nameColumn: {
    width: NAME_COLUMN_WIDTH,
    justifyContent: "space-around",
    paddingLeft: 0,
  },
  nameColumnText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#FFFFFF",
    height: 48,
    textAlignVertical: "center",
    lineHeight: 48,
  },
  nameColumnWinnerText: {
    color: "#FEA04D",
    fontWeight: "700",
  },
  scoresHeaderGroup: {
    flexDirection: "row",
    flex: 0,
    justifyContent: "flex-start",
    gap: 20, // Reduced from 50
  },
  setColumnHeaderBox: {
    minWidth: 40, // Reduced from 80
    alignItems: "center",
  },
  scoresGroup: {
    flexDirection: "row",
    flex: 0,
    justifyContent: "flex-start",
    gap: 20, // Reduced from 50
  },
  setColumn: {
    minWidth: 40, // Reduced from 80
    alignItems: "center",
  },

  setScoreBox: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  setScoreText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  winningScoreText: {
    color: "#FEA04D",
    fontWeight: "900",
    fontSize: 32,
  },
  doublesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  doublesPhotos: {
    flexDirection: "row",
    alignItems: "center",
  },
  doublesNames: {
    flexDirection: "column",
    marginLeft: 12,
    alignItems: "flex-start",
  },
  doublesPlayerName: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    marginVertical: 2,
  },
  
  playerPhoto: {},
  playerPhotoDefault: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerPhotoText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deuceBranding: {
    fontSize: 48,
    fontWeight: "800",
    fontStyle: "italic",
    color: "#FEA04D",
    textAlign: "center",
    paddingVertical: 12,
    letterSpacing: 2,
  },
});
