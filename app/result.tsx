import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import { MAX_INPUT_CHARS } from '@/config';
import { analyze } from '@/core/analyze';
import { looksLikeEmail } from '@/core/email';
import { highlightParts } from '@/core/highlight';
import type { Verdict } from '@/core/types';
import type { ExplainOutput } from '@/llm/explain';
import {
  formatQwenTimings,
  qwenStatusLabels,
  QWEN_STAGE_LABEL,
  runQwenExplanation,
  runQwenPipeline,
  type QwenAnalysisResult,
  type QwenRuntime,
  type QwenStage,
} from '@/pipeline';
import { saveScanRecord } from '@/storage/history';
import { colors, fontSize, spacing } from '@/theme';

// FR-UI-02: the verdict is always a word, never color alone. Never "safe" (AGENTS rule 4).
const VERDICT_UI: Record<Verdict, { word: string; tl: string; color: string }> = {
  scam: { word: 'SCAM', tl: 'Mukhang scam ito', color: colors.scam },
  suspicious: { word: 'SUSPICIOUS', tl: 'Kahina-hinala', color: colors.suspicious },
  low_risk: { word: 'LOW RISK', tl: 'Walang nakitang red flag', color: colors.lowRisk },
};

type QwenPhase = 'loading' | 'ready' | 'error';

export default function ResultScreen() {
  const router = useRouter();
  const {
    text = '',
    truncated,
    inputType = 'text',
  } = useLocalSearchParams<{
    text: string;
    truncated?: string;
    inputType?: 'text' | 'image' | 'qr';
  }>();

  // Immediate rules-only snapshot while Qwen loads (no ML classifier, always fast).
  const rulesResult = useMemo(() => analyze(text, null), [text]);

  // Qwen classification state.
  const [qwenPhase, setQwenPhase] = useState<QwenPhase>('loading');
  const [qwenStage, setQwenStage] = useState<QwenStage | null>(null);
  const [qwenResult, setQwenResult] = useState<QwenAnalysisResult | null>(null);
  const [qwenError, setQwenError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Explanation state (FR-UI-04).
  const [explained, setExplained] = useState<{ text: string; out: ExplainOutput } | null>(null);
  const savedRef = useRef(false);

  // Active verdict uses Qwen result when ready, rules snapshot while loading/errored.
  const activeResult = qwenResult ?? rulesResult;
  const verdict = activeResult.verdict;
  const ui = VERDICT_UI[verdict];

  const timings = formatQwenTimings(
    rulesResult.timingsMs.rules,
    qwenResult?.classificationMs ?? null,
    explained?.out.ms ?? null,
  );

  // FR-FU-04 / FR-UI-04: load Qwen, classify, then explain in one context.
  useEffect(() => {
    let cancelled = false;
    let localRuntime: QwenRuntime | null = null;
    const abortCtrl = new AbortController();

    void (async () => {
      // Reset all state at the start of each run (retry or new text).
      setQwenPhase('loading');
      setQwenStage(null);
      setQwenError(null);
      setQwenResult(null);
      setExplained(null);
      savedRef.current = false;

      try {
        const { result, runtime } = await runQwenPipeline(
          text,
          (s) => {
            if (!cancelled) setQwenStage(s);
          },
          abortCtrl.signal,
        );
        localRuntime = runtime;
        if (cancelled) return;

        setQwenResult(result);
        setQwenPhase('ready');

        const out = await runQwenExplanation(text, result, runtime);
        if (cancelled) return;
        setExplained({ text, out });

        // Save scan metadata after successful Qwen analysis.
        if (!savedRef.current && text.trim()) {
          savedRef.current = true;
          void saveScanRecord({
            verdict: result.verdict,
            score: result.score,
            flagCount: result.flags.length,
            inputType,
          }).catch(() => {
            Alert.alert(
              'Hindi na-save ang scan',
              'Hindi naisulat ang scan metadata sa lokal na history. Nananatili ang resulta sa screen.',
            );
          });
        }
      } catch (err) {
        if (cancelled || (err as Error)?.name === 'AbortError') return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Hindi maanalisa ng Qwen. Subukan muli.';
        setQwenError(msg);
        setQwenPhase('error');

        // Save rules-snapshot metadata so history still records the attempt.
        if (!savedRef.current && text.trim()) {
          savedRef.current = true;
          const snapshot = analyze(text, null);
          void saveScanRecord({
            verdict: snapshot.verdict,
            score: snapshot.score,
            flagCount: snapshot.flags.length,
            inputType,
          }).catch(() => {});
        }
      } finally {
        void localRuntime?.release().catch(() => {});
        localRuntime = null;
      }
    })();

    return () => {
      cancelled = true;
      abortCtrl.abort();
      // Runtime is released in the finally block; abort will surface AbortError there.
    };
  }, [text, retryCount, inputType]);

  const parts = highlightParts(
    text,
    activeResult.flags.map((f) => f.evidence),
  );

  const statusLabels = qwenStatusLabels(qwenStage, qwenError);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Verdict card ── loading state while Qwen is initialising / classifying */}
        {qwenPhase === 'loading' ? (
          <View
            style={[styles.verdictCard, styles.verdictLoading]}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel="Inaanalisa ang mensahe…"
          >
            <View style={styles.row}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.verdictLoadingText}>Inaanalisa…</Text>
            </View>
            {qwenStage ? (
              <Text style={styles.stageLabel}>{QWEN_STAGE_LABEL[qwenStage]}</Text>
            ) : null}
          </View>
        ) : (
          /* Verdict card ── Qwen result or rules snapshot (on error) */
          <View
            style={[styles.verdictCard, { backgroundColor: ui.color }]}
            testID="analysis-verdict"
            accessible
            accessibilityRole="header"
            accessibilityLabel={`Verdict: ${ui.word}, score ${activeResult.score} sa 100. ${ui.tl}.`}
          >
            <Text style={styles.verdictWord}>{ui.word}</Text>
            <Text style={styles.verdictSub}>
              {ui.tl} · Score {activeResult.score}/100
            </Text>
            {qwenResult !== null ? (
              <>
                <Text style={styles.verdictSub}>Qwen AI · fine-tuned na modelo</Text>
                {qwenResult.llmRaised ? (
                  <Text style={styles.verdictSub}>Itinaas ng Qwen mula sa rules baseline.</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.verdictSub}>Rules lang (Qwen hindi available)</Text>
            )}
          </View>
        )}

        {/* Error banner with retry button */}
        {qwenPhase === 'error' && qwenError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{qwenError}</Text>
            <Pressable
              onPress={() => {
                setRetryCount((c) => c + 1);
              }}
              style={styles.retryButton}
              accessibilityRole="button"
              accessibilityLabel="Subukan muli ang Qwen AI"
            >
              <Text style={styles.retryText}>Subukan muli</Text>
            </Pressable>
          </View>
        ) : null}

        {looksLikeEmail(text) ? <Text style={styles.muted}>Sinuri bilang email.</Text> : null}

        {truncated === '1' ? (
          // FR-IN-01
          <Text style={styles.disclaimer}>
            Pinutol sa {MAX_INPUT_CHARS.toLocaleString()} characters ang message.
          </Text>
        ) : null}

        {verdict === 'low_risk' ? (
          // FR-UI-03 / HON-01
          <Text style={styles.disclaimer}>
            Hindi ito garantiya. Hindi 100% accurate ang OopsScam; mag-ingat pa rin at huwag ibigay
            ang OTP o MPIN kahit kanino.
          </Text>
        ) : null}

        <Text style={styles.section}>Bakit?</Text>
        {explained ? (
          <Text>{explained.out.explanation.explanationTl}</Text>
        ) : (
          <View style={styles.row} accessibilityLiveRegion="polite">
            {qwenPhase !== 'error' ? <ActivityIndicator color={colors.primary} /> : null}
            <Text style={styles.muted}>
              {qwenPhase === 'error' ? 'Walang Qwen explanation.' : 'Ipinapaliwanag…'}
            </Text>
          </View>
        )}

        {explained ? (
          <>
            <Text style={styles.section}>Gawin mo ito</Text>
            <Text>{explained.out.explanation.actionTl}</Text>
            <Text style={styles.muted}>
              Paliwanag mula sa:{' '}
              {explained.out.explanation.source === 'llm' ? 'local AI sa phone' : 'template'}
            </Text>
          </>
        ) : null}

        {activeResult.flags.length > 0 ? (
          <>
            <Text style={styles.section}>Mga red flag ({activeResult.flags.length})</Text>
            {activeResult.flags.map((f) => (
              <Text key={f.id}>• {f.tl}</Text>
            ))}
          </>
        ) : null}

        <Text style={styles.section}>Ang message</Text>
        <View style={styles.messageBox}>
          <Text>
            {parts.map((p, i) =>
              p.highlighted ? (
                <Text key={i} style={styles.highlight}>
                  {p.text}
                </Text>
              ) : (
                p.text
              ),
            )}
          </Text>
        </View>

        <Button title="Mag-check ng iba" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
      <StatusStrip
        llmLabel={statusLabels.llmLabel}
        classifierLabel={statusLabels.classifierLabel}
        timings={timings}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  verdictCard: {
    borderRadius: spacing.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  verdictLoading: {
    backgroundColor: colors.surface,
  },
  verdictLoadingText: {
    fontSize: fontSize.body,
    fontWeight: '700',
    color: colors.text,
  },
  stageLabel: {
    color: colors.muted,
    fontSize: fontSize.small,
  },
  verdictWord: {
    fontSize: fontSize.verdict,
    fontWeight: '800',
    color: colors.background,
  },
  verdictSub: {
    color: colors.background,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: colors.scam + '22',
    borderLeftWidth: 3,
    borderLeftColor: colors.scam,
    borderRadius: spacing.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.text,
    fontSize: fontSize.small,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    backgroundColor: colors.primary,
  },
  retryText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: fontSize.small,
  },
  disclaimer: {
    color: colors.muted,
  },
  section: {
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  muted: {
    color: colors.muted,
    fontSize: fontSize.small,
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderRadius: spacing.sm,
    padding: spacing.md,
  },
  highlight: {
    backgroundColor: colors.highlight,
    fontWeight: '700',
  },
});
