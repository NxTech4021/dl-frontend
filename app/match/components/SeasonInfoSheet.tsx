import PickleballIcon from "@/assets/images/045-PICKLEBALL.svg";
import PadelIcon from "@/assets/images/padel-icon.svg";
import TennisIcon from "@/assets/images/tennis-icon.svg";
import { getSportColors, SportType } from "@/constants/SportsColor";
import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";
import React from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SeasonInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  seasonName: string;
  leagueName: string;
  seasonStartDate: string;
  seasonEndDate: string;
  sportType: SportType;
  divisionId: string;
  seasonDivisions: any[];
  isLoading: boolean;
}

export function SeasonInfoSheet({
  visible,
  onClose,
  seasonName,
  leagueName,
  seasonStartDate,
  seasonEndDate,
  sportType,
  divisionId,
  seasonDivisions,
  isLoading,
}: SeasonInfoSheetProps) {
  const insets = useSafeAreaInsets();
  const sportColors = getSportColors(sportType);

  const getSportIcon = () => {
    const sport = sportType?.toUpperCase();
    if (sport?.includes("TENNIS")) return TennisIcon;
    if (sport?.includes("PADEL")) return PadelIcon;
    return PickleballIcon;
  };

  const SportIcon = getSportIcon();

  const totalPlayers = seasonDivisions.reduce((sum, d) => {
    const count =
      d.gameType === "DOUBLES"
        ? (d.currentDoublesCount || 0) * 2
        : d.currentSinglesCount || 0;
    return sum + count;
  }, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.container, { paddingBottom: insets.bottom + 20 }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.titleRow}>
            <View
              style={[
                styles.sportBadge,
                { backgroundColor: sportColors.badgeColor },
              ]}
            >
              <SportIcon
                width={22}
                height={22}
                fill={sportColors.buttonColor}
              />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.seasonName} numberOfLines={1}>
                {seasonName}
              </Text>
              <Text style={styles.leagueName} numberOfLines={1}>
                {leagueName}
              </Text>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.datesRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Start date</Text>
              <Text style={styles.dateValue}>{seasonStartDate}</Text>
            </View>
            <View style={styles.dateSeparator} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>End date</Text>
              <Text style={styles.dateValue}>{seasonEndDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Divisions */}
          <View style={styles.divisionsHeader}>
            <Text style={styles.sectionTitle}>Divisions</Text>
            {!isLoading && seasonDivisions.length > 0 && (
              <Text
                style={[
                  styles.totalPlayers,
                  { color: sportColors.buttonColor },
                ]}
              >
                {totalPlayers} total players
              </Text>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator
              color={sportColors.buttonColor}
              style={{ marginVertical: verticalScale(24) }}
            />
          ) : seasonDivisions.length === 0 ? (
            <Text style={styles.emptyText}>No divisions available yet</Text>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.divisionsList}
            >
              {seasonDivisions.map((div) => {
                const isCurrentDivision = div.id === divisionId;
                const playerCount =
                  div.gameType === "DOUBLES"
                    ? (div.currentDoublesCount || 0) * 2
                    : div.currentSinglesCount || 0;
                const maxPlayers =
                  div.gameType === "DOUBLES"
                    ? div.maxDoublesTeams
                      ? div.maxDoublesTeams * 2
                      : 0
                    : div.maxSinglesPlayers || 0;
                const genderUpper = (div.genderCategory || "").toUpperCase();
                const genderPrefix =
                  genderUpper === "MALE"
                    ? "Men's "
                    : genderUpper === "FEMALE"
                      ? "Women's "
                      : genderUpper === "MIXED"
                        ? "Mixed "
                        : "";
                const typeLabel =
                  div.gameType === "DOUBLES" ? "Doubles" : "Singles";

                return (
                  <View
                    key={div.id}
                    style={[
                      styles.divisionRow,
                      isCurrentDivision && styles.divisionRowActive,
                    ]}
                  >
                    <View style={styles.divisionLeft}>
                      <View style={styles.divisionNameRow}>
                        <Text style={styles.divisionName}>{div.name}</Text>
                        {isCurrentDivision && (
                          <View
                            style={[
                              styles.youBadge,
                              { backgroundColor: sportColors.buttonColor },
                            ]}
                          >
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.divisionType}>
                        {`${genderPrefix}${typeLabel}`}
                      </Text>
                    </View>
                    <View style={styles.divisionRight}>
                      <Text
                        style={[
                          styles.divisionPlayerCount,
                          { color: sportColors.buttonColor },
                        ]}
                      >
                        {maxPlayers > 0
                          ? `${playerCount} / ${maxPlayers}`
                          : `${playerCount}`}
                      </Text>
                      <Text style={styles.divisionPlayersLabel}>players</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    maxHeight: "82%",
  },
  handle: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: "#E5E7EB",
    borderRadius: moderateScale(2),
    alignSelf: "center",
    marginBottom: verticalScale(20),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(20),
    gap: scale(12),
  },
  sportBadge: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    flex: 1,
  },
  seasonName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#111827",
    marginBottom: verticalScale(2),
  },
  leagueName: {
    fontSize: moderateScale(13),
    color: "#6B7280",
    fontWeight: "500",
  },
  datesRow: {
    flexDirection: "row",
    marginBottom: verticalScale(20),
    backgroundColor: "#F9FAFB",
    borderRadius: moderateScale(12),
    padding: scale(14),
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: moderateScale(11),
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: verticalScale(4),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: moderateScale(14),
    color: "#111827",
    fontWeight: "600",
  },
  dateSeparator: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: scale(14),
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: verticalScale(16),
  },
  divisionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#111827",
  },
  totalPlayers: {
    fontSize: moderateScale(13),
    fontWeight: "600",
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: verticalScale(24),
  },
  divisionsList: {
    maxHeight: verticalScale(280),
  },
  divisionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
    backgroundColor: "#F9FAFB",
  },
  divisionRowActive: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  divisionLeft: {
    flex: 1,
  },
  divisionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(2),
  },
  divisionName: {
    fontSize: moderateScale(15),
    fontWeight: "700",
    color: "#111827",
  },
  youBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(20),
  },
  youBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: "700",
    color: "#FFFFFF",
  },
  divisionType: {
    fontSize: moderateScale(12),
    color: "#6B7280",
    fontWeight: "500",
  },
  divisionRight: {
    alignItems: "flex-end",
  },
  divisionPlayerCount: {
    fontSize: moderateScale(17),
    fontWeight: "700",
    marginBottom: verticalScale(1),
  },
  divisionPlayersLabel: {
    fontSize: moderateScale(11),
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
