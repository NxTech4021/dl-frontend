// src/features/feed/components/PostMatchShareSheet.tsx

import { MatchResult, SportColors } from "@/features/standings/types";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSharePost } from "../hooks";
import type { ShareStyle } from "../hooks/useSharePost";
import { feedTheme } from "../theme";
import { DarkThemeScorecard } from "./DarkThemeScorecard";
import {
  ScorecardCaptureRef,
  ScorecardCaptureWrapper,
} from "./ScorecardCaptureWrapper";
import { SolidScorecard } from "./SolidScorecard";
import { TransparentScorecard } from "./TransparentScorecard";

const MAX_CAPTION_LENGTH = 500;

const { width: SCREEN_W, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Preview sizing ───────────────────────────────────────────────────────────
// Natural render size (uses previewScale=1 PREVIEW fixed font/sizes in ScoreCard)
const PREVIEW_NATURAL_W = Math.min(SCREEN_W * 0.55, 210);
const PREVIEW_NATURAL_H = PREVIEW_NATURAL_W * (16 / 9);

// Each style option card inner width: 3 equal flex items in a row
// Row padding: screenPadding(15)*2=30, gaps: 10*2=20; item horizontal padding: 6*2=12
const MINI_PREVIEW_W = (SCREEN_W - 30 - 20) / 3 - 12;
const MINI_PREVIEW_H = MINI_PREVIEW_W * (16 / 9);
// Scale + top-left-aligned translate
const MINI_SCALE = MINI_PREVIEW_W / PREVIEW_NATURAL_W;
const MINI_TX = -(PREVIEW_NATURAL_W * (1 - MINI_SCALE)) / 2;
const MINI_TY = -(PREVIEW_NATURAL_H * (1 - MINI_SCALE)) / 2;

// Modal full-size preview
const MODAL_PREVIEW_H = Math.min(SCREEN_HEIGHT * 0.65, 520);
const MODAL_PREVIEW_W = MODAL_PREVIEW_H * (9 / 16);
const MODAL_SCALE = MODAL_PREVIEW_W / PREVIEW_NATURAL_W;
const MODAL_TX = -(PREVIEW_NATURAL_W * (1 - MODAL_SCALE)) / 2;
const MODAL_TY = -(PREVIEW_NATURAL_H * (1 - MODAL_SCALE)) / 2;
// ─────────────────────────────────────────────────────────────────────────────

interface PostMatchShareSheetProps {
  visible: boolean;
  scorecardMatch: MatchResult | null;
  sportColors: SportColors;
  isPickleball: boolean;
  onPost: (caption: string) => void;
  onSkip: () => void;
  onClose?: () => void;
  onExternalShare?: () => void;
  onInstagramShare?: () => void;
  isPosting?: boolean;
  bottomSheetRef: React.RefObject<BottomSheet | null>;
}

export const PostMatchShareSheet: React.FC<PostMatchShareSheetProps> = ({
  visible,
  scorecardMatch,
  sportColors,
  isPickleball,
  onPost,
  onSkip,
  onClose,
  onExternalShare,
  onInstagramShare,
  isPosting = false,
  bottomSheetRef,
}) => {
  const [caption, setCaption] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<ShareStyle>("white");
  const [previewModalStyle, setPreviewModalStyle] = useState<ShareStyle | null>(
    null,
  );
  const scorecardRef = useRef<ScorecardCaptureRef>(null);
  const { captureAndSave, shareToInstagram, isCapturing, isSaving } =
    useSharePost();
  const cardWidth = Math.min(360, Dimensions.get("window").width - 48);
  const getCaptureViewRef = () => ({
    current: scorecardRef.current?.viewRef || null,
  });

  const isOverLimit = caption.length > MAX_CAPTION_LENGTH;
  const canPost = !isOverLimit && !isPosting;

  const handleStyleChange = useCallback((style: ShareStyle) => {
    setSelectedStyle(style);
    scorecardRef.current?.setBackgroundStyle(style);
  }, []);

  const handlePost = useCallback(() => {
    if (canPost) {
      onPost(caption);
      setCaption("");
    }
  }, [canPost, caption, onPost]);

  const handleSkip = useCallback(() => {
    setCaption("");
    onSkip();
  }, [onSkip]);

  const handleClose = useCallback(() => {
    setCaption("");
    // Call onClose if provided (allows parent to reset state without navigation)
    onClose?.();
  }, [onClose]);

  const handleInstagramShare = useCallback(async () => {
    // Check if Instagram is installed
    const canOpen = await Linking.canOpenURL("instagram://");
    if (!canOpen) {
      Alert.alert(
        "Instagram Not Installed",
        "Please install Instagram to share directly to your story.",
        [{ text: "OK" }],
      );
      return;
    }

    // If custom handler provided, use it; otherwise use internal shareToInstagram
    if (onInstagramShare) {
      onInstagramShare();
    } else {
      const success = await shareToInstagram(getCaptureViewRef());
      if (success) {
        bottomSheetRef.current?.close();
      }
    }
  }, [onInstagramShare, shareToInstagram, bottomSheetRef]);

  const handleSaveToGallery = useCallback(async () => {
    // If custom handler provided, use it; otherwise use internal captureAndSave
    if (onExternalShare) {
      onExternalShare();
    } else {
      const success = await captureAndSave(getCaptureViewRef());
      if (success) {
        bottomSheetRef.current?.close();
      }
    }
  }, [onExternalShare, captureAndSave, bottomSheetRef]);

  // Only render backdrop when visible to prevent touch blocking
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderMatchPreview = () => {
    if (!scorecardMatch) return null;

    return (
      <View style={styles.previewCard} collapsable={false}>
        <ScorecardCaptureWrapper
          ref={scorecardRef}
          match={scorecardMatch}
          sportColors={sportColors}
          isPickleball={isPickleball}
          cardWidth={cardWidth}
        />
      </View>
    );
  };

  // Don't render anything if not visible - prevents touch blocking when closed
  if (!visible) {
    return null;
  }

  const renderModalPreview = () => {
    if (!previewModalStyle || !scorecardMatch) return null;

    // A scaled wrapper that renders at PREVIEW_NATURAL_W then scales up to MODAL_PREVIEW_W
    const inner =
      previewModalStyle === "dark" ? (
        <DarkThemeScorecard
          match={scorecardMatch}
          sportColors={sportColors}
          matchType={scorecardMatch.matchType}
          previewScale={1}
        />
      ) : previewModalStyle === "transparent" ? (
        <View style={{ flex: 1, backgroundColor: "#4A5568" }}>
          <TransparentScorecard match={scorecardMatch} previewScale={1} />
        </View>
      ) : (
        <SolidScorecard
          match={scorecardMatch}
          sportColors={sportColors}
          matchType={scorecardMatch.matchType}
          previewScale={1}
        />
      );

    return (
      <View
        style={{
          width: PREVIEW_NATURAL_W,
          height: PREVIEW_NATURAL_H,
          position: "absolute",
          transform: [
            { translateX: MODAL_TX },
            { translateY: MODAL_TY },
            { scale: MODAL_SCALE },
          ],
        }}
      >
        {inner}
      </View>
    );
  };

  return (
    <>
      {/* Full-size preview modal — opens when tapping ⊞ on a style option */}
      <Modal
        visible={previewModalStyle !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalStyle(null)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop tap to close */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setPreviewModalStyle(null)}
          />

          {/* Preview card */}
          <View style={styles.modalPreviewWrapper} pointerEvents="none">
            {renderModalPreview()}
          </View>

          {/* Label badge */}
          <View style={styles.modalLabelBadge}>
            <Text style={styles.modalLabelText}>
              {previewModalStyle === "white"
                ? "Standard"
                : previewModalStyle === "dark"
                  ? "Dark"
                  : "Transparent"}{" "}
              — Preview
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setPreviewModalStyle(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={["75%"]}
        enablePanDownToClose
        onClose={handleClose}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoid}
          >
            <Text style={styles.title}>Share to Activity Feed?</Text>

            {renderMatchPreview()}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Add a caption..."
                placeholderTextColor={feedTheme.colors.textTertiary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={MAX_CAPTION_LENGTH + 50}
                textAlignVertical="top"
                editable={!isPosting}
              />
              <Text
                style={[
                  styles.charCounter,
                  isOverLimit && styles.charCounterError,
                ]}
              >
                {caption.length}/{MAX_CAPTION_LENGTH}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
                disabled={isPosting}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.postButton,
                  !canPost && styles.postButtonDisabled,
                ]}
                onPress={handlePost}
                activeOpacity={0.7}
                disabled={!canPost}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or share externally:</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Background style selector for save to gallery */}
            <View style={styles.styleSelectorContainer}>
              <View style={styles.styleSelectorHeader}>
                <View>
                  <Text style={styles.styleSelectorLabel}>Save to gallery</Text>
                  <Text style={styles.styleSelectorSubLabel}>
                    Choose a background style
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.saveInlineButton}
                  onPress={handleSaveToGallery}
                  activeOpacity={0.7}
                  disabled={isPosting || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={feedTheme.colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color={feedTheme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.styleOptionsRow}>
                {(["white", "dark", "transparent"] as ShareStyle[]).map(
                  (style) => (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.styleOption,
                        selectedStyle === style && styles.styleOptionSelected,
                      ]}
                      onPress={() => handleStyleChange(style)}
                      activeOpacity={0.7}
                    >
                      {/* Mini scorecard preview — transform-scaled so inner content fits correctly */}
                      <View style={styles.miniPreviewContainer}>
                        {scorecardMatch ? (
                          <View style={styles.miniScaleWrapper}>
                            {style === "dark" ? (
                              <DarkThemeScorecard
                                match={scorecardMatch}
                                sportColors={sportColors}
                                matchType={scorecardMatch.matchType}
                                previewScale={1}
                                noRadius
                              />
                            ) : style === "transparent" ? (
                              <View style={styles.transparentPreviewBg}>
                                <TransparentScorecard
                                  match={scorecardMatch}
                                  previewScale={1}
                                />
                              </View>
                            ) : (
                              <SolidScorecard
                                match={scorecardMatch}
                                sportColors={sportColors}
                                matchType={scorecardMatch.matchType}
                                previewScale={1}
                              />
                            )}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.miniPreviewPlaceholder,
                              style === "white"
                                ? styles.placeholderWhite
                                : style === "dark"
                                  ? styles.placeholderDark
                                  : styles.placeholderTransparent,
                            ]}
                          />
                        )}
                        {/* Expand button — tapping shows full preview modal */}
                        {scorecardMatch && (
                          <TouchableOpacity
                            style={styles.previewInfoButton}
                            onPress={() => setPreviewModalStyle(style)}
                            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="expand-outline"
                              size={13}
                              color="rgba(255,255,255,0.95)"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.styleOptionLabel,
                          selectedStyle === style &&
                            styles.styleOptionLabelSelected,
                        ]}
                      >
                        {style === "white"
                          ? "Standard"
                          : style === "dark"
                            ? "Dark"
                            : "Transparent"}
                      </Text>
                      <Text style={styles.styleOptionSubLabel}>
                        {style === "transparent" ? "Card only" : "9:16 story"}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            {/* Instagram row — coming soon */}
            <TouchableOpacity
              style={styles.instagramRow}
              activeOpacity={0.5}
              disabled
            >
              <View style={styles.instagramIconWrap}>
                <Ionicons name="logo-instagram" size={22} color="#E4405F" />
              </View>
              <View>
                <Text style={styles.instagramRowLabel}>Share to Instagram</Text>
                <Text style={styles.instagramRowSub}>Coming soon</Text>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </BottomSheetScrollView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: feedTheme.spacing.screenPadding,
    paddingBottom: 24,
  },
  keyboardAvoid: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  previewCard: {
    marginBottom: 20,
    alignItems: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: feedTheme.colors.textPrimary,
    lineHeight: 20,
    minHeight: 80,
    maxHeight: 120,
  },
  charCounter: {
    fontSize: 12,
    color: feedTheme.colors.textTertiary,
    textAlign: "right",
    marginTop: 8,
  },
  charCounterError: {
    color: "#FF3B30",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    backgroundColor: feedTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: feedTheme.colors.textSecondary,
  },
  postButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: feedTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: feedTheme.colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: feedTheme.colors.textSecondary,
    paddingHorizontal: 12,
  },

  styleSelectorContainer: {
    marginBottom: 16,
  },
  styleSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  saveInlineButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  instagramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    opacity: 0.45,
  },
  instagramIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: feedTheme.colors.background,
    borderWidth: 1,
    borderColor: feedTheme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  instagramRowLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: feedTheme.colors.textPrimary,
  },
  instagramRowSub: {
    fontSize: 12,
    color: feedTheme.colors.textSecondary,
    marginTop: 1,
  },
  styleSelectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: feedTheme.colors.textPrimary,
    marginBottom: 2,
  },
  styleSelectorSubLabel: {
    fontSize: 12,
    color: feedTheme.colors.textSecondary,
    marginTop: 1,
  },
  styleOptionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  styleOption: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: feedTheme.colors.border,
    backgroundColor: feedTheme.colors.background,
  },
  styleOptionSelected: {
    borderColor: feedTheme.colors.primary,
    backgroundColor: `${feedTheme.colors.primary}10`,
  },
  // Mini scorecard preview inside each style option
  // Outer container clips to the target mini size; inner scaled View renders at natural size
  miniPreviewContainer: {
    width: MINI_PREVIEW_W,
    height: MINI_PREVIEW_H,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  // Inner absolute View rendered at PREVIEW_NATURAL_W × PREVIEW_NATURAL_H,
  // then scaled down via transform to fit inside miniPreviewContainer
  miniScaleWrapper: {
    position: "absolute",
    width: PREVIEW_NATURAL_W,
    height: PREVIEW_NATURAL_H,
    transform: [
      { translateX: MINI_TX },
      { translateY: MINI_TY },
      { scale: MINI_SCALE },
    ],
  },
  transparentPreviewBg: {
    flex: 1,
    backgroundColor: "#4A5568",
  },
  miniPreviewPlaceholder: {
    flex: 1,
  },
  placeholderWhite: {
    backgroundColor: "#FFFFFF",
  },
  placeholderDark: {
    backgroundColor: "#1a1a2e",
  },
  placeholderTransparent: {
    backgroundColor: "#4A5568",
  },
  // Expand button overlay on each mini preview
  previewInfoButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  styleOptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: feedTheme.colors.textSecondary,
  },
  styleOptionLabelSelected: {
    color: feedTheme.colors.primary,
  },
  styleOptionSubLabel: {
    fontSize: 10,
    color: feedTheme.colors.textTertiary,
    fontWeight: "400",
  },
  // Full-size preview modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalPreviewWrapper: {
    width: MODAL_PREVIEW_W,
    height: MODAL_PREVIEW_H,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  modalLabelBadge: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  modalLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    position: "absolute",
    top: 52,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
});
