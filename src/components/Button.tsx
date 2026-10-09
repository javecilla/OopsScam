import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { brutalist, colors, fonts, shape, spacing } from '@/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
  busy?: boolean;
  accessibilityHint?: string;
};

// SRS 4.1: touch targets at least 48 dp tall.
const MIN_TOUCH_HEIGHT = 48;

export function Button({
  title,
  onPress,
  variant,
  disabled,
  testID,
  busy,
  accessibilityHint,
}: ButtonProps) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      testID={testID}
      android_ripple={{ color: secondary ? colors.highlight : '#801A24' }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        pressed && styles.pressed,
        (disabled || busy) && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.onPrimary} />
      ) : null}
      <Text role="section" style={[styles.label, secondary && styles.secondaryLabel]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_HEIGHT,
    minWidth: MIN_TOUCH_HEIGHT,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: shape.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    borderRightWidth: brutalist.borderWidth,
    borderBottomWidth: brutalist.borderWidth,
  },
  disabled: {
    opacity: 0.55,
    borderRightWidth: brutalist.borderWidth,
    borderBottomWidth: brutalist.borderWidth,
  },
  label: {
    color: colors.onPrimary,
    fontSize: 16,
    fontFamily: fonts.bold,
    textAlign: 'center',
  },
  secondaryLabel: {
    color: colors.ink,
    fontFamily: fonts.semibold,
  },
});
