import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Verdict } from '@/core/types';
import {
  clearScanHistory,
  getRecentScans,
  getScanStats,
  type ScanRecord,
} from '@/storage/history';
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
  const [stats, setStats] = useState({ total: 0, scamCount: 0, suspiciousCount: 0, lowRiskCount: 0 });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [records, currentStats] = await Promise.all([getRecentScans(50), getScanStats()]);
      setScans(records);
      setStats(currentStats);
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
            await clearScanHistory();
            void loadData();
          },
        },
      ],
    );
  };

  return (
    <Screen>
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
            <Text style={[styles.statNumber, { color: colors.lowRisk }]}>{stats.lowRiskCount}</Text>
            <Text style={styles.statLabel}>Low risk</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={scans}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Wala pang naitalang scan</Text>
              <Text style={styles.emptySubtitle}>
                Lahat ng susuriing text, screenshot, at QR ay ligtas na itatala rito offline.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const badge = VERDICT_BADGE[item.verdict] ?? VERDICT_BADGE.low_risk;
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

              {item.snippet ? (
                <View style={styles.snippetBox}>
                  <Text style={styles.snippetText} numberOfLines={2}>
                    {item.snippet}
                  </Text>
                </View>
              ) : null}

              {item.flags_summary ? (
                <Text style={styles.flagsText} numberOfLines={1}>
                  Red flags: {item.flags_summary}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        {scans.length > 0 ? (
          <Button title="Burahin ang Kasaysayan" variant="secondary" onPress={handleClear} />
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
  snippetBox: {
    backgroundColor: colors.background,
    borderRadius: spacing.xs,
    padding: spacing.sm,
    marginTop: 2,
  },
  snippetText: {
    fontSize: fontSize.small,
    color: colors.text,
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
