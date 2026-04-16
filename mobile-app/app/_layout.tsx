import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import '../i18n'; // Initializes translations on boot

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { patientId } = usePatientStore();
  const segments = useSegments();
  const router = useRouter();

  // The Bouncer logic: protects the (tabs) from unauthenticated users
  useEffect(() => {
    // Check if the user is currently on the login screen
    const inAuthGroup = segments[0] === 'login';

    if (!patientId && !inAuthGroup) {
      // No ID found and not on the login page -> Redirect to login
      router.replace('/login');
    } else if (patientId && inAuthGroup) {
      // ID found but still on the login page -> Redirect to main app
      router.replace('/(tabs)');
    }
  }, [patientId, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Registration of the login and main tab routes */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}