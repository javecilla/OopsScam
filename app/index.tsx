import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import { MAX_INPUT_CHARS } from '@/config';
import { statusLabels } from '@/pipeline';
import { colors, fontSize, spacing } from '@/theme';
import { pickImage } from '@/vision/images';

// FR-IN-04: fictional samples, one scam and one genuine OTP.
const SAMPLES = [
  {
    label: 'Sample: pekeng GCash alert',
    text: 'GCash Advisory: Your account will be SUSPENDED within 24 hours due to unusual activity. Verify now at gcash-verify.xyz/login to avoid deactivation.',
  },
  {
    label: 'Sample: totoong OTP',
    text: 'Your GCash OTP is 482913. Do not share this code with anyone, including GCash employees. It expires in 5 minutes.',
  },
];

const TRUNCATED_NOTICE = `Pinutol sa ${MAX_INPUT_CHARS.toLocaleString()} characters ang message.`;
const LABELS_REFRESH_MS = 1000;

export default function HomeScreen() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [labels, setLabels] = useState(statusLabels);
  const [picking, setPicking] = useState(false);

  // Keep the status strip current while the model loads in the background.
  useEffect(() => {
    const id = setInterval(() => {
      const next = statusLabels();
      setLabels((prev) => (prev.llmLabel === next.llmLabel ? prev : next));
    }, LABELS_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // FR-IN-01: cap the input and tell the user.
  const load = (raw: string): string => {
    const capped = raw.slice(0, MAX_INPUT_CHARS);
    setText(capped);
    setNotice(raw.length > MAX_INPUT_CHARS ? TRUNCATED_NOTICE : null);
    return capped;
  };

  const check = (message: string) => {
    if (!message.trim()) {
      // FR-IN-05
      setNotice('Mag-paste o mag-type muna ng message na gusto mong i-check.');
      return;
    }
    router.push({ pathname: '/result', params: { text: message } });
  };

  // FR-IN-03 / USE-02: shared text opens here and goes straight to the result.
  useEffect(() => {
    if (!hasShareIntent) return;
    const image = shareIntent.files?.find((file) => file.mimeType?.startsWith('image/'));
    if (image) {
      resetShareIntent();
      router.push({ pathname: '/screenshot', params: { uri: image.path } });
      return;
    }
    const shared = shareIntent.text ?? shareIntent.webUrl ?? '';
    resetShareIntent();
    if (!shared.trim()) return;
    const truncated = shared.length > MAX_INPUT_CHARS ? '1' : '0';
    router.push({
      pathname: '/result',
      params: { text: shared.slice(0, MAX_INPUT_CHARS), truncated },
    });
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  // FR-IN-02 / SEC-04: the clipboard is read only when the user taps Paste.
  const paste = async () => {
    const clip = await Clipboard.getStringAsync();
    if (clip) load(clip);
    else setNotice('Walang laman ang clipboard.');
  };

  const pickScreenshot = async (): Promise<void> => {
    setPicking(true);
    setNotice(null);
    try {
      const uri = await pickImage();
      if (uri !== null) router.push({ pathname: '/screenshot', params: { uri } });
    } catch (error) {
      setNotice(
        `Hindi makapili ng screenshot: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setPicking(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Scam ba ito?</Text>
        <Text style={styles.subtitle}>
          I-paste o i-share dito ang text o link. Sa phone mo lang ito sinusuri, walang internet.
        </Text>

        <TextInput
          testID="message-input"
          style={styles.input}
          value={text}
          onChangeText={load}
          placeholder="I-paste ang message dito…"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Message na i-check"
        />
        {notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Paste" variant="secondary" onPress={paste} testID="paste-message" />
          </View>
          <View style={styles.flex}>
            <Button title="I-check" onPress={() => check(text)} testID="analyze-message" />
          </View>
        </View>

        <Button
          title={picking ? 'Binubuksan ang gallery…' : 'Pumili ng screenshot'}
          variant="secondary"
          onPress={pickScreenshot}
          testID="pick-screenshot"
          disabled={picking}
        />
        <Button
          title="I-check ang QR"
          variant="secondary"
          onPress={() => router.push('/qr')}
          testID="open-qr"
        />

        <Text style={styles.section}>Subukan ang sample</Text>
        {SAMPLES.map((s) => (
          <Button key={s.label} title={s.label} variant="secondary" onPress={() => check(s.text)} />
        ))}
      </ScrollView>
      <StatusStrip llmLabel={labels.llmLabel} classifierLabel={labels.classifierLabel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.sm,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  notice: {
    color: colors.suspicious,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  section: {
    marginTop: spacing.sm,
    fontWeight: '600',
  },
});
