import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetView
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Season } from '../services/SeasonService';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

interface PaymentOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  season: Season | null;
  onPayNow: (season: Season) => void;
  onPayLater: (season: Season) => void;
  sport?: 'pickleball' | 'tennis' | 'padel';
  isProcessingPayment?: boolean;
}

// Sport-specific color configurations
const getSportColors = (sport: 'pickleball' | 'tennis' | 'padel') => {
  switch (sport) {
    case 'tennis':
      return {
        primary: '#587A27',
        primaryLight: '#A2E047',
        gradient: ['#A2E047', '#587A27'] as [string, string],
        buttonGradient: ['#A2E047', '#729E32'] as [string, string],
      };
    case 'padel':
      return {
        primary: '#2E6698',
        primaryLight: '#4DABFE',
        gradient: ['#4DABFE', '#2E6698'] as [string, string],
        buttonGradient: ['#4DABFE', '#377FBF'] as [string, string],
      };
    case 'pickleball':
    default:
      return {
        primary: '#602E98',
        primaryLight: '#A04DFE',
        gradient: ['#A04DFE', '#602E98'] as [string, string],
        buttonGradient: ['#A04DFE', '#7B3BBF'] as [string, string],
      };
  }
};

export const PaymentOptionsBottomSheet: React.FC<PaymentOptionsBottomSheetProps> = ({
  visible,
  onClose,
  season,
  onPayNow,
  onPayLater,
  sport = 'pickleball',
  isProcessingPayment = false,
}) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const sportColors = getSportColors(sport);

  // snap point for the bottom sheet
  const snapPoints = useMemo(() => ['55%'], []);

  // handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // present modal when visible is true
  useEffect(() => {
    if (visible && season) {
      if (Platform.OS === 'ios') {
        requestAnimationFrame(() => {
          setTimeout(() => {
            bottomSheetModalRef.current?.present();
          }, 50);
        });
      } else {
        bottomSheetModalRef.current?.present();
      }
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible, season]);

  // backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handlePayNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (season && !isProcessingPayment) {
      onPayNow(season);
      onClose();
    }
  };

  const handlePayLater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!season) return;
    onPayLater(season);
    onClose();
  };

  if (!season) return null;

  const entryFee = typeof season.entryFee === 'string'
    ? parseFloat(season.entryFee).toFixed(2)
    : season.entryFee.toFixed(2);

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      index={0}
      onChange={handleSheetChanges}
      backdropComponent={renderBackdrop}
      handleComponent={(props) => (
        <View style={styles.handleContainer}>
          <BottomSheetHandle {...props} />
        </View>
      )}
      backgroundStyle={styles.bottomSheetBackground}
      style={styles.bottomSheetContainer}
      enablePanDownToClose={true}
      enableDismissOnClose={true}
      enableHandlePanningGesture={true}
    >
      <BottomSheetView style={[styles.contentContainer, { paddingBottom: 20 + insets.bottom }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Payment Options</Text>
          <Text style={styles.seasonName}>{season.name}</Text>
        </View>

        {/* Entry Fee Card */}
        <LinearGradient
          colors={sportColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.feeCardGradient}
        >
          <View style={styles.feeCard}>
            <View style={styles.feeContent}>
              <Text style={styles.feeLabel}>Entry Fee</Text>
              <Text style={styles.feeAmount}>RM{entryFee}</Text>
            </View>
            <View style={styles.feeDivider} />
            <View style={styles.feeContent}>
              <Text style={styles.feeLabel}>Season</Text>
              <Text style={styles.feeSeasonName} numberOfLines={1}>{season.name}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Payment Options */}
        <View style={styles.paymentOptionsContainer}>
          {/* Pay Now Button */}
          <TouchableOpacity
            style={styles.payNowButtonContainer}
            onPress={handlePayNow}
            disabled={isProcessingPayment}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={sportColors.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.payNowButton,
                isProcessingPayment && styles.payNowButtonDisabled,
              ]}
            >
              <View style={styles.buttonContent}>
                {isProcessingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.payNowButtonText}>
                  {isProcessingPayment ? 'Opening Gateway…' : 'Pay Now'}
                </Text>
              </View>
              <Text style={styles.buttonSubtext}>Complete registration with payment</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pay Later Button */}
          <TouchableOpacity
            style={[styles.payLaterButton, { borderColor: sportColors.primaryLight }]}
            onPress={handlePayLater}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="time" size={20} color={sportColors.primary} />
              <Text style={[styles.payLaterButtonText, { color: sportColors.primary }]}>Pay Later</Text>
            </View>
            <Text style={styles.payLaterSubtext}>Register now, pay before deadline</Text>
          </TouchableOpacity>
        </View>

        {/* Info Notice */}
        <View style={styles.infoNoticeContainer}>
          <Ionicons name="information-circle-outline" size={18} color="#86868B" />
          <Text style={styles.infoNoticeText}>
            Payment must be completed before the registration deadline to secure your spot.
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    paddingTop: 8,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  modalTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  seasonName: {
    fontSize: isSmallScreen ? 14 : 15,
    fontWeight: '500',
    color: '#86868B',
    textAlign: 'center',
  },
  feeCardGradient: {
    borderRadius: 16,
    padding: 2,
    marginBottom: 24,
  },
  feeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeContent: {
    flex: 1,
    alignItems: 'center',
  },
  feeDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#86868B',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  feeSeasonName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  paymentOptionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  payNowButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payNowButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  payNowButtonDisabled: {
    opacity: 0.85,
  },
  payLaterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  payNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  payLaterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '400',
  },
  payLaterSubtext: {
    color: '#86868B',
    fontSize: 12,
    fontWeight: '400',
  },
  infoNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoNoticeText: {
    fontSize: 13,
    color: '#86868B',
    fontWeight: '400',
    flex: 1,
    lineHeight: 18,
  },
});
