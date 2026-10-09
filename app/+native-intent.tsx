import { getShareExtensionKey } from 'expo-share-intent';

// Share deep links go to Home, where useShareIntentContext picks up the text (expo-share-intent + Expo Router).
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return '/';
    return path;
  } catch {
    return '/';
  }
}
