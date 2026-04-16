import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { storage } from '../store/storage';
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
  const [ready, setReady] = useState(false);

  // ✅ Hydrate storage cache FIRST, then load i18n
  useEffect(() => {
    storage.hydrate().then(() => {
      require('../i18n');   // dynamic import — runs after storage is ready
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inAuthGroup = segments[0] === 'login';
    if (!patientId && !inAuthGroup) {
      router.replace('/login');
    } else if (patientId && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [patientId, segments, ready]);

  // ✅ Show spinner until hydration is complete
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}