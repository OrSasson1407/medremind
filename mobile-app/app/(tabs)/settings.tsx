import React from 'react';
import { StyleSheet, TouchableOpacity, View, I18nManager, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Layout, Colors } from '@/constants/theme';
import { storage } from '@/store/storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const theme = useColorScheme() ?? 'light';
  const logout = usePatientStore((s) => s.logout);  // ✅ new

  const changeLanguage = async (lng: 'en' | 'he' | 'ar') => {
    await storage.set('app-language', lng);          // ✅ await fix
    await i18n.changeLanguage(lng);

    const isRTL = lng === 'he' || lng === 'ar';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      await Updates.reloadAsync();
    }
  };

  // ✅ new
  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  const LangButton = ({ code, label }: { code: 'en' | 'he' | 'ar'; label: string }) => {
    const isActive = i18n.language === code;
    return (
      <TouchableOpacity
        style={[
          styles.langButton,
          {
            borderColor: isActive ? Colors[theme].tint : Colors[theme].border,
            backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
          },
        ]}
        onPress={() => changeLanguage(code)}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <ThemedText
          type="defaultSemiBold"
          style={{ color: isActive ? Colors[theme].tint : Colors[theme].text }}
        >
          {label}
        </ThemedText>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container} variant="background">
      <View style={styles.header}>
        <ThemedText type="title">{t('settings')}</ThemedText>
      </View>

      {/* Language Card */}
      <ThemedView variant="cardBg" style={styles.card}>
        <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
          {t('language')}
        </ThemedText>
        <ThemedText type="default" style={{ marginBottom: 24, color: '#6b7280' }}>
          {t('selectLanguage')}
        </ThemedText>

        <View style={styles.options}>
          <LangButton code="he" label="עברית (Hebrew)" />
          <LangButton code="ar" label="العربية (Arabic)" />
          <LangButton code="en" label="English" />
        </View>
      </ThemedView>

      {/* ✅ Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: Colors[theme].danger }]}
        onPress={handleLogout}
        accessibilityRole="button"
      >
        <ThemedText type="defaultSemiBold" style={[styles.logoutText, { color: Colors[theme].danger }]}>
          {t('logout')}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Layout.gutter, justifyContent: 'center' },
  header: { marginBottom: 32, alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start' },
  card: {
    borderRadius: Layout.borderRadius,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 16,
  },
  options: { gap: 12 },
  langButton: { padding: 16, borderRadius: Layout.borderRadius, borderWidth: 2, alignItems: 'center' },
  logoutButton: {
    marginTop: 8,
    padding: 16,
    borderRadius: Layout.borderRadius,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: { color: '#ef4444' },
});