import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { paymentService } from '@/src/services/paymentService';
import { useSession } from '@/lib/auth-client';

const { width, height } = Dimensions.get('window');

export default function PaymentScreen() {
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const paymentData = {
    leagueName: params.leagueName as string,
    sport: params.sport as string,
    category: params.category as string,
    matchId: params.matchId as string,
    entryFee: params.entryFee as string,
  };

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check if user is authenticated
      if (!session?.user?.id) {
        Alert.alert('Authentication Required', 'Please log in to continue with payment.');
        router.push('/login');
        return;
      }

      // Mock payment data - in production, get seasonId from the registration page
      const seasonId = 'season_winter_2025'; // This should come from the selected match
      const leagueId = 'league_subang'; // This should come from the selected league

      console.log('🔐 Making payment for user:', session.user.id);

      const result = await paymentService.createPayment({
        seasonId,
        leagueId,
        amount: parseFloat(paymentData.entryFee.replace('RM', '')),
        billDesc: `${paymentData.leagueName} - ${paymentData.category} Registration`,
        userId: session.user.id // Use actual authenticated user ID
      });

      console.log('💳 Payment service result:', result);

      if (result.success) {
        console.log('✅ Payment created successfully, navigating to WebView...');
        console.log('🔗 Payment URL:', result.paymentUrl);

        // Navigate to WebView payment screen instead of opening Safari
        try {
          console.log('🚀 Attempting navigation to WebView...');
          router.replace({
            pathname: '/payment-webview-simple',
            params: {
              paymentUrl: result.paymentUrl,
              orderId: result.orderId,
              amount: result.amount.toString(),
              leagueName: paymentData.leagueName,
              category: paymentData.category,
              userId: session.user.id
            }
          });
          console.log('🎯 Navigation command sent successfully');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          Alert.alert('Navigation Error', 'Failed to open payment page. Please try again.');
        }
      } else {
        console.error('❌ Payment creation failed:', result);
        Alert.alert('Payment Error', result.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      Alert.alert('Payment Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const entryFeeAmount = paymentData.entryFee.replace('RM', '');

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#B98FAF', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>League:</Text>
              <Text style={styles.summaryValue}>{paymentData.leagueName}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sport:</Text>
              <Text style={styles.summaryValue}>{paymentData.sport}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Category:</Text>
              <Text style={styles.summaryValue}>{paymentData.category}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Entry Fee:</Text>
              <Text style={styles.totalValue}>{paymentData.entryFee}</Text>
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.infoText}>Secure payment powered by Fiuu</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="card" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>Credit Card, Debit Card, FPX Banking</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#F59E0B" />
              <Text style={styles.infoText}>Payment confirmation within 5 minutes</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <View style={styles.termsRow}>
            <Ionicons name="information-circle" size={16} color="#6B7280" />
            <Text style={styles.termsText}>
              By proceeding with payment, you agree to our Terms & Conditions and Privacy Policy.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.payButton, isLoading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.payButtonText}>Pay RM{entryFeeAmount}</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.secureText}>
          🔒 Your payment is secured with 256-bit SSL encryption
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    color: '#863A73',
    fontWeight: '700',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  termsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payButton: {
    backgroundColor: '#863A73',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#863A73',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  secureText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});