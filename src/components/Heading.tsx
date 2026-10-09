import { StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { brutalist, colors, shape, spacing } from '@/theme';

export function Heading({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.group}>
      <View style={styles.title}>
        <View pointerEvents="none" accessible={false} style={styles.slash} />
        <Text role="headline" accessibilityRole="header" style={styles.words}>
          {title}
        </Text>
      </View>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm, marginBottom: spacing.sm },
  title: {
    backgroundColor: colors.frame,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: 14,
    borderRadius: shape.control,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  slash: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    right: -10,
    width: 14,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.ink,
    transform: [{ skewX: '-12deg' }],
  },
  words: {
    color: colors.onFrame,
    letterSpacing: 0.5,
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});
