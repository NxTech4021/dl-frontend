import { useSession } from "@/lib/auth-client";
import axiosInstance from "@/lib/endpoints";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

import { moderateScale, scale, verticalScale } from "@/core/utils/responsive";

// Sport icon imports
import PickleballIcon from "@/assets/images/045-PICKLEBALL.svg";
import PadelIcon from "@/assets/images/padel-icon.svg";
import TennisIcon from "@/assets/images/tennis-icon.svg";

interface LeagueInfo {
  name: string;
  season?: string;
  division?: string;
  sportType: "PICKLEBALL" | "TENNIS" | "PADEL";
  divisionId?: string;
  gameType?: "SINGLES" | "DOUBLES";
  seasonId?: string;
}

interface CreateMatchScreenProps {
  leagueInfo: LeagueInfo;
  onClose: () => void;
  onCreateMatch: (matchData: MatchFormData) => Promise<void> | void;
}

export interface MatchFormData {
  date: string;
  time: string;
  duration: number;
  numberOfPlayers: number;
  location: string;
  fee: "FREE" | "SPLIT" | "FIXED";
  feeAmount: string;
  courtBooked: boolean;
  description: string;
  partnerId?: string;
}

type FeeType = "FREE" | "SPLIT" | "FIXED";

export const CreateMatchScreen: React.FC<CreateMatchScreenProps> = memo(
  ({ leagueInfo, onClose, onCreateMatch }) => {
    const insets = useSafeAreaInsets();
    const { data: session } = useSession();

    // Lock player count from division gameType for league matches
    const isLeagueMatch = !!leagueInfo?.divisionId;
    const lockedPlayerCount =
      leagueInfo?.gameType?.toUpperCase() === "DOUBLES" ? 4 : 2;

    const [formData, setFormData] = useState<MatchFormData>({
      date: "",
      time: "",
      duration: 2,
      numberOfPlayers: isLeagueMatch ? lockedPlayerCount : 2,
      location: "",
      fee: "FREE",
      feeAmount: "0.00",
      courtBooked: false,
      description: "",
    });

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [tempTime, setTempTime] = useState<Date>(new Date());
    const [isTimePickerVisible, setTimePickerVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
    );
    const [isMonthView, setIsMonthView] = useState(false);
    const [currentMonth, setCurrentMonth] = useState<Date>(
      startOfMonth(new Date()),
    );

    // #037 BUG 1: Fetch partner info for doubles leagues
    const [partnerName, setPartnerName] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [partnerLoading, setPartnerLoading] = useState(false);
    const isDoublesLeague =
      isLeagueMatch && leagueInfo?.gameType?.toUpperCase() === "DOUBLES";

    useEffect(() => {
      if (!isDoublesLeague || !leagueInfo?.seasonId) return;

      const fetchPartner = async () => {
        setPartnerLoading(true);
        try {
          const response = await axiosInstance.get(
            `/api/pairing/partnership/active/${leagueInfo.seasonId}`,
          );
          const partnership = response.data?.data;
          if (partnership && partnership.status === "ACTIVE") {
            // Show the OTHER person's name (not the current user)
            const currentUserId = session?.user?.id;
            const isCaptain = partnership.captainId === currentUserId;
            const otherPersonName = isCaptain
              ? partnership.partner?.name
              : partnership.captain?.name;
            const otherPersonId = isCaptain
              ? partnership.partnerId
              : partnership.captainId;
            setPartnerName(otherPersonName || null);
            setPartnerId(otherPersonId || null);
          }
          // INCOMPLETE partnerships (partner left) → show no partner
        } catch {
          // No partnership — will be caught by handleCreateMatch later
        } finally {
          setPartnerLoading(false);
        }
      };

      fetchPartner();
    }, [isDoublesLeague, leagueInfo?.seasonId]);

    // Memoized sport-specific colors
    const sportColors = useMemo(() => {
      switch (leagueInfo.sportType) {
        case "PICKLEBALL":
          return {
            background: "#A04DFE",
            badge: "#A855F7",
            label: "Pickleball",
          };
        case "TENNIS":
          return { background: "#65B741", badge: "#22C55E", label: "Tennis" };
        case "PADEL":
          return { background: "#3B82F6", badge: "#60A5FA", label: "Padel" };
        default:
          return { background: "#A04DFE", badge: "#A855F7", label: "Friendly" };
      }
    }, [leagueInfo.sportType]);

    // Memoized sport icon component
    const SportIcon = useMemo(() => {
      switch (leagueInfo.sportType) {
        case "TENNIS":
          return TennisIcon;
        case "PADEL":
          return PadelIcon;
        case "PICKLEBALL":
        default:
          return PickleballIcon;
      }
    }, [leagueInfo.sportType]);

    // Memoized week days for the date selector
    const weekDays = useMemo(() => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(currentWeekStart, i));
      }
      return days;
    }, [currentWeekStart]);

    // Memoized month days for the date selector (including leading/trailing days)
    const monthDays = useMemo(() => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const endDate = startOfWeek(addDays(monthEnd, 7), { weekStartsOn: 1 });

      const days = [];
      let currentDate = startDate;
      while (currentDate < endDate) {
        days.push(currentDate);
        currentDate = addDays(currentDate, 1);
      }
      return days;
    }, [currentMonth]);

    const handlePreviousWeek = useCallback(() => {
      setCurrentWeekStart((prev) => addDays(prev, -7));
    }, []);

    const handleNextWeek = useCallback(() => {
      setCurrentWeekStart((prev) => addDays(prev, 7));
    }, []);

    const handlePreviousMonth = useCallback(() => {
      setCurrentMonth((prev) => subMonths(prev, 1));
    }, []);

    const handleNextMonth = useCallback(() => {
      setCurrentMonth((prev) => addMonths(prev, 1));
    }, []);

    const toggleMonthView = useCallback(() => {
      setIsMonthView((prev) => {
        // Sync current month with current week when toggling to month view
        if (!prev) {
          setCurrentMonth(startOfMonth(currentWeekStart));
        }
        return !prev;
      });
    }, [currentWeekStart]);

    const handleDateSelect = useCallback((date: Date) => {
      setSelectedDate(date);
      setFormData((prev) => ({ ...prev, date: format(date, "yyyy-MM-dd") }));
    }, []);

    // For Android, we need to show/hide the picker
    const showAndroidTimePicker = () => {
      if (Platform.OS === "android") {
        setTimePickerVisible(true);
      }
    };

    // For iOS, show modal with spinner picker
    const showIOSTimePicker = () => {
      if (Platform.OS === "ios") {
        setTempTime(selectedTime);
        setTimePickerVisible(true);
      }
    };

    const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        // Android picker auto-dismisses
        setTimePickerVisible(false);
        if (event.type === "set" && date) {
          updateTimeSelection(date);
        }
      } else if (date) {
        // iOS: Update temp time as user scrolls the picker
        setTempTime(date);
      }
    };

    const handleIOSConfirm = () => {
      updateTimeSelection(tempTime);
      setTimePickerVisible(false);
    };

    const handleIOSCancel = () => {
      setTimePickerVisible(false);
    };

    const updateTimeSelection = (date: Date) => {
      setSelectedTime(date);
      updateTimeString(date, formData.duration);
    };

    const updateTimeString = (startDate: Date, duration: number) => {
      if (!startDate) return;
      const timeString = format(startDate, "h:mm a");
      const endTime = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
      const endTimeString = format(endTime, "h:mm a");
      setFormData((prev) => ({
        ...prev,
        time: `${timeString} - ${endTimeString}`,
      }));
    };

    const handlePlayerCountChange = (delta: number) => {
      const newCount = Math.max(
        2,
        Math.min(4, formData.numberOfPlayers + delta),
      );
      setFormData({ ...formData, numberOfPlayers: newCount });
    };

    const handleCreateMatch = async () => {
      // Validate required fields
      if (!formData.date) {
        toast.error("Please select a date");
        return;
      }

      if (!formData.time) {
        toast.error("Please select a time");
        return;
      }

      // Validate date/time is not in the past
      try {
        const dateStr = formData.date;
        const timeStr = formData.time.split(" - ")[0]; // Get start time only
        const dateTimeStr = `${dateStr} ${timeStr}`;
        const selectedDateTime = new Date(dateTimeStr);
        const now = new Date();

        if (selectedDateTime < now) {
          toast.error("Match date and time cannot be in the past");
          return;
        }
      } catch {
        // Continue with other validations - date format might be unusual but valid
      }

      if (!formData.location || formData.location.trim() === "") {
        toast.error("Please enter a location");
        return;
      }

      // Validate doubles partner exists for league matches
      if (isDoublesLeague && !partnerName) {
        toast.error(
          "You need an active partner for doubles matches. Go to Team Pairing to find one.",
        );
        return;
      }

      // Validate fee amount if not FREE
      if (formData.fee !== "FREE") {
        const feeAmount = parseFloat(formData.feeAmount);

        if (!formData.feeAmount || formData.feeAmount.trim() === "") {
          toast.error("Please enter a fee amount");
          return;
        }

        if (isNaN(feeAmount) || feeAmount <= 0) {
          toast.error("Please enter a valid fee amount greater than 0");
          return;
        }

        // Maximum fee validation (prevent extremely large amounts)
        if (feeAmount > 10000) {
          toast.error("Fee amount cannot exceed RM 10,000");
          return;
        }
      }

      // All validations passed
      setIsSubmitting(true);
      try {
        await onCreateMatch({ ...formData, partnerId: partnerId ?? undefined });
      } catch {
        toast.error('Failed to create match. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* White Navigation Bar */}
        <View style={[styles.navBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={moderateScale(24)}
              color="#1D1D1F"
            />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Create a Match</Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* League Banner */}
        <View
          style={[
            styles.leagueBanner,
            { backgroundColor: sportColors.background },
          ]}
        >
          <View style={styles.leagueBannerLeft}>
            <View style={styles.sportIconContainer}>
              <SportIcon
                width={moderateScale(40)}
                height={moderateScale(40)}
                fill="#FFFFFF"
              />
            </View>
            <View style={styles.leagueBannerContent}>
              <Text style={styles.leagueName}>{leagueInfo.name}</Text>
              {leagueInfo.season && (
                <Text style={styles.leagueSeason}>
                  {leagueInfo.season}
                  {leagueInfo.division && ` - ${leagueInfo.division}`}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.leagueBannerRight}>
            <View style={styles.leagueBadge}>
              <Text style={styles.leagueBadgeText}>LEAGUE</Text>
            </View>
          </View>
        </View>

        <View style={styles.keyboardView}>
          <View style={styles.contentWrapper}>
            <KeyboardAwareScrollView
              style={styles.content}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              bottomOffset={16}
            >
              {/* Date Selection */}
              <View style={styles.section}>
                <View style={styles.dateSectionHeader}>
                  <Text style={styles.sectionLabel}>
                    Date <Text style={styles.requiredAsterisk}>*</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={toggleMonthView}
                    style={styles.expandButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isMonthView ? "contract-outline" : "expand-outline"}
                      size={moderateScale(20)}
                      color={sportColors.background}
                    />
                    <Text
                      style={[
                        styles.expandButtonText,
                        { color: sportColors.background },
                      ]}
                    >
                      {isMonthView ? "Week View" : "Month View"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateCard}>
                  {/* Month/Year Header with Arrows */}
                  <View style={styles.monthHeader}>
                    <TouchableOpacity
                      onPress={
                        isMonthView ? handlePreviousMonth : handlePreviousWeek
                      }
                      style={styles.arrowButton}
                    >
                      <Ionicons
                        name="chevron-back"
                        size={moderateScale(20)}
                        color={sportColors.background}
                      />
                    </TouchableOpacity>
                    <Text style={styles.monthText}>
                      {format(
                        isMonthView ? currentMonth : currentWeekStart,
                        "MMMM yyyy",
                      )}
                    </Text>
                    <TouchableOpacity
                      onPress={isMonthView ? handleNextMonth : handleNextWeek}
                      style={styles.arrowButton}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={moderateScale(20)}
                        color={sportColors.background}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Day Names Header - Always show for both views */}
                  <View style={styles.dayNamesHeader}>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (dayName, index) => (
                        <Text key={index} style={styles.dayNameHeaderText}>
                          {dayName}
                        </Text>
                      ),
                    )}
                  </View>

                  {/* Week Days or Month Days */}
                  {!isMonthView ? (
                    <View style={styles.weekDaysContainer}>
                      {weekDays.map((day, index) => {
                        const isSelected =
                          selectedDate && isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.dayColumn}
                            onPress={() => handleDateSelect(day)}
                          >
                            <View
                              style={[
                                styles.dayNumber,
                                isSelected && {
                                  backgroundColor: sportColors.background,
                                },
                                isToday && !isSelected && styles.todayIndicator,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumberText,
                                  isSelected && styles.dayNumberTextSelected,
                                  isToday && !isSelected && styles.todayText,
                                ]}
                              >
                                {format(day, "d")}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.monthDaysContainer}>
                      {monthDays.map((day, index) => {
                        const isSelected =
                          selectedDate && isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth =
                          day.getMonth() === currentMonth.getMonth();
                        return (
                          <TouchableOpacity
                            key={index}
                            style={styles.monthDayCell}
                            onPress={() => handleDateSelect(day)}
                          >
                            <View
                              style={[
                                styles.dayNumber,
                                isSelected && {
                                  backgroundColor: sportColors.background,
                                },
                                isToday && !isSelected && styles.todayIndicator,
                                !isCurrentMonth && styles.otherMonthDay,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dayNumberText,
                                  isSelected && styles.dayNumberTextSelected,
                                  isToday && !isSelected && styles.todayText,
                                  !isCurrentMonth && styles.otherMonthText,
                                ]}
                              >
                                {format(day, "d")}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

              {/* Time Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Time <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.inputCard}
                  onPress={
                    Platform.OS === "ios"
                      ? showIOSTimePicker
                      : showAndroidTimePicker
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={moderateScale(22)}
                    color="#A04DFE"
                  />
                  <Text
                    style={[
                      styles.inputText,
                      !formData.time && styles.placeholderText,
                    ]}
                  >
                    {formData.time || "Select time"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Duration Slider */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Duration</Text>
                <View style={styles.durationCard}>
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderTrack}>
                      <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={5}
                        step={0.5}
                        value={formData.duration}
                        onValueChange={(value: number) => {
                          setFormData((prev) => ({ ...prev, duration: value }));
                          // Update end time when duration changes (if time is already selected)
                          if (selectedTime) {
                            updateTimeString(selectedTime, value);
                          }
                        }}
                        minimumTrackTintColor={sportColors.background}
                        maximumTrackTintColor="#EAEAEA"
                        thumbTintColor={sportColors.background}
                      />
                    </View>
                    <Text style={styles.durationText}>
                      {formData.duration === 1
                        ? "1 hour"
                        : `${formData.duration} hours`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Location Input */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>
                  Location <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.locationCard}>
                  <View style={styles.locationInputRow}>
                    <Ionicons
                      name="location-outline"
                      size={moderateScale(22)}
                      color="#A04DFE"
                    />
                    <TextInput
                      style={styles.textInput}
                      value={formData.location}
                      onChangeText={(text) =>
                        setFormData({ ...formData, location: text })
                      }
                      placeholder="Select location"
                      placeholderTextColor="#BABABA"
                    />
                  </View>

                  {/* Court Booked Toggle */}
                  <View style={styles.courtBookedRow}>
                    <View style={styles.courtBookedLabelContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={moderateScale(18)}
                        color={formData.courtBooked ? "#22C55E" : "#86868B"}
                        style={styles.courtBookedIcon}
                      />
                      <Text
                        style={[
                          styles.courtBookedLabel,
                          formData.courtBooked &&
                            styles.courtBookedLabelChecked,
                        ]}
                      >
                        {formData.courtBooked
                          ? "Court booked"
                          : "Court booked?"}
                      </Text>
                    </View>
                    <Switch
                      value={formData.courtBooked}
                      onValueChange={(value) =>
                        setFormData({ ...formData, courtBooked: value })
                      }
                      trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                      thumbColor={formData.courtBooked ? "#22C55E" : "#F4F4F5"}
                      ios_backgroundColor="#D1D5DB"
                    />
                  </View>
                </View>
              </View>

              {/* Number of Players — hidden for league matches (auto-set from division type) */}
              {!isLeagueMatch && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Number of players</Text>
                  <View style={styles.playerCountRow}>
                    <Ionicons
                      name="people-outline"
                      size={moderateScale(22)}
                      color={sportColors.background}
                    />
                    <View style={styles.playerCountControls}>
                      <TouchableOpacity
                        style={styles.countButton}
                        onPress={() => handlePlayerCountChange(-2)}
                      >
                        <Ionicons
                          name="remove"
                          size={moderateScale(20)}
                          color="#BABABA"
                        />
                      </TouchableOpacity>
                      <Text style={styles.playerCountText}>
                        {formData.numberOfPlayers}
                      </Text>
                      <TouchableOpacity
                        style={styles.countButton}
                        onPress={() => handlePlayerCountChange(2)}
                      >
                        <Ionicons
                          name="add"
                          size={moderateScale(20)}
                          color="#BABABA"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* #037 BUG 1: Show partner info for doubles league matches */}
              {isDoublesLeague && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Doubles Partner</Text>
                  <View style={styles.playerCountRow}>
                    <Ionicons
                      name="people"
                      size={moderateScale(22)}
                      color={sportColors.background}
                    />
                    <Text
                      style={[
                        styles.playerCountText,
                        { flex: 1, marginLeft: moderateScale(12) },
                      ]}
                    >
                      {partnerLoading
                        ? "Loading..."
                        : partnerName
                          ? `Playing with ${partnerName}`
                          : "No partner found — pair up first"}
                    </Text>
                    {partnerName && (
                      <Ionicons
                        name="checkmark-circle"
                        size={moderateScale(20)}
                        color="#22C55E"
                      />
                    )}
                    {!partnerName && !partnerLoading && (
                      <Ionicons
                        name="alert-circle"
                        size={moderateScale(20)}
                        color="#EF4444"
                      />
                    )}
                  </View>
                </View>
              )}

              {/* Fee Toggle */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Fee</Text>
                <View style={styles.feeRow}>
                  <View style={styles.feeToggleContainer}>
                    {(["FREE", "SPLIT", "FIXED"] as FeeType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.feeButton,
                          formData.fee === type && {
                            backgroundColor: sportColors.background,
                          },
                        ]}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            fee: type,
                            feeAmount: type === "FREE" ? "0.00" : "",
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.feeButtonText,
                            formData.fee === type && styles.feeButtonTextActive,
                          ]}
                        >
                          {type === "FREE"
                            ? "Free"
                            : type === "SPLIT"
                              ? "Split Cost"
                              : "Fixed Fee"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {formData.fee !== "FREE" && (
                    <View style={styles.feeAmountContainer}>
                      <Text style={styles.feeAmountPrefix}>RM</Text>
                      <TextInput
                        style={styles.feeAmountInput}
                        value={formData.feeAmount}
                        onChangeText={(text) => {
                          // Only allow numbers and one decimal point
                          const sanitized = text.replace(/[^0-9.]/g, "");
                          // Prevent multiple decimal points
                          const parts = sanitized.split(".");
                          let validAmount =
                            parts.length > 2
                              ? `${parts[0]}.${parts.slice(1).join("")}`
                              : sanitized;

                          // Limit to 2 decimal places
                          if (parts.length === 2 && parts[1].length > 2) {
                            validAmount = `${parts[0]}.${parts[1].substring(0, 2)}`;
                          }

                          // Prevent amount exceeding 10000
                          const numericValue = parseFloat(validAmount);
                          if (!isNaN(numericValue) && numericValue > 10000) {
                            return; // Don't update if exceeds max
                          }

                          setFormData({ ...formData, feeAmount: validAmount });
                        }}
                        placeholder="0.00"
                        placeholderTextColor="#BABABA"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
                {formData.fee === "SPLIT" && (
                  <View style={styles.estimatedCostRow}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.estimatedCostText}>
                      Estimated Cost Per Player RM{" "}
                      {(() => {
                        const amount = parseFloat(formData.feeAmount || "0");
                        const players = formData.numberOfPlayers || 2;
                        const perPlayer =
                          !isNaN(amount) && players > 0
                            ? (amount / players).toFixed(2)
                            : "0.00";
                        return perPlayer;
                      })()}
                    </Text>
                  </View>
                )}
                {formData.fee === "FIXED" && (
                  <View style={styles.estimatedCostRow}>
                    <View style={styles.bulletPoint} />
                    <Text style={styles.estimatedCostText}>
                      Cost Per Player RM{" "}
                      {(() => {
                        const amount = parseFloat(formData.feeAmount || "0");
                        return !isNaN(amount) ? amount.toFixed(2) : "0.00";
                      })()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Description Input */}
              <View style={styles.section}>
                <View style={styles.descriptionHeader}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.optionalLabel}>(Optional)</Text>
                </View>
                <View style={styles.descriptionCard}>
                  <Ionicons
                    name="create-outline"
                    size={moderateScale(20)}
                    color="#BABABA"
                    style={styles.descriptionIcon}
                  />
                  <TextInput
                    style={styles.descriptionInput}
                    value={formData.description}
                    onChangeText={(text) =>
                      setFormData({ ...formData, description: text })
                    }
                    placeholder="Add notes..."
                    placeholderTextColor="#BABABA"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </KeyboardAwareScrollView>
          </View>

          {/* Create Button - Fixed at bottom */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.createButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleCreateMatch}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.createButtonText}>Create Match</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Android Time Picker - Shows native dialog when triggered */}
        {Platform.OS === "android" && isTimePickerVisible && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* iOS Time Picker Modal - Native spinner with Confirm/Cancel */}
        {Platform.OS === "ios" && (
          <Modal
            visible={isTimePickerVisible}
            transparent
            animationType="slide"
            onRequestClose={handleIOSCancel}
          >
            <View style={styles.timeModalOverlay}>
              <Pressable
                style={styles.timeModalBackdrop}
                onPress={handleIOSCancel}
              />
              <View style={styles.timeModalContent}>
                <View style={styles.timeModalHeader}>
                  <TouchableOpacity onPress={handleIOSCancel}>
                    <Text style={styles.timeModalCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleIOSConfirm}>
                    <Text
                      style={[
                        styles.timeModalConfirm,
                        { color: sportColors.background },
                      ]}
                    >
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor="#000000"
                    themeVariant="light"
                    locale="en_US"
                    style={styles.iosSpinnerPicker}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  },
);

CreateMatchScreen.displayName = "CreateMatchScreen";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FAFC",
  },
  navBar: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: moderateScale(4),
  },
  navTitle: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1D1D1F",
  },
  navPlaceholder: {
    width: scale(32),
  },
  leagueBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: scale(16),
    paddingRight: 0,
    paddingTop: verticalScale(26),
    paddingBottom: verticalScale(36),
  },
  leagueBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: scale(12),
  },
  leagueBannerRight: {
    marginLeft: "auto",
    alignSelf: "stretch",
    justifyContent: "center",
  },
  sportIconContainer: {
    width: scale(40),
    height: verticalScale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  leagueBannerContent: {
    flex: 1,
  },
  leagueName: {
    fontSize: moderateScale(16),
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: verticalScale(2),
  },
  leagueSeason: {
    fontSize: moderateScale(14),
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  leagueBadge: {
    backgroundColor: "#FEA04D",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: 0,
  },
  leagueBadgeText: {
    color: "#FFFFFF",
    fontSize: moderateScale(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: "#F6FAFC",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    overflow: "hidden",
    marginTop: verticalScale(-15),
    zIndex: 1,
    paddingTop: verticalScale(24),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(24),
    backgroundColor: "#F6FAFC",
  },
  section: {
    marginBottom: verticalScale(24),
  },
  sectionLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: verticalScale(10),
  },
  requiredAsterisk: {
    color: "#DC2626",
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  dateSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(10),
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  expandButtonText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
  },
  dateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: moderateScale(16),
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  arrowButton: {
    padding: moderateScale(4),
  },
  monthText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#1D1D1F",
    marginHorizontal: scale(16),
  },
  dayNamesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(4),
  },
  dayNameHeaderText: {
    fontSize: moderateScale(11),
    fontWeight: "500",
    color: "#BABABA",
    flex: 1,
    textAlign: "center",
  },
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  monthDaysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  monthDayCell: {
    width: "14.28%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(8),
  },
  dayName: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#BABABA",
    marginBottom: verticalScale(8),
    letterSpacing: -0.12,
  },
  dayNameSelected: {
    color: "#86868B",
  },
  dayNumber: {
    width: scale(26),
    height: verticalScale(26),
    borderRadius: moderateScale(13),
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#86868B",
    letterSpacing: -0.12,
  },
  dayNumberTextSelected: {
    color: "#FFFFFF",
  },
  todayIndicator: {
    borderWidth: 1,
    borderColor: "#86868B",
  },
  todayText: {
    color: "#1D1D1F",
    fontWeight: "600",
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: "#BABABA",
  },
  locationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#EAEAEA",
    overflow: "hidden",
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(12),
    gap: scale(12),
  },
  inputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(16),
    gap: scale(12),
  },
  inputText: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#1D1D1F",
  },
  placeholderText: {
    color: "#BABABA",
  },
  textInput: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: "400",
    color: "#1D1D1F",
    padding: 0,
  },
  durationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: moderateScale(16),
  },
  sliderContainer: {
    marginTop: 0,
  },
  sliderTrack: {
    paddingHorizontal: scale(8),
  },
  slider: {
    width: "100%",
    height: verticalScale(40),
  },
  durationText: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#86868B",
    marginTop: verticalScale(8),
    textAlign: "left",
  },
  locationDivider: {
    height: verticalScale(1),
    backgroundColor: "#EAEAEA",
    marginHorizontal: scale(14),
  },
  courtBookedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
  },
  courtBookedLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  courtBookedIcon: {
    marginRight: 0,
  },
  courtBookedLabel: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#86868B",
  },
  courtBookedLabelChecked: {
    color: "#22C55E",
  },
  playerCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: scale(4),
  },
  playerCountControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(16),
  },
  countButton: {
    width: scale(24),
    height: verticalScale(24),
    borderRadius: moderateScale(4),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  playerCountText: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "#1D1D1F",
    minWidth: scale(24),
    textAlign: "center",
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  feeToggleContainer: {
    flexDirection: "row",
    gap: scale(6),
    flex: 1,
  },
  feeButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(10),
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  feeButtonText: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#86868B",
    letterSpacing: 0.25,
  },
  feeButtonTextActive: {
    color: "#FFFFFF",
  },
  feeAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: "#FEA04D",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(10),
    gap: scale(4),
  },
  feeAmountPrefix: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#1D1D1F",
  },
  feeAmountInput: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#1D1D1F",
    minWidth: scale(60),
    textAlign: "left",
    padding: 0,
  },
  estimatedCostRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(12),
    gap: scale(8),
  },
  bulletPoint: {
    width: scale(4),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#86868B",
  },
  estimatedCostText: {
    fontSize: moderateScale(12),
    fontWeight: "500",
    color: "#86868B",
  },
  descriptionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: scale(6),
    marginBottom: verticalScale(10),
  },
  descriptionLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#1D1D1F",
  },
  optionalLabel: {
    fontSize: moderateScale(12),
    fontWeight: "400",
    color: "#BABABA",
  },
  descriptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#EAEAEA",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(12),
  },
  descriptionIcon: {
    marginTop: verticalScale(4),
  },
  descriptionInput: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: "400",
    color: "#1D1D1F",
    minHeight: verticalScale(80),
    padding: 0,
    lineHeight: verticalScale(22),
  },
  footer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
    backgroundColor: "#FDFDFD",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: verticalScale(-4) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(10),
    elevation: 8,
  },
  createButton: {
    backgroundColor: "#FEA04D",
    paddingVertical: verticalScale(16),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F09433",
  },
  createButtonText: {
    fontSize: moderateScale(22),
    fontWeight: "600",
    color: "#1D1D1F",
  },
  // iOS Native Spinner Time Picker Modal Styles
  timeModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  timeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  timeModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingBottom: verticalScale(34),
    width: "100%",
  },
  timeModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  timeModalCancel: {
    fontSize: moderateScale(17),
    color: "#007AFF",
  },
  timeModalConfirm: {
    fontSize: moderateScale(17),
    fontWeight: "600",
  },
  timePickerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: verticalScale(16),
  },
  iosSpinnerPicker: {
    width: "100%",
    height: verticalScale(216),
    backgroundColor: "#FFFFFF",
  },
});
