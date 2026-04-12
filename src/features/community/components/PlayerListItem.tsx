import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Player } from "../types";

const { width } = Dimensions.get("window");
const isSmallScreen = width < 375;
const isTablet = width > 768;

export type PlayerListMode = "friend" | "invite";

interface PlayerListItemProps {
  player: Player;
  isFriend?: boolean;
  isPendingRequest?: boolean;
  mode?: PlayerListMode;
  actionLoading?: boolean;
  onPress?: (player: Player) => void;
  onAddFriend?: (player: Player) => void;
}

const getDMRRating = (skillRatings: any): string | null => {
  if (!skillRatings) return null;
  const sports = ["pickleball", "tennis", "padel"];
  for (const sport of sports) {
    const val = skillRatings[sport]?.dmr ?? skillRatings[sport]?.rating;
    if (val != null) return formatDMR(val);
  }
  const direct = skillRatings.dmr ?? skillRatings.rating;
  return direct != null ? formatDMR(direct) : null;
};

/** DB may store DMR as decimal (e.g. 3.9) or integer (e.g. 3900). Normalise to integer. */
const formatDMR = (val: number): string => {
  // If value is stored as a decimal fraction (< 100), scale up to integer
  const int = val < 100 ? Math.round(val * 1000) : Math.round(val);
  return String(int);
};

const getGenderMeta = (
  gender?: string | null,
): { symbol: string; color: string } | null => {
  if (!gender) return null;
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return { symbol: "♂", color: "#4A90E2" };
  if (g === "female" || g === "f") return { symbol: "♀", color: "#E91E8C" };
  return null;
};

export const PlayerListItem: React.FC<PlayerListItemProps> = ({
  player,
  isFriend = false,
  isPendingRequest = false,
  mode = "friend",
  actionLoading = false,
  onPress,
  onAddFriend,
}) => {
  const dmr = getDMRRating(player.skillRatings);
  const genderMeta = getGenderMeta(player.gender);

  const renderAction = () => {
    if (isFriend) {
      return (
        <View style={styles.friendsBadge}>
          <Ionicons name="people" size={14} color="#256b27c0" />
          <Text style={styles.friendsBadgeText}>Friends</Text>
        </View>
      );
    }
    if (isPendingRequest) {
      return (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>Pending</Text>
        </View>
      );
    }
    const isInviteMode = mode === "invite";
    return (
      <TouchableOpacity
        style={isInviteMode ? styles.inviteButton : styles.addFriendButton}
        onPress={() => onAddFriend?.(player)}
        disabled={actionLoading}
        activeOpacity={0.75}
      >
        {actionLoading ? (
          <ActivityIndicator
            size="small"
            color={isInviteMode ? "#FFFFFF" : "#FEA04D"}
          />
        ) : (
          <Text
            style={
              isInviteMode
                ? styles.inviteButtonText
                : styles.addFriendButtonText
            }
          >
            {isInviteMode ? "Invite" : "Add Friend"}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress ? () => onPress(player) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Avatar */}
      {player.image ? (
        <Image source={{ uri: player.image }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.defaultAvatarContainer]}>
          <Text style={styles.defaultAvatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          {genderMeta && (
            <Text style={[styles.genderIcon, { color: genderMeta.color }]}>
              {" "}
              {genderMeta.symbol}
            </Text>
          )}
        </View>
        {player.area ? (
          <Text style={styles.areaText}>{player.area}</Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#BABABA" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isSmallScreen ? 10 : isTablet ? 16 : 13,
    minHeight: 68,
  },
  avatar: {
    width: isSmallScreen ? 44 : isTablet ? 58 : 50,
    height: isSmallScreen ? 44 : isTablet ? 58 : 50,
    borderRadius: isSmallScreen ? 22 : isTablet ? 29 : 25,
  },
  defaultAvatarContainer: {
    backgroundColor: "#FEA04D",
    justifyContent: "center",
    alignItems: "center",
  },
  defaultAvatarText: {
    color: "#FFFFFF",
    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    marginLeft: 13,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontFamily: "Inter",
    fontWeight: "700",
    fontSize: isSmallScreen ? 14 : isTablet ? 17 : 15,
    letterSpacing: -0.2,
    color: "#1a1a1a",
    flexShrink: 1,
  },
  genderIcon: {
    fontSize: 16,
    fontWeight: "600",
  },
  dmrText: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontSize: isSmallScreen ? 11 : isTablet ? 13 : 12,
    color: "#666666",
    marginTop: 2,
  },
  areaText: {
    fontFamily: "Inter",
    fontWeight: "500",
    fontSize: isSmallScreen ? 11 : isTablet ? 13 : 12,
    color: "#FEA04D",
    marginTop: 1,
  },
  /* Friend badge */
  friendsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  friendsBadgeText: {
    fontFamily: "Inter",
    fontWeight: "800",
    fontSize: 14,
    color: "#256b27c0",
  },
  /* Pending badge */
  pendingBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pendingText: {
    fontFamily: "Inter",
    fontWeight: "600",
    fontSize: 12,
    color: "#999999",
  },
  /* Add Friend button */
  addFriendButton: {
    backgroundColor: "#FEA04D",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  addFriendButtonText: {
    fontFamily: "Inter",
    fontWeight: "800",
    fontSize: 14,
    color: "#1D1D1F",
  },
  /* Invite button (partnership mode) */
  inviteButton: {
    backgroundColor: "#FEA04D",
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonText: {
    fontFamily: "Inter",
    fontWeight: "600",
    fontSize: 12,
    color: "#FFFFFF",
  },
});
