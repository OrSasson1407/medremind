import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  I18nManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Layout } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePatientStore, PendingLog } from '@/store/patientStore';

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function HistoryItem({ log, theme }: { log: PendingLog; theme: 'light' | 'dark' }) {
  const isTaken = log.status === 'taken';
  const statusColor = isTaken ? Colors[theme].success : Colors[theme].danger;
  const statusBg = isTaken ? Colors[theme].successBg : Colors[theme].dangerBg;
  const iconName = isTaken ? 'checkmark.circle.fill' : 'xmark.circle.fill';

  return (
    <ThemedView variant="cardBg" style={styles.historyItem}>
      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <IconSymbol name={iconName} size={22} color={statusColor} />
      </View>
      <View style={styles.itemInfo}>
        <ThemedText type="defaultSemiBold" style={styles.itemDoseId}>
          Dose #{log.dose_log_id}
        </ThemedText>
        {log.skip_reason ? (
          <ThemedText type="default" style={[styles.itemReason, { color: Colors[theme].icon }]}>
            {log.skip_reason}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.itemTime}>
        <ThemedText type="default" style={[styles.timeText, { color: Colors[theme].icon }]}>
          {formatTime(log.timestamp)}
        </ThemedText>
        <ThemedText type="default" style={[styles.dateText, { color: Colors[theme].icon }]}>
          {formatDate(log.timestamp)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const theme = useColorScheme() ?? 'light';
  const { pendingLogs } = usePatientStore();

  // Show most recent first
  const sortedLogs = [...pendingLogs].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <ThemedView style={styles.container} variant="background">
      <View style={styles.header}>
        <ThemedText type="title">{t('history')}</ThemedText>
        <ThemedText type="default" style={{ color: Colors[theme].icon }}>
          {t('historySubtitle')}
        </ThemedText>
      </View>

      {sortedLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="clock.fill" size={48} color={Colors[theme].icon} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            {t('noHistory')}
          </ThemedText>
          <ThemedText type="default" style={[styles.emptySubtitle, { color: Colors[theme].icon }]}>
            {t('noHistorySubtitle')}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {sortedLogs.map((log, index) => (
            <HistoryItem key={`${log.dose_log_id}-${index}`} log={log} theme={theme} />
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.gutter,
  },
  header: {
    marginBottom: 24,
    marginTop: 16,
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  listContent: {
    gap: 12,
    paddingBottom: 32,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: Layout.borderRadius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 12,
  },
  statusBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemDoseId: {
    fontSize: 16,
    marginBottom: 2,
  },
  itemReason: {
    fontSize: 13,
  },
  itemTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
