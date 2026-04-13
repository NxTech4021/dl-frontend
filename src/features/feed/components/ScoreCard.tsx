// src/features/feed/components/ScoreCard.tsx

import PaddleIcon from "@/assets/icons/sports/Paddle.svg";
import PickleballIcon from "@/assets/icons/sports/Pickleball.svg";
import TennisIcon from "@/assets/icons/sports/Tennis.svg";
import { MatchResult, SportColors } from "@/features/standings/types";
import { format, isValid } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";

interface ScoreCardProps {
  match: MatchResult;
  sportColors: SportColors;
  isFriendly?: boolean;
  containerStyle?: ViewStyle;
  scoreHeaderRowStyle?: ViewStyle;
  previewScale?: number;
}

// Map sport types to their icons
const getSportIcon = (
  sportType: string | undefined,
  color: string,
  size: number = 66,
) => {
  const normalizedType = sportType?.toUpperCase() || "TENNIS";

  switch (normalizedType) {
    case "PICKLEBALL":
      return <PickleballIcon width={size} height={size} fill={color} />;
    case "PADEL":
      return <PaddleIcon width={size} height={size} fill={color} />;
    case "TENNIS":
    default:
      return <TennisIcon width={size} height={size} fill={color} />;
  }
};

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
// All values here are the actual pixel sizes used when rendering the preview card.
// Adjust any of these to change how the preview looks.
const PREVIEW = {
  // Dimensions
  iconSize: 16,
  photoSize: 16,
  nameColWidth: 80,
  boxHeight: 10,
  doublesPhotoOverlap: -6,
  setColumnWidth: 14,
  headerPadding: 3,
  mainSectionPaddingV: 1,
  mainSectionPaddingH: 3,
  mainSectionGap: 3,
  scoresSectionPaddingV: 2,
  scoresSectionPaddingH: 4,
  scoreHeaderPaddingV: 1,
  scoreHeaderPaddingH: 5,
  scoreHeaderBorderRadius: 4,
  scoreHeaderMarginLeft: 10,
  scoreHeaderMaxWidth: 160,
  scoresColumnsPaddingH: 4,
  scoresColumnsMarginLeft: 10,
  scoresGroupGap: 8,
  doublesNamesMarginLeft: 2,
  titleContainerMarginLeft: 2,
  sportIconMarginRight: 1,
  singlesRowGap: 2,
  matchTypeBadgeMinWidth: 24,
  matchTypeBadgePaddingH: 3,
  matchTypeBadgePaddingV: 1,
  // Font sizes
  leagueText: 6,
  seasonDivisionText: 5,
  matchTypeText: 5,
  cardVenueName: 6,
  scoreText: 14,
  scoreDivider: 14,
  teamName: 6,
  winnerName: 6,
  loserName: 5,
  doublesPlayerName: 4,
  cardMatchDate: 5,
  setHeaderText: 5,
  nameColumnText: 5,
  setScoreText: 6,
  winningScoreText: 6,
};
// ─────────────────────────────────────────────────────────────────────────────

const ScoreCard: React.FC<ScoreCardProps> = ({
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
  const parsedMatchDate = new Date(match.matchDate);
  const formattedMatchDate = isValid(parsedMatchDate)
    ? format(parsedMatchDate, "d MMM yyyy, h:mm a")
    : "Date TBD";

  // Helper function to render player photo
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

  // Format player names
  const formatPlayerName = (
    name: string | null,
    firstNameOnly: boolean = false,
  ) => {
    if (!name) return "Player";
    const parts = name.split(" ");
    if (firstNameOnly && parts.length > 1) {
      return parts[0];
    }
    return name;
  };

  const isTeam1Winner = match.outcome === "team1";
  const isTeam2Winner = match.outcome === "team2";

  // Handle different score structures for different sports
  // Pickleball uses gameScores with team1Points/team2Points
  // Tennis/Padel use setScores with team1Games/team2Games
  const scores =
    (match.gameScores?.length ?? 0) > 0
      ? match.gameScores
      : match.setScores || [];
  const matchTypeLabel = isFriendly ? "Friendly" : "League";

  // Get season and division info
  const seasonName =
    (match as any).division?.season?.name || (match as any).seasonName || "";
  const divisionName =
    (match as any).division?.name || (match as any).divisionName || "";

  return (
    <View
      style={[
        styles.cardContainer,
        containerStyle,
        isPreview && { maxWidth: 170, maxHeight: 120, borderRadius: 16 },
      ]}
    >
      {/* League/Match Info Header */}
      <LinearGradient
        colors={[
          `rgba(${parseInt(sportColors.background.slice(1, 3), 16)}, ${parseInt(sportColors.header.slice(3, 5), 16)}, ${parseInt(sportColors.background.slice(5, 7), 16)}, 0.08)`,
          "#FFFFFF",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, isPreview && { padding: PREVIEW.headerPadding }]}
      >
        {/* Header with icon and badge */}
        <View
          style={[
            styles.header,
            isPreview && { padding: PREVIEW.headerPadding },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.sportIcon,
                  isPreview && { marginRight: PREVIEW.sportIconMarginRight },
                ]}
              >
                {getSportIcon(
                  match.sport,
                  sportColors.background,
                  isPreview ? PREVIEW.iconSize : 66,
                )}
              </View>
              <View
                style={[
                  styles.titleContainer,
                  isPreview && { marginLeft: PREVIEW.titleContainerMarginLeft },
                ]}
              >
                <Text
                  style={[
                    styles.leagueText,
                    isPreview && { fontSize: PREVIEW.leagueText },
                  ]}
                >
                  {match.leagueName || "Match"}
                </Text>
                {(seasonName || divisionName) && (
                  <Text
                    style={[
                      styles.seasonDivisionText,
                      isPreview && { fontSize: PREVIEW.seasonDivisionText },
                    ]}
                  >
                    {seasonName}
                    {seasonName && divisionName && " • "}
                    {divisionName}
                  </Text>
                )}
              </View>
            </View>

            <View
              style={[
                styles.matchTypeBadge,
                { borderColor: isFriendly ? "#83CFF9" : "#FEA04D" },
                isPreview && {
                  minWidth: PREVIEW.matchTypeBadgeMinWidth,
                  paddingHorizontal: PREVIEW.matchTypeBadgePaddingH,
                  paddingVertical: PREVIEW.matchTypeBadgePaddingV,
                },
              ]}
            >
              <Text
                style={[
                  styles.matchTypeText,
                  { color: isFriendly ? "#83CFF9" : "#FEA04D" },
                  isPreview && { fontSize: PREVIEW.matchTypeText },
                ]}
              >
                {matchTypeLabel}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

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
            <>
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
                    isPreview && {
                      fontSize: isTeam1Winner
                        ? PREVIEW.winnerName
                        : PREVIEW.loserName,
                      marginTop: 2,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {formatPlayerName(team1Players[0].name ?? null)}
                </Text>
              </View>
            </>
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
                    isTeam1Winner ? styles.winnerName : styles.loserName,
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team1Players[0].name ?? null, true)}
                </Text>
                <Text
                  style={[
                    styles.doublesPlayerName,
                    isTeam1Winner ? styles.winnerName : styles.loserName,
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
            <>
              <View
                style={[
                  styles.singlesRow,
                  isPreview && { gap: PREVIEW.singlesRowGap },
                ]}
              >
                {renderPlayerPhoto(team2Players[0])}
                <Text
                  style={[
                    styles.teamName,
                    isTeam2Winner ? styles.winnerName : styles.loserName,
                    isPreview && {
                      fontSize: isTeam2Winner
                        ? PREVIEW.winnerName
                        : PREVIEW.loserName,
                      marginTop: 2,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {formatPlayerName(team2Players[0].name ?? null)}
                </Text>
              </View>
            </>
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
                    isTeam2Winner ? styles.winnerName : styles.loserName,
                    isPreview && { fontSize: PREVIEW.doublesPlayerName },
                  ]}
                  numberOfLines={1}
                >
                  {formatPlayerName(team2Players[0].name ?? null, true)}
                </Text>
                <Text
                  style={[
                    styles.doublesPlayerName,
                    isTeam2Winner ? styles.winnerName : styles.loserName,
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
          {/* Header Row with rounded edges */}
          {(() => {
            const displayScores =
              scores.length === 2
                ? [...scores, { __placeholder: true }]
                : scores;
            return (
              <>
                <View
                  style={[
                    styles.scoreHeaderRow,
                    { backgroundColor: sportColors.background },
                    scoreHeaderRowStyle,
                    isPreview && {
                      paddingVertical: PREVIEW.scoreHeaderPaddingV,
                      paddingHorizontal: PREVIEW.scoreHeaderPaddingH,
                      borderRadius: PREVIEW.scoreHeaderBorderRadius,
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

                {/* Spaced out scores section */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 20,
  },
  sportIcon: {
    marginRight: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleContainer: {
    flexDirection: "column",
    marginLeft: 12,
  },
  leagueText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  seasonDivisionText: {
    fontSize: 24,
    color: "#4C4C4B",
    fontWeight: "500",
  },
  cardContainer: {
    width: "100%",
    maxWidth: 850,
    height: "100%",
    maxHeight: 620,
    backgroundColor: "#FFFFFF",
    borderRadius: 48,
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "hidden",
    // NEW: This replaces ios shadow props and android elevation
    boxShadow: "0px 12px 24px rgba(0, 0, 0, 0.12)",
  },

  matchTypeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
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
  mainScoreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    gap: 20,
  },
  cardVenueName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1D1D1F",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 12,
  },
  teamContainer: {
    flex: 1,
    alignItems: "center",
  },
  singlesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  teamName: {
    fontSize: 32,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  winnerName: {
    color: "#1D1D1F",
    fontWeight: "900",
    fontSize: 28,
  },
  loserName: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 24,
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 100,
    fontWeight: "900",
    color: "1D1D1F",
  },
  scoreDivider: {
    fontSize: 100,
    color: "#1D1D1F",
    marginHorizontal: 8,
  },
  scoresSection: {
    backgroundColor: "transparent",
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  scoreHeaderRow: {
    flexDirection: "row",
    borderRadius: 22,
    maxWidth: 754,
    paddingVertical: 8,
    paddingHorizontal: 40,
    marginBottom: 16,
    marginLeft: 40,
    alignItems: "center",
  },
  nameColumnHeaderBox: {
    width: NAME_COLUMN_WIDTH,
    paddingLeft: 8,
  },
  scoresHeaderGroup: {
    flexDirection: "row",
    flex: 0,
    justifyContent: "flex-start",
    gap: 50,
  },
  setColumnHeaderBox: {
    minWidth: 80,
    alignItems: "center",
  },
  scoresColumns: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 40,
    marginLeft: 40,
  },
  nameColumn: {
    width: NAME_COLUMN_WIDTH,
    justifyContent: "space-around",
    paddingLeft: 8,
  },
  nameColumnText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#374151",
    height: 48,
    textAlignVertical: "center",
    lineHeight: 48,
  },
  scoresGroup: {
    flexDirection: "row",
    flex: 0,
    justifyContent: "flex-start",
    gap: 50,
  },
  setColumn: {
    minWidth: 80,
    alignItems: "center",
  },
  setScoreBox: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  setHeaderText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1D1D1F",
  },
  winningScoreText: {
    color: "#FEA04D",
    fontWeight: "900",
    fontSize: 32,
  },
  setScoreText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#374151",
  },
  teamPhotos: {
    marginBottom: 12,
  },
  doublesPhotos: {
    flexDirection: "row",
    alignItems: "center",
  },
  doublesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  doublesNames: {
    flexDirection: "column",
    marginLeft: 12,
    alignItems: "flex-start",
  },
  doublesPlayerName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginVertical: 2,
  },
  playerPhoto: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  playerPhotoDefault: {
    backgroundColor: "#6DE9A0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  playerPhotoText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cardMatchDate: {
    fontSize: 26,
    fontWeight: "500",
    color: "#86868B",
    marginTop: 4,
    textAlign: "center",
  },
  cardWalkover: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
    marginTop: 2,
    textAlign: "center",
  },
});

export default ScoreCard;
