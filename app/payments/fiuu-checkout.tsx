import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

type PaymentStatus = 'idle' | 'processing' | 'completed' | 'pending' | 'failed';

interface CheckoutPayload {
  paymentId: string;
  orderId: string;
  membershipId: string;
  amount: string;
  currency: string;
  checkout: {
    paymentUrl: string;
    params: Record<string, string>;
  };
}

interface ReturnMessage {
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  message?: string;
  orderId?: string;
}

export default function FiuuCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ payload?: string }>();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to payment gateway...');

  useEffect(() => {
    if (params?.payload) {
      try {
        const decoded = decodeURIComponent(params.payload);
        const parsed = JSON.parse(decoded) as CheckoutPayload;
        setPayload(parsed);
        setStatus('processing');
        setPageLoaded(false);
        setStatusMessage('Loading FIUU secure payment page...');
      } catch (error) {
        console.error('Failed to parse payment payload', error);
        setStatus('failed');
        setStatusMessage('Unable to load payment session. Please try again.');
      }
    } else {
      setStatus('failed');
      setStatusMessage('Payment details not found. Please start again.');
    }
  }, [params?.payload]);

  const htmlSource = useMemo(() => {
    if (!payload) return null;
    const inputs = Object.entries(payload.checkout.params)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}" />`)
      .join('\n');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>FIUU Checkout</title>
          <style>
            body { background:#f9fafb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; display:flex; align-items:center; justify-content:center; min-height:100vh; }
            .card { background:#ffffff; border-radius:18px; padding:24px; max-width:340px; width:90%; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); text-align:center; }
            h1 { margin-bottom:12px; font-size:18px; color:#111827; }
            p { margin:0; color:#4b5563; font-size:14px; }
          </style>
        </head>
        <body onload="document.forms[0].submit();">
          <div class="card">
            <h1>Redirecting to FIUU</h1>
            <p>Please wait while we secure your payment session.</p>
          </div>
          <form method="POST" action="${payload.checkout.paymentUrl}">
            ${inputs}
          </form>
        </body>
      </html>
    `;
  }, [payload]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/user-dashboard');
    }
  };

  const handleResult = (result: ReturnMessage) => {
    const normalized = result.status ?? 'FAILED';
    if (normalized === 'COMPLETED') {
      setStatus('completed');
      setStatusMessage('Payment successful! Your registration is confirmed.');
    } else if (normalized === 'PENDING') {
      setStatus('pending');
      setStatusMessage('Payment pending. We will update your registration once the gateway confirms.');
    } else {
      setStatus('failed');
      setStatusMessage(result.message || 'Payment was not completed. You can try again.');
    }
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const raw = event.nativeEvent.data;
      const parsed = JSON.parse(raw) as ReturnMessage;
      handleResult(parsed);
    } catch (error) {
      console.warn('Unable to parse payment result', error);
    }
  };

  const renderStatus = () => {
    if (status === 'idle' && pageLoaded) return null;

    const headline =
      status === 'completed'
        ? 'Payment Confirmed'
        : status === 'pending'
        ? 'Payment Pending'
        : status === 'failed'
        ? 'Payment Failed'
        : 'Processing Payment';

    return (
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>{headline}</Text>
        <Text style={styles.statusMessage}>{statusMessage}</Text>
        {status === 'processing' && (
          <ActivityIndicator style={styles.statusSpinner} color="#863A73" />
        )}
        {status !== 'processing' && (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Back to App</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#B98FAF', '#FFFFFF']}
      locations={[0, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FIUU Payment</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.statusContainer}>{renderStatus()}</View>

        <View style={styles.webviewContainer}>
          {htmlSource && payload ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlSource, baseUrl: payload.checkout.paymentUrl }}
              onMessage={onMessage}
              onLoadEnd={() => {
                setPageLoaded(true);
                if (status === 'processing') setStatus('idle');
              }}
              injectedJavaScript={`
                (function() {
                  var meta = document.querySelector('meta[name=viewport]');
                  if (!meta) {
                    meta = document.createElement('meta');
                    meta.name = 'viewport';
                    document.head.appendChild(meta);
                  }
                  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
                  var style = document.createElement('style');
                  style.innerHTML = 'html,body{width:100vw !important;max-width:100vw !important;overflow-x:hidden !important;}';
                  document.head.appendChild(style);
                })();
                true;
              `}
              contentMode="mobile"
              javaScriptEnabled
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#863A73" />
                  <Text style={styles.loadingText}>Preparing secure checkout…</Text>
                </View>
              )}
              sharedCookiesEnabled
              incognito={false}
              mixedContentMode="always"
            />
          ) : (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#863A73" />
              <Text style={styles.loadingText}>Preparing payment session…</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 16 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  backButton: {
    minWidth: 60,
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#863A73',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#863A73',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  statusMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  statusSpinner: {
    marginTop: 12,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#863A73',
    borderRadius: 12,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  webviewContainer: {
    flex: 1,
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    color: '#4B5563',
    fontSize: 15,
  },
});
