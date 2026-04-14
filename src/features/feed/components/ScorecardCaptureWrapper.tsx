import { type CardBackgroundStyle } from "@/features/standings/components";
import { MatchResult, SportColors } from "@/features/standings/types";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { DarkThemeScorecard } from "./DarkThemeScorecard";
import ScoreCard from "./ScoreCard";
import { SolidScorecard } from "./SolidScorecard";
import { TransparentScorecard } from "./TransparentScorecard";

interface ScorecardCaptureWrapperProps {
  match: MatchResult;
  sportColors: SportColors;
  isPickleball: boolean;
  cardWidth: number;
  captureOnly?: boolean;
  renderCaptureHost?: boolean;
}

export interface ScorecardCaptureRef {
  viewRef: View | null;
  setBackgroundStyle: (style: CardBackgroundStyle) => void;
}

/**
 * Wrapper component for MatchResultCard that allows dynamic background style changes
 * for different capture scenarios (white, transparent, or dark backgrounds).
 * Renders as 1080x1920px (9:16 ratio) for optimal sharing quality.
 */
export const ScorecardCaptureWrapper = forwardRef<
  ScorecardCaptureRef,
  ScorecardCaptureWrapperProps
>(
  (
    {
      match,
      sportColors,
      isPickleball,
      cardWidth,
      captureOnly = false,
      renderCaptureHost = true,
    },
    ref,
  ) => {
  const [backgroundStyle, setBackgroundStyle] =
    useState<CardBackgroundStyle>("white");
  const viewRef = useRef<View>(null);

  // Derive isFriendly from match data
  const isFriendly =
    (match as any).isFriendly || (match as any).matchType === "FRIENDLY";

  // Expose both the view ref and the style setter to parent
  useImperativeHandle(ref, () => ({
    get viewRef() {
      return viewRef.current;
    },
    setBackgroundStyle,
  }));

  // Calculate dimensions for 1080x1920 (9:16 ratio) optimal quality output
  const CAPTURE_WIDTH = 1080;
  const CAPTURE_HEIGHT = 1920;
  const PADDING = 0;

  const DISPLAY_BASE_WIDTH = 850;
  const DISPLAY_BASE_HEIGHT = 600;
  const displayScale = Math.min(1, cardWidth / DISPLAY_BASE_WIDTH);
  const displayHeight = DISPLAY_BASE_HEIGHT * displayScale;

  return (
    <>
      {!captureOnly && (
        <View
          style={{
            width: cardWidth,
            height: displayHeight,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ScoreCard
            match={match}
            sportColors={sportColors}
            isFriendly={isFriendly}
            scoreHeaderRowStyle={{ borderRadius: 22 }}
            containerStyle={{
              width: DISPLAY_BASE_WIDTH,
              height: DISPLAY_BASE_HEIGHT,
              boxShadow: "none",
              transform: [{ scale: displayScale }],
            }}
          />
        </View>
      )}

      {renderCaptureHost && (
        <View
          ref={viewRef}
          collapsable={false}
          style={[
            styles.captureContainer,
            {
              width: CAPTURE_WIDTH,
              height: CAPTURE_HEIGHT,
              backgroundColor:
                backgroundStyle === "dark"
                  ? "transparent"
                  : backgroundStyle === "white"
                    ? "transparent"
                    : "transparent",
              padding: PADDING,
            },
          ]}
        >
          {/* Capture version - hidden from view, used only for sharing */}
          {backgroundStyle === "white" ? (
            <SolidScorecard
              match={match}
              sportColors={sportColors}
              isFriendly={isFriendly}
            />
          ) : backgroundStyle === "dark" ? (
            <DarkThemeScorecard
              match={match}
              sportColors={sportColors}
              isFriendly={isFriendly}
            />
          ) : (
            <TransparentScorecard match={match} isFriendly={isFriendly} />
          )}
        </View>
      )}
    </>
  );
},
);

ScorecardCaptureWrapper.displayName = "ScorecardCaptureWrapper";

const styles = StyleSheet.create({
  captureContainer: {
    position: "absolute",
    left: -10000,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
