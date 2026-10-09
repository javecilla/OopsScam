import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, fontSize, spacing } from '@/theme';

type StatusStripProps = {
  llmLabel: string;
  classifierLabel: string;
  timings?: string;
};

// SRS FR-UI-05. Presentation only: the screen passes in ready-made labels.
export function StatusStrip({ llmLabel, classifierLabel, timings }: StatusStripProps) {
  return (
    <View style={styles.strip} accessibilityRole="summary">
      <Text style={styles.text}>
        Offline-ready · {llmLabel} · {classifierLabel}
      </Text>
      {timings ? <Text style={styles.text}>{timings}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  text: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
});
