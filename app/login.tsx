import { authClient } from "@/lib/auth-client";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { signInWithNativeOAuth } from "@/lib/native-social-auth";
import { getPostAuthRoute } from "@/lib/post-auth-route";
import { AuthStorage } from "@/src/core/storage";
import { LoginScreen } from "@/src/features/auth/screens/LoginScreen";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { toast } from "sonner-native";

export default function LoginRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const { from } = useLocalSearchParams<{ from?: string }>();

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
      if (__DEV__) console.log("Login attempt with:", emailOrUsername);

      const isEmail = emailOrUsername.includes("@");

      let result;
      if (isEmail) {
        if (__DEV__) console.log("Attempting email login");
        result = await authClient.signIn.email({
          email: emailOrUsername,
          password: password,
        });
      } else {
        if (__DEV__) console.log("Attempting username login");
        result = await authClient.signIn.username({
          username: emailOrUsername,
          password: password,
        });
      }

      // console.log("Login result:", result);

      if (result.data?.user?.id) {
        if (__DEV__) console.log("Login successful, tracking last login...");

        // Update Last Login
        try {
          if (__DEV__) console.log("📤 Sending trackLogin request");
          const trackResponse = await axiosInstance.put(
            endpoints.user.trackLogin,
          );
          if (__DEV__) console.log("✅ Last login tracked successfully:", trackResponse.data);
        } catch (trackErr: any) {
          if (__DEV__) {
            console.error("❌ Failed to track last login:", trackErr.message);
            if (trackErr.response) {
              console.error("❌ Response status:", trackErr.response.status);
              console.error("❌ Response data:", trackErr.response.data);
            }
          }
        }

        // signIn() already stores the cookie synchronously via the expo client's
        // onSuccess hook, and useSession() will detect the change via $sessionSignal.
        await AuthStorage.markLoggedIn();

        // Fetch the real onboarding status so we navigate directly to the correct
        // route without any flash (the auth signIn response lacks completedOnboarding).
        let nextRoute = getPostAuthRoute({ user: result.data.user as any });
        try {
          const onboardingRes = await axiosInstance.get(
            `/api/onboarding/status/${result.data.user.id}?t=${Date.now()}`,
          );
          const onboardingData = onboardingRes.data?.data || onboardingRes.data;
          if (onboardingData?.completedOnboarding) {
            nextRoute = "/user-dashboard";
          }
        } catch {
          // Non-critical — fall back to the route derived from the session user
        }

        router.replace(nextRoute as any);
        return;
      } else {
        if (__DEV__) console.error("Login failed:", result.error);
        const errorMsg = result.error?.message?.toLowerCase() || "";
        const errorStatus = (result.error as any)?.status;

        // Unverified email — redirect to verification screen
        // better-auth code: EMAIL_NOT_VERIFIED → "Email not verified"
        if (errorMsg.includes("email not verified") || errorMsg.includes("not verified") || errorMsg.includes("email verification")) {
          toast.error("Email not verified", {
            description: "Please check your inbox for the verification link before logging in.",
          });
          router.push({ pathname: "/verifyEmail", params: { email: emailOrUsername, source: "login" } } as any);
          return;
        }

        // Rate limiting
        if (errorMsg.includes("too many") || errorStatus === 429) {
          toast.error("Too many login attempts", {
            description: "You've been temporarily locked out. Please wait a few minutes before trying again.",
          });
          return;
        }

        // Wrong credentials
        // better-auth email plugin:    INVALID_EMAIL_OR_PASSWORD    → "Invalid email or password"
        // better-auth username plugin: INVALID_USERNAME_OR_PASSWORD → "Invalid username or password"
        // INVALID_PASSWORD                                          → "Invalid password"
        // CREDENTIAL_ACCOUNT_NOT_FOUND                             → "Credential account not found"
        // All of these (plus 401) mean the same thing to the user: wrong login details
        if (
          errorMsg.includes("invalid email or password") ||
          errorMsg.includes("invalid username or password") ||
          errorMsg.includes("invalid password") ||
          errorMsg.includes("credential account not found") ||
          errorMsg.includes("invalid credentials") ||
          errorStatus === 401
        ) {
          toast.error("Incorrect credentials", {
            description: "The email/username or password you entered is incorrect. Please double-check and try again.",
          });
          return;
        }

        // Account not found — better-auth code: USER_NOT_FOUND → "User not found"
        if (
          errorMsg.includes("user not found") ||
          errorMsg.includes("account not found") ||
          errorMsg.includes("no account") ||
          errorMsg.includes("does not exist")
        ) {
          toast.error("Account not found", {
            description: "We couldn't find an account with that email or username. Please check for typos or sign up.",
          });
          return;
        }

        // Session / token errors
        if (errorMsg.includes("session expired") || errorMsg.includes("invalid token")) {
          toast.error("Session expired", {
            description: "Your session has expired. Please log in again.",
          });
          return;
        }

        // Account suspended / blocked
        if (errorMsg.includes("suspended") || errorMsg.includes("banned") || errorMsg.includes("blocked")) {
          toast.error("Account suspended", {
            description: "Your account has been suspended. Please contact support for assistance.",
          });
          return;
        }

        // Fallback — surface the raw better-auth message
        toast.error("Login failed", {
          description: result.error?.message || "Unable to log in. Please check your credentials and try again.",
        });
      }
    } catch (error: any) {
      if (__DEV__) console.error("Login failed:", error);
      
      const errorMsg = error?.message?.toLowerCase() || "";
      const status = error?.status;
      const isNetworkError =
        errorMsg.includes("network") ||
        errorMsg.includes("fetch") ||
        errorMsg.includes("failed to connect") ||
        errorMsg.includes("econnrefused") ||
        errorMsg.includes("connection");
      
      if (isNetworkError || status === "failed to connect" || status === "ECONNREFUSED") {
        toast.error("Unable to connect to server", {
          description: "Please check your internet connection and try again.",
        });
        return;
      }
      
      if (status === 500 || status === "internal server error") {
        toast.error("Server error", {
          description: "We're having trouble logging you in. Please try again in a few minutes.",
        });
        return;
      }
      
      if (status === 0 || !status) {
        toast.error("Unable to connect to server", {
          description: "Please check your internet connection.",
        });
        return;
      }

      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      });
    }
  };

  const handleSignUp = () => {
    router.replace("/register");
  };

  const handleForgotPassword = () => {
    router.push("/resetPassword");
  };

  const handleSocialLogin = async (
    provider: "google" | "apple",
  ) => {
    // signInWithNativeOAuth handles all errors internally and returns null on failure
    const result = await signInWithNativeOAuth(provider);
    if (result) {
      router.replace(result.nextRoute);
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
