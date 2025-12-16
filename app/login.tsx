import { authClient } from "@/lib/auth-client";
import axiosInstance, { endpoints } from "@/lib/endpoints";
import { LoginScreen } from "@/src/features/auth/screens/LoginScreen";
import { useRouter, useNavigation } from "expo-router";
import React, { useEffect } from "react";
import { toast } from "sonner-native";
import { useSession } from "@/lib/auth-client";

export default function LoginRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const { data: session } = useSession();

  // Disable gesture navigation when user is unauthenticated (after logout)
  // This prevents users from swiping back to protected pages
  useEffect(() => {
    if (!session?.user) {
      navigation.setOptions({
        gestureEnabled: false,
      });
    } else {
      navigation.setOptions({
        gestureEnabled: true,
      });
    }
  }, [session?.user, navigation]);

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

      console.log("Login result:", result);

      if (result.data?.user?.id) {
        console.log("Login successful, tracking last login...");

        // Update Last Login
        try {
          console.log("📤 Sending trackLogin request");
          const trackResponse = await axiosInstance.put(endpoints.user.trackLogin);
          console.log("✅ Last login tracked successfully:", trackResponse.data);
        } catch (trackErr: any) {
          console.error("❌ Failed to track last login:", trackErr.message);
          if (trackErr.response) {
            console.error("❌ Response status:", trackErr.response.status);
            console.error("❌ Response data:", trackErr.response.data);
          }
        }

        // Wait a moment for session to be established in SecureStore
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Confirm session is saved
        const sessionCheck = await authClient.getSession();
        console.log("Session after login:", sessionCheck);

        if (sessionCheck.data) {
          console.log("Session confirmed, redirecting to dashboard");
          router.replace("/user-dashboard");
        } else {
          console.error("Session not established after login");
          toast.error("Session not established. Please try again.");
        }
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
    router.push("/register");
  };

  const handleForgotPassword = () => {
    router.push("/resetPassword");
  };

  const handleSocialLogin = (provider: "facebook" | "google" | "apple") => {
    console.log(`Social login with ${provider} - not implemented yet`);
    // TODO: Implement social login functionality
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
