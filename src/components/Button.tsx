import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

// SRS 4.1: touch targets at least 48 dp tall.
const MIN_TOUCH_HEIGHT = 48;

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{title}</Text>
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
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: colors.background,
    fontWeight: '600',
  },
  secondaryLabel: {
    color: colors.primary,
  },
});
