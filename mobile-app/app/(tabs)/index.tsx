import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore, Medication, Schedule } from '@/store/patientStore';
import { ttsService, SupportedLanguage } from '@/services/ttsService';

function MedicationCard({
  medication,
  schedule,
  theme,
  onTaken,
  onSkip,
  onPlayAudio,
}: {
  medication: Medication;
  schedule: Schedule;
  theme: 'light' | 'dark';
  onTaken: () => void;
  onSkip: () => void;
  onPlayAudio: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ThemedView variant="cardBg" style={styles.card}>
      {/* Audio button */}
      <TouchableOpacity
        style={[styles.audioButton, { backgroundColor: Colors[theme].tint + '18' }]}
        onPress={onPlayAudio}
        accessibilityLabel="Replay voice reminder"
        accessibilityRole="button"
      >
        <IconSymbol name="speaker.wave.3.fill" size={28} color={Colors[theme].tint} />
        <ThemedText type="defaultSemiBold" style={[styles.audioLabel, { color: Colors[theme].tint }]}>
          {t('playAudio')}
        </ThemedText>
      </TouchableOpacity>

      {/* Medication info */}
      <ThemedText type="title" style={styles.medName}>
        {medication.name}
      </ThemedText>
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: Colors[theme].tint + '18' }]}>
          <IconSymbol name="pills.fill" size={14} color={Colors[theme].tint} />
          <ThemedText type="default" style={[styles.badgeText, { color: Colors[theme].tint }]}>
            {medication.dosage}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: Colors[theme].warningBg }]}>
          <IconSymbol name="clock.fill" size={14} color={Colors[theme].warning} />
          <ThemedText type="default" style={[styles.badgeText, { color: Colors[theme].warning }]}>
            {schedule.scheduled_time}
          </ThemedText>
        </View>
      </View>

      {medication.instructions ? (
        <ThemedText type="default" style={[styles.instructions, { color: Colors[theme].icon }]}>
          {medication.instructions}
        </ThemedText>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[theme].success }]}
          onPress={onTaken}
          activeOpacity={0.8}
          accessibilityLabel="Mark medication as taken"
          accessibilityRole="button"
        >
          <IconSymbol name="checkmark" size={20} color="#fff" />
          <ThemedText type="action" style={styles.buttonText}>
            {t('taken')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[theme].danger }]}
          onPress={onSkip}
          activeOpacity={0.8}
          accessibilityLabel="Skip medication"
          accessibilityRole="button"
        >
          <IconSymbol name="xmark" size={20} color="#fff" />
          <ThemedText type="action" style={styles.buttonText}>
            {t('skip')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

export default function PatientMainScreen() {
  const theme = useColorScheme() ?? 'light';
  const { t, i18n } = useTranslation();
  const { medications, syncData, markDose } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncData();
    setRefreshing(false);
  };

  // Build a flat list of (medication, schedule) pairs — one card per schedule slot
  const pendingItems: { medication: Medication; schedule: Schedule }[] = [];
  for (const med of medications) {
    for (const sched of med.schedules ?? []) {
      pendingItems.push({ medication: med, schedule: sched });
    }
  }

  const handleTaken = (scheduleId: number, medName: string) => {
    markDose(scheduleId, 'taken');
    ttsService.stop();
  };

  const handleSkip = (scheduleId: number) => {
    markDose(scheduleId, 'skipped');
    ttsService.stop();
  };

  const handlePlayAudio = (med: Medication) => {
    const lang = i18n.language as SupportedLanguage;
    ttsService.playMedicationReminder(med.name, med.dosage, lang);
  };

  // Auto-play first medication reminder on load
  useEffect(() => {
    if (pendingItems.length > 0) {
      handlePlayAudio(pendingItems[0].medication);
    }
    return () => ttsService.stop();
  }, [medications, i18n.language]);

  // Empty state
  if (pendingItems.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.centerAll]} variant="background">
        <IconSymbol name="checkmark.seal.fill" size={64} color={Colors[theme].success} />
        <ThemedText type="title" style={styles.emptyTitle}>
          {t('allCaughtUp')}
        </ThemedText>
        <ThemedText type="default" style={[styles.emptySubtitle, { color: Colors[theme].icon }]}>
          {t('noPending')}
        </ThemedText>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: Colors[theme].tint }]}
          onPress={onRefresh}
        >
          <IconSymbol name="arrow.clockwise" size={18} color={Colors[theme].tint} />
          <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint }}>
            {t('refresh')}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} variant="background">
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">{t('goodMorning')}</ThemedText>
        <ThemedText type="default" style={{ color: Colors[theme].icon }}>
          {t('timeForMedication')} ({pendingItems.length})
        </ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors[theme].tint}
          />
        }
      >
        {pendingItems.map(({ medication, schedule }) => (
          <MedicationCard
            key={`${medication.id}-${schedule.id}`}
            medication={medication}
            schedule={schedule}
            theme={theme}
            onTaken={() => handleTaken(schedule.id, medication.name)}
            onSkip={() => handleSkip(schedule.id)}
            onPlayAudio={() => handlePlayAudio(medication)}
          />
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.gutter,
  },
  centerAll: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  listContent: {
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: Layout.borderRadius,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 16,
    borderRadius: Layout.borderRadius,
  },
  audioLabel: {
    fontSize: 15,
  },
  medName: {
    textAlign: 'center',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actionContainer: {
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    height: Layout.buttonHeight,
    borderRadius: Layout.borderRadius,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
  },
  emptyTitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Layout.borderRadius,
    borderWidth: 2,
  },
});
