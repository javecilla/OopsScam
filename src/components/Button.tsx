import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
};

// SRS 4.1: touch targets at least 48 dp tall.
const MIN_TOUCH_HEIGHT = 48;

export function Button({ title, onPress }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.background,
    fontWeight: '600',
  },
});
