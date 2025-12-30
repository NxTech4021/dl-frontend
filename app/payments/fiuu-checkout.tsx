import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/core/theme/theme';
import { moderateScale, responsivePadding, getComponentSizes } from '@/core/utils/responsive';

type PaymentStatus = 'idle' | 'processing' | 'completed' | 'pending' | 'failed';

interface ReturnToParams {
  pathname: string;
  params?: Record<string, string>;
  dismissCount?: number; // Number of screens to go back (default: 1)
}

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
  returnTo?: ReturnToParams;
}

interface ReturnMessage {
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  message?: string;
  orderId?: string;
}

export default function FiuuCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ payload?: string }>();
  const [payload, setPayload] = useState<CheckoutPayload | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to payment gateway...');
  const componentSizes = getComponentSizes();

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
            * { box-sizing: border-box; }
            body {
              background: linear-gradient(180deg, #FFB678 0%, #FFFFFF 100%);
              font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .card {
              background: #FFFFFF;
              border-radius: 20px;
              padding: 32px 24px;
              max-width: 340px;
              width: 100%;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
              text-align: center;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #F4F4F4;
              border-top-color: #FE9F4D;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h1 {
              margin: 0 0 8px;
              font-size: 18px;
              font-weight: 700;
              color: #1A1C1E;
            }
            p {
              margin: 0;
              color: #6C7278;
              font-size: 14px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body onload="document.forms[0].submit();">
          <div class="card">
            <div class="spinner"></div>
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If we have a returnTo destination with dismissCount, go back multiple screens
    // This handles the case where we need to return to league-details from fiuu-checkout
    // through doubles-team-pairing (2 screens back)
    if (payload?.returnTo) {
      const dismissCount = payload.returnTo.dismissCount || 1;

      // Navigate back multiple times to reach the target screen
      // The useFocusEffect in the target screen will refresh the data
      for (let i = 0; i < dismissCount; i++) {
        if (router.canGoBack()) {
          router.back();
        }
      }
      return;
    }

    // Fallback to default behavior
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/user-dashboard');
    }
  };

  const getStatusIcon = () => {
    const iconSize = componentSizes.icon.large;
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={iconSize} color={theme.colors.semantic.success} />;
      case 'pending':
        return <Ionicons name="time" size={iconSize} color={theme.colors.primary} />;
      case 'failed':
        return <Ionicons name="close-circle" size={iconSize} color={theme.colors.semantic.error} />;
      case 'processing':
      default:
        return <ActivityIndicator size="large" color={theme.colors.primary} />;
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

  const renderStatusOverlay = () => {
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
      <View style={styles.statusOverlay}>
        <View style={styles.statusCard}>
          <View style={styles.statusIconContainer}>
            {getStatusIcon()}
          </View>
          <Text style={styles.statusTitle}>{headline}</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
          {status !== 'processing' && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Back to App</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#FFB678', '#FFFFFF']}
      locations={[0, 1]}
      style={styles.container}
    >
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top > 0 ? 0 : responsivePadding.md }]}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

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
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Preparing secure checkout…</Text>
                </View>
              )}
              sharedCookiesEnabled
              incognito={false}
              mixedContentMode="always"
            />
          ) : (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Preparing payment session…</Text>
            </View>
          )}
          {renderStatusOverlay()}
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
    paddingHorizontal: responsivePadding.lg,
    paddingVertical: responsivePadding.md,
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral.white,
    fontFamily: theme.typography.fontFamily.primary,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  webviewContainer: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral.white,
    position: 'relative',
  },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsivePadding.sm,
    backgroundColor: theme.colors.neutral.white,
  },
  loadingText: {
    color: theme.colors.neutral.gray[400],
    fontSize: moderateScale(15),
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Status overlay styles
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsivePadding.lg,
  },
  statusCard: {
    backgroundColor: theme.colors.neutral.white,
    borderRadius: 20,
    paddingVertical: responsivePadding.xl,
    paddingHorizontal: responsivePadding.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.neutral.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  statusIconContainer: {
    marginBottom: responsivePadding.md,
  },
  statusTitle: {
    fontSize: moderateScale(18),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.neutral.gray[700],
    marginBottom: responsivePadding.xs,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  statusMessage: {
    fontSize: moderateScale(14),
    color: theme.colors.neutral.gray[400],
    lineHeight: 22,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  primaryButton: {
    marginTop: responsivePadding.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: responsivePadding.md,
    paddingHorizontal: responsivePadding.xl,
    width: '100%',
  },
  primaryButtonText: {
    color: theme.colors.neutral.white,
    fontSize: moderateScale(16),
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
});
