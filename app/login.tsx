import { authClient, useSession } from "@/lib/auth-client";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { AuthStorage } from "@/src/core/storage";
import { LoginScreen } from "@/src/features/auth/screens/LoginScreen";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { toast } from "sonner-native";

export default function LoginRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const { data: session } = useSession();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Conditionally enable gesture navigation:
  // - Allow swipe back when coming from landing page (from=landing)
  // - Disable swipe back after logout to prevent accessing protected pages
  useEffect(() => {
    const allowGesture = from === "landing";
    navigation.setOptions({
      gestureEnabled: allowGesture,
    });
  }, [from, navigation]);

  const handleLogin = async (emailOrUsername: string, password: string) => {
    try {
      console.log("Login attempt with:", emailOrUsername);

      const isEmail = emailOrUsername.includes("@");

      let result;
      if (isEmail) {
        console.log("Attempting email login");
        result = await authClient.signIn.email({
          email: emailOrUsername,
          password: password,
        });
      } else {
        console.log("Attempting username login");
        result = await authClient.signIn.username({
          username: emailOrUsername,
          password: password,
        });
      }

      // console.log("Login result:", result);

      if (result.data?.user?.id) {
        console.log("Login successful, tracking last login...");

        // Update Last Login
        try {
          console.log("📤 Sending trackLogin request");
          const trackResponse = await axiosInstance.put(
            endpoints.user.trackLogin,
          );
          console.log(
            "✅ Last login tracked successfully:",
            trackResponse.data,
          );
        } catch (trackErr: any) {
          console.error("❌ Failed to track last login:", trackErr.message);
          if (trackErr.response) {
            console.error("❌ Response status:", trackErr.response.status);
            console.error("❌ Response data:", trackErr.response.data);
          }
        }

        // signIn() already stores the cookie synchronously via the expo client's
        // onSuccess hook, and useSession() will detect the change via $sessionSignal.
        // No need to poll getSession() — navigate immediately.
        await AuthStorage.markLoggedIn();
        router.replace("/user-dashboard");
        return;
      } else {
        console.error("Login failed:", result.error);
        toast.error(result.error?.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Login failed. Please try again.");
    }
  };

  const handleSignUp = () => {
    router.replace("/register");
  };

  const handleForgotPassword = () => {
    router.push("/resetPassword");
  };

  const handleSocialLogin = async (
    provider: "facebook" | "google" | "apple",
  ) => {
    // Prevent double-clicks while OAuth is in progress
    if (isSocialLoading) return;

    try {
      setIsSocialLoading(true);
      // TODO: Social Login Configuration Status
      // ✅ Google OAuth - Configured and working
      // ❌ Facebook Login - Needs configuration (see app/index.tsx for details)
      // ❌ Apple Sign-In - Needs configuration (see app/index.tsx for details)
      if (provider !== "google") {
        toast.info(
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in coming soon!`,
        );
        return;
      }

      // console.log(`Social login with ${provider}`);

      // Mark that user has logged in (so they see login screen on return, not landing)
      await AuthStorage.markLoggedIn();

      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/user-dashboard", // Converts to deuceleague://user-dashboard
      });

      // console.log("Social login result:", result);

      if (result.error) {
        console.error("Social login failed:", result.error);
        toast.error(
          result.error.message || "Social login failed. Please try again.",
        );
      }
      // Success handling is done via the callbackURL redirect
    } catch (error: any) {
      console.error("Social login error:", error);
      toast.error(error.message || "Social login failed. Please try again.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onSignUp={handleSignUp}
      onForgotPassword={handleForgotPassword}
      onSocialLogin={handleSocialLogin}
    />
  );
}
