import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Heading } from '@/components/Heading';
import { MessageInput } from '@/components/MessageInput';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import {
  acknowledgeSession,
  createSession,
  discardSession,
  editSession,
  PARTIAL_NOTICE,
  readScreenshot,
  submitSession,
} from '@/session';
import { useSession } from '@/useSession';
import { useAppActive, useReadiness } from '@/useReadiness';
import { colors, spacing } from '@/theme';
import { deleteTemporaryImage, pickImage } from '@/vision/images';

export default function ScreenshotScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const session = useSession(sessionId);
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const lock = useRef(false);
  const pickerLock = useRef(false);
  const input = useRef<TextInput>(null);
  const active = useAppActive();
  const labels = useReadiness();
  const insets = useSafeAreaInsets();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (active) lock.current = false;
  }, [active]);

  useEffect(() => {
    if (!sessionId) return;
    void readScreenshot(sessionId).catch(() => {
      if (alive.current)
        setNotice('Could not extract text from screenshot. Please try a clearer screenshot.');
    });
  }, [sessionId]);

  const busy = session?.extraction === 'busy';

  const retry = async () => {
    if (pickerLock.current) return;
    pickerLock.current = true;
    setPicking(true);
    setNotice(null);
    try {
      const uri = await pickImage();
      if (!uri) return;
      if (!alive.current) {
        deleteTemporaryImage(uri);
        return;
      }
      if (sessionId) discardSession(sessionId);
      router.replace({
        pathname: '/screenshot',
        params: { sessionId: createSession('', 'screenshot', uri) },
      });
    } catch {
      if (alive.current)
        setNotice('Unable to select image. Please try again or paste text in Home.');
    } finally {
      pickerLock.current = false;
      if (alive.current) setPicking(false);
    }
  };

  const check = () => {
    if (!sessionId || lock.current) return;
    if (!submitSession(sessionId)) {
      setNotice('Please review the notice or enter text before checking.');
      input.current?.focus();
      return;
    }
    lock.current = true;
    router.push({ pathname: '/result', params: { sessionId } });
  };

  return (
    <Screen keyboardOffset={insets.top + 56}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading
          title="Review Extracted Text"
          description="Text read from images (OCR) may have typos. Review and edit the text before checking."
        />
        {!session ? (
          <Notice message="No screenshot selected. Please choose an image or return to Home." />
        ) : (
          <>
            {busy ? (
              <>
                <ActivityIndicator color={colors.primary} />
                <Text accessibilityLiveRegion="polite">Reading screenshot locally on your phone…</Text>
              </>
            ) : null}
            {session.extraction === 'error' ? (
              <Notice message="No readable text found. Please try a clearer screenshot, or type the message in Home." />
            ) : null}
            {session.ocrMs !== undefined ? (
              <Text role="label" accessibilityLiveRegion="polite" testID="ocr-notice">
                Extracted in {(session.ocrMs / 1000).toFixed(1)}s. Review and edit the text below.
              </Text>
            ) : null}
            <MessageInput
              value={session.text}
              inputRef={input}
              testID="ocr-text"
              label="Text from screenshot"
              editable={!busy}
              onChangeText={(raw) => {
                if (sessionId) editSession(sessionId, raw);
              }}
            />
            {session.truncated ? (
              <Notice
                message={PARTIAL_NOTICE}
                onAcknowledge={
                  session.acknowledged
                    ? undefined
                    : () => {
                        if (sessionId) acknowledgeSession(sessionId);
                      }
                }
              />
            ) : null}
            <Button
              title="Check Extracted Text"
              onPress={check}
              testID="analyze-screenshot"
              disabled={busy || picking || (session.truncated && !session.acknowledged)}
            />
          </>
        )}
        {notice ? <Notice message={notice} /> : null}
        <Button
          title="Choose Another Screenshot"
          variant="secondary"
          onPress={retry}
          busy={picking}
          disabled={busy}
        />
        <Button
          title="Back to Home"
          variant="secondary"
          onPress={() => {
            if (sessionId) discardSession(sessionId);
            router.dismissTo('/');
          }}
        />
        <StatusStrip llmLabel={labels.llmLabel} classifierLabel={labels.classifierLabel} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.md, paddingBottom: spacing.xl } });
