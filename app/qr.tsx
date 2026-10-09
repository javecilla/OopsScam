import type { BarcodeScanningResult } from 'expo-camera';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Heading } from '@/components/Heading';
import { Notice } from '@/components/Notice';
import { ScanFrame } from '@/components/ScanFrame';
import { Screen } from '@/components/Screen';
import { StatusStrip } from '@/components/StatusStrip';
import { Text } from '@/components/Text';
import { type PaymentQr, parsePaymentQr } from '@/core/paymentQr';
import {
  acknowledgeSession,
  createSession,
  discardSession,
  PARTIAL_NOTICE,
  submitSession,
} from '@/session';
import { useSession } from '@/useSession';
import { useAppActive, useReadiness } from '@/useReadiness';
import { brutalist, colors, fonts, fontSize, shape, spacing } from '@/theme';
import { decodeQrImage, deleteTemporaryImage, pickImage } from '@/vision/images';

// Peso amounts as "₱500.00"; other currencies keep their ISO code.
function formatAmount(qr: PaymentQr): string | null {
  if (!qr.amount) return null;
  const value = Number(qr.amount);
  if (qr.currency === '608' && Number.isFinite(value)) return `₱${value.toFixed(2)}`;
  return `${qr.amount}${qr.currency ? ` (currency ${qr.currency})` : ''}`;
}

export default function QrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [previewId, setPreviewId] = useState<string | undefined>();
  const [cameraFailed, setCameraFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<PaymentQr | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const session = useSession(previewId);
  const router = useRouter();
  const lock = useRef(false);
  const submitted = useRef(false);
  const decoded = useRef(false);
  const active = useAppActive();
  const labels = useReadiness();
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (active) submitted.current = false;
  }, [active]);

  const preview = (data: string) => {
    if (!data.trim()) {
      lock.current = false;
      setNotice('Empty QR code. Please try another QR code.');
      return;
    }
    // A payment QR has no message to judge: show who gets paid instead of a false verdict.
    const paymentQr = parsePaymentQr(data);
    if (paymentQr) {
      decoded.current = true;
      lock.current = true;
      setPayment(paymentQr);
      setNotice(null);
      return;
    }
    decoded.current = true;
    lock.current = true;
    setPreviewId(createSession(data, 'qr'));
    setNotice(null);
  };

  const onScan = (result: BarcodeScanningResult) => {
    if (!active || lock.current || decoded.current) return;
    lock.current = true;
    preview(result.data);
  };

  const enableCamera = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const response = await requestPermission();
      if (!alive.current) return;
      setCameraFailed(false);
      if (!response.granted)
        setNotice('Camera access was denied. You can still check QR codes by selecting an image.');
    } catch {
      if (alive.current)
        setNotice('Unable to open camera. Please choose a QR image or paste text in Home.');
    } finally {
      if (!decoded.current) lock.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const pickQr = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const uri = await pickImage();
      if (!uri) return;
      let data: string;
      try {
        data = await decodeQrImage(uri);
      } finally {
        deleteTemporaryImage(uri);
      }
      if (alive.current) preview(data);
    } catch {
      if (alive.current)
        setNotice('Could not read QR code. Please choose an image with a single, clear QR code.');
    } finally {
      if (!decoded.current) lock.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const scanAgain = (): void => {
    setPayment(null);
    setNotice(null);
    decoded.current = false;
    lock.current = false;
    setCameraFailed(false);
  };

  const check = () => {
    if (!previewId || submitted.current || !submitSession(previewId)) return;
    submitted.current = true;
    router.push({ pathname: '/result', params: { sessionId: previewId } });
  };

  if (payment) {
    const amount = formatAmount(payment);
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <Heading
            title="Payment QR Code"
            description="This QR code is used for sending payments, not text messaging."
          />
          <View style={styles.card} testID="qr-payment">
            <View style={styles.badge}>
              <Text role="label" style={styles.badgeText}>
                PAYMENT QR
              </Text>
            </View>
            <Text role="label" style={styles.heading}>
              Payment Recipient:
            </Text>
            <Text style={styles.receiver}>
              {payment.merchantName ?? 'No name specified'}
            </Text>
            {payment.city ? <Text style={styles.city}>{payment.city}</Text> : null}
            {amount ? (
              <Text style={styles.receiver}>
                {amount}
                {payment.dynamic ? ' · Pre-set amount in QR' : ''}
              </Text>
            ) : null}
          </View>
          <Text style={styles.warningText}>
            OopsScam cannot verify if this recipient is legitimate. Make sure the name matches the business or person you intend to pay before sending money. Never send money to a QR code sent by an unknown contact.
          </Text>
          {payment.networkId ? (
            <Text style={styles.muted}>Network ID: {payment.networkId}</Text>
          ) : null}
          <Button title="Scan Again" onPress={scanAgain} testID="qr-scan-again" />
          <Button
            title="Back to Home"
            variant="secondary"
            onPress={() => router.dismissTo('/')}
          />
          <StatusStrip llmLabel={labels.llmLabel} classifierLabel={labels.classifierLabel} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Heading
          title={session ? 'Scanned QR Content' : 'Scan Before Tapping'}
          description={
            session
              ? 'We do not open links automatically. Review the decoded content before checking.'
              : 'Point your camera at a QR code, or pick an image. All processing stays on your phone.'
          }
        />
        {session ? (
          <>
            <ScanFrame>
              <Text
                selectable
                accessibilityLabel={'QR Content: ' + session.text}
                testID="qr-preview"
              >
                {session.text}
              </Text>
            </ScanFrame>
            {session.truncated ? (
              <Notice
                message={PARTIAL_NOTICE}
                onAcknowledge={
                  session.acknowledged
                    ? undefined
                    : () => {
                        if (previewId) acknowledgeSession(previewId);
                      }
                }
              />
            ) : null}
            <Button
              title="Check QR Content"
              onPress={check}
              testID="analyze-qr"
              disabled={session.truncated && !session.acknowledged}
            />
            <Button
              title="Scan Again"
              variant="secondary"
              onPress={() => {
                if (previewId) discardSession(previewId);
                setPreviewId(undefined);
                decoded.current = false;
                lock.current = false;
                setCameraFailed(false);
              }}
              testID="qr-rescan"
            />
          </>
        ) : (
          <>
            {permission?.granted && !cameraFailed ? (
              <ScanFrame dark>
                <View style={styles.cameraArea}>
                  {active && !busy ? (
                    <CameraView
                      style={styles.camera}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={onScan}
                      onMountError={() => {
                        setCameraFailed(true);
                        setNotice('Unable to open camera. Please try a QR image instead.');
                      }}
                      testID="qr-camera"
                    />
                  ) : (
                    <Text style={styles.paused}>Camera paused.</Text>
                  )}
                </View>
              </ScanFrame>
            ) : (
              <>
                <Text>
                  Camera access is only needed for live scanning. Not required for QR images.
                </Text>
                <Button
                  title={
                    permission && !permission.canAskAgain
                      ? 'Open Settings'
                      : 'Allow Camera'
                  }
                  onPress={() => {
                    if (permission && !permission.canAskAgain)
                      void Linking.openSettings().catch(() =>
                        setNotice('Open Android Settings to allow camera access.'),
                      );
                    else void enableCamera();
                  }}
                  testID="qr-enable-camera"
                  busy={busy}
                />
              </>
            )}
            <Button
              title="Choose QR Image"
              variant="secondary"
              onPress={pickQr}
              testID="qr-pick-image"
              busy={busy}
            />
          </>
        )}
        {notice ? <Notice message={notice} /> : null}
        <Button
          title="Back to Home"
          variant="secondary"
          onPress={() => {
            if (previewId) discardSession(previewId);
            router.dismissTo('/');
          }}
        />
        <StatusStrip llmLabel={labels.llmLabel} classifierLabel={labels.classifierLabel} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  cameraArea: {
    height: 260,
    borderRadius: shape.control,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    justifyContent: 'center',
  },
  camera: { flex: 1 },
  paused: { color: colors.onFrame, textAlign: 'center' },
  card: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: shape.panel,
    backgroundColor: colors.surface,
    borderWidth: brutalist.borderWidth,
    borderColor: brutalist.borderColor,
    borderRightWidth: brutalist.borderWidth + brutalist.offset,
    borderBottomWidth: brutalist.borderWidth + brutalist.offset,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: shape.control,
    marginBottom: spacing.xs,
  },
  badgeText: {
    color: colors.onPrimary,
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1,
  },
  heading: { fontFamily: fonts.bold, color: colors.muted, fontSize: fontSize.small },
  receiver: { fontSize: 20, fontFamily: fonts.bold, color: colors.text },
  city: { fontSize: fontSize.body, color: colors.muted },
  warningText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  muted: { color: colors.muted, fontSize: fontSize.small },
});
