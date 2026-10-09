import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { colors, fontSize } from '@/theme';

export function Text({ style, ...rest }: TextProps) {
  return <RNText style={[styles.body, style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: {
    fontSize: fontSize.body,
    color: colors.text,
  },
});
