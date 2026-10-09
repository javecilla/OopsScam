import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { MAX_INPUT_CHARS } from '@/config';
import { colors, fontSize, spacing } from '@/theme';
import { deleteTemporaryImage, recognizeScreenshot } from '@/vision/images';

export default function ScreenshotScreen() {
  const router = useRouter();
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const read = async (): Promise<void> => {
      try {
        const start = performance.now();
        let extracted: string;
        try {
          extracted = await recognizeScreenshot(uri);
        } finally {
          deleteTemporaryImage(uri);
        }
        if (!active) return;
        setText(extracted.slice(0, MAX_INPUT_CHARS));
        const timing = `Nabasa sa ${((performance.now() - start) / 1000).toFixed(1)} s. Suriin at itama ang text bago i-check.`;
        setNotice(
          extracted.length > MAX_INPUT_CHARS
            ? `${timing} Pinutol sa ${MAX_INPUT_CHARS} characters.`
            : timing,
        );
      } catch (error) {
        if (active)
          setNotice(
            `Hindi mabasa ang screenshot: ${error instanceof Error ? error.message : String(error)}`,
          );
      } finally {
        if (active) setBusy(false);
      }
    };
    void read();
    return () => {
      active = false;
    };
  }, [uri]);

  const check = (): void => {
    if (!text.trim()) {
      setNotice('Mag-type muna ng text na gusto mong i-check.');
      return;
    }
    router.push({ pathname: '/result', params: { text, inputType: 'image' } });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text>Text mula sa screenshot</Text>
        {busy ? <ActivityIndicator color={colors.primary} /> : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" testID="ocr-notice">
            {notice}
          </Text>
        ) : null}
        <TextInput
          value={text}
          onChangeText={(value) => setText(value.slice(0, MAX_INPUT_CHARS))}
          editable={!busy}
          multiline
          textAlignVertical="top"
          style={styles.input}
          accessibilityLabel="ocr-text"
          testID="ocr-text"
        />
        <Button
          title="I-check ang text"
          variant="primary"
          onPress={check}
          testID="analyze-screenshot"
          disabled={busy}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  input: {
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
