import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

const CalendarIcon = () => (
  <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <Path
      d="M2.67 2.67H13.33C13.7 2.67 14 2.97 14 3.33V13.33C14 13.7 13.7 14 13.33 14H2.67C2.3 14 2 13.7 2 13.33V3.33C2 2.97 2.3 2.67 2.67 2.67Z"
      stroke="#ACB5BB"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10.67 1.33V4"
      stroke="#ACB5BB"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.33 1.33V4"
      stroke="#ACB5BB"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 6.67H14"
      stroke="#ACB5BB"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface DatePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onDateSelect,
  label = "Your Birthday",
  placeholder = "Select date",
  error,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState({
    month: (selectedDate?.getMonth() ?? -1) + 1 || 1,
    day: selectedDate?.getDate() || 1,
    year: selectedDate?.getFullYear() || 2000,
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const days = Array.from({ length: getDaysInMonth(tempDate.month, tempDate.year) }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(tempDate.year, tempDate.month - 1, tempDate.day);
    onDateSelect(newDate);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[
          styles.dateText,
          !selectedDate && styles.placeholderText
        ]}>
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </Text>
        <CalendarIcon />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select your birthday</Text>
            
            <View style={styles.pickerContainer}>
              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.pickerItem,
                        tempDate.month === index + 1 && styles.pickerItemSelected
                      ]}
                      onPress={() => setTempDate({ ...tempDate, month: index + 1 })}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.month === index + 1 && styles.pickerItemTextSelected
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerItem,
                        tempDate.day === day && styles.pickerItemSelected
                      ]}
                      onPress={() => setTempDate({ ...tempDate, day })}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.day === day && styles.pickerItemTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <ScrollView style={styles.picker} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.pickerItem,
                        tempDate.year === year && styles.pickerItemSelected
                      ]}
                      onPress={() => setTempDate({ ...tempDate, year })}
                    >
                      <Text style={[
                        styles.pickerItemText,
                        tempDate.year === year && styles.pickerItemTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6C7278',
    marginBottom: 8,
    letterSpacing: -0.02,
    fontFamily: 'Roboto',
  },
  dateButton: {
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(254, 160, 77, 0.5)',
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    shadowColor: '#E4E5E7',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1C1E',
  },
  placeholderText: {
    color: '#6C7278',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    width: Dimensions.get('window').width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C7278',
    textAlign: 'center',
    marginBottom: 10,
  },
  picker: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EDF1F3',
    borderRadius: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#EDF1F3',
  },
  pickerItemSelected: {
    backgroundColor: '#FFF7F0',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#1A1C1E',
  },
  pickerItemTextSelected: {
    color: '#FE9F4D',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  confirmButton: {
    backgroundColor: '#FE9F4D',
  },
  cancelButtonText: {
    color: '#6C7278',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default DatePicker;