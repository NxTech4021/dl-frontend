import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface FriendlyMatch {
  id: string;
  matchType: "SINGLES" | "DOUBLES";
  status: string;
  scheduledTime?: string;
  matchDate?: string;
  location?: string;
  venue?: string;
  courtBooked?: boolean;
  fee?: "FREE" | "SPLIT" | "FIXED";
  feeAmount?: number | string;
  duration?: number;
  notes?: string;
  description?: string;
  genderRestriction?: "MALE" | "FEMALE" | "OPEN" | null;
  skillLevels?: string[];
  createdBy?: {
    id: string;
    name: string;
    image?: string;
  };
  participants: Array<{
    user: {
      id: string;
      name: string;
      image?: string;
    };
    role: string;
    team?: string;
    invitationStatus?: string;
  }>;
}

interface FriendlyMatchCardProps {
  match: FriendlyMatch;
  onPress: (match: FriendlyMatch) => void;
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

export const FriendlyMatchCard: React.FC<FriendlyMatchCardProps> = ({
  match,
  onPress,
  isPast = false,
}) => {
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

  // Only cancelled and unfilled are non-interactive; completed/finished etc. remain tappable
  const isNonInteractive = isUnfilled || isCancelled;

  const dateString = match.scheduledTime || match.matchDate;
  if (!dateString) {
    return null;
  }

  const formatTimeRange = (dateString: string) => {
    const startDate = new Date(dateString);
    const duration = match.duration || 2;
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    const startTime = format(startDate, "h:mma").toLowerCase();
    const endTime = format(endDate, "h:mma").toLowerCase();
    const dayDate = format(startDate, "EEE d MMMM yyyy");
    return `${startTime} - ${endTime}, ${dayDate}`;
  };

  const renderPlayerAvatar = (player: FriendlyMatch["participants"][0]) => {
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

  const getGenderRestrictionText = () => {
    if (!match.genderRestriction) return null;
    switch (match.genderRestriction) {
      case "MALE":
        return "Male only";
      case "FEMALE":
        return "Female only";
      default:
        return null;
    }
  };

  const formatSkillLevel = (level: string): string => {
    const skillMap: Record<string, string> = {
      BEGINNER: "Beginner",
      IMPROVER: "Improver",
      INTERMEDIATE: "Intermediate",
      UPPER_INTERMEDIATE: "Upper Intermediate",
      EXPERT: "Expert",
      ADVANCED: "Advanced",
    };
    return (
      skillMap[level] ||
      level.charAt(0) + level.slice(1).toLowerCase().replace(/_/g, " ")
    );
  };

  const getSkillLevels = () => {
    if (!match.skillLevels || match.skillLevels.length === 0) return [];
    return match.skillLevels;
  };

  // Render a single participant column (avatar + name)
  const renderParticipantColumn = (
    participant: FriendlyMatch["participants"][0],
    key: string,
  ) => (
    <View key={key} style={styles.playerColumnFixed}>
      <View style={styles.playerAvatarLarge}>
        {renderPlayerAvatar(participant)}
      </View>
      <Text style={styles.playerNameText} numberOfLines={1}>
        {participant.user.name?.split(" ")[0] || "Player"}
      </Text>
    </View>
  );

  // Render an empty slot column
  const renderEmptySlotColumn = (key: string) => (
    <View key={key} style={styles.playerColumnFixed}>
      <View style={styles.emptySlotCircle}>
        <Ionicons name="person" size={24} color="#D1D5DB" />
      </View>
      <Text style={styles.emptySlotText}> </Text>
    </View>
  );

  // Team-split layout: host side | vertical divider | opponent side
  const renderTeamLayout = () => {
    const hostId = match.createdBy?.id;
    const host =
      activeParticipants.find((p) => p.user.id === hostId) ||
      activeParticipants[0];

    if (!isDoubles) {
      // Singles: [host] | divider | [opponent or empty]
      const opponent = activeParticipants.find(
        (p) => p.user.id !== host?.user.id,
      );
      return (
        <>
          {host
            ? renderParticipantColumn(host, "host")
            : renderEmptySlotColumn("host-empty")}
          <View style={styles.verticalDivider} />
          {opponent
            ? renderParticipantColumn(opponent, "opp")
            : renderEmptySlotColumn("opp-empty")}
        </>
      );
    }

    // Doubles: determine host team vs opponent team
    const byTeam1 = activeParticipants.filter((p) => p.team === "team1");
    const byTeam2 = activeParticipants.filter((p) => p.team === "team2");
    // Only use team-based layout when both sides are populated.
    // Friendly-doubles joiners get team=null until scores are submitted,
    // so fall back to positional order whenever team data is incomplete.
    const hasTeamData = byTeam1.length > 0 && byTeam2.length > 0;

    let hostTeam: typeof activeParticipants;
    let opponentTeam: typeof activeParticipants;

    if (hasTeamData) {
      const hostInTeam1 = byTeam1.some((p) => p.user.id === host?.user.id);
      hostTeam = hostInTeam1 ? byTeam1 : byTeam2;
      opponentTeam = hostInTeam1 ? byTeam2 : byTeam1;
    } else {
      // No team data: host is first, partner is second, opponents are 3rd & 4th
      if (host) {
        const hostIdx = activeParticipants.findIndex(
          (p) => p.user.id === host.user.id,
        );
        const others = activeParticipants.filter(
          (p) => p.user.id !== host.user.id,
        );
        hostTeam = hostIdx === 0 ? [host, ...others.slice(0, 1)] : [host];
        opponentTeam =
          hostIdx === 0 ? others.slice(1) : [others[0], ...others.slice(1)];
      } else {
        hostTeam = activeParticipants.slice(0, 2);
        opponentTeam = activeParticipants.slice(2, 4);
      }
    }

    const hostTeamSlots = 2;
    const oppTeamSlots = 2;

    return (
      <>
        {/* Host side (up to 2) */}
        {Array.from({ length: hostTeamSlots }).map((_, i) => {
          const p = hostTeam[i];
          return p
            ? renderParticipantColumn(p, `ht-${i}`)
            : renderEmptySlotColumn(`ht-empty-${i}`);
        })}

        {/* Vertical divider */}
        <View style={styles.verticalDivider} />

        {/* Opponent side (up to 2) */}
        {Array.from({ length: oppTeamSlots }).map((_, i) => {
          const p = opponentTeam[i];
          return p
            ? renderParticipantColumn(p, `ot-${i}`)
            : renderEmptySlotColumn(`ot-empty-${i}`);
        })}
      </>
    );
  };

  return (
    <TouchableOpacity
      style={styles.matchCard}
      activeOpacity={isNonInteractive ? 1 : 0.7}
      onPress={() => !isNonInteractive && onPress(match)}
      disabled={isNonInteractive}
    >
      {/* Top Section - Players and FRIENDLY Badge */}
      <View style={styles.cardTopSection}>
        <View style={styles.playersRow}>{renderTeamLayout()}</View>

        {/* FRIENDLY Badge */}
        <View style={styles.friendlyBadgeCard}>
          <Text style={styles.friendlyBadgeCardText} allowFontScaling={false}>
            FRIENDLY
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Match Info Section */}
      <View style={styles.cardInfoSection}>
        <Text style={styles.matchTitleText}>
          {match.matchType === "DOUBLES" ? "Doubles" : "Singles"} Friendly Match
        </Text>

        <View style={styles.cardInfoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>{formatTimeRange(dateString)}</Text>
        </View>

        <View style={styles.cardInfoRow}>
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.cardInfoText}>
            {match.location || match.venue || "Location TBD"}
          </Text>
        </View>

        {/* Fee Info with Court Booked Badge */}
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
          {match.courtBooked !== undefined && (
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
                size={14}
                color={match.courtBooked ? "#10B981" : "#DC2626"}
                style={{ marginLeft: 4 }}
              />
            </View>
          )}
        </View>

        {/* Gender and Skill Level Restrictions */}
        {(getGenderRestrictionText() || getSkillLevels().length > 0) && (
          <View style={styles.restrictionsRow}>
            {getGenderRestrictionText() && (
              <View style={styles.restrictionChip}>
                <Text style={styles.restrictionText}>
                  {getGenderRestrictionText()}
                </Text>
              </View>
            )}
            {getSkillLevels().map((level, index) => (
              <View key={`skill-${index}`} style={styles.restrictionChip}>
                <Text style={styles.restrictionText}>
                  {formatSkillLevel(level)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Unfilled badge */}
        {isUnfilled && (
          <View style={styles.unfilledBadge}>
            <Ionicons
              name="person-remove-outline"
              size={13}
              color="#6B7280"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.unfilledBadgeText}>
              Unfilled · No one joined
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 4,
  },
  matchCardPast: {
    opacity: 0.45,
  },
  cardTopSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  verticalDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
    minHeight: 56,
  },
  playerColumn: {
    alignItems: "center",
    gap: 4,
  },
  playerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    fontSize: 20,
    fontWeight: "700",
  },
  playerNameText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1A1C1E",
    maxWidth: 60,
    textAlign: "center",
  },
  emptySlotColumn: {
    alignItems: "center",
    gap: 4,
  },
  emptySlotRow: {
    flexDirection: "row",
    gap: 8,
  },
  emptySlotCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  emptySlotText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  friendlyBadgeCard: {
    backgroundColor: "#83CFF9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  friendlyBadgeCardText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  playerColumnFixed: {
    alignItems: "center",
    gap: 4,
    width: 64,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  cardInfoSection: {
    gap: 8,
  },
  matchTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1C1E",
    marginBottom: 4,
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardInfoText: {
    fontSize: 14,
    color: "#4B5563",
    flex: 1,
  },
  feeIcon: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    width: 16,
    textAlign: "center",
  },
  courtBookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
  },
  courtBookedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  courtNotBookedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
  },
  courtNotBookedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  restrictionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  restrictionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  restrictionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  unfilledBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginTop: 6,
  },
  unfilledBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default FriendlyMatchCard;
