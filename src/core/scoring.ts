// Rules score R (FR-RL-08): sum of flag points, minus the real-OTP deduction, clamped to 0..100.

import type { Flag } from './types';

const REAL_OTP_DEDUCTION = 60;

export const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

export function rulesScore(flags: Flag[], realOtp: boolean): number {
  const sum = flags.reduce((total, f) => total + f.points, 0);
  return clamp100(sum - (realOtp ? REAL_OTP_DEDUCTION : 0));
}
