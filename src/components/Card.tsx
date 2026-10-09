import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { brutalist, colors, shape, spacing } from '@/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  dark?: boolean;
}

export function Card({ children, style, accentColor, dark = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        dark ? styles.darkCard : styles.lightCard,
        accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 6 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: shape.panel,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
    padding: spacing.md,
    gap: spacing.sm,
    position: 'relative',
  },
  lightCard: {
    backgroundColor: colors.surface,
  },
  darkCard: {
    backgroundColor: colors.ink,
    borderColor: colors.primary,
  },
});
