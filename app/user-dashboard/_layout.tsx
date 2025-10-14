import { Stack } from 'expo-router';
import { DashboardProvider } from '@features/dashboard-user';

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          gestureEnabled: true, // Re-enable swipe-back gesture
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="pickleball" />
        <Stack.Screen name="tennis" />
        <Stack.Screen name="category" options={{ title: 'League Category' }} />
        <Stack.Screen name="seasons" options={{ title: 'Seasons' }} />
      </Stack>
    </DashboardProvider>
  );
}



