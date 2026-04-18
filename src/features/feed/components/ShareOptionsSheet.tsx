// src/features/feed/components/ShareOptionsSheet.tsx

import { getSportColors, SportType } from "@/constants/SportsColor";
import { MatchResult, SportColors } from "@/features/standings/types";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import type { ShareError } from "../hooks/useSharePost";
import { feedTheme } from "../theme";
import { DarkThemeScorecard } from "./DarkThemeScorecard";
import { SolidScorecard } from "./SolidScorecard";
import { TransparentScorecard } from "./TransparentScorecard";

export type ShareStyle = "transparent" | "white" | "dark";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
// Cap preview width so it doesn't look oversized on 6.5"+ devices
const PREVIEW_WIDTH = Math.min(SCREEN_WIDTH * 0.55, 210);
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9); // Maintain 9:16 aspect ratio
// Large screens (6.5"+) use a more compact sheet
const IS_LARGE_SCREEN = SCREEN_HEIGHT >= 840;

interface ShareOptionsSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>;
  onClose: () => void;
  onShareImage: (style: ShareStyle) => void;
  onSaveImage: (style: ShareStyle) => void;
  onShareLink: () => void;
  onShareInstagram?: (style: ShareStyle) => void;
  isLoading?: boolean;
  defaultStyle?: ShareStyle;
  shareError?: ShareError | null;
  onClearError?: () => void;
  match?: MatchResult;
  sportType?: string;
}

export const ShareOptionsSheet: React.FC<ShareOptionsSheetProps> = ({
  bottomSheetRef,
  onClose,
  onShareImage,
  onSaveImage,
  onShareLink,
  onShareInstagram,
  isLoading = false,
  defaultStyle = "white",
  shareError,
  onClearError,
  match,
  sportType,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<ShareStyle>(defaultStyle);
  // Driven directly by the sheet's native animation — no JS re-render lag
  const sheetAnimatedIndex = useSharedValue(-1);

  // Keep prevMatchRef for future use (e.g. resetting state on match change)
  const prevMatchRef = useRef<typeof match>(undefined);

  // Get sport colors for preview
  const sportColors: SportColors = useMemo(() => {
    const sport = (sportType?.toUpperCase() || "TENNIS") as SportType;
    return getSportColors(sport);
  }, [sportType]);

  const isPickleball = useMemo(
    () => sportType?.toUpperCase() === "PICKLEBALL",
    [sportType],
  );

  const handleShareImage = useCallback(() => {
    onShareImage(selectedStyle);
  }, [onShareImage, selectedStyle]);

  const handleSaveImage = useCallback(() => {
    onSaveImage(selectedStyle);
  }, [onSaveImage, selectedStyle]);

  const handleShareInstagram = useCallback(async () => {
    if (!onShareInstagram) return;

    // Check if Instagram is installed
    const instagramUrl = "instagram://";
    const canOpen = await Linking.canOpenURL(instagramUrl);

    if (!canOpen) {
      Alert.alert(
        "Instagram Not Installed",
        "Please install Instagram to share directly to your story.",
        [{ text: "OK" }],
      );
      return;
    }

    onShareInstagram(selectedStyle);
  }, [onShareInstagram, selectedStyle]);

  const handleRetry = useCallback(() => {
    if (shareError?.retryAction) {
      onClearError?.();
      shareError.retryAction();
    }
  }, [shareError, onClearError]);

  // Renders the scorecard content inside the backdrop portal so it sits
  // above the backdrop overlay (avoids the gray-overlay issue).
  const renderPreviewContent = useCallback(() => {
    if (!match) return null;
    if (selectedStyle === "transparent") {
      return (
        <View style={styles.transparentPreviewWrapper}>
          <TransparentScorecard match={match} previewScale={1} />
        </View>
      );
    }
    if (selectedStyle === "dark") {
      return (
        <DarkThemeScorecard
          match={match}
          sportColors={sportColors}
          matchType={match.matchType}
          previewScale={1}
        />
      );
    }
    return (
      <SolidScorecard
        match={match}
        sportColors={sportColors}
        matchType={match.matchType}
        previewScale={1}
      />
    );
  }, [match, selectedStyle, sportColors]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <>
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
        {match && (
          <Animated.View
            style={[styles.previewContainer, previewAnimatedStyle]}
          >
            <View style={styles.previewCard}>{renderPreviewContent()}</View>
          </Animated.View>
        )}
      </>
    ),
    [match, renderPreviewContent, previewAnimatedStyle],
  );

  // Animated style: preview is visible only while the sheet is open (index >= 0).
  // Opacity snaps to 0 instantly when the sheet starts closing so no shadow
  // artefact lingers during the pan-down gesture.
  const previewAnimatedStyle = useAnimatedStyle(() => {
    const isOpen = sheetAnimatedIndex.value >= 0;
    return {
      opacity: isOpen
        ? interpolate(sheetAnimatedIndex.value, [0, 1], [1, 1], "clamp")
        : 0,
      // Slide up as the sheet opens; snap back instantly on close.
      transform: [
        {
          translateY: isOpen ? 0 : 24,
        },
        { translateX: -PREVIEW_WIDTH / 2 },
      ],
    };
  });

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={[IS_LARGE_SCREEN ? "34%" : "40%"]}
        enablePanDownToClose
        onDismiss={onClose}
        animatedIndex={sheetAnimatedIndex}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView
          style={[styles.container, IS_LARGE_SCREEN && { paddingTop: 4 }]}
        >
          {/* Error Banner */}
          {shareError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{shareError.message}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
                activeOpacity={0.7}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Style Selector */}
          <View style={styles.styleSelector}>
            <Text
              style={[
                styles.styleSelectorLabel,
                IS_LARGE_SCREEN && { fontSize: 11 },
              ]}
            >
              Background Style (PNG)
            </Text>
            <View style={styles.styleToggleThree}>
              <TouchableOpacity
                style={[
                  styles.styleOption,
                  selectedStyle === "white" && styles.styleOptionSelected,
                ]}
                onPress={() => setSelectedStyle("white")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.styleOptionText,
                    IS_LARGE_SCREEN && { fontSize: 12 },
                    selectedStyle === "white" && styles.styleOptionTextSelected,
                  ]}
                >
                  Standard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.styleOption,
                  selectedStyle === "dark" && styles.styleOptionSelected,
                ]}
                onPress={() => setSelectedStyle("dark")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.styleOptionText,
                    IS_LARGE_SCREEN && { fontSize: 12 },
                    selectedStyle === "dark" && styles.styleOptionTextSelected,
                  ]}
                >
                  Dark
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.styleOption,
                  selectedStyle === "transparent" && styles.styleOptionSelected,
                ]}
                onPress={() => setSelectedStyle("transparent")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.styleOptionText,
                    IS_LARGE_SCREEN && { fontSize: 12 },
                    selectedStyle === "transparent" &&
                      styles.styleOptionTextSelected,
                  ]}
                >
                  Transparent
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.styleHint, IS_LARGE_SCREEN && { fontSize: 11 }]}
            >
              {selectedStyle === "white"
                ? "White background - ready to share"
                : selectedStyle === "dark"
                  ? "Dark themed background - for sharing"
                  : "Transparent background - for editing"}
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.option, IS_LARGE_SCREEN && { paddingVertical: 10 }]}
            onPress={handleShareImage}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons
              name="share-outline"
              size={24}
              color={
                isLoading
                  ? feedTheme.colors.textTertiary
                  : feedTheme.colors.primary
              }
            />
            <Text
              style={[
                styles.optionText,
                IS_LARGE_SCREEN && { fontSize: 14 },
                isLoading && styles.disabledText,
              ]}
            >
              Share as Image
            </Text>
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={feedTheme.colors.primary}
                style={styles.loader}
              />
            )}
          </TouchableOpacity>

          {/* Instagram share — future implementation */}

          <TouchableOpacity
            style={[styles.option, IS_LARGE_SCREEN && { paddingVertical: 10 }]}
            onPress={handleSaveImage}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Ionicons
              name="download-outline"
              size={24}
              color={
                isLoading
                  ? feedTheme.colors.textTertiary
                  : feedTheme.colors.primary
              }
            />
            <Text
              style={[
                styles.optionText,
                IS_LARGE_SCREEN && { fontSize: 14 },
                isLoading && styles.disabledText,
              ]}
            >
              Save to Gallery
            </Text>
            {isLoading && (
              <ActivityIndicator
                size="small"
                color={feedTheme.colors.primary}
                style={styles.loader}
              />
            )}
          </TouchableOpacity>
          {/* 
        <TouchableOpacity
          style={styles.option}
          onPress={onShareLink}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Ionicons
            name="link-outline"
            size={24}
            color={
              isLoading
                ? feedTheme.colors.textTertiary
                : feedTheme.colors.primary
            }
          />
          <Text style={[styles.optionText, isLoading && styles.disabledText]}>
            Share Link
          </Text>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={feedTheme.colors.primary}
              style={styles.loader}
            />
          )}
        </TouchableOpacity> */}
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingTop: 8,
  },
  styleSelector: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  styleSelectorLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: feedTheme.colors.textSecondary,
    marginBottom: 8,
  },
  styleToggle: {
    flexDirection: "row",
    backgroundColor: feedTheme.colors.border,
    borderRadius: 8,
    padding: 3,
  },
  styleToggleThree: {
    flexDirection: "row",
    backgroundColor: feedTheme.colors.border,
    borderRadius: 8,
    padding: 3,
  },
  styleOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  styleOptionSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  styleOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: feedTheme.colors.textSecondary,
  },
  styleOptionTextSelected: {
    color: feedTheme.colors.textPrimary,
  },
  styleHint: {
    fontSize: 12,
    color: feedTheme.colors.textTertiary,
    marginTop: 6,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: feedTheme.colors.border,
    marginVertical: 8,
    marginHorizontal: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  optionText: {
    fontSize: 16,
    color: feedTheme.colors.textPrimary,
    marginLeft: 14,
    flex: 1,
  },
  disabledText: {
    color: feedTheme.colors.textTertiary,
  },
  loader: {
    marginLeft: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#FF3B30",
    marginLeft: 8,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#FF3B30",
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  previewContainer: {
    position: "absolute",
    bottom: "40%",
    left: "50%",
    alignItems: "center",
    zIndex: 1000,
    elevation: 1000,
    // translateX is in the animated style to avoid conflict with Animated.View
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  transparentPreviewWrapper: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: "#4A5568",
  },
});
