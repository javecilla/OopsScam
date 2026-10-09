import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Heading } from '@/components/Heading';
import { Notice } from '@/components/Notice';
import { ScanFrame } from '@/components/ScanFrame';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import { highlightParts } from '@/core/highlight';
import type { Verdict } from '@/core/types';
import { formatTimings } from '@/pipeline';
import { clearSessions, enhanceSession } from '@/session';
import { saveScanRecord } from '@/storage/history';
import { brutalist, colors, fonts, shape, spacing } from '@/theme';
import { useReadiness } from '@/useReadiness';
import { useSession } from '@/useSession';

const VERDICT_UI: Record<
  Verdict,
  { word: string; meaning: string; background: string; foreground: string }
> = {
  scam: {
    word: 'SCAM',
    meaning: 'This looks like a scam. Do not click links, reply, or send money.',
    background: colors.highlight,
    foreground: colors.scam,
  },
  suspicious: {
    word: 'SUSPICIOUS',
    meaning: 'Warning signs detected. Verify through official channels before acting.',
    background: colors.suspicious,
    foreground: colors.text,
  },
  low_risk: {
    word: 'LOW RISK',
    meaning: 'No obvious red flags detected in the analyzed message.',
    background: colors.frame,
    foreground: colors.onFrame,
  },
};

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const session = useSession(sessionId);
  const router = useRouter();
  const labels = useReadiness();
  const result = session?.result;
  const explained = session?.explained;
  const verdict = explained?.verdict ?? result?.verdict;
  const ui = verdict ? VERDICT_UI[verdict] : null;
  const message = session?.text ?? '';
  const parts = useMemo(
    () =>
      result
        ? highlightParts(
            message,
            result.flags.map((flag) => flag.evidence),
          )
        : [],
    [result, message],
  );

  useEffect(() => {
    if (sessionId) void enhanceSession(sessionId);
  }, [sessionId]);

  const savedSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId || !session?.result || !session?.explained || !session.text.trim()) return;
    if (savedSessionIdRef.current === sessionId) return;

    if (!session.enhancing) {
      savedSessionIdRef.current = sessionId;
      const inputType: 'text' | 'image' | 'qr' =
        session.source === 'screenshot' ? 'image' : session.source === 'qr' ? 'qr' : 'text';
      void saveScanRecord({
        verdict: session.explained.verdict ?? session.result.verdict,
        score: session.result.score,
        flagCount: session.result.flags.length,
        inputType,
      }).catch((err) => {
        console.warn('Failed to save scan record:', err);
      });
    }
  }, [sessionId, session?.result, session?.explained, session?.enhancing, session?.source, session?.text]);

  useEffect(() => {
    return () => {
      if (sessionId && session?.result && session.text.trim() && savedSessionIdRef.current !== sessionId) {
        savedSessionIdRef.current = sessionId;
        const inputType: 'text' | 'image' | 'qr' =
          session.source === 'screenshot' ? 'image' : session.source === 'qr' ? 'qr' : 'text';
        void saveScanRecord({
          verdict: session.explained?.verdict ?? session.result.verdict,
          score: session.result.score,
          flagCount: session.result.flags.length,
          inputType,
        }).catch((err) => {
          console.warn('Failed to save scan record on unmount:', err);
        });
      }
    };
  }, [sessionId, session?.result, session?.explained, session?.source, session?.text]);

  const newCheck = () => {
    clearSessions();
    router.dismissTo('/');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {!result || !ui || !session || !explained ? (
          <>
            <Heading
              title="No Input Found"
              description="No message was provided for this result. Please try checking again from Home."
            />
            <Button title="Back to Home" onPress={newCheck} />
          </>
        ) : (
          <>
            <ScanFrame>
              <View
                style={[
                  styles.verdict,
                  { backgroundColor: ui.background },
                ]}
                accessible
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
                accessibilityLabel={
                  'Verdict: ' + ui.word + '. Risk score ' + result.score + ' out of 100. ' + ui.meaning
                }
                testID="analysis-verdict"
              >
                <View style={styles.stampBadge}>
                  <Text role="label" style={styles.stampBadgeText}>
                    SECURITY CALLING CARD
                  </Text>
                </View>
                <Text role="verdict" style={[styles.verdictWord, { color: ui.foreground }]}>
                  {ui.word}
                </Text>
                <Text style={[styles.verdictMeaning, { color: ui.foreground }]}>{ui.meaning}</Text>
                <Text role="label" style={[styles.verdictScore, { color: ui.foreground }]}>
                  Risk score: {result.score}/100
                </Text>
              </View>
            </ScanFrame>

            <Text role="label" style={styles.muted}>
              Automated risk rating based on rules and local AI (not a guarantee).
            </Text>

            {explained.llmRaised ? (
              <Notice message="Risk rating was elevated by local AI after contextual analysis." />
            ) : null}

            {session.truncated ? (
              <Notice message="Only part of the message was checked. Unchecked text may contain risks." />
            ) : null}

            {verdict === 'low_risk' ? (
              <Notice message="This is not a guarantee that the message is safe. Stay cautious and never share OTPs or passwords." />
            ) : null}

            <Card accentColor={colors.primary} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: colors.primary }]}>
                  <Text role="label" style={styles.sectionBadgeText}>
                    ACTION
                  </Text>
                </View>
                <Text role="section" accessibilityRole="header">
                  What You Should Do
                </Text>
              </View>
              <Text style={styles.bodyText}>{explained.explanation.actionTl}</Text>
            </Card>

            <Card accentColor={colors.frame} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: colors.frame }]}>
                  <Text role="label" style={styles.sectionBadgeText}>
                    EXPLANATION
                  </Text>
                </View>
                <Text role="section" accessibilityRole="header">
                  Why This Verdict?
                </Text>
              </View>
              <Text style={styles.bodyText} accessibilityLiveRegion="polite">
                {explained.explanation.explanationTl}
              </Text>
              {session.enhancing ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text role="label">Local AI is generating an in-depth explanation…</Text>
                </View>
              ) : null}
              <Text role="label" style={styles.muted}>
                Explanation source:{' '}
                {explained.explanation.source === 'llm' ? 'local AI on your phone' : 'security rule template'}
              </Text>
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: colors.ink }]}>
                  <Text role="label" style={styles.sectionBadgeText}>
                    RED FLAGS ({result.flags.length})
                  </Text>
                </View>
              </View>
              {result.flags.length ? (
                result.flags.map((flag) => (
                  <View key={flag.id} style={styles.flag}>
                    <Text style={styles.flagText}>• {flag.en || flag.tl}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>No obvious red flags detected in the analyzed message.</Text>
              )}
            </Card>

            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionBadge, { backgroundColor: colors.ink }]}>
                  <Text role="label" style={styles.sectionBadgeText}>
                    ANALYZED MESSAGE
                  </Text>
                </View>
              </View>
              <View style={styles.messageBox}>
                <Text selectable style={styles.messageContent}>
                  {parts.map((part, index) =>
                    part.highlighted ? (
                      <Text key={index} style={styles.highlight}>
                        {part.text}
                      </Text>
                    ) : (
                      part.text
                    ),
                  )}
                </Text>
              </View>
            </Card>

            <Button title="Check Another Message" onPress={newCheck} />
            <Button
              title="Back to Input"
              variant="secondary"
              onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
            />
            <Button
              title="View Scan History"
              variant="secondary"
              onPress={() => router.push('/history' as any)}
            />
            <StatusStrip
              llmLabel={labels.llmLabel}
              classifierLabel={labels.classifierLabel}
              timings={formatTimings({ ...result.timingsMs, llm: explained.ms || null })}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  verdict: {
    borderRadius: shape.panel,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  stampBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.control,
    transform: [{ skewX: '-8deg' }],
  },
  stampBadgeText: {
    color: colors.onFrame,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  verdictWord: {
    letterSpacing: 1,
  },
  verdictMeaning: {
    fontSize: 16,
    lineHeight: 22,
  },
  verdictScore: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.control,
    transform: [{ skewX: '-8deg' }],
  },
  sectionBadgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  muted: { color: colors.muted },
  loading: { gap: spacing.sm, alignItems: 'flex-start', marginVertical: spacing.xs },
  flag: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.softBorder,
  },
  flagText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  messageBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.softBorder,
    borderRadius: shape.control,
    padding: spacing.md,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  highlight: {
    backgroundColor: colors.highlight,
    color: colors.scam,
    fontFamily: fonts.bold,
  },
});
