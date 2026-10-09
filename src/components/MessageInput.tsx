import type { Ref } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from './Text';
import { MAX_INPUT_CHARS } from '@/config';
import { brutalist, colors, fonts, fontSize, shape, spacing } from '@/theme';

export function MessageInput({
  value,
  onChangeText,
  label = 'Message to check',
  editable = true,
  inputRef,
  testID = 'message-input',
}: {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  editable?: boolean;
  inputRef?: Ref<TextInput>;
  testID?: string;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text role="label" style={styles.badgeText}>
            MESSAGE
          </Text>
        </View>
        <Text role="section" style={styles.label}>
          {label}
        </Text>
      </View>
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline
        textAlignVertical="top"
        style={styles.input}
        accessibilityLabel={label}
        placeholder="Paste or type a message, link, or text here…"
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <Text role="label" style={styles.count}>
        {value.length.toLocaleString()} / {MAX_INPUT_CHARS.toLocaleString()} characters
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.control,
    transform: [{ skewX: '-8deg' }],
  },
  badgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
  },
  label: {
    fontFamily: fonts.semibold,
  },
  input: {
    minHeight: 160,
    padding: spacing.md,
    fontSize: fontSize.body,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
    borderRadius: shape.panel,
  },
  count: { color: colors.muted, textAlign: 'right' },
});
