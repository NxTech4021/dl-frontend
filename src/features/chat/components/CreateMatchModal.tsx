// import { Ionicons } from '@expo/vector-icons';
// import Slider from '@react-native-community/slider';
// import React, { useState } from 'react';
// import {
//     KeyboardAvoidingView,
//     Modal,
//     Platform,
//     Pressable,
//     ScrollView,
//     StyleSheet,
//     Text,
//     TextInput,
//     TouchableOpacity,
//     View,
// } from 'react-native';
// import { Calendar } from 'react-native-calendars';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const TIME_OPTIONS = [
//   '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM',
//   '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
//   '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
//   '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
//   '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
//   '9:00 PM', '9:30 PM', '10:00 PM'
// ];

// const PLAYER_OPTIONS = ['2', '4'];

// interface LeagueInfo {
//   name: string;
//   season?: string;
//   division?: string;
//   sportType: 'PICKLEBALL' | 'TENNIS' | 'PADEL';
// }

// interface CreateMatchModalProps {
//   visible: boolean;
//   onClose: () => void;
//   leagueInfo: LeagueInfo;
//   onCreateMatch: (matchData: MatchFormData) => void;
// }

// export interface MatchFormData {
//   date: string;
//   time: string;
//   duration: number;
//   numberOfPlayers: string;
//   location: string;
//   fee: 'FREE' | 'SPLIT';
//   courtBooked: boolean;
//   description: string;
// }

// export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
//   visible,
//   onClose,
//   leagueInfo,
//   onCreateMatch,
// }) => {
//   const insets = useSafeAreaInsets();
//   const [formData, setFormData] = useState<MatchFormData>({
//     date: '',
//     time: '',
//     duration: 2,
//     numberOfPlayers: '',
//     location: '',
//     fee: 'FREE',
//     courtBooked: false,
//     description: '',
//   });
  
//   const [showCalendarModal, setShowCalendarModal] = useState(false);
//   const [showTimeModal, setShowTimeModal] = useState(false);
//   const [showPlayerModal, setShowPlayerModal] = useState(false);

//   // Get sport-specific colors
//   const getSportColors = () => {
//     switch (leagueInfo.sportType) {
//       case 'PICKLEBALL':
//         return { background: '#A04DFE', badge: '#A855F7', label: 'Pickleball' };
//       case 'TENNIS':
//         return { background: '#65B741', badge: '#22C55E', label: 'Tennis' };
//       case 'PADEL':
//         return { background: '#3B82F6', badge: '#60A5FA', label: 'Padel' };
//       default:
//         return { background: '#A04DFE', badge: '#A855F7', label: 'Friendly' };
//     }
//   };

//   const sportColors = getSportColors();

//   const formatDisplayDate = (dateString: string) => {
//     if (!dateString) return '';
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { 
//       month: 'short', 
//       day: 'numeric', 
//       year: 'numeric' 
//     });
//   };

//   const getTodayString = () => {
//     const today = new Date();
//     const year = today.getFullYear();
//     const month = String(today.getMonth() + 1).padStart(2, '0');
//     const day = String(today.getDate()).padStart(2, '0');
//     return `${year}-${month}-${day}`;
//   };

//   const handleCreateMatch = () => {
//     // Validate required fields
//     if (!formData.date || !formData.time || !formData.numberOfPlayers) {
//       // TODO: Show error toast
//       return;
//     }

//     onCreateMatch(formData);
//     // Reset form
//     setFormData({
//       date: '',
//       time: '',
//       duration: 2,
//       numberOfPlayers: '',
//       location: '',
//       fee: 'FREE',
//       courtBooked: false,
//       description: '',
//     });
//     onClose();
//   };

//   const handleClose = () => {
//     // Reset form on close
//     setFormData({
//       date: '',
//       time: '',
//       duration: 2,
//       numberOfPlayers: '',
//       location: '',
//       fee: 'FREE',
//       courtBooked: false,
//       description: '',
//     });
//     onClose();
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       presentationStyle="pageSheet"
//       onRequestClose={handleClose}
//     >
//       <KeyboardAvoidingView
//         style={styles.container}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//       >
//         {/* Header */}
//         <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
//           <TouchableOpacity onPress={handleClose} style={styles.backButton}>
//             <Ionicons name="chevron-back-outline" size={24} color="#111827" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Create a Match</Text>
//           <View style={styles.headerPlaceholder} />
//         </View>

//         {/* Sports Badge */}
//         <View style={styles.badgeContainer}>
//           <View style={[styles.leagueBadge, { borderColor: sportColors.badge }]}>
//             <Text style={[styles.leagueBadgeText, { color: sportColors.badge }]}>
//               {sportColors.label}
//             </Text>
//           </View>
//         </View>

//         <ScrollView
//           style={styles.content}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//           keyboardShouldPersistTaps="handled"
//         >
//           {/* League Info Banner */}
//           <View style={[styles.leagueBanner, { backgroundColor: sportColors.background }]}>
//             <Text style={styles.leagueName}>{leagueInfo.name}</Text>
//             {leagueInfo.season && (
//               <Text style={styles.leagueSeason}>
//                 {leagueInfo.season}
//                 {leagueInfo.division && ` - ${leagueInfo.division}`}
//               </Text>
//             )}
//           </View>

//           {/* Form Fields */}
//           <View style={styles.form}>
//             {/* Date Input */}
//             <View style={styles.fieldContainer}>
//               <View style={styles.labelRow}>
//                 <Text style={styles.label}>Date</Text>
//                 <Ionicons name="calendar-outline" size={16} color="#F97316" style={styles.labelIcon} />
//               </View>
//               <TouchableOpacity
//                 style={styles.inputWrapper}
//                 onPress={() => setShowCalendarModal(true)}
//                 activeOpacity={0.7}
//               >
//                 <Text style={[styles.inputText, !formData.date && styles.placeholderText]}>
//                   {formData.date ? formatDisplayDate(formData.date) : 'Select'}
//                 </Text>
//                 <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
//               </TouchableOpacity>
//             </View>

//             {/* Time Input */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Time</Text>
//               <TouchableOpacity
//                 style={styles.inputWrapper}
//                 onPress={() => setShowTimeModal(true)}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name="time-outline" size={20} color="#F97316" style={styles.inputIcon} />
//                 <Text style={[styles.inputText, !formData.time && styles.placeholderText]}>
//                   {formData.time || 'Select'}
//                 </Text>
//                 <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
//               </TouchableOpacity>
//             </View>

//             {/* Duration Slider */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Duration</Text>
//               <View style={styles.sliderContainer}>
//                 <Slider
//                   style={styles.slider}
//                   minimumValue={1}
//                   maximumValue={5}
//                   step={0.5}
//                   value={formData.duration}
//                   onValueChange={(value: number) => setFormData({ ...formData, duration: value })}
//                   minimumTrackTintColor={sportColors.background}
//                   maximumTrackTintColor="#D1D5DB"
//                   thumbTintColor={sportColors.background}
//                 />
//                 <Text style={[styles.durationText, { color: sportColors.background }]}>{formData.duration} hour(s)</Text>
//               </View>
//             </View>

//             {/* Number of Players */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Number of players</Text>
//               <TouchableOpacity
//                 style={styles.inputWrapper}
//                 onPress={() => setShowPlayerModal(true)}
//                 activeOpacity={0.7}
//               >
//                 <Ionicons name="people-outline" size={20} color="#F97316" style={styles.inputIcon} />
//                 <Text style={[styles.inputText, !formData.numberOfPlayers && styles.placeholderText]}>
//                   {formData.numberOfPlayers || 'Select'}
//                 </Text>
//                 <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
//               </TouchableOpacity>
//             </View>

//             {/* Location Input */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Location</Text>
//               <View style={styles.inputWrapper}>
//                 <Ionicons name="location-outline" size={20} color="#F97316" style={styles.inputIcon} />
//                 <TextInput
//                   style={styles.input}
//                   value={formData.location}
//                   onChangeText={(text) => setFormData({ ...formData, location: text })}
//                   placeholder="Select"
//                   placeholderTextColor="#9CA3AF"
//                 />
//               </View>
//               {/* Court Booked Toggle */}
//               <TouchableOpacity
//                 style={styles.courtBookedRow}
//                 onPress={() => setFormData({ ...formData, courtBooked: !formData.courtBooked })}
//                 activeOpacity={0.7}
//               >
//                 <View style={styles.courtBookedLeft}>
//                   <Text style={styles.courtBookedLabel}>Court booked</Text>
//                   {formData.courtBooked && (
//                     <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={styles.checkIcon} />
//                   )}
//                 </View>
//                 <View
//                   style={[
//                     styles.toggleSwitch,
//                     formData.courtBooked && styles.toggleSwitchActive,
//                   ]}
//                 >
//                   <View
//                     style={[
//                       styles.toggleThumb,
//                       formData.courtBooked && styles.toggleThumbActive,
//                     ]}
//                   />
//                 </View>
//               </TouchableOpacity>
//             </View>

//             {/* Fee Toggle */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Fee</Text>
//               <View style={styles.feeToggleContainer}>
//                 <TouchableOpacity
//                   style={[
//                     styles.feeButton,
//                     formData.fee === 'FREE' && [styles.feeButtonActive, { backgroundColor: '#F97316' }],
//                   ]}
//                   onPress={() => setFormData({ ...formData, fee: 'FREE' })}
//                   activeOpacity={0.7}
//                 >
//                   <Text
//                     style={[
//                       styles.feeButtonText,
//                       formData.fee === 'FREE' && styles.feeButtonTextActive,
//                     ]}
//                   >
//                     FREE
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   style={[
//                     styles.feeButton,
//                     formData.fee === 'SPLIT' && [styles.feeButtonActive, { backgroundColor: '#F97316' }],
//                   ]}
//                   onPress={() => setFormData({ ...formData, fee: 'SPLIT' })}
//                   activeOpacity={0.7}
//                 >
//                   <Text
//                     style={[
//                       styles.feeButtonText,
//                       formData.fee === 'SPLIT' && styles.feeButtonTextActive,
//                     ]}
//                   >
//                     SPLIT
//                   </Text>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Description Input */}
//             <View style={styles.fieldContainer}>
//               <Text style={styles.label}>Description</Text>
//               <TextInput
//                 style={[styles.input, styles.textArea]}
//                 value={formData.description}
//                 onChangeText={(text) => setFormData({ ...formData, description: text })}
//                 placeholder="Add match details..."
//                 placeholderTextColor="#9CA3AF"
//                 multiline
//                 numberOfLines={4}
//                 textAlignVertical="top"
//               />
//             </View>
//           </View>
//         </ScrollView>

//         {/* Create Button */}
//         <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
//           <TouchableOpacity
//             style={[styles.createButton, { backgroundColor: '#FEA04D'}]}
//             onPress={handleCreateMatch}
//             activeOpacity={0.8}
//           >
//             <Text style={styles.createButtonText}>Create Match</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Calendar Modal */}
//         <Modal
//           visible={showCalendarModal}
//           transparent
//           animationType="fade"
//           onRequestClose={() => setShowCalendarModal(false)}
//         >
//           <Pressable style={styles.modalOverlay} onPress={() => setShowCalendarModal(false)}>
//             <View style={styles.calendarModal}>
//               <View style={styles.dropdownHeader}>
//                 <Text style={styles.dropdownTitle}>Select Date</Text>
//                 <Pressable onPress={() => setShowCalendarModal(false)} style={styles.closeButton}>
//                   <Ionicons name="close" size={24} color="#6B7280" />
//                 </Pressable>
//               </View>
//               <Calendar
//                 onDayPress={(day) => {
//                   setFormData({ ...formData, date: day.dateString });
//                   setShowCalendarModal(false);
//                 }}
//                 markedDates={{
//                   [formData.date]: { 
//                     selected: true, 
//                     selectedColor: sportColors.background 
//                   }
//                 }}
//                 minDate={getTodayString()}
//                 theme={{
//                   todayTextColor: sportColors.background,
//                   selectedDayBackgroundColor: sportColors.background,
//                   selectedDayTextColor: '#FFFFFF',
//                   arrowColor: sportColors.background,
//                   monthTextColor: '#111827',
//                   textMonthFontWeight: '600',
//                   textDayFontSize: 15,
//                   textMonthFontSize: 16,
//                   textDayHeaderFontSize: 13,
//                 }}
//               />
//             </View>
//           </Pressable>
//         </Modal>

//         {/* Time Selection Modal */}
//         <Modal
//           visible={showTimeModal}
//           transparent
//           animationType="fade"
//           onRequestClose={() => setShowTimeModal(false)}
//         >
//           <Pressable style={styles.modalOverlay} onPress={() => setShowTimeModal(false)}>
//             <View style={styles.dropdownModal}>
//               <View style={styles.dropdownHeader}>
//                 <Text style={styles.dropdownTitle}>Select Time</Text>
//                 <Pressable onPress={() => setShowTimeModal(false)} style={styles.closeButton}>
//                   <Ionicons name="close" size={24} color="#6B7280" />
//                 </Pressable>
//               </View>
//               <ScrollView style={styles.dropdownOptions} showsVerticalScrollIndicator={false}>
//                 {TIME_OPTIONS.map((time) => (
//                   <TouchableOpacity
//                     key={time}
//                     style={[
//                       styles.dropdownOption,
//                       time === formData.time && styles.dropdownOptionSelected
//                     ]}
//                     onPress={() => {
//                       setFormData({ ...formData, time });
//                       setShowTimeModal(false);
//                     }}
//                   >
//                     <Text
//                       style={[
//                         styles.dropdownOptionText,
//                         time === formData.time && styles.dropdownOptionTextSelected
//                       ]}
//                     >
//                       {time}
//                     </Text>
//                     {time === formData.time && (
//                       <Ionicons name="checkmark" size={20} color={sportColors.background} />
//                     )}
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           </Pressable>
//         </Modal>

//         {/* Number of Players Selection Modal */}
//         <Modal
//           visible={showPlayerModal}
//           transparent
//           animationType="fade"
//           onRequestClose={() => setShowPlayerModal(false)}
//         >
//           <Pressable style={styles.modalOverlay} onPress={() => setShowPlayerModal(false)}>
//             <View style={styles.dropdownModal}>
//               <View style={styles.dropdownHeader}>
//                 <Text style={styles.dropdownTitle}>Number of Players</Text>
//                 <Pressable onPress={() => setShowPlayerModal(false)} style={styles.closeButton}>
//                   <Ionicons name="close" size={24} color="#6B7280" />
//                 </Pressable>
//               </View>
//               <ScrollView style={styles.dropdownOptions} showsVerticalScrollIndicator={false}>
//                 {PLAYER_OPTIONS.map((count) => (
//                   <TouchableOpacity
//                     key={count}
//                     style={[
//                       styles.dropdownOption,
//                       count === formData.numberOfPlayers && styles.dropdownOptionSelected
//                     ]}
//                     onPress={() => {
//                       setFormData({ ...formData, numberOfPlayers: count });
//                       setShowPlayerModal(false);
//                     }}
//                   >
//                     <Text
//                       style={[
//                         styles.dropdownOptionText,
//                         count === formData.numberOfPlayers && styles.dropdownOptionTextSelected
//                       ]}
//                     >
//                       {count} players
//                     </Text>
//                     {count === formData.numberOfPlayers && (
//                       <Ionicons name="checkmark" size={20} color={sportColors.background} />
//                     )}
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//           </Pressable>
//         </Modal>
//       </KeyboardAvoidingView>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#FFFFFF',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingBottom: 16,
//   },
//   backButton: {
//     padding: 4,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   headerPlaceholder: {
//     width: 32,
//   },
//   content: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingBottom: 24,
//   },
//   badgeContainer: {
//     alignItems: 'center',
//     paddingVertical: 8,
//     backgroundColor: '#FFFFFF',
//   },
//   leagueBanner: {
//     padding: 20,
//     alignItems: 'center',
//   },
//   leagueBadgeContainer: {
//     marginBottom: 8,
//   },
//   leagueBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 4,
//     borderRadius: 12,
//     borderWidth: 1.5,
//     backgroundColor: 'transparent',
//   },
//   leagueBadgeText: {
//     fontSize: 11,
//     fontWeight: '600',
//     textTransform: 'uppercase',
//     letterSpacing: 0.5,
//   },
//   leagueName: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 4,
//     textAlign: 'center',
//   },
//   leagueSeason: {
//     fontSize: 14,
//     color: 'rgba(255, 255, 255, 0.9)',
//     fontWeight: '500',
//     textAlign: 'center',
//   },
//   form: {
//     padding: 20,
//   },
//   fieldContainer: {
//     marginBottom: 20,
//   },
//   labelRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   labelIcon: {
//     marginLeft: 6,
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     borderRadius: 8,
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 16,
//     minHeight: 48,
//   },
//   inputIcon: {
//     marginRight: 12,
//   },
//   input: {
//     flex: 1,
//     fontSize: 15,
//     color: '#111827',
//     paddingVertical: 12,
//   },
//   inputText: {
//     flex: 1,
//     fontSize: 15,
//     color: '#111827',
//   },
//   placeholderText: {
//     color: '#9CA3AF',
//   },
//   sliderContainer: {
//     marginTop: 8,
//   },
//   slider: {
//     width: '100%',
//     height: 40,
//   },
//   durationText: {
//     fontSize: 14,
//     marginTop: 4,
//     fontWeight: '500',
//   },
//   feeToggleContainer: {
//     flexDirection: 'row',
//     gap: 12,
//     marginTop: 8,
//   },
//   feeButton: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     backgroundColor: '#E5E7EB',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   feeButtonActive: {
//     backgroundColor: '#D1D5DB',
//   },
//   feeButtonText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#6B7280',
//   },
//   feeButtonTextActive: {
//     color: '#FFFFFF',
//   },
//   textArea: {
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     borderRadius: 8,
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     minHeight: 100,
//     maxHeight: 150,
//   },
//   footer: {
//     paddingHorizontal: 20,
//     paddingTop: 16,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//   },
//   createButton: {
//     paddingVertical: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   createButtonText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#FFFFFF',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   dropdownModal: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     width: '85%',
//     maxWidth: 400,
//     maxHeight: '70%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   calendarModal: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 16,
//     width: '90%',
//     maxWidth: 400,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//     overflow: 'hidden',
//   },
//   dropdownHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   dropdownTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#111827',
//   },
//   closeButton: {
//     padding: 4,
//   },
//   dropdownOptions: {
//     padding: 8,
//   },
//   dropdownOption: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     marginVertical: 2,
//   },
//   dropdownOptionSelected: {
//     backgroundColor: '#F3F4F6',
//   },
//   dropdownOptionText: {
//     fontSize: 15,
//     color: '#374151',
//     fontWeight: '500',
//   },
//   dropdownOptionTextSelected: {
//     fontWeight: '600',
//     color: '#111827',
//   },

//   matchButton:{
//        backgroundColor: '#FEA04D',
//   },
//   courtBookedRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     marginTop: 12,
//     borderRadius: 8,
//     backgroundColor: '#F9FAFB',
//   },
//   courtBookedLeft: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   courtBookedLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//   },
//   checkIcon: {
//     marginLeft: 4,
//   },
//   toggleSwitch: {
//     width: 48,
//     height: 28,
//     borderRadius: 14,
//     backgroundColor: '#D1D5DB',
//     justifyContent: 'center',
//     paddingHorizontal: 3,
//   },
//   toggleSwitchActive: {
//     backgroundColor: '#16A34A',
//   },
//   toggleThumb: {
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     backgroundColor: '#FFFFFF',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//     elevation: 2,
//   },
//   toggleThumbActive: {
//     alignSelf: 'flex-end',
//   },
// });
