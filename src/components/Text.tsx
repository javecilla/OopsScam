import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { colors, fonts, fontSize } from '@/theme';

type Role = 'body' | 'label' | 'section' | 'headline' | 'verdict';
export function Text({ style, role = 'body', ...rest }: Omit<TextProps, 'role'> & { role?: Role }) {
  return <RNText style={[styles.body, styles[role], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: {
    fontSize: fontSize.body,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  label: { fontSize: fontSize.small, fontFamily: fonts.medium },
  section: { fontSize: fontSize.section, fontFamily: fonts.semibold },
  headline: { fontSize: fontSize.headline, fontFamily: fonts.bold },
  verdict: { fontSize: fontSize.verdict, fontFamily: fonts.bold },
});
