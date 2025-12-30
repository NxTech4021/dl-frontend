import { useColorScheme } from '@/hooks/useColorScheme';
import { useSession } from '@/lib/auth-client';
import { socketService } from '@/lib/socket-service';
import { useChatStore } from '@/src/features/chat/stores/ChatStore';
import { NavigationInterceptor } from '@core/navigation/NavigationInterceptor';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { Toaster } from 'sonner-native';
import { usePushNotifications } from '@/src/hooks/usePushNotifications';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { data: session } = useSession();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize push notifications (auto-registers when user is authenticated)
  usePushNotifications();

  // Initialize socket connection and load threads when user is authenticated
  useEffect(() => {
    const initSocket = async () => {
      if (session?.user?.id) {
        console.log('🔌 RootLayout: User authenticated, initializing socket connection...');
        try {
          await socketService.connect();
          console.log('✅ RootLayout: Socket connection initialized');

          // Load threads early so useChatSocketEvents can join rooms
          // This ensures real-time updates work from app startup
          const { loadThreads } = useChatStore.getState();
          await loadThreads(session.user.id);
          console.log('✅ RootLayout: Threads loaded for real-time updates');
        } catch (error) {
          console.error('❌ RootLayout: Failed to initialize socket:', error);
        }
      } else {
        console.log('👤 RootLayout: No user session, skipping socket initialization');
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (session?.user?.id) {
        console.log('🔌 RootLayout: Disconnecting socket on unmount');
        socketService.disconnect();
      }
    };
  }, [session?.user?.id]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
        <BottomSheetModalProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <NavigationInterceptor>
            <Stack
            screenOptions={{
              gestureEnabled: true,
              headerShown: false,
              presentation: 'card',
            }}
          >
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="dev" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="resetPassword" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="verifyEmail" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="onboarding" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
          }} 
        />
        <Stack.Screen 
          name="user-dashboard" 
          options={{ 
            headerShown: false,
            gestureEnabled: false,
            animation: 'none',
          }} 
        />
        <Stack.Screen 
          name="profile" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="edit-profile" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
            gestureEnabled: true,
          }} 
        />
        <Stack.Screen
          name="match-history"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen name="+not-found" />
        </Stack>
            </NavigationInterceptor>
            <StatusBar style="auto" />
            <Toaster />
          </ThemeProvider>
        </BottomSheetModalProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}