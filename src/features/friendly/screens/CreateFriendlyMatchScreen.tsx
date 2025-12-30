import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { toast } from 'sonner-native';
import { GenderSelector, type GenderRestriction } from '../components/GenderSelector';
import { SkillLevelSelector, type SkillLevel } from '../components/SkillLevelSelector';
import { getSportColors, SportType } from '@/constants/SportsColor';

// Sport icon imports
import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';

// Note: Sport is determined by the currently selected sport in the dashboard (leagues tab).
// Users cannot change the sport within this screen.

interface CreateFriendlyMatchScreenProps {
  sport: 'pickleball' | 'tennis' | 'padel';
  onClose: () => void;
  onCreateMatch: (matchData: FriendlyMatchFormData) => Promise<void>;
  isRequest?: boolean;
  recipientId?: string;
  threadId?: string;
}

export interface FriendlyMatchFormData {
  sport: 'pickleball' | 'tennis' | 'padel';
  date: string;
  time: string;
  duration: number;
  numberOfPlayers: number;
  location: string;
  fee: 'FREE' | 'SPLIT' | 'FIXED';
  feeAmount: string;
  courtBooked: boolean;
  description: string;
  genderRestriction: GenderRestriction | null;
  skillLevels: SkillLevel[];
}

type FeeType = 'FREE' | 'SPLIT' | 'FIXED';

const FRIENDLY_BADGE_COLOR = '#5A5E6A';

export const CreateFriendlyMatchScreen: React.FC<CreateFriendlyMatchScreenProps> = ({
  sport,
  onClose,
  onCreateMatch,
  isRequest = false,
  recipientId,
  threadId,
}) => {
  const insets = useSafeAreaInsets();

  // Sport is determined by the dashboard's selected sport (passed via props)
  const sportType: SportType = sport.toUpperCase() as SportType;
  const sportColors = getSportColors(sportType);
  
  const [formData, setFormData] = useState<FriendlyMatchFormData>({
    sport: sport,
    date: '',
    time: '',
    duration: 2,
    numberOfPlayers: 2,
    location: '',
    fee: 'FREE',
    feeAmount: '0.00',
    courtBooked: false,
    description: '',
    genderRestriction: null, // Default to All (null = OPEN)
    skillLevels: ['BEGINNER'], // Default to at least one skill level
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isMonthView, setIsMonthView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Entry animation values
  const headerEntryOpacity = useRef(new Animated.Value(0)).current;
  const headerEntryTranslateY = useRef(new Animated.Value(-20)).current;
  const contentEntryOpacity = useRef(new Animated.Value(0)).current;
  const contentEntryTranslateY = useRef(new Animated.Value(30)).current;
  const hasPlayedEntryAnimation = useRef(false);

  // Trigger entry animation on mount
  useEffect(() => {
    if (!hasPlayedEntryAnimation.current) {
      hasPlayedEntryAnimation.current = true;
      Animated.stagger(80, [
        Animated.parallel([
          Animated.spring(headerEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(headerEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.spring(contentEntryOpacity, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
          Animated.spring(contentEntryTranslateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: false,
          }),
        ]),
      ]).start();
    }
  }, []);

  // Get sport icon component based on selected sport
  const getSportIcon = () => {
    switch (sportType) {
      case 'TENNIS':
        return TennisIcon;
      case 'PADEL':
        return PadelIcon;
      case 'PICKLEBALL':
      default:
        return PickleballIcon;
    }
  };

  const SportIcon = getSportIcon();

  // Generate week days for the date selector
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  // Generate month days for the date selector
  const getMonthDays = () => {
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
  };

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();

  const handlePreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const toggleMonthView = () => {
    setIsMonthView(!isMonthView);
    if (!isMonthView) {
      setCurrentMonth(startOfMonth(currentWeekStart));
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
  };

  const showAndroidTimePicker = () => {
    if (Platform.OS === 'android') {
      setTimePickerVisible(true);
    }
  };

  const showIOSTimePicker = () => {
    if (Platform.OS === 'ios') {
      setTempTime(selectedTime);
      setTimePickerVisible(true);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setTimePickerVisible(false);
      if (event.type === 'set' && date) {
        updateTimeSelection(date);
      }
    } else if (date) {
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
    const timeString = format(startDate, 'h:mm a');
    const endTime = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    const endTimeString = format(endTime, 'h:mm a');
    setFormData((prev) => ({ ...prev, time: `${timeString} - ${endTimeString}` }));
  };

  const handlePlayerCountChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(4, formData.numberOfPlayers + delta));
    setFormData({ ...formData, numberOfPlayers: newCount });
  };

  const handleCreateMatch = async () => {
    // Validate required fields
    if (!formData.date || !formData.time) {
      toast.error('Please select a date and time');
      return;
    }

    if (!formData.location || formData.location.trim() === '') {
      toast.error('Please enter a location');
      return;
    }

    if (!formData.skillLevels || formData.skillLevels.length === 0) {
      toast.error('Please select at least one skill level');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateMatch({ ...formData, sport });
      toast.success('Friendly match created successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create friendly match');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* White Navigation Bar */}
      <Animated.View
        style={{
          opacity: headerEntryOpacity,
          transform: [{ translateY: headerEntryTranslateY }],
        }}
      >
        <View style={[styles.navBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Create a Match</Text>
          <View style={styles.navPlaceholder} />
        </View>

        {/* Friendly Banner */}
        <View style={[styles.friendlyBanner, { backgroundColor: sportColors.background }]}>
        <View style={styles.friendlyBannerLeft}>
          <View style={styles.sportIconContainer}>
            <SportIcon width={40} height={40} fill="#FFFFFF" />
          </View>
          <View style={styles.friendlyBannerContent}>
            <Text style={styles.friendlyTitle}>Friendly Match</Text>
          </View>
        </View>
        <View style={styles.friendlyBannerRight}>
          <View style={[styles.friendlyBadge, { backgroundColor: FRIENDLY_BADGE_COLOR }]}>
            <Text style={styles.friendlyBadgeText}>FRIENDLY</Text>
          </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          flex: 1,
          opacity: contentEntryOpacity,
          transform: [{ translateY: contentEntryTranslateY }],
        }}
      >
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
              <Text style={styles.sectionLabel}>Date</Text>
              <TouchableOpacity
                onPress={toggleMonthView}
                style={styles.expandButton}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={isMonthView ? "contract-outline" : "expand-outline"} 
                  size={20} 
                  color={sportColors.background} 
                />
                <Text style={[styles.expandButtonText, { color: sportColors.background }]}>
                  {isMonthView ? 'Week View' : 'Month View'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateCard}>
              {/* Month/Year Header with Arrows */}
              <View style={styles.monthHeader}>
                <TouchableOpacity 
                  onPress={isMonthView ? handlePreviousMonth : handlePreviousWeek} 
                  style={styles.arrowButton}
                >
                  <Ionicons name="chevron-back" size={20} color={sportColors.background} />
                </TouchableOpacity>
                <Text style={styles.monthText}>
                  {format(isMonthView ? currentMonth : currentWeekStart, 'MMMM yyyy')}
                </Text>
                <TouchableOpacity 
                  onPress={isMonthView ? handleNextMonth : handleNextWeek} 
                  style={styles.arrowButton}
                >
                  <Ionicons name="chevron-forward" size={20} color={sportColors.background} />
                </TouchableOpacity>
              </View>
              
              {/* Day Names Header */}
              <View style={styles.dayNamesHeader}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => (
                  <Text key={index} style={styles.dayNameHeaderText}>
                    {dayName}
                  </Text>
                ))}
              </View>
              
              {/* Week Days or Month Days */}
              {!isMonthView ? (
                <View style={styles.weekDaysContainer}>
                  {weekDays.map((day, index) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.dayColumn}
                        onPress={() => handleDateSelect(day)}
                      >
                        <View style={[
                          styles.dayNumber,
                          isSelected && { backgroundColor: sportColors.background },
                          isToday && !isSelected && styles.todayIndicator
                        ]}>
                          <Text style={[
                            styles.dayNumberText,
                            isSelected && styles.dayNumberTextSelected,
                            isToday && !isSelected && styles.todayText
                          ]}>
                            {format(day, 'd')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.monthDaysContainer}>
                  {monthDays.map((day, index) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.monthDayCell}
                        onPress={() => handleDateSelect(day)}
                      >
                        <View style={[
                          styles.dayNumber,
                          isSelected && { backgroundColor: sportColors.background },
                          isToday && !isSelected && styles.todayIndicator,
                          !isCurrentMonth && styles.otherMonthDay
                        ]}>
                          <Text style={[
                            styles.dayNumberText,
                            isSelected && styles.dayNumberTextSelected,
                            isToday && !isSelected && styles.todayText,
                            !isCurrentMonth && styles.otherMonthText
                          ]}>
                            {format(day, 'd')}
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
            <Text style={styles.sectionLabel}>Time</Text>
            <TouchableOpacity
              style={styles.inputCard}
              onPress={Platform.OS === 'ios' ? showIOSTimePicker : showAndroidTimePicker}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={22} color={sportColors.background} />
              <Text style={[styles.inputText, !formData.time && styles.placeholderText]}>
                {formData.time || 'Select time'}
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
                  {formData.duration === 1 ? '1 hour' : `${formData.duration} hours`}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationInputRow}>
                <Ionicons name="location-outline" size={22} color={sportColors.background} />
                <TextInput
                  style={styles.textInput}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Select location"
                  placeholderTextColor="#BABABA"
                />
              </View>
              
              {/* Court Booked Toggle */}
              <View style={styles.courtBookedRow}>
                <View style={styles.courtBookedLabelContainer}>
                  <Ionicons 
                    name="calendar-outline" 
                    size={18} 
                    color={formData.courtBooked ? '#22C55E' : '#86868B'} 
                    style={styles.courtBookedIcon} 
                  />
                  <Text style={[
                    styles.courtBookedLabel,
                    formData.courtBooked && styles.courtBookedLabelChecked
                  ]}>
                    {formData.courtBooked ? 'Court booked' : 'Court booked?'}
                  </Text>
                </View>
                <Switch
                  value={formData.courtBooked}
                  onValueChange={(value) => setFormData({ ...formData, courtBooked: value })}
                  trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                  thumbColor={formData.courtBooked ? '#22C55E' : '#F4F4F5'}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            </View>
          </View>

          {/* Number of Players */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Number of players</Text>
            <View style={styles.playerCountRow}>
              <Ionicons name="people-outline" size={22} color={sportColors.background} />
              <View style={styles.playerCountControls}>
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => handlePlayerCountChange(-2)}
                >
                  <Ionicons name="remove" size={20} color="#BABABA" />
                </TouchableOpacity>
                <Text style={styles.playerCountText}>{formData.numberOfPlayers}</Text>
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => handlePlayerCountChange(2)}
                >
                  <Ionicons name="add" size={20} color="#BABABA" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Gender Restriction */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Gender</Text>
            <GenderSelector
              value={formData.genderRestriction}
              onChange={(value) => setFormData({ ...formData, genderRestriction: value })}
              sportColor={sportColors.background}
            />
          </View>

          {/* Skill Level */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skill Level</Text>
            <SkillLevelSelector
              selectedLevels={formData.skillLevels}
              onChange={(levels) => setFormData({ ...formData, skillLevels: levels })}
              sportColor={sportColors.background}
            />
          </View>

          {/* Fee Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Fee</Text>
            <View style={styles.feeRow}>
              <View style={styles.feeToggleContainer}>
                {(['FREE', 'SPLIT', 'FIXED'] as FeeType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.feeButton,
                      formData.fee === type && { backgroundColor: sportColors.background }
                    ]}
                    onPress={() => setFormData({ ...formData, fee: type, feeAmount: type === 'FREE' ? '0.00' : '' })}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.feeButtonText,
                        formData.fee === type && styles.feeButtonTextActive
                      ]}
                    >
                      {type === 'FREE' ? 'Free' : type === 'SPLIT' ? 'Split Cost' : 'Fixed Fee'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {formData.fee !== 'FREE' && (
                <View style={styles.feeAmountContainer}>
                  <Text style={styles.feeAmountPrefix}>RM</Text>
                  <TextInput
                    style={styles.feeAmountInput}
                    value={formData.feeAmount}
                    onChangeText={(text) => setFormData({ ...formData, feeAmount: text })}
                    placeholder="0.00"
                    placeholderTextColor="#BABABA"
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>
            {formData.fee === 'SPLIT' && (
              <View style={styles.estimatedCostRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.estimatedCostText}>
                  Estimated Cost Per Player     RM  {(parseFloat(formData.feeAmount || '0') / formData.numberOfPlayers).toFixed(2)}
                </Text>
              </View>
            )}
            {formData.fee === 'FIXED' && (
              <View style={styles.estimatedCostRow}>
                <View style={styles.bulletPoint} />
                <Text style={styles.estimatedCostText}>
                  Cost Per Player     RM  {parseFloat(formData.feeAmount || '0').toFixed(2)}
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
              <Ionicons name="create-outline" size={20} color="#BABABA" style={styles.descriptionIcon} />
              <TextInput
                style={styles.descriptionInput}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
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
            style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
            onPress={handleCreateMatch}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={styles.createButtonText}>
              {isSubmitting ? 'Creating...' : 'Create Match'}
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </Animated.View>

      {/* Android Time Picker */}
      {Platform.OS === 'android' && isTimePickerVisible && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS Time Picker Modal */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={isTimePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View style={styles.timeModalOverlay}>
            <Pressable style={styles.timeModalBackdrop} onPress={handleIOSCancel} />
            <View style={styles.timeModalContent}>
              <View style={styles.timeModalHeader}>
                <TouchableOpacity onPress={handleIOSCancel}>
                  <Text style={styles.timeModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={[styles.timeModalConfirm, { color: sportColors.background }]}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6FAFC',
  },
  navBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  navPlaceholder: {
    width: 32,
  },
  friendlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 0,
    paddingTop: 26,
    paddingBottom: 36,
  },
  friendlyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  friendlyBannerRight: {
    marginLeft: 'auto',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendlyBannerContent: {
    flex: 1,
  },
  friendlyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  friendlyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
  },
  friendlyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F6FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: -15,
    zIndex: 1,
    paddingTop: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#F6FAFC',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 10,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  arrowButton: {
    padding: 4,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
    marginHorizontal: 16,
  },
  dayNamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayNameHeaderText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BABABA',
    flex: 1,
    textAlign: 'center',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  monthDaysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  monthDayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#86868B',
    letterSpacing: -0.12,
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
  },
  todayIndicator: {
    borderWidth: 1,
    borderColor: '#86868B',
  },
  todayText: {
    color: '#1D1D1F',
    fontWeight: '600',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: '#BABABA',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  placeholderText: {
    color: '#BABABA',
  },
  durationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    padding: 16,
  },
  sliderContainer: {
    marginTop: 0,
  },
  sliderTrack: {
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#86868B',
    marginTop: 8,
    textAlign: 'left',
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#1D1D1F',
    padding: 0,
  },
  courtBookedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  courtBookedLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courtBookedIcon: {
    marginRight: 0,
  },
  courtBookedLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#86868B',
  },
  courtBookedLabelChecked: {
    color: '#22C55E',
  },
  playerCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  playerCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  countButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    minWidth: 24,
    textAlign: 'center',
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  feeToggleContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  feeButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  feeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#86868B',
    letterSpacing: 0.25,
  },
  feeButtonTextActive: {
    color: '#FFFFFF',
  },
  feeAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEA04D',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  feeAmountPrefix: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  feeAmountInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
    minWidth: 60,
    textAlign: 'left',
    padding: 0,
  },
  estimatedCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  bulletPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#86868B',
  },
  estimatedCostText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#86868B',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#BABABA',
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  descriptionIcon: {
    marginTop: 4,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#1D1D1F',
    minHeight: 80,
    padding: 0,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FDFDFD',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  createButton: {
    backgroundColor: '#FEA04D',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F09433',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  timeModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  timeModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  timeModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    width: '100%',
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timeModalCancel: {
    fontSize: 17,
    color: '#007AFF',
  },
  timeModalConfirm: {
    fontSize: 17,
    fontWeight: '600',
  },
  timePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
  },
  iosSpinnerPicker: {
    width: '100%',
    height: 216,
    backgroundColor: '#FFFFFF',
  },
});

export default CreateFriendlyMatchScreen;
