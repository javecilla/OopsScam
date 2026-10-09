import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Heading } from '@/components/Heading';
import { MessageInput } from '@/components/MessageInput';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScanFrame } from '@/components/ScanFrame';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import {
  acknowledgeSession,
  createSession,
  editSession,
  getSession,
  PARTIAL_NOTICE,
  replaceHomeInput,
  setSessionNotice,
  submitSession,
} from '@/session';
import {
  addSmsOpenListener,
  autoCheckAvailable,
  consumeLaunchText,
  isAutoCheckOn,
  syncAutoCheck,
  turnOffAutoCheck,
  turnOnAutoCheck,
} from '@/sms/smsWatch';
import { useHomeSession } from '@/useSession';
import { useAppActive, useReadiness } from '@/useReadiness';
import { brutalist, colors, fonts, fontSize, shape, spacing } from '@/theme';
import { deleteTemporaryImage, pickImage } from '@/vision/images';

const AUTO_CHECK_EXPLAIN =
  'When enabled, every NEW incoming text message is checked privately on your phone. If a scam is detected, you will receive an alert. We do not read your inbox history, do not save your messages, and the app runs completely offline without sending data anywhere. You can turn this off anytime.';

export default function HomeScreen() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const session = useHomeSession();
  const draftId = session.id;
  const setNotice = (message: string | null) => {
    setSessionNotice(draftId, message);
  };
  const [picking, setPicking] = useState(false);
  const [autoCheck, setAutoCheck] = useState(isAutoCheckOn);
  const pickerLock = useRef(false);
  const navigating = useRef(false);
  const lastShare = useRef<typeof shareIntent | null>(null);
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
    if (active) navigating.current = false;
  }, [active]);

  const openResult = (id: string) => {
    if (navigating.current) return;
    if (!submitSession(id)) {
      setNotice(
        getSession(id)?.text.trim()
          ? 'Please review the partial input notice before checking.'
          : 'Please paste or type a message first.',
      );
      input.current?.focus();
      return;
    }
    navigating.current = true;
    router.push({ pathname: '/result', params: { sessionId: id } });
  };

  useEffect(() => {
    if (!hasShareIntent) {
      lastShare.current = null;
      return;
    }
    if (lastShare.current === shareIntent) return;
    lastShare.current = shareIntent;
    const image = shareIntent.files?.find((file) => file.mimeType?.startsWith('image/'));
    const shared = shareIntent.text ?? shareIntent.webUrl ?? '';
    resetShareIntent();
    if (image) {
      const id = createSession('', 'screenshot', image.path);
      router.push({ pathname: '/screenshot', params: { sessionId: id } });
    } else if (shared.trim()) {
      const id = replaceHomeInput(shared, 'share');
      if (!getSession(id)?.truncated && submitSession(id)) {
        navigating.current = true;
        router.push({ pathname: '/result', params: { sessionId: id } });
      }
    } else setSessionNotice(draftId, 'No readable text or image found in shared content.');
  }, [hasShareIntent, shareIntent, resetShareIntent, router, draftId]);

  // Handle incoming SMS notifications (FR-SM-05)
  useEffect(() => {
    if (!autoCheckAvailable) return;
    syncAutoCheck().then(setAutoCheck);
    const open = (sms: string) => {
      const id = replaceHomeInput(sms, 'text');
      if (submitSession(id)) {
        navigating.current = true;
        router.push({ pathname: '/result', params: { sessionId: id } });
      }
    };
    const launched = consumeLaunchText();
    if (launched) open(launched);
    return addSmsOpenListener(open);
  }, [router]);

  const toggleAutoCheck = (on: boolean) => {
    if (!on) {
      turnOffAutoCheck();
      setAutoCheck(false);
      return;
    }
    Alert.alert('Auto-check new text messages?', AUTO_CHECK_EXPLAIN, [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Turn On',
        onPress: async () => {
          const ok = await turnOnAutoCheck();
          setAutoCheck(ok);
          if (!ok) setNotice('Auto-check was not enabled: SMS permission is required.');
        },
      },
    ]);
  };

  const paste = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      if (!alive.current) return;
      if (!clip) {
        setNotice('Your clipboard is empty. You can type or paste directly here.');
        return;
      }
      replaceHomeInput(clip);
      setNotice(null);
    } catch {
      if (alive.current)
        setNotice('Could not access clipboard. Please paste manually into the input box.');
    }
  };

  const pickScreenshot = async () => {
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
      router.push({
        pathname: '/screenshot',
        params: { sessionId: createSession('', 'screenshot', uri) },
      });
    } catch {
      if (alive.current) setNotice('Unable to select image. Please try again or paste text.');
    } finally {
      pickerLock.current = false;
      if (alive.current) setPicking(false);
    }
  };

  return (
    <Screen keyboardOffset={insets.top + 56}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Heading
          title="Is This a Scam?"
          description="Check suspicious messages, links, screenshots, or QR codes safely on your device before tapping."
        />

        <ScanFrame>
          <MessageInput
            value={session?.text ?? ''}
            inputRef={input}
            onChangeText={(raw) => {
              editSession(draftId, raw);
              setNotice(null);
            }}
          />
        </ScanFrame>

        {session?.truncated ? (
          <Notice
            message={PARTIAL_NOTICE}
            onAcknowledge={session.acknowledged ? undefined : () => acknowledgeSession(draftId)}
          />
        ) : null}

        {session.notice ? <Notice message={session.notice} /> : null}

        <View style={styles.utilities}>
          <View style={styles.utility}>
            <Button title="Paste" variant="secondary" onPress={paste} testID="paste-message" />
          </View>
          {session?.text ? (
            <View style={styles.utility}>
              <Button
                title="Clear"
                variant="secondary"
                onPress={() => {
                  replaceHomeInput('');
                  setNotice(null);
                }}
              />
            </View>
          ) : null}
        </View>

        <Button
          title="Check Message"
          onPress={() => openResult(draftId)}
          testID="analyze-message"
          disabled={!!session?.truncated && !session.acknowledged}
        />

        {autoCheckAvailable ? (
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text role="section" style={styles.toggleTitle}>
                  Auto-Check New Text Messages
                </Text>
                <Text style={styles.toggleSubtitle}>
                  Scans new SMS messages privately as they arrive
                </Text>
              </View>
              <Switch
                value={autoCheck}
                onValueChange={toggleAutoCheck}
                trackColor={{ true: colors.primary, false: colors.softBorder }}
                thumbColor={colors.onPrimary}
                accessibilityLabel="Auto-check new text messages"
                testID="sms-auto-check"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text role="section" accessibilityRole="header">
            Check an Image or QR Code
          </Text>
          <Button
            title="Select Screenshot"
            variant="secondary"
            onPress={pickScreenshot}
            testID="pick-screenshot"
            busy={picking}
          />
          <Button
            title="Scan QR Code"
            variant="secondary"
            onPress={() => router.push('/qr')}
            testID="open-qr"
            disabled={picking}
          />
        </View>

        <View style={styles.section}>
          <Text role="section" accessibilityRole="header">
            Scan History
          </Text>
          <Text style={styles.muted}>
            Past scan results are safely saved offline on your phone.
          </Text>
          <Button
            title="View Scan History"
            variant="secondary"
            onPress={() => router.push('/history' as any)}
            testID="open-history"
            disabled={picking}
          />
        </View>

        <StatusStrip
          llmLabel={labels.llmLabel}
          classifierLabel={labels.classifierLabel}
          note={
            autoCheckAvailable
              ? `Auto-check text messages: ${autoCheck ? 'ON' : 'OFF'}`
              : undefined
          }
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  utilities: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  utility: { flexGrow: 1, flexBasis: 120 },
  section: { marginTop: spacing.md, gap: spacing.sm },
  toggleCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: shape.panel,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontSize: fontSize.body,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  toggleSubtitle: {
    fontSize: fontSize.small,
    color: colors.muted,
  },
  muted: { color: colors.muted },
});
