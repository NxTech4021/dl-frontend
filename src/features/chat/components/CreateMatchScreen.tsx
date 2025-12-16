import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addDays, startOfWeek, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

// Sport icon imports
import PickleballIcon from '@/assets/images/045-PICKLEBALL.svg';
import PadelIcon from '@/assets/images/padel-icon.svg';
import TennisIcon from '@/assets/images/tennis-icon.svg';

interface LeagueInfo {
  name: string;
  season?: string;
  division?: string;
  sportType: 'PICKLEBALL' | 'TENNIS' | 'PADEL';
  divisionId?: string;
}

interface CreateMatchScreenProps {
  leagueInfo: LeagueInfo;
  onClose: () => void;
  onCreateMatch: (matchData: MatchFormData) => void;
}

export interface MatchFormData {
  date: string;
  time: string;
  duration: number;
  numberOfPlayers: number;
  location: string;
  fee: 'FREE' | 'SPLIT' | 'FIXED';
  feeAmount: string;
  courtBooked: boolean;
  description: string;
}

type FeeType = 'FREE' | 'SPLIT' | 'FIXED';

export const CreateMatchScreen: React.FC<CreateMatchScreenProps> = ({
  leagueInfo,
  onClose,
  onCreateMatch,
}) => {
  const insets = useSafeAreaInsets();
  
  const [formData, setFormData] = useState<MatchFormData>({
    date: '',
    time: '',
    duration: 2,
    numberOfPlayers: 2,
    location: '',
    fee: 'FREE',
    feeAmount: '0.00',
    courtBooked: false,
    description: '',
  });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isMonthView, setIsMonthView] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionSectionRef = useRef<View>(null);
  const locationSectionRef = useRef<View>(null);
  const [locationY, setLocationY] = useState(0);
  const [descriptionY, setDescriptionY] = useState(0);

  // Get sport-specific colors
  const getSportColors = () => {
    switch (leagueInfo.sportType) {
      case 'PICKLEBALL':
        return { background: '#A04DFE', badge: '#A855F7', label: 'Pickleball' };
      case 'TENNIS':
        return { background: '#65B741', badge: '#22C55E', label: 'Tennis' };
      case 'PADEL':
        return { background: '#3B82F6', badge: '#60A5FA', label: 'Padel' };
      default:
        return { background: '#A04DFE', badge: '#A855F7', label: 'Friendly' };
    }
  };

  const sportColors = getSportColors();

  // Get sport icon component
  const getSportIcon = () => {
    switch (leagueInfo.sportType) {
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

  // Generate month days for the date selector (including leading/trailing days)
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
    // Sync current month with current week when toggling
    if (!isMonthView) {
      setCurrentMonth(startOfMonth(currentWeekStart));
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
  };

  // For Android, we need to show/hide the picker
  const showAndroidTimePicker = () => {
    if (Platform.OS === 'android') {
      setTimePickerVisible(true);
    }
  };

  // For iOS, show modal with spinner picker
  const showIOSTimePicker = () => {
    if (Platform.OS === 'ios') {
      setTempTime(selectedTime);
      setTimePickerVisible(true);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      // Android picker auto-dismisses
      setTimePickerVisible(false);
      if (event.type === 'set' && date) {
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
    const timeString = format(startDate, 'h:mm a');
    const endTime = new Date(startDate.getTime() + duration * 60 * 60 * 1000);
    const endTimeString = format(endTime, 'h:mm a');
    setFormData((prev) => ({ ...prev, time: `${timeString} - ${endTimeString}` }));
  };

  const handlePlayerCountChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(4, formData.numberOfPlayers + delta));
    setFormData({ ...formData, numberOfPlayers: newCount });
  };

  const handleCreateMatch = () => {
    // Validate required fields
    if (!formData.date || !formData.time) {
      // TODO: Show error toast
      return;
    }
    onCreateMatch(formData);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={sportColors.background} />
      
      {/* Header with Sport Background */}
      <View style={[styles.header, { backgroundColor: sportColors.background, paddingTop: insets.top }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a Match</Text>
          <View style={styles.leagueBadge}>
            <Text style={styles.leagueBadgeText}>LEAGUE</Text>
          </View>
        </View>
        
        {/* League Info Banner */}
        <View style={styles.leagueBannerContent}>
          <Text style={styles.leagueName}>{leagueInfo.name}</Text>
          {leagueInfo.season && (
            <Text style={styles.leagueSeason}>
              {leagueInfo.season}
              {leagueInfo.division && ` - ${leagueInfo.division}`}
            </Text>
          )}
        </View>

        {/* Sport Icon */}
        <View style={styles.headerIcon}>
          <SportIcon width={60} height={60} fill="#FFFFFF" />
        </View>
      </View>

      <View style={styles.keyboardView}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
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
              
              {/* Day Names Header - Always show for both views */}
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
              <Ionicons name="time-outline" size={22} color="#A04DFE" />
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
                  {formData.duration === 1 ? '1 hour' : `${formData.duration} hours`}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Input */}
          <View 
            ref={locationSectionRef} 
            style={styles.section}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              setLocationY(y);
            }}
          >
            <Text style={styles.sectionLabel}>Location</Text>
            <View style={styles.locationCard}>
              <View style={styles.locationInputRow}>
                <Ionicons name="location-outline" size={22} color="#A04DFE" />
                <TextInput
                  style={styles.textInput}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Select location"
                  placeholderTextColor="#BABABA"
                  onFocus={() => {
                    // Scroll to location field when focused, positioning it above keyboard
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: locationY - 20, animated: true });
                    }, 300);
                  }}
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
          <View 
            ref={descriptionSectionRef} 
            style={styles.section}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              setDescriptionY(y);
            }}
          >
            <View style={styles.descriptionHeader}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.optionalLabel}>Optional</Text>
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
                onFocus={() => {
                  // Scroll to description field when focused, positioning it above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: descriptionY - 20, animated: true });
                  }, 300);
                }}
              />
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Create Button - Fixed at bottom */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateMatch}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>Create Match</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Android Time Picker - Shows native dialog when triggered */}
      {Platform.OS === 'android' && isTimePickerVisible && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}

      {/* iOS Time Picker Modal - Native spinner with Confirm/Cancel */}
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
  header: {
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leagueBadge: {
    backgroundColor: '#FEA04D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F09433',
  },
  leagueBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  leagueBannerContent: {
    paddingHorizontal: 24,
    marginTop: 4,
  },
  leagueName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  leagueSeason: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerIcon: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    opacity: 0.9,
  },
  keyboardView: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
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
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#BABABA',
    marginBottom: 8,
    letterSpacing: -0.12,
  },
  dayNameSelected: {
    color: '#86868B',
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
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#1D1D1F',
    padding: 0,
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
  locationDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginHorizontal: 14,
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
    alignItems: 'center',
    gap: 8,
  },
  optionalLabel: {
    fontSize: 10,
    fontWeight: '400',
    color: '#BABABA',
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  descriptionIcon: {
    marginTop: 2,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
    minHeight: 60,
    padding: 0,
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
  createButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  // iOS Native Spinner Time Picker Modal Styles
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

