import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Cancellation reason options
const CANCELLATION_REASONS = [
  { value: "PERSONAL_EMERGENCY", label: "Personal Emergency" },
  { value: "INJURY", label: "Injury" },
  { value: "ILLNESS", label: "Illness" },
  { value: "WEATHER", label: "Bad Weather" },
  { value: "SCHEDULING_CONFLICT", label: "Scheduling Conflict" },
  { value: "WORK_COMMITMENT", label: "Work Commitment" },
  { value: "FAMILY_EMERGENCY", label: "Family Emergency" },
  { value: "OTHER", label: "Other" },
] as const;

type CancellationReason = (typeof CANCELLATION_REASONS)[number]["value"];

interface CancelMatchSheetProps {
  matchId: string;
  matchDate: string; // "Dec 04, 2025"
  matchTime: string; // "1:30 PM"
  hasOpponentJoined: boolean;
  isFriendly?: boolean;
  isHost?: boolean; // true = match creator, false = joinee leaving
  onClose: () => void;
  onCancel: (data: {
    reason: CancellationReason;
    comment?: string;
  }) => Promise<void>;
}

// Time tiers for warning display
type CancelTimeTier = "MORE_THAN_24H" | "TWO_TO_24H" | "LESS_THAN_2H";

const getTimeTier = (hours: number): CancelTimeTier => {
  if (hours > 24) return "MORE_THAN_24H";
  if (hours >= 2) return "TWO_TO_24H";
  return "LESS_THAN_2H";
};

export const CancelMatchSheet: React.FC<CancelMatchSheetProps> = ({
  matchId,
  matchDate,
  matchTime,
  hasOpponentJoined,
  isFriendly,
  isHost,
  onClose,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] =
    useState<CancellationReason | null>(null);
  const [hoursUntilMatch, setHoursUntilMatch] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    try {
      const datePartsMatch = matchDate.match(/(\w+)\s+(\d+),\s+(\d+)/);
      if (!datePartsMatch) return;

      const [, monthStr, day, year] = datePartsMatch;
      const monthMap: { [key: string]: number } = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };
      const month = monthMap[monthStr];
      if (month === undefined) return;

      // Parse time using manual parsing for "1:30 PM" format
      const timeMatch = matchTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) return;

      const [, hourStr, minuteStr, period] = timeMatch;
      let hours = parseInt(hourStr);
      const minutes = parseInt(minuteStr);

      // Convert to 24-hour format
      if (period.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (period.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      const matchStartTime = new Date(
        parseInt(year),
        month,
        parseInt(day),
        hours,
        minutes,
      );
      const now = new Date();
      const diffHours =
        (matchStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      setHoursUntilMatch(Math.max(0, Math.round(diffHours * 10) / 10));
    } catch (error) {
      console.error("Error calculating time until match:", error);
    }
  }, [matchDate, matchTime]);

  // ─── Simple confirmation (no opponent) ───────────────────────────────────────
  const handleSimpleCancel = () => {
    Alert.alert(
      "Cancel Match",
      "Are you sure you want to cancel this match? This cannot be undone.",
      [
        { text: "Keep Match", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await onCancel({ reason: "OTHER" });
              onClose();
            } catch {
              Alert.alert("Error", "Failed to cancel match. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ─── Full cancellation (opponent has joined) ──────────────────────────────────
  const handleCancelWithOpponent = async () => {
    if (!selectedReason) {
      Alert.alert("Select a Reason", "Please select a reason for cancellation");
      return;
    }
    try {
      setLoading(true);
      await onCancel({ reason: selectedReason });
      onClose();
    } catch {
      Alert.alert("Error", "Failed to cancel match. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tier = hoursUntilMatch !== null ? getTimeTier(hoursUntilMatch) : null;

  const warningConfig = tier
    ? {
        MORE_THAN_24H: {
          bg: "#EFF6FF",
          border: "#BFDBFE",
          iconColor: "#3B82F6",
          icon: "information-circle" as const,
          text: `You are cancelling ${hoursUntilMatch?.toFixed(1)} hours before the match. No penalty applies, but please try to reschedule with your opponent if possible.`,
        },
        TWO_TO_24H: {
          bg: "#FFFBEB",
          border: "#FDE68A",
          iconColor: "#D97706",
          icon: "warning" as const,
          text: `You are cancelling ${hoursUntilMatch?.toFixed(1)} hours before the match. Your opponent may claim a walkover win. Consider reaching out to reschedule.`,
        },
        LESS_THAN_2H: {
          bg: "#FEF2F2",
          border: "#FEE2E2",
          iconColor: "#DC2626",
          icon: "warning" as const,
          text: `You are cancelling ${hoursUntilMatch?.toFixed(1)} hours before the match. Your opponent is entitled to claim a walkover.`,
        },
      }[tier]
    : null;

  // ─── Friendly match: host cancels ──────────────────────────────────────────────
  if (isFriendly && isHost !== false) {
    return (
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {hasOpponentJoined ? "Cancel this match?" : "Cancel this match?"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {matchDate} · {matchTime}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.infoBanner, { marginTop: 24 }]}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            {hasOpponentJoined
              ? "This match will be removed. The players who joined will be notified."
              : "This match will be removed and no longer visible to anyone."}
          </Text>
        </View>
        <View style={[styles.actionButtons, { marginTop: 24 }]}>
          <TouchableOpacity
            style={styles.keepMatchButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.keepMatchButtonText}>Keep Match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelMatchButton, loading && styles.buttonDisabled]}
            onPress={handleSimpleCancel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.cancelMatchButtonText}>Cancel Match</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    );
  }

  // ─── Friendly match: joinee leaves ─────────────────────────────────────────────
  if (isFriendly && isHost === false) {
    return (
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Leave this match?</Text>
            <Text style={styles.headerSubtitle}>
              {matchDate} · {matchTime}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.infoBanner, { marginTop: 24 }]}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            You will be removed from this match. Please let the host know.
          </Text>
        </View>
        <View style={[styles.actionButtons, { marginTop: 24 }]}>
          <TouchableOpacity
            style={styles.keepMatchButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.keepMatchButtonText}>Stay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelMatchButton, loading && styles.buttonDisabled]}
            onPress={handleSimpleCancel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.cancelMatchButtonText}>Leave Match</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    );
  }

  // ─── No-opponent: simple 2-step confirmation ──────────────────────────────────
  if (!hasOpponentJoined) {
    return (
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Cancel Match</Text>
            <Text style={styles.headerSubtitle}>
              No one has joined yet — you can cancel freely.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.infoBanner, { marginTop: 24 }]}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Since no opponent has joined yet, cancelling has no impact on anyone
            else.
          </Text>
        </View>
        <View style={[styles.actionButtons, { marginTop: 24 }]}>
          <TouchableOpacity
            style={styles.keepMatchButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.keepMatchButtonText}>Keep Match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelMatchButton, loading && styles.buttonDisabled]}
            onPress={handleSimpleCancel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.cancelMatchButtonText}>Cancel Match</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    );
  }

  // ─── Opponent joined: full flow with time-based warning ───────────────────────
  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Cancel Match</Text>
          <Text style={styles.headerSubtitle}>
            Please select a reason for cancellation
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Time-based warning banner */}
      {warningConfig && (
        <View
          style={[
            styles.warningBanner,
            {
              backgroundColor: warningConfig.bg,
              borderColor: warningConfig.border,
            },
          ]}
        >
          <Ionicons
            name={warningConfig.icon}
            size={22}
            color={warningConfig.iconColor}
          />
          <Text style={[styles.warningText, { color: "#1F2937" }]}>
            {warningConfig.text}
          </Text>
        </View>
      )}

      {/* Reason Selection */}
      <View style={styles.reasonSection}>
        <Text style={styles.sectionTitle}>Reason for Cancellation</Text>
        <View style={styles.reasonGrid}>
          {CANCELLATION_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.value}
              style={[
                styles.reasonButton,
                selectedReason === reason.value && styles.reasonButtonSelected,
              ]}
              onPress={() => setSelectedReason(reason.value)}
            >
              <Text
                style={[
                  styles.reasonButtonText,
                  selectedReason === reason.value &&
                    styles.reasonButtonTextSelected,
                ]}
              >
                {reason.label}
              </Text>
              {selectedReason === reason.value && (
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* What Happens Next */}
      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>What happens next</Text>
        {[
          {
            icon: "people-outline" as const,
            text: "Your opponent(s) will be notified",
          },
          {
            icon: "trophy-outline" as const,
            text: "They may claim a walkover depending on timing",
          },
          {
            icon: "close-circle-outline" as const,
            text: "If a walkover is claimed, the match is recorded as a loss (0 points)",
          },
          {
            icon: "cash-outline" as const,
            text: "You may be responsible for any court booking costs",
          },
        ].map((item, i) => (
          <View key={i} style={styles.impactItem}>
            <Ionicons name={item.icon} size={20} color="#6B7280" />
            <Text style={styles.impactText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.keepMatchButton}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.keepMatchButtonText}>Keep Match</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.cancelMatchButton,
            (!selectedReason || loading) && styles.buttonDisabled,
          ]}
          onPress={handleCancelWithOpponent}
          disabled={!selectedReason || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.cancelMatchButtonText}>Cancel Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  closeButton: { padding: 4, marginTop: 4 },
  warningBanner: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#1F2937",
  },
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  reasonSection: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  reasonButtonSelected: { backgroundColor: "#F5900A", borderColor: "#F5900A" },
  reasonButtonText: { fontSize: 14, fontWeight: "500", color: "#4B5563" },
  reasonButtonTextSelected: { color: "#FFFFFF" },
  impactSection: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  impactItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  impactText: { flex: 1, fontSize: 14, color: "#6B7280", lineHeight: 20 },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  keepMatchButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  keepMatchButtonText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  cancelMatchButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelMatchButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  buttonDisabled: { opacity: 0.5 },
});
