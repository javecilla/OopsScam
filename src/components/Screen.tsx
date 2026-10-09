import type { ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
};

// The screen supplies its header height; this primitive has no context or state.
export function Screen({
  children,
  keyboardOffset = 0,
}: ScreenProps & { keyboardOffset?: number }) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView
        behavior="height"
        keyboardVerticalOffset={keyboardOffset}
        style={styles.inner}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: { flex: 1, padding: spacing.md, gap: spacing.md },
});
