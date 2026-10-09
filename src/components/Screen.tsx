import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
};

// The Stack header already covers the top inset.
export function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});
