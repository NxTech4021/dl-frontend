import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SPORT_COLORS, getSportColors } from "@/constants/SportsColor";

interface LeagueMatchAttachmentProps {
  isFromCurrentUser?: boolean;
  sportType?: "PICKLEBALL" | "TENNIS" | "PADEL" | null;
}

const getSportColor = (sportType: string | null | undefined): string => {
  const colors = getSportColors(sportType as any);
  return colors.background;
};

export const LeagueMatchAttachment: React.FC<LeagueMatchAttachmentProps> = ({
  isFromCurrentUser = false,
  sportType,
}) => {
  const iconColor = getSportColor(sportType);

  return (
    <View style={styles.container}>
      <Ionicons name="calendar" size={14} color={iconColor} style={styles.icon} />
      <Text style={styles.text}>
        {isFromCurrentUser ? "You posted a league match" : "Posted a league match"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
