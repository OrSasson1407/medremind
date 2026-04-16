import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState, useRef } from 'react';
import { 
  View, 
  ActivityIndicator, 
  AppState, 
  Modal, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { storage } from '../store/storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Layout } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

export const unstable_settings = {
  anchor: '(tabs)',
};

const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const { patientId, pinCode } = usePatientStore();
  const segments = useSegments();
  const router = useRouter();
  const { t } = useTranslation();
  
  const [ready, setReady] = useState(false);
  
  // Auto-lock state
  const [isLocked, setIsLocked] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVisible, setPinVisible] = useState(false);
  const backgroundTime = useRef<number | null>(null);

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

  // ✅ AppState listener for 5-minute auto-lock
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!backgroundTime.current) {
          backgroundTime.current = Date.now();
        }
      } else if (nextAppState === 'active') {
        if (patientId && backgroundTime.current && Date.now() - backgroundTime.current > LOCK_TIMEOUT_MS) {
          setIsLocked(true);
          handleBiometricAuth();
        }
        backgroundTime.current = null;
      }
    });

    return () => subscription.remove();
  }, [patientId]);

  const handleBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('unlockApp'),
        fallbackLabel: t('usePin'),
      });
      
      if (result.success) {
        unlock();
      }
    }
  };

  const handlePinUnlock = () => {
    if (inputPin === pinCode) {
      unlock();
    } else {
      setPinError(t('incorrectPin'));
    }
  };

  const unlock = () => {
    setIsLocked(false);
    setInputPin('');
    setPinError('');
  };

  // ✅ Show spinner until hydration is complete
  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const inputBorderColor = (hasValue: boolean) =>
    hasValue ? Colors[colorScheme].tint : Colors[colorScheme].border;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />

      {/* Global Lock Screen Overlay */}
      <Modal visible={isLocked} animationType="fade" transparent={false}>
        <ThemedView style={styles.lockContainer} variant="background">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            
            <View style={styles.lockHeader}>
              <View style={[styles.iconContainer, { backgroundColor: Colors[colorScheme].tint + '18' }]}>
                <IconSymbol name="lock.fill" size={48} color={Colors[colorScheme].tint} />
              </View>
              <ThemedText type="title" style={styles.title}>{t('unlockApp')}</ThemedText>
              <ThemedText type="default" style={[styles.subtitle, { color: Colors[colorScheme].icon }]}>
                {t('enterPinToUnlock')}
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              {pinError ? (
                <ThemedText style={[styles.errorText, { color: Colors[colorScheme].danger }]}>
                  {pinError}
                </ThemedText>
              ) : null}

              <View style={styles.pinRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.pinInput,
                    {
                      borderColor: inputBorderColor(inputPin.length > 0),
                      color: Colors[colorScheme].text,
                      backgroundColor: Colors[colorScheme].cardBg,
                    },
                  ]}
                  placeholder="****"
                  placeholderTextColor={Colors[colorScheme].icon}
                  keyboardType="number-pad"
                  secureTextEntry={!pinVisible}
                  value={inputPin}
                  onChangeText={(v) => { setInputPin(v); setPinError(''); }}
                  returnKeyType="done"
                  onSubmitEditing={handlePinUnlock}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.eyeButton, { borderColor: Colors[colorScheme].border, backgroundColor: Colors[colorScheme].cardBg }]}
                  onPress={() => setPinVisible((v) => !v)}
                >
                  <IconSymbol name={pinVisible ? 'eye.slash.fill' : 'eye.fill'} size={22} color={Colors[colorScheme].icon} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]} onPress={handlePinUnlock}>
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                {t('unlock')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricAuth}>
              <IconSymbol name="faceid" size={24} color={Colors[colorScheme].tint} />
              <ThemedText type="defaultSemiBold" style={{ color: Colors[colorScheme].tint }}>
                {t('useBiometrics')}
              </ThemedText>
            </TouchableOpacity>

          </KeyboardAvoidingView>
        </ThemedView>
      </Modal>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    padding: Layout.gutter,
    justifyContent: 'center',
  },
  keyboardView: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  lockHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  pinInput: {
    flex: 1,
  },
  input: {
    borderWidth: 2,
    borderRadius: Layout.borderRadius,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  eyeButton: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
});