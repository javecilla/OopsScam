import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import { MAX_INPUT_CHARS } from '@/config';
import { highlightParts } from '@/core/highlight';
import type { Verdict } from '@/core/types';
import type { ExplainOutput } from '@/llm/explain';
import { formatTimings, runAnalysis, runExplanation, statusLabels } from '@/pipeline';
import { colors, fontSize, spacing } from '@/theme';

// FR-UI-02: the verdict is always a word, never color alone. Never "safe" (AGENTS rule 4).
const VERDICT_UI: Record<Verdict, { word: string; tl: string; color: string }> = {
  scam: { word: 'SCAM', tl: 'Mukhang scam ito', color: colors.scam },
  suspicious: { word: 'SUSPICIOUS', tl: 'Kahina-hinala', color: colors.suspicious },
  low_risk: { word: 'LOW RISK', tl: 'Walang nakitang red flag', color: colors.lowRisk },
};

export default function ResultScreen() {
  const router = useRouter();
  const { text = '', truncated } = useLocalSearchParams<{ text: string; truncated?: string }>();

  // FR-FU-04: verdict and score right away, without the LLM.
  const result = useMemo(() => runAnalysis(text), [text]);
  const [done, setDone] = useState<{ text: string; out: ExplainOutput } | null>(null);
  const [labels, setLabels] = useState(statusLabels);

  // FR-UI-04: then the explanation, when ready (LLM or template fallback).
  useEffect(() => {
    let active = true;
    runExplanation(text, result).then((out) => {
      if (!active) return;
      setDone({ text, out });
      setLabels(statusLabels());
    });
    return () => {
      active = false;
    };
  }, [text, result]);

  // Only show an explanation that belongs to the message on screen.
  const explained = done?.text === text ? done.out : null;
  const verdict = explained?.verdict ?? result.verdict;
  const ui = VERDICT_UI[verdict];
  const parts = highlightParts(
    text,
    result.flags.map((f) => f.evidence),
  );
  const timings = formatTimings({ ...result.timingsMs, llm: explained?.ms ?? null });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[styles.verdictCard, { backgroundColor: ui.color }]}
          testID="analysis-verdict"
          accessible
          accessibilityRole="header"
          accessibilityLabel={`Verdict: ${ui.word}, score ${result.score} sa 100. ${ui.tl}.`}
        >
          <Text style={styles.verdictWord}>{ui.word}</Text>
          <Text style={styles.verdictSub}>
            {ui.tl} · Score {result.score}/100
          </Text>
          {explained?.llmRaised ? (
            <Text style={styles.verdictSub}>Itinaas ng local AI mula Low risk.</Text>
          ) : null}
        </View>

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
          <Text>{explained.explanation.explanationTl}</Text>
        ) : (
          <View style={styles.row} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Ipinapaliwanag…</Text>
          </View>
        )}

        {explained ? (
          <>
            <Text style={styles.section}>Gawin mo ito</Text>
            <Text>{explained.explanation.actionTl}</Text>
            <Text style={styles.muted}>
              Paliwanag mula sa:{' '}
              {explained.explanation.source === 'llm' ? 'local AI sa phone' : 'template'}
            </Text>
          </>
        ) : null}

        {result.flags.length > 0 ? (
          <>
            <Text style={styles.section}>Mga red flag ({result.flags.length})</Text>
            {result.flags.map((f) => (
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
        llmLabel={labels.llmLabel}
        classifierLabel={labels.classifierLabel}
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
  verdictWord: {
    fontSize: fontSize.verdict,
    fontWeight: '800',
    color: colors.background,
  },
  verdictSub: {
    color: colors.background,
    fontWeight: '600',
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
