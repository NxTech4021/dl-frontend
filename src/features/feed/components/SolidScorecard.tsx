// src/features/feed/components/SolidScorecard.tsx

import SCardPadel from "@/assets/backgrounds/Scard-Padel.svg";
import SCardPickleball from "@/assets/backgrounds/Scard-Pickleball.svg";
import SCardTennis from "@/assets/backgrounds/Scard-Tennis.svg";
import { MatchResult, SportColors } from "@/features/standings/types";
import React from "react";
import { StyleSheet, View } from "react-native";
import ScoreCard from "./ScoreCard";

interface SolidScorecardProps {
  match: MatchResult;
  sportColors: SportColors;
  isFriendly?: boolean;
  isSingles?: boolean;
  matchType?: string;
  previewScale?: number;
}

// Map sport types to their background images
const getSportBackground = (sportType: string | undefined) => {
  const normalizedType = sportType?.toUpperCase() || "TENNIS";
  console.log(
    "[SolidScorecard] Sport:",
    sportType,
    "→ Normalized:",
    normalizedType,
  );
  switch (normalizedType) {
    case "PICKLEBALL":
      return <SCardPickleball width="100%" height="100%" />;
    case "PADEL":
      return <SCardPadel width="100%" height="100%" />;
    case "TENNIS":
    default:
      return <SCardTennis width="100%" height="100%" />;
  }
};

export const SolidScorecard: React.FC<SolidScorecardProps> = ({
  match,
  sportColors,
  isFriendly = false,
  matchType = "SINGLES",
  previewScale,
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
      ]}
    >
      {/* Sport Background Image */}
      <View style={styles.backgroundImage}>
        {getSportBackground(match.sport)}
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
  },
  backgroundImage: {
    position: "absolute",
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
