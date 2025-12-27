import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Svg, { Path, Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Logo,
  PrimaryButton,
  VerificationInput,
  LinkText,
} from '../components/AuthComponents';
import { AuthStyles, AuthColors } from '../styles/AuthStyles';

interface VerificationScreenProps {
  email: string;
  onVerify: (code: string) => void;
  onResendCode: () => void;
  onBack: () => void;
}

export const VerificationScreen: React.FC<VerificationScreenProps> = ({
  email,
  onVerify,
  onResendCode,
  onBack,
}) => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerify = () => {
    const verificationCode = code.join('');
    if (verificationCode.length === 6) {
      onVerify(verificationCode);
    }
  };

  const handleResendCode = () => {
    if (resendTimer === 0) {
      setIsResending(true);
      onResendCode();
      setResendTimer(60);
      setTimeout(() => setIsResending(false), 1000);
    }
  };

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    if (code.every(digit => digit !== '')) {
      handleVerify();
    }
  }, [code]);

  return (
    <KeyboardAvoidingView
      style={AuthStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[AuthStyles.screenContainer, { paddingHorizontal: screenWidth * 0.07 }]}>

          {/* Header Section */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: screenHeight * 0.06,
            marginBottom: screenHeight * 0.08
          }}>
            {/* Back Button */}
            <TouchableOpacity
              onPress={onBack}
              style={{
                width: 36,
                height: 36
              }}
            >
              <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <Path d="M7.875 16.875H30.375C30.6734 16.875 30.9595 16.9935 31.1705 17.2045C31.3815 17.4155 31.5 17.7016 31.5 18C31.5 18.2984 31.3815 18.5845 31.1705 18.7955C30.9595 19.0065 30.6734 19.125 30.375 19.125H7.875C7.57663 19.125 7.29048 19.0065 7.07951 18.7955C6.86853 18.5845 6.75 18.2984 6.75 18C6.75 17.7016 6.86853 17.4155 7.07951 17.2045C7.29048 16.9935 7.57663 16.875 7.875 16.875Z" fill="black"/>
                <Path d="M8.34081 18L17.6716 27.3285C17.8828 27.5397 18.0015 27.8262 18.0015 28.125C18.0015 28.4237 17.8828 28.7102 17.6716 28.9215C17.4603 29.1327 17.1738 29.2514 16.8751 29.2514C16.5763 29.2514 16.2898 29.1327 16.0786 28.9215L5.95356 18.7965C5.84879 18.692 5.76567 18.5678 5.70895 18.4311C5.65224 18.2945 5.62305 18.1479 5.62305 18C5.62305 17.852 5.65224 17.7055 5.70895 17.5688C5.76567 17.4321 5.84879 17.308 5.95356 17.2035L16.0786 7.07846C16.2898 6.86721 16.5763 6.74854 16.8751 6.74854C17.1738 6.74854 17.4603 6.86721 17.6716 7.07846C17.8828 7.2897 18.0015 7.57621 18.0015 7.87496C18.0015 8.1737 17.8828 8.46021 17.6716 8.67146L8.34081 18Z" fill="black"/>
              </Svg>
            </TouchableOpacity>

            {/* Logo */}
            <View style={{
              alignItems: 'center',
              flex: 1
            }}>
              <Svg width="102" height="23" viewBox="0 0 102 23" fill="none">
                <Path d="M4.86 1.06H11.58C14.08 1.06 16.04 1.72 17.46 3.04C18.9 4.36 19.62 6.31 19.62 8.89C19.62 10.75 19.38 12.48 18.9 14.08C18.42 15.68 17.71 17.07 16.77 18.25C15.85 19.41 14.7 20.33 13.32 21.01C11.96 21.67 10.4 22 8.64 22H0.66L4.86 1.06ZM9 18.16C10.36 18.16 11.52 17.75 12.48 16.93C13.44 16.11 14.09 14.84 14.43 13.12L15 10.3C15.08 9.92 15.13 9.56 15.15 9.22C15.19 8.88 15.21 8.62 15.21 8.44C15.21 7.18 14.9 6.28 14.28 5.74C13.68 5.18 12.87 4.9 11.85 4.9H8.46L5.79 18.16H9ZM22.6092 22L26.8092 1.06H40.2792L39.4992 4.9H30.4092L29.4792 9.49H37.5192L36.7392 13.33H28.6992L27.7392 18.16H37.1592L36.3792 22H22.6092ZM49.883 1.06L47.363 13.6C47.303 13.88 47.253 14.2 47.213 14.56C47.173 14.9 47.153 15.21 47.153 15.49C47.153 17.49 48.173 18.49 50.213 18.49C51.413 18.49 52.363 18.13 53.063 17.41C53.763 16.69 54.273 15.55 54.593 13.99L57.203 1.06H61.493L58.943 13.75C58.643 15.23 58.253 16.51 57.773 17.59C57.313 18.67 56.723 19.56 56.003 20.26C55.283 20.96 54.433 21.49 53.453 21.85C52.473 22.19 51.333 22.36 50.033 22.36C47.733 22.36 45.973 21.79 44.753 20.65C43.553 19.51 42.953 17.82 42.953 15.58C42.953 15.18 42.973 14.77 43.013 14.35C43.053 13.91 43.123 13.43 43.223 12.91L45.593 1.06H49.883ZM71.805 22.36C70.685 22.36 69.665 22.18 68.745 21.82C67.845 21.46 67.065 20.93 66.405 20.23C65.745 19.51 65.235 18.62 64.875 17.56C64.515 16.5 64.335 15.26 64.335 13.84C64.335 12 64.605 10.28 65.145 8.68C65.705 7.08 66.465 5.69 67.425 4.51C68.385 3.33 69.515 2.4 70.815 1.72C72.135 1.04 73.555 0.699999 75.075 0.699999C76.955 0.699999 78.475 1.15 79.635 2.05C80.815 2.93 81.655 4.18 82.155 5.8L78.285 7.42C78.165 7.02 78.015 6.65 77.835 6.31C77.655 5.95 77.425 5.65 77.145 5.41C76.885 5.15 76.555 4.95 76.155 4.81C75.775 4.65 75.305 4.57 74.745 4.57C73.345 4.57 72.205 5.05 71.325 6.01C70.465 6.97 69.875 8.24 69.555 9.82L68.895 13.12C68.835 13.42 68.795 13.7 68.775 13.96C68.755 14.2 68.745 14.42 68.745 14.62C68.745 17.2 69.895 18.49 72.195 18.49C73.375 18.49 74.315 18.2 75.015 17.62C75.735 17.04 76.325 16.29 76.785 15.37L80.415 17.02C79.475 18.84 78.255 20.19 76.755 21.07C75.275 21.93 73.625 22.36 71.805 22.36ZM83.828 22L88.028 1.06H101.498L100.718 4.9H91.628L90.698 9.49H98.738L97.958 13.33H89.918L88.958 18.16H98.378L97.598 22H83.828Z" fill="#FEA04D"/>
              </Svg>
            </View>

            {/* Spacer to balance the layout */}
            <View style={{ width: 36 }} />
          </View>

          {/* Content Section */}
          <View style={{ flex: 1 }}>
            {/* Header Title */}
            <Text style={{
              fontFamily: 'Inter',
              fontWeight: '700',
              fontSize: screenWidth * 0.08, // Responsive font size
              lineHeight: screenWidth * 0.1,
              color: '#000000',
              marginBottom: screenHeight * 0.02
            }}>
              Verify your email.
            </Text>

            {/* Verification Container */}
            <View style={{ marginBottom: screenHeight * 0.05 }}>
              {/* Description */}
              <Text style={{
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '500',
                fontSize: screenWidth * 0.03,
                lineHeight: screenWidth * 0.048,
                letterSpacing: -0.02,
                color: '#6C7278',
                marginBottom: screenHeight * 0.04
              }}>
                We've sent a 6-digit verification code to your email address.
              </Text>

              {/* Verification Code Label */}
              <Text style={{
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: '700',
                fontSize: screenWidth * 0.03,
                lineHeight: screenWidth * 0.048,
                letterSpacing: -0.02,
                color: '#6C7278',
                marginBottom: screenHeight * 0.05
              }}>
                Verification Code
              </Text>

              {/* Code Input Container */}
              <View style={{
                width: '100%',
                height: 40,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: screenHeight * 0.03
              }}>
                <VerificationInput code={code} onCodeChange={setCode} />
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={handleVerify}
                style={{
                  width: '100%',
                  maxWidth: 310,
                  height: 40,
                  borderRadius: 20,
                  alignSelf: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}
              >
                <Svg width="100%" height="40" viewBox="0 0 310 40" fill="none" style={{
                  position: 'absolute',
                  width: '100%',
                  height: 40
                }}>
                  <Defs>
                    <SvgLinearGradient id="confirmGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#FF7903"/>
                      <Stop offset="100%" stopColor="#FEA04D"/>
                    </SvgLinearGradient>
                  </Defs>
                  <Rect width="100%" height="40" rx="20" fill="url(#confirmGradient)"/>
                </Svg>
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  fontWeight: '600',
                  lineHeight: 24,
                  zIndex: 1
                }}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>

            {/* Resend Code Link */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: screenHeight * 0.01,
              gap: 6
            }}>
              <Text style={{
                fontFamily: 'Inter',
                fontWeight: '500',
                fontSize: screenWidth * 0.03,
                lineHeight: screenWidth * 0.042,
                letterSpacing: -0.01,
                color: '#6C7278'
              }}>
                Didn't receive a code?
              </Text>
              <TouchableOpacity onPress={handleResendCode} disabled={resendTimer > 0}>
                <Text style={{
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  fontSize: screenWidth * 0.03,
                  lineHeight: screenWidth * 0.042,
                  letterSpacing: -0.01,
                  textDecorationLine: 'underline',
                  color: '#FEA04D',
                  opacity: resendTimer > 0 ? 0.5 : 1
                }}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code.'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};