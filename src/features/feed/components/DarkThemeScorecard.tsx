// src/features/feed/components/DarkThemeScorecard.tsx

import SCardDark from "@/assets/backgrounds/Scard-DARK.svg";
import { MatchResult, SportColors } from "@/features/standings/types";
import React from "react";
import { StyleSheet, View } from "react-native";
import ScoreCard from "./ScoreCard";

interface DarkThemeScorecardProps {
  match: MatchResult;
  sportColors: SportColors;
  isFriendly?: boolean;
  matchType?: string;
  previewScale?: number;
  noRadius?: boolean;
}

export const DarkThemeScorecard: React.FC<DarkThemeScorecardProps> = ({
  match,
  sportColors,
  isFriendly = false,
  matchType = "SINGLES",
  previewScale,
  noRadius = false,
}) => {
  return (
    <View
      style={[
        styles.scorecardContainer,
        previewScale !== undefined && {
          aspectRatio: undefined,
          width: "100%",
          height: "100%",
        },
        noRadius && { borderRadius: 0 },
      ]}
    >
      {/* Background Image - Dark Version */}
      <View style={styles.backgroundImage}>
        <SCardDark width="100%" height="100%" />
      </View>

      {/* Content Overlay */}
      <View style={styles.contentContainer}>
        <ScoreCard
          match={match}
          sportColors={sportColors}
          isFriendly={isFriendly}
          previewScale={previewScale}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scorecardContainer: {
    width: "100%",
    aspectRatio: 9 / 16,
    overflow: "hidden",
    position: "relative",
    borderRadius: 32,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
