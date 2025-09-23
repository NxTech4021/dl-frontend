import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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

export default function PaymentPendingScreen() {
  const params = useLocalSearchParams();
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [isChecking, setIsChecking] = useState(true);
  const { data: session } = useSession();

  const paymentData = {
    orderId: params.orderId as string,
    amount: params.amount as string,
    leagueName: params.leagueName as string,
    category: params.category as string,
    userId: (params.userId as string) || session?.user?.id, // Fallback to session if no param
  };

  const checkPaymentStatus = async () => {
    try {
      if (!paymentData.userId) {
        console.error('No user ID available for payment status check');
        setPaymentStatus('failed');
        return;
      }

      const result = await paymentService.getPaymentStatus(paymentData.orderId, paymentData.userId);

      if (result.success) {
        const status = result.payment.status.toLowerCase();
        setPaymentStatus(status === 'success' ? 'success' : status === 'failed' ? 'failed' : 'pending');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check payment status immediately
    checkPaymentStatus();

    // Set up polling to check payment status every 10 seconds
    const interval = setInterval(() => {
      if (paymentStatus === 'pending') {
        checkPaymentStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [paymentStatus]);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (paymentStatus === 'success') {
      // Navigate to success page or back to dashboard
      router.replace('/user-dashboard');
    } else if (paymentStatus === 'failed') {
      // Navigate back to payment page or league registration
      router.back();
    }
  };

  const renderContent = () => {
    switch (paymentStatus) {
      case 'pending':
        return (
          <>
            <View style={styles.iconContainer}>
              <ActivityIndicator size="large" color="#863A73" />
            </View>
            <Text style={styles.title}>Payment Processing</Text>
            <Text style={styles.subtitle}>
              Please wait while we confirm your payment. This may take a few minutes.
            </Text>
            <View style={styles.detailsCard}>
              <Text style={styles.orderId}>Order ID: {paymentData.orderId}</Text>
              <Text style={styles.amount}>Amount: RM{paymentData.amount}</Text>
            </View>
          </>
        );

      case 'success':
        return (
          <>
            <View style={[styles.iconContainer, styles.successIcon]}>
              <Ionicons name="checkmark-circle" size={80} color="#059669" />
            </View>
            <Text style={[styles.title, styles.successTitle]}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Congratulations! You have successfully registered for {paymentData.leagueName} - {paymentData.category}.
            </Text>
            <View style={styles.detailsCard}>
              <Text style={styles.orderId}>Order ID: {paymentData.orderId}</Text>
              <Text style={styles.amount}>Paid: RM{paymentData.amount}</Text>
            </View>
          </>
        );

      case 'failed':
        return (
          <>
            <View style={[styles.iconContainer, styles.failedIcon]}>
              <Ionicons name="close-circle" size={80} color="#EF4444" />
            </View>
            <Text style={[styles.title, styles.failedTitle]}>Payment Failed</Text>
            <Text style={styles.subtitle}>
              Unfortunately, your payment could not be processed. Please try again or contact support.
            </Text>
            <View style={styles.detailsCard}>
              <Text style={styles.orderId}>Order ID: {paymentData.orderId}</Text>
              <Text style={styles.amount}>Amount: RM{paymentData.amount}</Text>
            </View>
          </>
        );
    }
  };

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
            router.replace('/user-dashboard');
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        {renderContent()}

        {paymentStatus !== 'pending' && (
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>
              {paymentStatus === 'success' ? 'Continue' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        )}

        {paymentStatus === 'pending' && (
          <View style={styles.checkingContainer}>
            <Text style={styles.checkingText}>
              {isChecking ? 'Checking payment status...' : 'Payment status will update automatically'}
            </Text>
          </View>
        )}
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(134, 58, 115, 0.1)',
  },
  successIcon: {
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
  },
  failedIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  successTitle: {
    color: '#059669',
  },
  failedTitle: {
    color: '#EF4444',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  detailsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderId: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#863A73',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  checkingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});