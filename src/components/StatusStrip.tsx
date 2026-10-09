import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fontSize, spacing } from '@/theme';

type StatusStripProps = {
  llmLabel: string;
  classifierLabel: string;
  timings?: string;
  note?: string;
};

// SRS FR-UI-05. Presentation only: the screen passes in ready-made labels.
export function StatusStrip({ llmLabel, classifierLabel, timings, note }: StatusStripProps) {
  return (
    <View style={styles.strip} accessibilityRole="summary">
      <Text role="label" style={styles.title}>
        All analysis runs locally on your phone
      </Text>
      <Text role="label" style={styles.text}>
        Offline-ready · {llmLabel} · {classifierLabel}
      </Text>
      {timings ? (
        <Text role="label" style={styles.text}>
          {timings}
        </Text>
      ) : null}
      {note ? (
        <Text role="label" style={styles.text}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  text: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  title: { color: colors.text },
});
