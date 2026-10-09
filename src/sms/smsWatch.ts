// JS side of the optional SMS auto-check module (modules/sms-watch). If the native module is
// missing, every call is a no-op so paste and share keep working (FR-SM-07).

import { NativeModule, requireOptionalNativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

import type { Verdict } from '../core/types';

type SmsWatchEvents = { onSmsOpen: (event: { text: string }) => void };

declare class SmsWatchModule extends NativeModule<SmsWatchEvents> {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): boolean;
  notify(verdict: Verdict, flagTl: string, text: string): void;
  consumeLaunchText(): string | null;
}

const native = requireOptionalNativeModule<SmsWatchModule>('SmsWatch');

export const autoCheckAvailable = native !== null;

export function isAutoCheckOn(): boolean {
  return native?.isEnabled() ?? false;
}

export function notifyRisk(verdict: Verdict, flagTl: string, text: string): void {
  native?.notify(verdict, flagTl, text);
}

// FR-SM-01: RECEIVE_SMS (and POST_NOTIFICATIONS on Android 13+), then turn on. Never READ_SMS.
export async function turnOnAutoCheck(): Promise<boolean> {
  if (!native) return false;
  const wanted = [PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    wanted.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const granted = await PermissionsAndroid.requestMultiple(wanted);
  const ok = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === 'granted';
  native.setEnabled(ok);
  return ok;
}

// FR-SM-06: the receiver reads this on every text, so checks stop immediately.
export function turnOffAutoCheck(): void {
  native?.setEnabled(false);
}

// If RECEIVE_SMS was revoked in system settings, turn the setting off so the status strip is accurate.
export async function syncAutoCheck(): Promise<boolean> {
  if (!native?.isEnabled()) return false;
  const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  if (!granted) native.setEnabled(false);
  return granted;
}

// FR-SM-05: the text of a tapped notification, on cold start or while running.
export function consumeLaunchText(): string | null {
  return native?.consumeLaunchText() ?? null;
}

export function addSmsOpenListener(listener: (text: string) => void): () => void {
  const sub = native?.addListener('onSmsOpen', (event) => listener(event.text));
  return () => sub?.remove();
}
