import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function LoginScreen() {
  const [idInput, setIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const theme = useColorScheme() ?? 'light';
  const { setAuth, syncData } = usePatientStore();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!idInput || !pinInput) {
      setError('Please enter both Patient ID and PIN Code.');
      return;
    }

    setIsLoading(true);
    try {
      // Save credentials to the MMKV offline store
      setAuth(parseInt(idInput, 10), pinInput);
      
      // Trigger initial sync to pull down the medication schedule
      await syncData();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err) {
      setError('Failed to connect. Please check your credentials and internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container} variant="background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol name="cross.case.fill" size={48} color={Colors[theme].tint} />
          </View>
          <ThemedText type="title" style={styles.title}>MedRemind</ThemedText>
          <ThemedText type="default" style={styles.subtitle}>Patient Device Setup</ThemedText>
        </View>

        <ThemedView variant="cardBg" style={styles.card}>
          {error ? (
            <ThemedText type="default" style={styles.errorText}>{error}</ThemedText>
          ) : null}

          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">Patient ID</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[theme].border, color: Colors[theme].text }]}
              placeholder="e.g. 1"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={idInput}
              onChangeText={setIdInput}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">PIN Code</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: Colors[theme].border, color: Colors[theme].text }]}
              placeholder="4-digit PIN"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              secureTextEntry
              value={pinInput}
              onChangeText={setPinInput}
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: Colors[theme].tint }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.buttonText}>Connect Device</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
        
        <ThemedText style={styles.footerText}>
          Ask your family member or caregiver for your connection details.
        </ThemedText>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    padding: Layout.gutter,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 18,
  },
  card: {
    padding: 24,
    borderRadius: Layout.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 2,
    borderRadius: Layout.borderRadius,
    padding: 16,
    fontSize: 18,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  button: {
    height: 56,
    borderRadius: Layout.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footerText: {
    textAlign: 'center',
    color: '#9ca3af',
    marginTop: 32,
    paddingHorizontal: 20,
  }
});