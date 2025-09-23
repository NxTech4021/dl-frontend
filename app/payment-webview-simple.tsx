import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentWebViewSimple() {
  const params = useLocalSearchParams();

  const paymentUrl = params.paymentUrl as string;
  const orderId = params.orderId as string;
  const amount = params.amount as string;
  const leagueName = params.leagueName as string;
  const category = params.category as string;
  const userId = params.userId as string;

  console.log('🔗 WebView Screen - Payment URL:', paymentUrl);

  // Test if URL is accessible before loading in WebView
  React.useEffect(() => {
    const testUrl = async () => {
      try {
        console.log('🌐 Testing URL accessibility...');
        const response = await fetch(paymentUrl, { method: 'HEAD' });
        console.log('📡 URL test response status:', response.status);
        console.log('📡 URL test response headers:', response.headers);
      } catch (error) {
        console.error('❌ URL accessibility test failed:', error);
      }
    };

    if (paymentUrl) {
      testUrl();
    }
  }, [paymentUrl]);

  const handleClose = () => {
    router.back();
  };

  const handleNavigationStateChange = (navState: any) => {
    console.log('🔍 WebView navigation:', navState.url);

    // Only redirect if we're actually ON the return URL (not just a parameter)
    // Check if the current URL is our backend's return endpoint
    if (navState.url.startsWith('http://192.168.0.197:3001/api/payment/return')) {
      console.log('✅ Payment completed, redirecting to pending page');

      // Navigate to payment pending page to check final status
      router.replace({
        pathname: '/payment-pending',
        params: {
          orderId: orderId,
          amount,
          leagueName,
          category,
          userId
        }
      });
    }
  };

  if (!paymentUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No payment URL provided</Text>
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure Payment</Text>
        <View style={styles.spacer} />
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(error) => {
          console.error('❌ WebView error:', error);
          console.error('❌ WebView error details:', JSON.stringify(error, null, 2));
        }}
        onHttpError={(error) => {
          console.error('❌ WebView HTTP error:', error);
        }}
        onLoad={() => {
          console.log('✅ WebView loaded successfully');
        }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 Paying RM{amount} for {leagueName} - {category}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  spacer: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  footer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#863A73',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});