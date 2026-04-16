import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/services/api'; // ✅ Import API

function validate(id: string, pin: string): string {
  if (!id.trim() || !pin.trim()) return 'Please enter both Patient ID and PIN.';
  if (isNaN(Number(id)) || Number(id) <= 0) return 'Patient ID must be a valid number.';
  if (pin.length < 4) return 'PIN must be at least 4 digits.';
  return '';
}

export default function LoginScreen() {
  const [idInput, setIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pinVisible, setPinVisible] = useState(false);

  const theme = useColorScheme() ?? 'light';
  const { setAuth, syncData } = usePatientStore();
  const router = useRouter();

  const handleLogin = async () => {
    const validationError = validate(idInput, pinInput);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // ✅ The True Verification: Check the PIN against the database FIRST
      await api.post('/patients/mobile-sync', { 
        patient_id: parseInt(idInput, 10), 
        pin_code: pinInput 
      });

      // If successful, save credentials locally and sync
      setAuth(parseInt(idInput, 10), pinInput);
      await syncData();
      router.replace('/(tabs)');
      
    } catch (err: any) {
      // ✅ Block access if the PIN or ID doesn't match the database
      if (err.response?.status === 403 || err.response?.status === 404) {
        setError('Invalid Patient ID or PIN code. Please try again.');
      } else {
        setError('Network error. First-time setup requires an internet connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputBorderColor = (hasValue: boolean) =>
    hasValue ? Colors[theme].tint : Colors[theme].border;

  return (
    <ThemedView style={styles.container} variant="background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: Colors[theme].tint + '18' }]}>
              <IconSymbol name="cross.case.fill" size={48} color={Colors[theme].tint} />
            </View>
            <ThemedText type="title" style={styles.title}>MedRemind</ThemedText>
            <ThemedText type="default" style={[styles.subtitle, { color: Colors[theme].icon }]}>
              Patient Device Setup
            </ThemedText>
          </View>

          {/* Card */}
          <ThemedView variant="cardBg" style={styles.card}>

            {/* Error banner */}
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: Colors[theme].dangerBg }]}>
                <IconSymbol name="exclamationmark.triangle.fill" size={18} color={Colors[theme].danger} />
                <ThemedText type="default" style={[styles.errorText, { color: Colors[theme].danger }]}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            {/* Patient ID */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Patient ID</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: inputBorderColor(idInput.length > 0),
                    color: Colors[theme].text,
                    backgroundColor: Colors[theme].cardBg,
                  },
                ]}
                placeholder="e.g. 1"
                placeholderTextColor={Colors[theme].icon}
                keyboardType="number-pad"
                value={idInput}
                onChangeText={(v) => { setIdInput(v); setError(''); }}
                editable={!isLoading}
                returnKeyType="next"
                accessibilityLabel="Patient ID input"
              />
            </View>

            {/* PIN Code */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold" style={styles.label}>PIN Code</ThemedText>
              <View style={styles.pinRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.pinInput,
                    {
                      borderColor: inputBorderColor(pinInput.length > 0),
                      color: Colors[theme].text,
                      backgroundColor: Colors[theme].cardBg,
                    },
                  ]}
                  placeholder="4-digit PIN"
                  placeholderTextColor={Colors[theme].icon}
                  keyboardType="number-pad"
                  secureTextEntry={!pinVisible}
                  value={pinInput}
                  onChangeText={(v) => { setPinInput(v); setError(''); }}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  accessibilityLabel="PIN code input"
                />
                <TouchableOpacity
                  style={[styles.eyeButton, { borderColor: Colors[theme].border, backgroundColor: Colors[theme].cardBg }]}
                  onPress={() => setPinVisible((v) => !v)}
                  accessibilityLabel={pinVisible ? 'Hide PIN' : 'Show PIN'}
                >
                  <IconSymbol
                    name={pinVisible ? 'eye.slash.fill' : 'eye.fill'}
                    size={22}
                    color={Colors[theme].icon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: Colors[theme].tint },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Connect device"
            >
             {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText type="defaultSemiBold" style={styles.buttonText}>
                  Connect Device
                </ThemedText> 
              )}
            </TouchableOpacity>
          </ThemedView>

          {/* Footer */}
          <ThemedText style={[styles.footerText, { color: Colors[theme].icon }]}>
            Ask your family member or caregiver for your connection details.
          </ThemedText>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Layout.gutter,
    justifyContent: 'center',
  },
  header: {
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
    fontSize: 34,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 17,
  },
  card: {
    padding: 24,
    borderRadius: Layout.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 15,
  },
  input: {
    borderWidth: 2,
    borderRadius: Layout.borderRadius,
    padding: 16,
    fontSize: 18,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  pinInput: {
    flex: 1,
  },
  eyeButton: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 28,
    paddingHorizontal: 20,
    fontSize: 14,
    lineHeight: 20,
  },
});