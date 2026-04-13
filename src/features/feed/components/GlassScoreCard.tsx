// src/features/feed/components/GlassScoreCard.tsx

import PaddleIcon from "@/assets/icons/sports/Paddle.svg";
import PickleballIcon from "@/assets/icons/sports/Pickleball.svg";
import TennisIcon from "@/assets/icons/sports/Tennis.svg";
import { MatchResult, SportColors } from "@/features/standings/types";
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
const PREVIEW = {
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
  const matchTypeLabel = isFriendly ? "Friendly" : "League";

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
      {/* Header */}
      <BlurView
        intensity={40}
        tint="dark"
        style={[styles.header, isPreview && { padding: PREVIEW.headerPadding }]}
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
                "#FFFFFF",
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
              { backgroundColor: isFriendly ? "#FFFFFF" : "#FFFFFF" },
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
      </BlurView>

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
  cardContainer: {
    width: "100%",
    maxWidth: 850,
    height: "100%",
    maxHeight: 620,
    backgroundColor: "transparent",
    borderRadius: 48,
    overflow: "hidden",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
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
  sportIcon: {
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: "column",
    marginLeft: 12,
  },
  leagueText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  seasonDivisionText: {
    fontSize: 24,
    color: "rgba(255, 255, 255, 0.65)",
    fontWeight: "500",
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
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 12,
  },
  mainScoreSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 20,
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
    color: "#FFFFFF",
  },
  winnerName: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 28,
  },
  loserName: {
    color: "rgba(255, 255, 255, 0.55)",
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
    color: "#FFFFFF",
  },
  scoreDivider: {
    fontSize: 100,
    color: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 8,
  },
  cardMatchDate: {
    fontSize: 26,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.55)",
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
  scoresSection: {
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
  setHeaderText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
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
    color: "rgba(255, 255, 255, 0.85)",
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
  setScoreText: {
    fontSize: 30,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.7)",
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
});
