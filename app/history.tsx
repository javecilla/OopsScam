import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Heading } from '@/components/Heading';
import { ScanFrame } from '@/components/ScanFrame';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import type { Verdict } from '@/core/types';
import {
  clearScanHistory,
  getRecentScans,
  getScanStats,
  type ScanRecord,
} from '@/storage/history';
import { brutalist, colors, fonts, fontSize, shape, spacing } from '@/theme';

const VERDICT_BADGE: Record<
  Verdict,
  { label: string; background: string; foreground: string; border: string }
> = {
  scam: {
    label: 'SCAM',
    background: colors.highlight,
    foreground: colors.scam,
    border: colors.scam,
  },
  suspicious: {
    label: 'SUSPICIOUS',
    background: colors.suspicious,
    foreground: colors.text,
    border: colors.suspicious,
  },
  low_risk: {
    label: 'LOW RISK',
    background: colors.frame,
    foreground: colors.onFrame,
    border: colors.frame,
  },
};

const TYPE_LABELS: Record<'text' | 'image' | 'qr', string> = {
  text: 'Text Message',
  image: 'Screenshot',
  qr: 'QR Code',
};

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
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
      'Clear Scan History',
      'Are you sure you want to delete all saved scan records from your phone? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await clearScanHistory();
              await loadData();
            } catch {
              setLoadError(true);
              Alert.alert(
                'Could Not Clear History',
                'Failed to clear database records. Please try again.',
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
      {loadError ? (
        <View
          style={styles.emptyContainer}
          accessibilityLiveRegion="polite"
          testID="history-load-error"
        >
          <Text role="section" style={styles.emptyTitle}>
            Could Not Load History
          </Text>
          <Text style={styles.emptySubtitle}>
            The local database could not be read. Please tap retry to try again.
          </Text>
          <Button
            title="Try Again"
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
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          !loadError ? (
            <View style={styles.header}>
              <Heading
                title="Scan History"
                description="Past scan records are saved offline on your phone. Only scan verdict, score, input type, and flag count are retained for your privacy."
              />

              <ScanFrame>
                <View style={styles.statsCard} accessibilityRole="summary">
                  <View style={styles.statBox}>
                    <Text role="section" style={styles.statNumber}>
                      {stats.total}
                    </Text>
                    <Text role="label" style={styles.statLabel}>
                      Total
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text role="section" style={[styles.statNumber, { color: colors.scam }]}>
                      {stats.scamCount}
                    </Text>
                    <Text role="label" style={styles.statLabel}>
                      Scam
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text role="section" style={[styles.statNumber, { color: colors.suspicious }]}>
                      {stats.suspiciousCount}
                    </Text>
                    <Text role="label" style={styles.statLabel}>
                      Suspicious
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text role="section" style={[styles.statNumber, { color: colors.frame }]}>
                      {stats.lowRiskCount}
                    </Text>
                    <Text role="label" style={styles.statLabel}>
                      Low risk
                    </Text>
                  </View>
                </View>
              </ScanFrame>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loadError ? null : loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text role="label" style={styles.muted}>
                Loading scan history…
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text role="section" style={styles.emptyTitle}>
                No Scans Recorded Yet
              </Text>
              <Text style={styles.emptySubtitle}>
                Messages, screenshots, and QR codes you check will be safely listed here.
              </Text>
              <View style={styles.emptyButtonWrapper}>
                <Button
                  title="Check a Message Now"
                  onPress={() => router.dismissTo('/')}
                  testID="empty-start-check"
                />
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          const badge = VERDICT_BADGE[item.verdict] ?? VERDICT_BADGE.low_risk;
          const typeLabel = TYPE_LABELS[item.input_type] ?? 'Text Message';

          return (
            <View style={styles.itemCard} testID={`history-item-${item.id}`}>
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: badge.background, borderColor: badge.border },
                  ]}
                >
                  <Text
                    role="label"
                    style={[styles.badgeText, { color: badge.foreground }]}
                  >
                    {badge.label}
                  </Text>
                </View>

                <View style={styles.typeTag}>
                  <Text role="label" style={styles.typeText}>
                    {typeLabel}
                  </Text>
                </View>

                <Text role="label" style={styles.dateText}>
                  {formatDate(item.timestamp)}
                </Text>
              </View>

              <Text role="label" style={styles.scoreText}>
                Risk score: {item.score}/100
              </Text>

              <Text role="label" style={styles.flagsText}>
                Red flags detected: {item.flag_count}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            {scans.length > 0 ? (
              <Button
                title="Clear Scan History"
                variant="secondary"
                onPress={handleClear}
                testID="clear-history"
                disabled={loading}
              />
            ) : null}
            <Button
              title="Back to Home"
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
              testID="back-home"
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: shape.panel,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: shape.panel,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
    marginVertical: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.section,
    color: colors.text,
  },
  emptySubtitle: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: fontSize.body,
  },
  emptyButtonWrapper: {
    marginTop: spacing.md,
    width: '100%',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: shape.panel,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    borderRadius: shape.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.small,
  },
  typeTag: {
    backgroundColor: colors.background,
    borderRadius: shape.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },
  typeText: {
    color: colors.muted,
    fontSize: fontSize.small,
  },
  dateText: {
    fontSize: fontSize.small,
    color: colors.muted,
    marginLeft: 'auto',
  },
  scoreText: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.small,
    color: colors.text,
  },
  flagsText: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  footer: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  muted: {
    color: colors.muted,
  },
});
