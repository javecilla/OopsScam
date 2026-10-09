import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Verdict } from '@/core/types';
import { clearScanHistory, getRecentScans, getScanStats, type ScanRecord } from '@/storage/history';
import { colors, fontSize, spacing } from '@/theme';

const VERDICT_BADGE: Record<Verdict, { label: string; color: string }> = {
  scam: { label: 'SCAM', color: colors.scam },
  suspicious: { label: 'SUSPICIOUS', color: colors.suspicious },
  low_risk: { label: 'LOW RISK', color: colors.lowRisk },
};

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('tl-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    scamCount: 0,
    suspiciousCount: 0,
    lowRiskCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [records, currentStats] = await Promise.all([getRecentScans(50), getScanStats()]);
      setScans(records);
      setStats(currentStats);
    } catch {
      // Do not display database errors: legacy error details may contain message content.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleClear = () => {
    Alert.alert(
      'Burahin ang Kasaysayan',
      'Sigurado ka bang nais mong burahin ang lahat ng naitalang scan sa phone?',
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Burahin',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearScanHistory();
              await loadData();
            } catch {
              setLoadError(true);
              Alert.alert(
                'Hindi natapos ang pagbura',
                'Hindi natapos ang database cleanup. Subukang burahin muli ang kasaysayan.',
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      {!loadError ? (
        <View style={styles.header}>
          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.scam }]}>{stats.scamCount}</Text>
              <Text style={styles.statLabel}>Scam</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.suspicious }]}>
                {stats.suspiciousCount}
              </Text>
              <Text style={styles.statLabel}>Suspicious</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: colors.lowRisk }]}>
                {stats.lowRiskCount}
              </Text>
              <Text style={styles.statLabel}>Low risk</Text>
            </View>
          </View>
        </View>
      ) : null}

      {loadError ? (
        <View
          style={styles.emptyContainer}
          accessibilityLiveRegion="polite"
          testID="history-load-error"
        >
          <Text style={styles.emptyTitle}>Hindi mabuksan ang kasaysayan</Text>
          <Text style={styles.emptySubtitle}>
            Hindi nabasa ang lokal na database. Subukang muli.
          </Text>
          <Button
            title="Subukang muli"
            onPress={() => void loadData()}
            testID="history-retry"
            disabled={loading}
          />
        </View>
      ) : null}

      <FlatList
        data={loadError ? [] : scans}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading || loadError ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Wala pang naitalang scan</Text>
              <Text style={styles.emptySubtitle}>
                Oras, verdict, score, uri ng input, at bilang ng red flags lang ang itinatala. Hindi
                sine-save ang message, larawan, o detalye ng red flags.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const badge = VERDICT_BADGE[item.verdict];
          return (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={[styles.badge, { backgroundColor: badge.color }]}>
                  <Text style={styles.badgeText}>{badge.label}</Text>
                </View>
                <Text style={styles.typeTag}>[{item.input_type.toUpperCase()}]</Text>
                <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
              </View>

              <Text style={styles.scoreText}>Score: {item.score}/100</Text>

              <Text style={styles.flagsText}>Red flags: {item.flag_count}</Text>
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        {scans.length > 0 || loadError ? (
          <Button
            title="Burahin ang Kasaysayan"
            variant="secondary"
            onPress={handleClear}
            disabled={loading}
          />
        ) : null}
        <Button title="Bumalik sa Home" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg * 2,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: fontSize.body,
  },
  emptySubtitle: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: fontSize.small,
    paddingHorizontal: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: fontSize.small,
  },
  typeTag: {
    fontSize: fontSize.small,
    color: colors.muted,
    fontWeight: '600',
  },
  dateText: {
    fontSize: fontSize.small,
    color: colors.muted,
    marginLeft: 'auto',
  },
  scoreText: {
    fontWeight: '600',
    fontSize: fontSize.small,
    marginTop: 2,
  },
  flagsText: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  footer: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
