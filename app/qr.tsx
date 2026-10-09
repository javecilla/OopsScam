import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { MAX_INPUT_CHARS } from '@/config';
import { colors, spacing } from '@/theme';
import { decodeQrImage, deleteTemporaryImage, pickImage } from '@/vision/images';

export default function QrScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scanned = useRef(false);

  const check = (data: string): void => {
    if (typeof data !== 'string' || !data.trim()) {
      throw new TypeError('Walang laman ang QR code. Subukan ang ibang QR.');
    }
    router.replace({
      pathname: '/result',
      params: {
        text: data.slice(0, MAX_INPUT_CHARS),
        truncated: data.length > MAX_INPUT_CHARS ? '1' : '0',
        inputType: 'qr',
      },
    });
  };

  const onScan = (result: BarcodeScanningResult): void => {
    if (scanned.current || busy) return;
    scanned.current = true;
    try {
      check(result.data);
    } catch (error) {
      scanned.current = false;
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const enableCamera = async (): Promise<void> => {
    try {
      const response = await requestPermission();
      if (!response.granted) {
        setNotice(
          'Hindi pinayagan ang camera. Puwede kang pumili ng QR image, o payagan ang camera sa Settings.',
        );
      }
    } catch (error) {
      setNotice(
        `Hindi mabuksan ang camera: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const pickQr = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      const uri = await pickImage();
      if (uri === null) return;
      let data: string;
      try {
        data = await decodeQrImage(uri);
      } finally {
        deleteTemporaryImage(uri);
      }
      check(data);
    } catch (error) {
      setNotice(`Hindi mabasa ang QR: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text>
          Itutok sa isang QR code. Susuriin ang laman nito sa phone; hindi bubuksan ang link.
        </Text>
        {permission?.granted && !busy ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onScan}
            onMountError={(error) => setNotice(`Hindi mabuksan ang camera: ${error.message}`)}
            testID="qr-camera"
          />
        ) : (
          <Button
            title="Payagan ang camera"
            variant="primary"
            onPress={enableCamera}
            testID="qr-enable-camera"
            disabled={busy}
          />
        )}
        <Button
          title={busy ? 'Binabasa ang QR…' : 'Pumili ng QR image'}
          variant="secondary"
          onPress={pickQr}
          testID="qr-pick-image"
          disabled={busy}
        />
        {notice ? (
          <Text accessibilityLiveRegion="polite" testID="qr-notice">
            {notice}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  camera: { flex: 1, minHeight: 240, borderRadius: spacing.sm, backgroundColor: colors.surface },
});
