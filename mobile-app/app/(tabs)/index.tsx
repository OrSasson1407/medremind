import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore } from '@/store/patientStore';
import { ttsService, SupportedLanguage } from '@/services/ttsService';

export default function PatientMainScreen() {
  const theme = useColorScheme() ?? 'light';
  const { t, i18n } = useTranslation();
  const { medications, syncData, markDose } = usePatientStore();

  useEffect(() => {
    syncData();
  }, [syncData]);

  const activeMedication = medications.length > 0 ? medications[0] : null;
  const activeSchedule = activeMedication?.schedules?.length ? activeMedication.schedules[0] : null;

  const handleTaken = () => {
    if (activeSchedule) {
      markDose(activeSchedule.id, 'taken');
      ttsService.stop();
    }
  };

  const handleSkip = () => {
    if (activeSchedule) {
      markDose(activeSchedule.id, 'skipped');
      ttsService.stop();
    }
  };

  const playReminderAudio = () => {
    if (activeMedication) {
      // Pass the current active language to the Text-to-Speech service
      const currentLang = i18n.language as SupportedLanguage;
      ttsService.playMedicationReminder(activeMedication.name, activeMedication.dosage, currentLang);
    }
  };

  useEffect(() => {
    if (activeMedication) {
      playReminderAudio();
    }
    return () => ttsService.stop();
  }, [activeMedication, i18n.language]);

  if (!activeMedication || !activeSchedule) {
    return (
      <ThemedView style={[styles.container, styles.centerAll]} variant="background">
        <ThemedText type="title" style={{ textAlign: 'center', marginBottom: 16 }}>{t('allCaughtUp')}</ThemedText>
        <ThemedText type="default" style={{ textAlign: 'center' }}>{t('noPending')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} variant="background">
      <View style={styles.header}>
        <ThemedText type="title">{t('goodMorning')}</ThemedText>
        <ThemedText type="default">{t('timeForMedication')}</ThemedText>
      </View>

      <ThemedView variant="cardBg" style={styles.card}>
        
        <TouchableOpacity 
          style={styles.audioButton}
          onPress={playReminderAudio}
          accessibilityLabel="Replay voice reminder"
          accessibilityRole="button"
        >
          <IconSymbol name="speaker.wave.3.fill" size={32} color={Colors[theme].tint} />
          <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint, marginTop: 4 }}>
            {t('playAudio')}
          </ThemedText>
        </TouchableOpacity>

        <ThemedText type="title" style={styles.medName}>
          {activeMedication.name}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.medDetails}>
          {activeMedication.dosage} • {activeSchedule.scheduled_time}
        </ThemedText>
        
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors[theme].success }]}
            onPress={handleTaken}
            activeOpacity={0.8}
            accessibilityLabel="Mark medication as taken"
            accessibilityRole="button"
          >
            <ThemedText type="action" style={styles.buttonText}>
              {t('taken')}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors[theme].danger }]}
            onPress={handleSkip}
            activeOpacity={0.8}
            accessibilityLabel="Skip medication"
            accessibilityRole="button"
          >
            <ThemedText type="action" style={styles.buttonText}>
              {t('skip')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.gutter,
    justifyContent: 'center',
  },
  centerAll: {
    alignItems: 'center',
  },
  header: {
    marginBottom: 32,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
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
  },
  audioButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderRadius: Layout.borderRadius,
  },
  medName: {
    textAlign: 'center',
    marginBottom: 8,
  },
  medDetails: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 32,
  },
  actionContainer: {
    gap: 16, 
  },
  actionButton: {
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
  },
});