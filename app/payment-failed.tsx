import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function PaymentFailedScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const status = params.status as string;
  const error = params.error as string;

  const handleTryAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGoToDashboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/user-dashboard');
  };

  const getErrorMessage = () => {
    if (error === 'invalid_signature') {
      return 'Payment verification failed. Please contact support.';
    }
    if (error === 'processing_error') {
      return 'An error occurred while processing your payment.';
    }
    if (status === 'cancelled') {
      return 'Payment was cancelled. You can try again anytime.';
    }
    return 'Your payment could not be processed. Please try again or contact support.';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FEE2E2', '#FFFFFF']}
        locations={[0, 1]}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="close-circle" size={100} color="#EF4444" />
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>
          {getErrorMessage()}
        </Text>

        {orderId && (
          <View style={styles.orderCard}>
            <Text style={styles.orderLabel}>Order ID:</Text>
            <Text style={styles.orderValue}>{orderId}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.tryAgainButton} onPress={handleTryAgain}>
            <Text style={styles.tryAgainButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardButton} onPress={handleGoToDashboard}>
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.supportInfo}>
          <Ionicons name="help-circle" size={16} color="#6B7280" />
          <Text style={styles.supportText}>
            Need help? Contact our support team
          </Text>
        </View>
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
    height: height * 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  orderCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  orderLabel: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 4,
    fontWeight: '500',
  },
  orderValue: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  tryAgainButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tryAgainButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dashboardButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  dashboardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  supportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  supportText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    textAlign: 'center',
  },
});