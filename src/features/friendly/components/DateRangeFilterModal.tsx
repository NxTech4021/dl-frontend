import React, { useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, startOfWeek, addDays } from 'date-fns';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';

interface DateRangeFilterModalProps {
  onClose: () => void;
  onApply: (startDate: Date | null, endDate: Date | null) => void;
  sportColor?: string;
}

export interface DateRangeFilterModalRef {
  present: () => void;
  dismiss: () => void;
}

export const DateRangeFilterModal = forwardRef<DateRangeFilterModalRef, DateRangeFilterModalProps>(({
  onClose,
  onApply,
  sportColor = '#A04DFE',
}, ref) => {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  const snapPoints = useMemo(() => ['75%', '90%'], []);

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetModalRef.current?.present();
    },
    dismiss: () => {
      bottomSheetModalRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleDateSelect = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Select end date
      if (date < startDate) {
        // If selected date is before start, swap them
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const handleApply = () => {
    onApply(startDate, endDate);
    bottomSheetModalRef.current?.dismiss();
  };

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

  const monthDays = getMonthDays();

  const isDateInRange = (date: Date) => {
    if (!startDate) return false;
    if (!endDate) return isSameDay(date, startDate);
    return date >= startDate && date <= endDate;
  };

  const isDateStart = (date: Date) => {
    return startDate && isSameDay(date, startDate);
  };

  const isDateEnd = (date: Date) => {
    return endDate && isSameDay(date, endDate);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
    >
      <BottomSheetView style={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Date Range</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Month/Year Header */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={styles.arrowButton}
            >
              <Ionicons name="chevron-back" size={20} color={sportColor} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={styles.arrowButton}
            >
              <Ionicons name="chevron-forward" size={20} color={sportColor} />
            </TouchableOpacity>
          </View>

          {/* Day Names Header */}
          <View style={styles.dayNamesHeader}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
              <Text key={dayName} style={styles.dayNameText}>
                {dayName}
              </Text>
            ))}
          </View>

          {/* Calendar Days - Month View Only */}
          <View style={styles.monthDaysContainer}>
            {monthDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const inRange = isDateInRange(day);
              const isStart = isDateStart(day);
              const isEnd = isDateEnd(day);
              const isToday = isSameDay(day, new Date());

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.monthDayCell}
                  onPress={() => handleDateSelect(day)}
                >
                  <View
                    style={[
                      styles.dayNumber,
                      (isStart || isEnd) && { backgroundColor: sportColor },
                      inRange && !isStart && !isEnd && styles.dayInRange,
                      isToday && !isStart && !isEnd && styles.todayIndicator,
                      !isCurrentMonth && styles.otherMonthDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        (isStart || isEnd) && styles.dayNumberTextSelected,
                        inRange && !isStart && !isEnd && { color: sportColor },
                        isToday && !isStart && !isEnd && styles.todayText,
                        !isCurrentMonth && styles.otherMonthText,
                      ]}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected Range Display */}
          {(startDate || endDate) && (
            <View style={styles.selectedRange}>
              <Text style={styles.selectedRangeText}>
                {startDate && format(startDate, 'MMM dd, yyyy')}
                {endDate && ` - ${format(endDate, 'MMM dd, yyyy')}`}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: sportColor }]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

DateRangeFilterModal.displayName = 'DateRangeFilterModal';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
    marginHorizontal: 16,
  },
  dayNamesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BABABA',
    flex: 1,
    textAlign: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: {
    backgroundColor: '#F3F4F6',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#86868B',
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
  selectedRange: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    alignItems: 'center',
  },
  selectedRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DateRangeFilterModal;
