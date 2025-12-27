import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { toast } from 'sonner-native';
import {
  CircleArrowButton,
  InputField,
  SocialButton,
} from "../components/AuthComponents";
import { AuthColors, AuthStyles } from "../styles/AuthStyles";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignUp: () => void;
  onForgotPassword: () => void;
  onSocialLogin?: (provider: "facebook" | "google" | "apple") => void | Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onSignUp,
  onForgotPassword,
  onSocialLogin,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const handleLogin = async () => {
    if (email && password && !isLoading) {
      try {
        setIsLoading(true);
        await onLogin(email, password);
      } catch (error) {
        console.error("Login error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={AuthStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: AuthColors.white,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            AuthStyles.screenContainer,
            {
              paddingHorizontal: screenWidth * 0.09,
              backgroundColor: AuthColors.white,
            },
          ]}
        >
          {/* Decorative Package Icon */}
          <View
            style={{
              position: "absolute",
              width: 67,
              height: 71,
              right: screenWidth * 0.09,
              top: screenHeight * 0.1,
            }}
          >
            <Svg width="67" height="71" viewBox="0 0 67 71" fill="none">
              <Defs>
                <ClipPath id="clip0_1273_1964">
                  <Rect width="67" height="71" fill="white" />
                </ClipPath>
              </Defs>
              <G clipPath="url(#clip0_1273_1964)">
                <Path
                  d="M66.9952 35.2153C66.9769 35.9135 66.9083 36.6208 66.7848 37.3281C64.9275 48.0714 50.9017 59.5725 19.7851 70.9404C18.9983 71.2252 18.2846 70.5086 18.4676 69.6911C23.399 47.3457 22.7586 14.6934 18.1382 1.29534C17.8729 0.537481 18.646 -0.19282 19.4145 0.0506138C47.9694 9.11738 67.3521 21.482 66.9952 35.2153Z"
                  fill="#44A7DE"
                />
                <Path
                  d="M20.6226 35.2153V37.3282H21.1303V35.2153H20.6226Z"
                  stroke="#ED2124"
                  strokeMiterlimit="10"
                />
                <Path
                  d="M22.3879 8.15321C21.6972 7.8271 20.9973 7.50558 20.2836 7.18866C14.5973 4.6303 8.22489 2.24649 1.31263 0.0509927C0.548666 -0.192441 -0.1787 0.519488 0.0363074 1.29572C6.46823 24.6929 7.2139 47.4425 0.365681 69.6914C0.118651 70.4906 0.900912 71.2255 1.68317 70.9408C8.74182 68.3595 14.9267 65.7735 20.2836 63.1876C21.0018 62.8477 21.7017 62.4987 22.3879 62.1542C39.2088 53.7029 47.3059 45.3067 48.6875 37.3285C48.811 36.6212 48.8796 35.9138 48.8979 35.2157C49.1587 25.2211 38.9664 15.9523 22.3879 8.15321ZM22.3879 46.8408C21.9808 47.0108 21.5599 47.1761 21.1299 47.3461V37.3285H20.6221V35.2157H21.1299V24.8812C21.5599 25.0879 21.9762 25.2946 22.3879 25.5013C28.7878 28.7119 33.0377 31.9454 34.0349 35.2157C34.25 35.9184 34.3186 36.6212 34.2179 37.3285C33.7879 40.461 30.1694 43.6348 22.3879 46.8408Z"
                  fill="#195E9A"
                />
                <Path
                  d="M34.0349 35.2148C34.2499 35.9176 34.3185 36.6203 34.2179 37.3277H20.6221V35.2148H34.0349Z"
                  fill="white"
                />
                <Path
                  d="M66.9952 35.2148C66.9769 35.913 66.9082 36.6203 66.7847 37.3277H48.6875C48.811 36.6203 48.8796 35.913 48.8979 35.2148H66.9952Z"
                  fill="white"
                />
                <Path
                  d="M22.388 8.15254V62.1535C21.7018 62.498 21.0019 62.8471 20.2837 63.187V7.18799C20.9973 7.50491 21.6973 7.82643 22.388 8.15254Z"
                  fill="white"
                />
              </G>
            </Svg>
          </View>

          {/* Content Section */}
          <View
            style={{
              flex: 1,
              marginTop: screenHeight * 0.18,
              gap: screenHeight * 0.025,
            }}
          >
            {/* Header Title */}
            <Text
              style={{
                fontFamily: "Inter",
                fontWeight: "700",
                fontSize: screenWidth * 0.08,
                lineHeight: screenWidth * 0.1,
                color: "#000000",
              }}
            >
              <Text style={{ color: "black" }}>Hey, you.{"\n"}</Text>
              <Text style={{ color: AuthColors.primary }}>Welcome back!</Text>
            </Text>

            {/* Input Section */}
            <View style={{ gap: 16 }}>
              {/* Username or Email Input */}
              <InputField
                label="Username or email"
                placeholder="yourname@gmail.com"
                value={email}
                onChangeText={setEmail}
                icon="user"
                keyboardType="email-address"
              />

              {/* Password Input */}
              <InputField
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                icon="lock"
                secureTextEntry={!showPassword}
                showEyeIcon
                onEyePress={() => setShowPassword(!showPassword)}
              />
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={{
                alignSelf: "flex-end",
                marginBottom: screenHeight * 0.03,
              }}
              onPress={onForgotPassword}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontWeight: "500",
                  fontSize: screenWidth * 0.035,
                  lineHeight: screenWidth * 0.045,
                  letterSpacing: -0.01,
                  color: AuthColors.primary,
                }}
              >
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Sign In Button with Arrow */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: screenHeight * 0.02,
              width: '100%',
            }}>
              <Text style={{
                fontFamily: 'Inter',
                fontStyle: 'normal',
                fontWeight: '600',
                fontSize: 22,
                lineHeight: 28,
                letterSpacing: -0.01,
                color: '#000000',
              }}>
                Sign In
              </Text>
              <TouchableOpacity 
                onPress={handleLogin}
                disabled={isLoading}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: AuthColors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <LinearGradient
                  colors={[AuthColors.primary, AuthColors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Svg width="42" height="42" viewBox="0 0 42 42" fill="none">
                      <Path d="M8.75 21H33.25M33.25 21L26.25 28M33.25 21L26.25 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </Svg>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Or Sign In With */}
            <Text
              style={{
                textAlign: "center",
                fontFamily: "Inter",
                fontWeight: "500",
                fontSize: screenWidth * 0.03,
                lineHeight: screenWidth * 0.042,
                letterSpacing: -0.01,
                color: "#404040",
              }}
            >
              or sign in with
            </Text>

            {/* Social Login Buttons */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: screenWidth * 0.015,
              }}
            >
              <SocialButton
                type="facebook"
                onPress={() => {
                  if (onSocialLogin) {
                    try {
                      onSocialLogin("facebook");
                    } catch (error) {
                      toast.error("Facebook login failed", {
                        description: "Please try again later.",
                      });
                    }
                  } else {
                    toast.error("Social login not available", {
                      description: "This feature is coming soon.",
                    });
                  }
                }}
              />
              <SocialButton
                type="apple"
                onPress={() => {
                  if (onSocialLogin) {
                    try {
                      onSocialLogin("apple");
                    } catch (error) {
                      toast.error("Apple login failed", {
                        description: "Please try again later.",
                      });
                    }
                  } else {
                    toast.error("Social login not available", {
                      description: "This feature is coming soon.",
                    });
                  }
                }}
              />
              <SocialButton
                type="google"
                onPress={() => {
                  if (onSocialLogin) {
                    try {
                      onSocialLogin("google");
                    } catch (error) {
                      toast.error("Google login failed", {
                        description: "Please try again later.",
                      });
                    }
                  } else {
                    toast.error("Social login not available", {
                      description: "This feature is coming soon.",
                    });
                  }
                }}
              />
            </View>

            {/* Sign Up Link */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: screenWidth * 0.015
            }}>
              <Text style={{
                fontFamily: 'Inter',
                fontWeight: '500',
                fontSize: 14,
                lineHeight: 22,
                letterSpacing: -0.01,
                color: '#404040',
              }}>Don't have an account yet?</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSignUp();
                }}
                style={{
                  paddingTop: Platform.OS === 'ios' ? 1 : 0.5,
                  paddingBottom: Platform.OS === 'ios' ? 1 : 0.5,
                  paddingHorizontal: Platform.OS === 'ios' ? 2 : 1,
                  borderBottomWidth: 1,
                  borderBottomColor: AuthColors.primary,
                }}
              >
                <Text style={{
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  fontSize: 14,
                  lineHeight: 22,
                  letterSpacing: -0.01,
                  color: AuthColors.primary,
                }}>Create now!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
