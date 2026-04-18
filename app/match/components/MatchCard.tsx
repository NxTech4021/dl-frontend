import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Match } from "./types";

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
  onViewScorecard?: (match: Match) => void;
  isPast?: boolean;
}

const TERMINAL_STATUSES = new Set([
  "COMPLETED",
  "FINISHED",
  "CANCELLED",
  "VOID",
  "UNFINISHED",
  "WALKOVER_PENDING",
  "ONGOING",
]);

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onPress,
  onViewScorecard,
  isPast = false,
}) => {
  // Show participants who are either ACCEPTED or PENDING (not DECLINED, EXPIRED, CANCELLED)
  const activeParticipants = (match.participants || []).filter(
    (p) =>
      !p.invitationStatus ||
      p.invitationStatus === "ACCEPTED" ||
      p.invitationStatus === "PENDING",
  );
  const isDoubles = match.matchType === "DOUBLES";
  const maxSlots = isDoubles ? 4 : 2;
  const emptySlots = maxSlots - activeParticipants.length;

  // Unfilled: match time has passed, no terminal status, and no opposing side joined
  const isUnfilled =
    isPast &&
    !TERMINAL_STATUSES.has(match.status?.toUpperCase()) &&
    activeParticipants.length <= maxSlots / 2;

  const isCancelled = match.status?.toUpperCase() === "CANCELLED";

  const COMPLETED_STATUSES = new Set(["COMPLETED", "FINISHED"]);
  const isCompleted = COMPLETED_STATUSES.has(match.status?.toUpperCase() ?? "");

  // Non-interactive: unfilled, cancelled, or completed (completed uses View Scorecard only)
  const isNonInteractive = isUnfilled || isCancelled || isCompleted;

  // Use scheduledTime or matchDate
  const dateString = match.scheduledTime || match.matchDate;
  if (!dateString) {
    console.warn("⚠️ Match has no date:", match.id);
    return null;
  }

  const formatTimeRange = (dateString: string) => {
    const startDate = new Date(dateString);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const startTime = format(startDate, "h:mma").toLowerCase();
    const endTime = format(endDate, "h:mma").toLowerCase();
    const dayDate = format(startDate, "EEE d MMMM yyyy");
    return `${startTime} - ${endTime}, ${dayDate}`;
  };

  const renderPlayerAvatar = (player: Match["participants"][0]) => {
    if (player?.user?.image) {
      return (
        <Image source={{ uri: player.user.image }} style={styles.avatarImage} />
      );
    }
    return (
      <View style={styles.defaultAvatar}>
        <Text style={styles.defaultAvatarText}>
          {player?.user?.name?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.matchCard}>
    <TouchableOpacity
      activeOpacity={isNonInteractive ? 1 : 0.7}
      onPress={() => !isNonInteractive && onPress(match)}
      disabled={isNonInteractive}
    >
      {/* Top Section - Players and LEAGUE Badge */}
      <View style={styles.cardTopSection}>
        <View style={styles.playersRow}>
          {/* Show participants */}
          {activeParticipants.map((participant) => (
            <View key={participant.user.id} style={styles.playerColumn}>
              <View style={styles.playerAvatarLarge}>
                {renderPlayerAvatar(participant)}
              </View>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {participant.user.name?.split(" ")[0] || "Player"}
              </Text>
            </View>
          ))}

          {/* Show empty slots */}
          {emptySlots > 0 && (
            <View style={styles.emptySlotColumn}>
              <View style={styles.emptySlotRow}>
                {Array.from({ length: Math.min(emptySlots, 2) }).map(
                  (_, idx) => (
                    <View key={`empty-${idx}`} style={styles.emptySlotCircle}>
                      <Ionicons
                        name="person"
                        size={moderateScale(24)}
                        color="#D1D5DB"
                      />
                    </View>
                  ),
                )}
              </View>
              <Text style={styles.emptySlotText}>
                {isDoubles
                  ? `${Math.ceil(emptySlots / 2)} pair slot`
                  : `${emptySlots} player slot`}
              </Text>
            </View>
          )}
        </View>

        {/* LEAGUE Badge */}
        <View style={styles.leagueBadgeCard}>
          <Text style={styles.leagueBadgeCardText}>LEAGUE</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Match Info Section */}
      <View style={styles.cardInfoSection}>
        <Text style={styles.matchTitleText}>
          {match.matchType === "DOUBLES" ? "Doubles" : "Singles"} League Match
        </Text>

        <View style={styles.cardInfoRow}>
          <Ionicons
            name="time-outline"
            size={moderateScale(16)}
            color="#6B7280"
          />
          <Text style={styles.cardInfoText}>{formatTimeRange(dateString)}</Text>
        </View>

        <View style={styles.cardInfoRow}>
          <Ionicons
            name="location-outline"
            size={moderateScale(16)}
            color="#6B7280"
          />
          <Text style={styles.cardInfoText}>
            {match.location || match.venue || "Location TBD"}
          </Text>
        </View>

        {/* Fee Info with Court Booked Badge — hidden for past/completed matches */}
        {!isCompleted && !isPast && (
          <View style={styles.cardInfoRow}>
            <Text style={styles.feeIcon}>$</Text>
            <Text style={styles.cardInfoText}>
              {(() => {
                if (match.fee === "FREE") return "Free";
                if (!match.fee || !match.feeAmount) return "Fee TBD";
                const totalAmount = Number(match.feeAmount);
                if (match.fee === "SPLIT") {
                  const numPlayers = match.matchType === "DOUBLES" ? 4 : 2;
                  const perPlayer = (totalAmount / numPlayers).toFixed(2);
                  return `Split · RM${perPlayer} per player`;
                }
                return `Fixed · RM${totalAmount.toFixed(2)} per player`;
              })()}
            </Text>
            <View
              style={
                match.courtBooked
                  ? styles.courtBookedBadge
                  : styles.courtNotBookedBadge
              }
            >
              <Text
                style={
                  match.courtBooked
                    ? styles.courtBookedText
                    : styles.courtNotBookedText
                }
              >
                {match.courtBooked ? "Court booked" : "Court not booked"}
              </Text>
              <Ionicons
                name={match.courtBooked ? "checkmark-circle" : "close-circle"}
                size={moderateScale(14)}
                color={match.courtBooked ? "#10B981" : "#DC2626"}
                style={{ marginLeft: scale(4) }}
              />
            </View>
          </View>
        )}

        {/* Unfilled badge */}
        {isUnfilled && (
          <View style={styles.unfilledBadge}>
            <Ionicons
              name="person-remove-outline"
              size={moderateScale(13)}
              color="#6B7280"
              style={{ marginRight: scale(4) }}
            />
            <Text style={styles.unfilledBadgeText}>
              Unfilled · No one joined
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>

      {isCompleted && onViewScorecard && (
        <TouchableOpacity
          style={styles.viewScorecardButton}
          onPress={() => onViewScorecard(match)}
          activeOpacity={0.75}
        >
          <Ionicons
            name="trophy-outline"
            size={moderateScale(15)}
            color="#FEA04D"
            style={{ marginRight: scale(6) }}
          />
          <Text style={styles.viewScorecardText}>View Scorecard</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(16),
    marginBottom: verticalScale(12),
    borderRadius: moderateScale(16),
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.12,
    shadowRadius: moderateScale(2),
    elevation: 4,
  },

  cardTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(12),
    flex: 1,
  },
  playerColumn: {
    alignItems: "center",
    gap: verticalScale(4),
  },
  playerAvatarLarge: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  defaultAvatar: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8B4BC",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "#FFFFFF",
    fontSize: moderateScale(20),
    fontWeight: "700",
  },
  playerNameText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#1A1C1E",
    maxWidth: scale(60),
    textAlign: "center",
  },
  emptySlotColumn: {
    alignItems: "center",
    gap: verticalScale(4),
  },
  emptySlotRow: {
    flexDirection: "row",
    gap: scale(8),
  },
  emptySlotCircle: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  emptySlotText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#9CA3AF",
  },
  leagueBadgeCard: {
    backgroundColor: "#FEA04D",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  leagueBadgeCardText: {
    color: "#FFFFFF",
    fontSize: moderateScale(11),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: verticalScale(16),
  },
  cardInfoSection: {
    gap: verticalScale(8),
  },
  matchTitleText: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: verticalScale(4),
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  cardInfoText: {
    fontSize: moderateScale(14),
    color: "#4B5563",
    flex: 1,
  },
  feeIcon: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#6B7280",
    width: scale(16),
    textAlign: "center",
  },
  courtBookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    backgroundColor: "#ECFDF5",
    borderRadius: moderateScale(16),
  },
  courtBookedText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#10B981",
  },
  courtNotBookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    backgroundColor: "#FEF2F2",
    borderRadius: moderateScale(16),
  },
  courtNotBookedText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#DC2626",
  },
  unfilledBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    backgroundColor: "#F3F4F6",
    borderRadius: moderateScale(16),
    marginTop: verticalScale(6),
  },
  unfilledBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: "600",
    color: "#6B7280",
  },
  viewScorecardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: scale(0),
    marginTop: verticalScale(12),
    paddingVertical: verticalScale(10),
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  viewScorecardText: {
    fontSize: moderateScale(14),
    fontWeight: "700",
    color: "#FEA04D",
  },
});
