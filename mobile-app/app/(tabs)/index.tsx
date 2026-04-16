import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  I18nManager,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNetInfo } from '@react-native-community/netinfo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore, Medication, Schedule } from '@/store/patientStore';
import { ttsService, SupportedLanguage } from '@/services/ttsService';

// Helper to map medication type to an icon name
const getMedicationIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'pill':
      return 'circle.fill';
    case 'liquid':
      return 'drop.fill';
    case 'syringe':
      return 'syringe.fill';
    case 'capsule':
    default:
      return 'pills.fill';
  }
};

function MedicationCard({
  medication,
  schedule,
  theme,
  onTaken,
  onSkip,
  onPlayAudio,
  isA11y, // ✅ Passed down from parent for scaling
}: {
  medication: Medication;
  schedule: Schedule;
  theme: 'light' | 'dark';
  onTaken: () => void;
  onSkip: () => void;
  onPlayAudio: () => void;
  isA11y: boolean;
}) {
  const { t } = useTranslation();
  
  // Use the specific medication color or default to the app's tint color
  const medColor = medication.color || Colors[theme].tint;
  
  // ✅ Calculate dynamic scale factor
  const scale = isA11y ? 1.3 : 1;

  return (
    <ThemedView variant="cardBg" style={styles.card}>
      {/* Visual Pill Identifier */}
      <View style={styles.visualIdentifierContainer}>
        <View style={[styles.iconCircle, { backgroundColor: medColor + (isA11y ? '30' : '20'), transform: [{ scale: isA11y ? 1.1 : 1 }] }]}>
          <IconSymbol name={getMedicationIcon(medication.type)} size={42 * scale} color={medColor} />
        </View>
      </View>

      {/* Audio button */}
      <TouchableOpacity
        style={[styles.audioButton, { backgroundColor: Colors[theme].tint + '18', padding: 12 * scale }]}
        onPress={onPlayAudio}
        accessibilityLabel="Replay voice reminder"
        accessibilityRole="button"
      >
        <IconSymbol name="speaker.wave.3.fill" size={28 * scale} color={Colors[theme].tint} />
        <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint, fontSize: 15 * scale }}>
          {t('playAudio')}
        </ThemedText>
      </TouchableOpacity>

      {/* Medication info */}
      <ThemedText type="title" style={[styles.medName, { fontSize: 28 * scale }]}>
        {medication.name}
      </ThemedText>
      
      <View style={styles.metaRow}>
        <View style={[styles.badge, { backgroundColor: Colors[theme].tint + '18', paddingVertical: 5 * scale, paddingHorizontal: 10 * scale }]}>
          <IconSymbol name="pills.fill" size={14 * scale} color={Colors[theme].tint} />
          <ThemedText type="default" style={{ color: Colors[theme].tint, fontSize: 14 * scale, fontWeight: '600' }}>
            {medication.dosage}
          </ThemedText>
        </View>
        <View style={[styles.badge, { backgroundColor: Colors[theme].warningBg, paddingVertical: 5 * scale, paddingHorizontal: 10 * scale }]}>
          <IconSymbol name="clock.fill" size={14 * scale} color={Colors[theme].warning} />
          <ThemedText type="default" style={{ color: Colors[theme].warning, fontSize: 14 * scale, fontWeight: '600' }}>
            {schedule.scheduled_time}
          </ThemedText>
        </View>
      </View>

      {medication.instructions ? (
        <ThemedText type="default" style={[styles.instructions, { color: Colors[theme].icon, fontSize: 14 * scale }]}>
          {medication.instructions}
        </ThemedText>
      ) : null}

      {/* Action buttons */}
      <View style={[styles.actionContainer, { gap: 12 * scale }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[theme].success, height: Layout.buttonHeight * scale }]}
          onPress={onTaken}
          activeOpacity={0.8}
          accessibilityLabel="Mark medication as taken"
          accessibilityRole="button"
        >
          <IconSymbol name="checkmark" size={20 * scale} color="#fff" />
          <ThemedText type="action" style={{ color: '#fff', fontSize: 16 * scale }}>
            {t('taken')}
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: Colors[theme].danger, height: Layout.buttonHeight * scale }]}
          onPress={onSkip}
          activeOpacity={0.8}
          accessibilityLabel="Skip medication"
          accessibilityRole="button"
        >
          <IconSymbol name="xmark" size={20 * scale} color="#fff" />
          <ThemedText type="action" style={{ color: '#fff', fontSize: 16 * scale }}>
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
  
  // ✅ Pulled in currentStreak for gamification badge
  const { medications, pendingLogs, caregiverPhone, isAccessibilityMode, currentStreak, syncData, markDose, undoDose } = usePatientStore();
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ Calculate global scale based on accessibility mode
  const scale = isAccessibilityMode ? 1.3 : 1;

  // Network State
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  // Modal States
  const [skipScheduleId, setSkipScheduleId] = useState<number | null>(null);
  const [sosModalVisible, setSosModalVisible] = useState(false);

  // Undo Toast Animation State
  const [toastText, setToastText] = useState('');
  const [toastType, setToastType] = useState<'success' | 'danger'>('success');
  const [lastActionId, setLastActionId] = useState<number | null>(null);
  
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(20)).current;
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    syncData();
  }, [syncData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncData();
    setRefreshing(false);
  };

  const getGreetingKey = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return 'goodMorning';
    if (currentHour < 18) return 'goodAfternoon';
    return 'goodEvening';
  };

  // Locally filter out pending actions for instant, smooth UI removal
  const pendingLogIds = new Set(pendingLogs.map((log) => log.dose_log_id));
  const pendingItems: { medication: Medication; schedule: Schedule }[] = [];
  
  for (const med of medications) {
    for (const sched of med.schedules ?? []) {
      if (!pendingLogIds.has(sched.id)) {
        pendingItems.push({ medication: med, schedule: sched });
      }
    }
  }

  // Toast Management
  const hideToast = (shouldSync: boolean = false) => {
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(toastTranslateY, { toValue: 20, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setLastActionId(null);
      if (shouldSync) syncData(); // Background sync executes after the undo window closes
    });
  };

  const showToast = (type: 'success' | 'danger', text: string, scheduleId: number) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);

    setToastType(type);
    setToastText(text);
    setLastActionId(scheduleId);
    
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(toastTranslateY, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start(() => {
      // 4-second Undo Window
      toastTimeout.current = setTimeout(() => {
        hideToast(true);
      }, 4000);
    });
  };

  const handleUndo = () => {
    if (lastActionId !== null) {
      undoDose(lastActionId);
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      hideToast(false); // Hide toast, do NOT sync to server
    }
  };

  const handleTaken = (scheduleId: number, medName: string) => {
    markDose(scheduleId, 'taken');
    ttsService.stop();
    showToast('success', `${medName} - ${t('taken')}`, scheduleId);
  };

  const handleSkipRequest = (scheduleId: number) => {
    setSkipScheduleId(scheduleId);
    ttsService.stop();
  };

  const confirmSkip = (reason: string) => {
    if (skipScheduleId !== null) {
      markDose(skipScheduleId, 'skipped', reason);
      showToast('danger', t('skip'), skipScheduleId);
      setSkipScheduleId(null);
    }
  };

  const executeCall = () => {
    const phoneToCall = caregiverPhone || '911';
    Linking.openURL(`tel:${phoneToCall}`).catch(err => console.error('Error opening dialer', err));
    setSosModalVisible(false);
  };

  const handlePlayAudio = (med: Medication) => {
    const lang = i18n.language as SupportedLanguage;
    ttsService.playMedicationReminder(med.name, med.dosage, lang);
  };

  useEffect(() => {
    // Only auto-play if there's no active undo toast showing
    if (pendingItems.length > 0 && (toastOpacity as any)._value === 0) {
      handlePlayAudio(pendingItems[0].medication);
    }
    return () => ttsService.stop();
  }, [medications, i18n.language]);

  // Shared Header Component
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTextContainer}>
        <ThemedText type="title" style={{ fontSize: 32 * scale }}>{t(getGreetingKey())}</ThemedText>
        <ThemedText type="default" style={{ color: Colors[theme].icon, fontSize: 16 * scale }}>
          {t('timeForMedication')} ({pendingItems.length})
        </ThemedText>

        {/* ✅ Gamification Streak Badge Component */}
        {currentStreak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: Colors[theme].tint + '18', paddingVertical: 4 * scale, marginTop: 8 * scale }]}>
            <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint, fontSize: 14 * scale }}>
              {t('perfectStreak', { count: currentStreak })}
            </ThemedText>
          </View>
        )}
      </View>
      <TouchableOpacity 
        style={[styles.sosButton, { backgroundColor: Colors[theme].dangerBg, padding: 8 * scale }]} 
        onPress={() => setSosModalVisible(true)}
        accessibilityLabel={t('emergencyContact')}
      >
        <IconSymbol name="phone.circle.fill" size={32 * scale} color={Colors[theme].danger} />
      </TouchableOpacity>
    </View>
  );

  if (pendingItems.length === 0) {
    return (
      <ThemedView style={styles.container} variant="background">
        {renderHeader()}

        <View style={styles.centerAll}>
          {isOffline && (
            <View style={[styles.offlineBanner, { backgroundColor: Colors[theme].warningBg, paddingVertical: 10 * scale }]}>
              <IconSymbol name="wifi.slash" size={16 * scale} color={Colors[theme].warning} />
              <ThemedText type="defaultSemiBold" style={[styles.offlineText, { color: Colors[theme].warning, fontSize: 14 * scale }]}>
                {t('offlineBanner')}
              </ThemedText>
            </View>
          )}
          <IconSymbol name="checkmark.seal.fill" size={64 * scale} color={Colors[theme].success} />
          <View style={styles.streakWinContainer}>
             <ThemedText type="title" style={[styles.emptyTitle, { fontSize: 24 * scale }]}>
               {t('allCaughtUp')}
             </ThemedText>
          </View>
          <ThemedText type="default" style={[styles.emptySubtitle, { color: Colors[theme].icon, fontSize: 16 * scale }]}>
            {t('noPending')}
          </ThemedText>
          <TouchableOpacity
            style={[styles.refreshButton, { borderColor: Colors[theme].tint, paddingVertical: 12 * scale }]}
            onPress={onRefresh}
          >
            <IconSymbol name="arrow.clockwise" size={18 * scale} color={Colors[theme].tint} />
            <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint, fontSize: 16 * scale }}>
              {t('refresh')}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Floating Toast specifically for when the list empties out so the user can still undo */}
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
              backgroundColor: toastType === 'success' ? Colors[theme].success : Colors[theme].danger,
              paddingVertical: 12 * scale,
            },
          ]}
        >
          <View style={styles.toastContent}>
            <IconSymbol name={toastType === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={24 * scale} color="#fff" />
            <ThemedText type="defaultSemiBold" style={[styles.toastText, { fontSize: 16 * scale }]}>{toastText}</ThemedText>
          </View>

          {lastActionId !== null && (
            <>
              <View style={styles.toastDivider} />
              <TouchableOpacity style={[styles.undoButton, { paddingVertical: 4 * scale }]} onPress={handleUndo} activeOpacity={0.7}>
                <IconSymbol name="arrow.uturn.backward" size={16 * scale} color="#fff" />
                <ThemedText type="defaultSemiBold" style={[styles.undoText, { fontSize: 15 * scale }]}>{t('undo')}</ThemedText>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        {/* SOS Confirmation Modal */}
        <Modal visible={sosModalVisible} transparent animationType="fade" onRequestClose={() => setSosModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setSosModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: Colors[theme].background, alignItems: 'center' }]}>
                  <IconSymbol name="phone.circle.fill" size={64 * scale} color={Colors[theme].danger} />
                  <ThemedText type="title" style={[styles.modalTitle, { marginTop: 16 * scale, marginBottom: 8 * scale, fontSize: 24 * scale }]}>
                    {t('emergencyContact')}
                  </ThemedText>
                  <ThemedText type="default" style={{ color: Colors[theme].icon, marginBottom: 24 * scale, textAlign: 'center', fontSize: 16 * scale }}>
                    {t('callCaregiver')}
                  </ThemedText>

                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: Colors[theme].danger, height: 60 * scale, width: '100%' }]} 
                    onPress={executeCall} 
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="phone.fill" size={24 * scale} color="#fff" />
                    <ThemedText type="defaultSemiBold" style={{ color: '#fff', fontSize: 18 * scale }}>{t('call')}</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.cancelButton, { height: 56 * scale }]} onPress={() => setSosModalVisible(false)} activeOpacity={0.8}>
                    <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].icon, fontSize: 16 * scale }}>{t('cancel')}</ThemedText>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} variant="background">
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: Colors[theme].warningBg, paddingVertical: 10 * scale }]}>
          <IconSymbol name="wifi.slash" size={16 * scale} color={Colors[theme].warning} />
          <ThemedText type="defaultSemiBold" style={[styles.offlineText, { color: Colors[theme].warning, fontSize: 14 * scale }]}>
            {t('offlineBanner')}
          </ThemedText>
        </View>
      )}

      {renderHeader()}

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
            isA11y={isAccessibilityMode} // ✅ Passed down for scaling
            onTaken={() => handleTaken(schedule.id, medication.name)}
            onSkip={() => handleSkipRequest(schedule.id)}
            onPlayAudio={() => handlePlayAudio(medication)}
          />
        ))}
      </ScrollView>

      {/* Interactive Undo Toast */}
      <Animated.View
        style={[
          styles.toastContainer,
          {
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
            backgroundColor: toastType === 'success' ? Colors[theme].success : Colors[theme].danger,
            paddingVertical: 12 * scale,
          },
        ]}
      >
        <View style={styles.toastContent}>
          <IconSymbol name={toastType === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={24 * scale} color="#fff" />
          <ThemedText type="defaultSemiBold" style={[styles.toastText, { fontSize: 16 * scale }]}>{toastText}</ThemedText>
        </View>

        {lastActionId !== null && (
          <>
            <View style={styles.toastDivider} />
            <TouchableOpacity style={[styles.undoButton, { paddingVertical: 4 * scale }]} onPress={handleUndo} activeOpacity={0.7}>
              <IconSymbol name="arrow.uturn.backward" size={16 * scale} color="#fff" />
              <ThemedText type="defaultSemiBold" style={[styles.undoText, { fontSize: 15 * scale }]}>{t('undo')}</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Bottom Sheet Skip Reason Modal */}
      <Modal
        visible={skipScheduleId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSkipScheduleId(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSkipScheduleId(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: Colors[theme].background }]}>
                <ThemedText type="title" style={[styles.modalTitle, { fontSize: 24 * scale }]}>
                  {t('skipReasonTitle')}
                </ThemedText>

                {['feelingSick', 'alreadyTookIt', 'sideEffects', 'otherReason'].map((reasonKey) => (
                  <TouchableOpacity
                    key={reasonKey}
                    style={[styles.reasonButton, { backgroundColor: Colors[theme].tint + '18', height: 56 * scale }]}
                    onPress={() => confirmSkip(t(reasonKey))}
                    activeOpacity={0.8}
                  >
                    <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].tint, fontSize: 16 * scale }}>
                      {t(reasonKey)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.cancelButton, { height: 56 * scale }]}
                  onPress={() => setSkipScheduleId(null)}
                  activeOpacity={0.8}
                >
                  <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].icon, fontSize: 16 * scale }}>
                    {t('cancel')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SOS Confirmation Modal */}
      <Modal visible={sosModalVisible} transparent animationType="fade" onRequestClose={() => setSosModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setSosModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: Colors[theme].background, alignItems: 'center' }]}>
                <IconSymbol name="phone.circle.fill" size={64 * scale} color={Colors[theme].danger} />
                <ThemedText type="title" style={[styles.modalTitle, { marginTop: 16 * scale, marginBottom: 8 * scale, fontSize: 24 * scale }]}>
                  {t('emergencyContact')}
                </ThemedText>
                <ThemedText type="default" style={{ color: Colors[theme].icon, marginBottom: 24 * scale, textAlign: 'center', fontSize: 16 * scale }}>
                  {t('callCaregiver')}
                </ThemedText>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: Colors[theme].danger, height: 60 * scale, width: '100%' }]} 
                  onPress={executeCall} 
                  activeOpacity={0.8}
                >
                  <IconSymbol name="phone.fill" size={24 * scale} color="#fff" />
                  <ThemedText type="defaultSemiBold" style={{ color: '#fff', fontSize: 18 * scale }}>{t('call')}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelButton, { height: 56 * scale }]} onPress={() => setSosModalVisible(false)} activeOpacity={0.8}>
                  <ThemedText type="defaultSemiBold" style={{ color: Colors[theme].icon, fontSize: 16 * scale }}>{t('cancel')}</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.gutter,
  },
  centerAll: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Layout.borderRadius,
    marginBottom: 16,
    gap: 8,
  },
  offlineText: {
    fontSize: 14,
  },
  header: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerTextContainer: {
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  sosButton: {
    padding: 8,
    borderRadius: 30,
  },
  streakBadge: {
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  streakWinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  visualIdentifierContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  reasonButton: {
    height: 56,
    borderRadius: Layout.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  // Updated Interactive Toast Styles
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: Layout.gutter,
    right: Layout.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Layout.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 16,
    flexShrink: 1,
  },
  toastDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  undoText: {
    color: '#ffffff',
    fontSize: 15,
  },
});