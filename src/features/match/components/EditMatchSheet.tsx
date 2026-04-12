import axiosInstance, { endpoints } from "@/lib/endpoints";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

type FeeType = "FREE" | "SPLIT" | "FIXED";

interface EditMatchSheetProps {
  matchId: string;
  initialDate: string; // "Dec 04, 2025"
  initialTime: string; // "1:30 PM"
  initialLocation: string;
  initialCourtBooked: boolean;
  initialFee: string;
  initialFeeAmount: string;
  initialDuration: string;
  initialNotes: string;
  onClose: () => void;
  onSaved: () => void;
}

// Parse "Dec 04, 2025" + "1:30 PM" into a Date object
const parseMatchDateTime = (dateStr: string, timeStr: string): Date => {
  try {
    const dateMatch = dateStr.match(/(\w+)\s+(\d+),\s+(\d+)/);
    if (!dateMatch) return new Date();
    const [, monthStr, day, year] = dateMatch;
    const monthMap: Record<string, number> = {
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
    const month = monthMap[monthStr] ?? 0;

    const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return new Date(parseInt(year), month, parseInt(day));
    const [, hourStr, minuteStr, period] = timeMatch;
    let hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);
    if (period.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (period.toUpperCase() === "AM" && hours === 12) hours = 0;

    return new Date(parseInt(year), month, parseInt(day), hours, minutes);
  } catch {
    return new Date();
  }
};

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

const formatDisplayTime = (d: Date): string =>
  d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const formatDateForAPI = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
};

export const EditMatchSheet: React.FC<EditMatchSheetProps> = ({
  matchId,
  initialDate,
  initialTime,
  initialLocation,
  initialCourtBooked,
  initialFee,
  initialFeeAmount,
  initialDuration,
  initialNotes,
  onClose,
  onSaved,
}) => {
  const initialDateTime = parseMatchDateTime(initialDate, initialTime);

  const [dateTime, setDateTime] = useState<Date>(initialDateTime);
  const [location, setLocation] = useState(initialLocation || "");
  const [courtBooked, setCourtBooked] = useState(initialCourtBooked);
  const [fee, setFee] = useState<FeeType>((initialFee as FeeType) || "FREE");
  const [feeAmount, setFeeAmount] = useState(initialFeeAmount || "");
  const [duration, setDuration] = useState(initialDuration || "2");
  const [notes, setNotes] = useState(initialNotes || "");
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const handleDateConfirm = (date: Date) => {
    setShowDatePicker(false);
    setDateTime((prev) => {
      const updated = new Date(date);
      updated.setHours(prev.getHours(), prev.getMinutes());
      return updated;
    });
  };

  const handleTimeConfirm = (time: Date) => {
    setShowTimePicker(false);
    setDateTime((prev) => {
      const updated = new Date(prev);
      updated.setHours(time.getHours(), time.getMinutes());
      return updated;
    });
  };

  const handleSave = async () => {
    if (!location.trim()) {
      Alert.alert(
        "Location Required",
        "Please enter a location for the match.",
      );
      return;
    }

    try {
      setLoading(true);
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const payload: Record<string, any> = {
        matchDate: formatDateForAPI(dateTime),
        deviceTimezone,
        location: location.trim(),
        courtBooked,
        fee,
        feeAmount: fee !== "FREE" ? parseFloat(feeAmount || "0") : 0,
        duration: parseFloat(duration) || 2,
        notes: notes.trim() || undefined,
      };

      await axiosInstance.put(endpoints.match.update(matchId), payload);
      toast.success("Match updated successfully");
      onSaved();
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to update match";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const FEE_OPTIONS: { value: FeeType; label: string }[] = [
    { value: "FREE", label: "Free" },
    { value: "SPLIT", label: "Split" },
    { value: "FIXED", label: "Fixed" },
  ];

  return (
    <BottomSheetScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Match</Text>
          <Text style={styles.headerSubtitle}>Update match details below</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Date & Time Row */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#6B7280"
              style={styles.fieldIcon}
            />
            <Text style={styles.dateTimeText}>
              {formatDisplayDate(dateTime)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color="#6B7280"
              style={styles.fieldIcon}
            />
            <Text style={styles.dateTimeText}>
              {formatDisplayTime(dateTime)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="location-outline"
            size={18}
            color="#6B7280"
            style={styles.fieldIcon}
          />
          <TextInput
            style={styles.textInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter court or venue"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Duration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Duration (hours)</Text>
        <View style={styles.durationRow}>
          {["1", "1.5", "2", "2.5", "3"].map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.durationChip,
                duration === d && styles.durationChipSelected,
              ]}
              onPress={() => setDuration(d)}
            >
              <Text
                style={[
                  styles.durationChipText,
                  duration === d && styles.durationChipTextSelected,
                ]}
              >
                {d}h
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Court Booked */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionTitle}>Court Booked</Text>
            <Text style={styles.switchSubtitle}>
              Let players know if court is reserved
            </Text>
          </View>
          <Switch
            value={courtBooked}
            onValueChange={setCourtBooked}
            trackColor={{ false: "#E5E7EB", true: "#F5900A" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Fee */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Court Fee</Text>
        <View style={styles.feeRow}>
          {FEE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.feeChip,
                fee === opt.value && styles.feeChipSelected,
              ]}
              onPress={() => setFee(opt.value)}
            >
              <Text
                style={[
                  styles.feeChipText,
                  fee === opt.value && styles.feeChipTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {fee !== "FREE" && (
          <View style={[styles.inputWrapper, { marginTop: 10 }]}>
            <Text style={styles.currencyPrefix}>RM</Text>
            <TextInput
              style={styles.textInput}
              value={feeAmount}
              onChangeText={setFeeAmount}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional info for players…"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={dateTime}
        minimumDate={new Date()}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      {/* Time Picker Modal */}
      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        date={dateTime}
        onConfirm={handleTimeConfirm}
        onCancel={() => setShowTimePicker(false)}
      />
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  closeButton: { padding: 4, marginTop: 4 },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  switchSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  fieldIcon: { marginRight: 8 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
  },
  durationRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  durationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  durationChipSelected: {
    backgroundColor: "#F5900A",
    borderColor: "#F5900A",
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  durationChipTextSelected: {
    color: "#FFFFFF",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feeRow: {
    flexDirection: "row",
    gap: 8,
  },
  feeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  feeChipSelected: {
    backgroundColor: "#F5900A",
    borderColor: "#F5900A",
  },
  feeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  feeChipTextSelected: {
    color: "#FFFFFF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F5900A",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
