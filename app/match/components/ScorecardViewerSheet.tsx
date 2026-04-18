import { getSportColors, SportType } from "@/constants/SportsColor";
import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";
import { GameScore, MatchPlayer, MatchResult, SetScore } from "@/features/standings/types";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import ScoreCard from "@/src/features/feed/components/ScoreCard";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { format } from "date-fns";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DISPLAY_BASE_WIDTH = 850;
const DISPLAY_BASE_HEIGHT = 600;

interface ScorecardViewerSheetProps {
  matchId: string | null;
  visible: boolean;
  onClose: () => void;
  sportType: string;
}

export const ScorecardViewerSheet: React.FC<ScorecardViewerSheetProps> = ({
  matchId,
  visible,
  onClose,
  sportType,
}) => {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const sportColors = getSportColors(sportType?.toUpperCase() as SportType);

  useEffect(() => {
    if (visible && matchId) {
      bottomSheetRef.current?.present();
      fetchMatchResult(matchId);
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible, matchId]);

  const fetchMatchResult = async (id: string) => {
    setLoading(true);
    setMatchResult(null);
    try {
      const response = await axiosInstance.get(endpoints.match.getDetails(id));
      const data = response.data?.data;
      if (!data) return;

      // Group participants by team assignment
      const allParticipants: any[] = data.participants || [];
      const team1: any[] = [];
      const team2: any[] = [];

      allParticipants.forEach((p: any) => {
        const t = (p.team || "").toLowerCase();
        if (t === "team1" || t === "team_a") team1.push(p);
        else if (t === "team2" || t === "team_b") team2.push(p);
      });

      // Fall back to splitting evenly if no team tags
      if (team1.length === 0 && team2.length === 0) {
        const half = Math.ceil(allParticipants.length / 2);
        allParticipants.forEach((p: any, i: number) => {
          if (i < half) team1.push(p);
          else team2.push(p);
        });
      }

      const toPlayer = (p: any): MatchPlayer => ({
        id: p.userId || p.id || "",
        name: p.name || null,
        image: p.image || null,
      });

      // Parse set/game scores
      const isPickleball =
        (data.sportType || sportType || "").toUpperCase() === "PICKLEBALL";
      let setScores: SetScore[] = [];
      let gameScores: GameScore[] = [];

      if (isPickleball) {
        const pkl: any[] = data.pickleballScores || [];
        gameScores = pkl.map((g: any) => ({
          gameNumber: g.gameNumber,
          team1Points: g.player1Points ?? g.team1Points ?? 0,
          team2Points: g.player2Points ?? g.team2Points ?? 0,
        }));
      } else {
        const sc: any[] = data.scores || [];
        setScores = sc.map((s: any) => ({
          setNumber: s.setNumber,
          team1Games: s.player1Games ?? s.team1Games ?? 0,
          team2Games: s.player2Games ?? s.team2Games ?? 0,
          team1Tiebreak: s.player1Tiebreak ?? s.team1Tiebreak ?? null,
          team2Tiebreak: s.player2Tiebreak ?? s.team2Tiebreak ?? null,
          hasTiebreak: s.hasTiebreak ?? false,
        }));
      }

      const t1 = data.team1Score ?? 0;
      const t2 = data.team2Score ?? 0;
      const outcome = t1 > t2 ? "team1" : t2 > t1 ? "team2" : "";

      setMatchResult({
        id,
        matchType: data.matchType,
        matchDate: data.matchDate || new Date().toISOString(),
        sport: data.sportType || sportType,
        team1Score: t1,
        team2Score: t2,
        outcome,
        setScores,
        gameScores,
        team1Players: team1.map(toPlayer),
        team2Players: team2.map(toPlayer),
        isWalkover: data.isWalkover ?? false,
        isFriendly: false,
        location: data.location,
        leagueName: data.leagueName,
        seasonName: data.season,
        divisionName: data.division,
      });
    } catch {
      // silently fail — "not available" state shown
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

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

  const cardWidth = SCREEN_WIDTH - scale(32);
  const displayScale = Math.min(1, cardWidth / DISPLAY_BASE_WIDTH);
  const displayHeight = DISPLAY_BASE_HEIGHT * displayScale;

  if (!matchId) return null;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      handleComponent={(props) => (
        <View style={styles.handleContainer}>
          <BottomSheetHandle {...props} />
        </View>
      )}
      backgroundStyle={styles.sheetBackground}
      enablePanDownToClose
      enableDismissOnClose
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sheetTitle}>Scorecard</Text>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={sportColors.background} />
            <Text style={styles.stateText}>Loading scorecard…</Text>
          </View>
        ) : matchResult ? (
          <>
            {/* ScoreCard — same display sizing as ScorecardCaptureWrapper */}
            <View
              style={{
                width: cardWidth,
                height: displayHeight,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                alignSelf: "center",
                marginBottom: verticalScale(20),
              }}
            >
              <ScoreCard
                match={matchResult}
                sportColors={sportColors}
                isFriendly={false}
                scoreHeaderRowStyle={{ borderRadius: 22 }}
                containerStyle={{
                  width: DISPLAY_BASE_WIDTH,
                  height: DISPLAY_BASE_HEIGHT,
                  boxShadow: "none",
                  transform: [{ scale: displayScale }],
                }}
              />
            </View>

            {/* Match meta info */}
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={moderateScale(16)}
                color="#86868B"
              />
              <Text style={styles.infoText}>
                {format(new Date(matchResult.matchDate), "EEEE, d MMMM yyyy")}
              </Text>
            </View>

            {!!matchResult.location && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={moderateScale(16)}
                  color="#86868B"
                />
                <Text style={styles.infoText}>{matchResult.location}</Text>
              </View>
            )}

            {matchResult.isWalkover && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={moderateScale(16)}
                  color="#F59E0B"
                />
                <Text style={[styles.infoText, styles.walkoverText]}>
                  Walkover
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.centeredState}>
            <Ionicons
              name="alert-circle-outline"
              size={moderateScale(40)}
              color="#9CA3AF"
            />
            <Text style={styles.stateText}>Scorecard not available</Text>
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    paddingTop: verticalScale(8),
  },
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
  },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(40),
  },
  sheetTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: verticalScale(16),
  },
  centeredState: {
    paddingVertical: verticalScale(60),
    alignItems: "center",
    gap: verticalScale(12),
  },
  stateText: {
    fontSize: moderateScale(14),
    color: "#6B7280",
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  infoText: {
    fontSize: moderateScale(14),
    color: "#4B5563",
    flex: 1,
  },
  walkoverText: {
    color: "#F59E0B",
    fontWeight: "600",
  },
});
