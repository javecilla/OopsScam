import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import {
  cleanupAbandonedImages,
  decodeQrImage,
  deleteTemporaryImage,
  recognizeScreenshot,
} from '../images';
import { requireNativeModule } from 'expo';
jest.mock('expo', () => ({ requireNativeModule: jest.fn() }));
jest.mock('expo-camera', () => ({ Camera: { scanFromURLAsync: jest.fn(async () => []) } }));
jest.mock('expo-file-system', () => {
  let paths: string[] = [];
  let deleted: string[] = [];
  class File {
    uri: string;
    exists = true;
    constructor(uri: string) {
      this.uri = uri;
    }
    get name() {
      return this.uri.split('/').pop();
    }
    delete() {
      deleted.push(this.uri);
    }
  }
  class Directory {
    list() {
      return paths.map((path) => new File(path));
    }
  }
  return {
    File,
    Directory,
    Paths: { cache: { uri: 'file:///app/cache/' } },
    setEntries: (values: string[]) => {
      paths = values;
      deleted = [];
    },
    deleted: () => deleted,
  };
});
const fs = jest.requireMock<{ setEntries: (paths: string[]) => void; deleted: () => string[] }>(
  'expo-file-system',
);
const decodeQr = jest.fn<() => Promise<string[]>>();
const recognizeText = jest.fn<() => Promise<string>>();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(requireNativeModule).mockReturnValue({ decodeQr, recognizeText });
  fs.setEntries([]);
});
afterEach(() => {
  jest.useRealTimers();
});
test('cleanup preserves original images and similarly named cache siblings', () => {
  deleteTemporaryImage('content://photos/original');
  deleteTemporaryImage('file:///app/cache-other/original.png');
  deleteTemporaryImage('file:///app/cache/../files/original.png');
  deleteTemporaryImage('file:///app/cache/%2e%2e/files/original.png');
  deleteTemporaryImage('file:///app/cache/owned.image');
  expect(fs.deleted()).toEqual(['file:///app/cache/owned.image']);
});
test('startup cleanup removes only picker-owned filenames', () => {
  fs.setEntries([
    'file:///app/cache/oopsscam-picked-123.image',
    'file:///app/cache/other.png',
    'file:///app/cache/model.gguf',
  ]);
  cleanupAbandonedImages();
  expect(fs.deleted()).toEqual(['file:///app/cache/oopsscam-picked-123.image']);
});
test('vision rejects remote image URIs before reaching native code', async () => {
  await expect(recognizeScreenshot('https://example.com/image.png')).rejects.toThrow('local image');
  expect(() => deleteTemporaryImage('https://example.com/image.png')).toThrow('local image');
});
test('ambiguous QR images never become a guessed payload', async () => {
  decodeQr.mockResolvedValue(['https://one.example', 'https://two.example']);
  await expect(decodeQrImage('file:///app/cache/image.png')).rejects.toThrow('isang malinaw');
});
test('QR images use the native bundled decoder and preserve the payload', async () => {
  decodeQr.mockResolvedValue(['https://example.com/check']);
  await expect(decodeQrImage('content://photos/qr')).resolves.toBe('https://example.com/check');
  expect(decodeQr).toHaveBeenCalledWith('content://photos/qr');
});
test.each([{ codes: [] }, { codes: [''] }])(
  'unreadable QR results are rejected: $codes',
  async ({ codes }) => {
    decodeQr.mockResolvedValue(codes);
    await expect(decodeQrImage('file:///app/cache/image.png')).rejects.toThrow();
  },
);
test.each(['qr', 'ocr'])('a stuck %s bridge rejects instead of loading forever', async (kind) => {
  jest.useFakeTimers();
  decodeQr.mockReturnValue(new Promise(() => {}));
  recognizeText.mockReturnValue(new Promise(() => {}));
  const operation = kind === 'qr' ? decodeQrImage : recognizeScreenshot;
  const assertion = expect(operation('file:///app/cache/image.png')).rejects.toThrow('too long');
  await jest.advanceTimersByTimeAsync(20000);
  await assertion;
  expect(jest.getTimerCount()).toBe(0);
});
