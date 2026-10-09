import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';
import { brutalist, colors, fonts, shape, spacing } from '@/theme';

export function Notice({
  message,
  onAcknowledge,
}: {
  message: string;
  onAcknowledge?: () => void;
}) {
  return (
    <View style={styles.box}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text role="label" style={styles.badgeText}>
            NOTICE
          </Text>
        </View>
      </View>
      <Text style={styles.message} accessibilityLiveRegion="polite">
        {message}
      </Text>
      {onAcknowledge ? (
        <Button title="I understand — continue" variant="secondary" onPress={onAcknowledge} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.highlight,
    borderRadius: shape.panel,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.control,
    borderWidth: 1,
    borderColor: colors.ink,
    transform: [{ skewX: '-6deg' }],
  },
  badgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
