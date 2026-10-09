import { requireNativeModule } from 'expo';
import { Camera } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';

interface VisionModule {
  pickImage(): Promise<string | null>;
  recognizeText(imageUri: string): Promise<string>;
}

function validateImageUri(uri: string): void {
  if (typeof uri !== 'string' || !/^(file|content):\/\//.test(uri)) {
    throw new TypeError('Choose a local image: only file:// and content:// URIs are supported.');
  }
}

/** Copies a picked image to app cache without requesting broad library access. */
export async function pickImage(): Promise<string | null> {
  const vision = requireNativeModule<VisionModule>('OopsScamVision');
  const uri = await vision.pickImage();
  if (uri === null) return null;
  validateImageUri(uri);
  return uri;
}

/** Returns editable OCR text; empty recognition is an explicit error. */
export async function recognizeScreenshot(uri: string): Promise<string> {
  validateImageUri(uri);
  const vision = requireNativeModule<VisionModule>('OopsScamVision');
  const text = await vision.recognizeText(uri);
  if (typeof text !== 'string') {
    throw new TypeError('OCR returned invalid text. Rebuild the native app and try again.');
  }
  if (!text.trim()) {
    throw new Error(
      'Walang nabasang text. Pumili ng mas malinaw na screenshot o mag-paste ng text.',
    );
  }
  return text;
}

/** Decodes QR images locally; ambiguous images must be cropped by the user. */
export async function decodeQrImage(uri: string): Promise<string> {
  validateImageUri(uri);
  const codes = await Camera.scanFromURLAsync(uri, ['qr']);
  if (!Array.isArray(codes) || codes.length !== 1) {
    throw new Error('Pumili ng image na may isang malinaw na QR code.');
  }
  const data = codes[0]?.data;
  if (typeof data !== 'string' || !data.trim()) {
    throw new TypeError('Walang laman ang QR code. Pumili ng ibang QR image.');
  }
  return data;
}

/** Deletes only app-cache copies; original content-provider images are left with their owner. */
export function deleteTemporaryImage(uri: string): void {
  validateImageUri(uri);
  if (!uri.startsWith('file://')) return;
  const segments = decodeURIComponent(uri).split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) return;
  const file = new File(uri);
  const cacheRoot = Paths.cache.uri.replace(/\/+$/, '') + '/';
  if (file.uri.startsWith(cacheRoot) && file.exists) file.delete();
}

// Only our native picker's named files belong to us; other cached files are untouched.
export function cleanupAbandonedImages(): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && /^oopsscam-picked-.*\.image$/.test(entry.name)) {
        try {
          entry.delete();
        } catch {
          /* A later startup can retry an owned file. */
        }
      }
    }
  } catch {
    /* An unavailable cache must not prevent text checks. */
  }
}
