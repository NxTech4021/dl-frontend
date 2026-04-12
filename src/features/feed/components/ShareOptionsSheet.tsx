// src/features/feed/components/ShareOptionsSheet.tsx

import { getSportColors, SportType } from "@/constants/SportsColor";
import { MatchResult, SportColors } from "@/features/standings/types";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  withTiming,
} from "react-native-reanimated";
import type { ShareError } from "../hooks/useSharePost";
import { feedTheme } from "../theme";
import { DarkThemeScorecard } from "./DarkThemeScorecard";
import { SolidScorecard } from "./SolidScorecard";
import { TransparentScorecard } from "./TransparentScorecard";

export type ShareStyle = "transparent" | "white" | "dark";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Cap preview width so it doesn't look oversized on 6.5"+ devices
const PREVIEW_WIDTH = Math.min(SCREEN_WIDTH * 0.55, 210);
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (16 / 9); // Maintain 9:16 aspect ratio

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
  // Skeleton: fades out once the scorecard has been laid out
  const skeletonOpacity = useSharedValue(1);
  const skeletonStyle = useAnimatedStyle(() => ({
    opacity: skeletonOpacity.value,
  }));

  // Reset skeleton whenever match changes (new post opened)
  const prevMatchRef = useRef<typeof match>(undefined);
  useEffect(() => {
    if (match !== prevMatchRef.current) {
      prevMatchRef.current = match;
      skeletonOpacity.value = 1;
    }
  }, [match, skeletonOpacity]);

  const handlePreviewLayout = useCallback(() => {
    skeletonOpacity.value = withTiming(0, { duration: 300 });
  }, [skeletonOpacity]);

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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
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

  // Render preview — always mounted when match exists so there is no render delay
  const renderPreview = useCallback(() => {
    if (!match) return null;

    return (
      <Animated.View style={[styles.previewContainer, previewAnimatedStyle]}>
        <View style={styles.previewCard} onLayout={handlePreviewLayout}>
          {selectedStyle === "transparent" ? (
            <View style={styles.transparentPreviewWrapper}>
              <TransparentScorecard match={match} previewScale={1} />
            </View>
          ) : selectedStyle === "dark" ? (
            <DarkThemeScorecard
              match={match}
              sportColors={sportColors}
              matchType={match.matchType}
              previewScale={1}
            />
          ) : (
            <SolidScorecard
              match={match}
              sportColors={sportColors}
              matchType={match.matchType}
              previewScale={1}
            />
          )}
          {/* Skeleton overlay — fades out once content is laid out */}
          <Animated.View
            style={[styles.skeletonOverlay, skeletonStyle]}
            pointerEvents="none"
          >
            <View style={styles.skeletonShimmer} />
            <View
              style={[styles.skeletonLine, { width: "60%", marginTop: 12 }]}
            />
            <View
              style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]}
            />
            <View
              style={[styles.skeletonLine, { width: "50%", marginTop: 8 }]}
            />
          </Animated.View>
        </View>
      </Animated.View>
    );
  }, [
    match,
    selectedStyle,
    sportColors,
    previewAnimatedStyle,
    handlePreviewLayout,
    skeletonStyle,
  ]);

  return (
    <>
      {/* Preview — root-level so it is not clipped by sheet content bounds */}
      {renderPreview()}

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["40%"]}
        enablePanDownToClose
        onDismiss={onClose}
        animatedIndex={sheetAnimatedIndex}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.container}>
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
            <Text style={styles.styleSelectorLabel}>
              Background Style (PNG)
            </Text>
            <View style={styles.styleToggle}>
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
                    selectedStyle === "white" && styles.styleOptionTextSelected,
                  ]}
                >
                  Standard
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
                    selectedStyle === "transparent" &&
                      styles.styleOptionTextSelected,
                  ]}
                >
                  Transparent
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.styleHint}>
              {selectedStyle === "white"
                ? "White background - ready to share"
                : "Transparent background - for editing"}
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.option}
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
            <Text style={[styles.optionText, isLoading && styles.disabledText]}>
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

          {onShareInstagram && (
            <TouchableOpacity
              style={styles.option}
              onPress={handleShareInstagram}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name="logo-instagram"
                size={24}
                color={isLoading ? feedTheme.colors.textTertiary : "#E4405F"}
              />
              <Text
                style={[styles.optionText, isLoading && styles.disabledText]}
              >
                Share to Instagram (Comming soon)
              </Text>
              {isLoading && (
                <ActivityIndicator
                  size="small"
                  color={feedTheme.colors.primary}
                  style={styles.loader}
                />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.option}
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
            <Text style={[styles.optionText, isLoading && styles.disabledText]}>
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
  skeletonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  skeletonShimmer: {
    width: "70%",
    height: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
  },
  skeletonLine: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    marginHorizontal: 16,
    alignSelf: "center",
  },
  transparentPreviewWrapper: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: "#4A5568",
  },
});
