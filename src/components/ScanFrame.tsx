import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function ScanFrame({ children, dark = false }: { children?: ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.frame, dark && styles.dark]}>
      <View pointerEvents="none" accessible={false} style={[styles.corner, styles.topLeft]} />
      <View pointerEvents="none" accessible={false} style={[styles.corner, styles.topRight]} />
      <View pointerEvents="none" accessible={false} style={[styles.corner, styles.bottomLeft]} />
      <View pointerEvents="none" accessible={false} style={[styles.corner, styles.bottomRight]} />
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { padding: 20, position: 'relative' },
  dark: { backgroundColor: colors.ink },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: colors.primary },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
});
