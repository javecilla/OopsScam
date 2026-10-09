import { describe, expect, it } from '@jest/globals';

import { highlightParts } from '../highlight';

const join = (parts: { text: string }[]) => parts.map((p) => p.text).join('');

describe('highlightParts', () => {
  it('highlights evidence case-insensitively and keeps the full message', () => {
    const msg = 'Your account is SUSPENDED. Visit gcash-verify.xyz now';
    const parts = highlightParts(msg, ['suspended', 'gcash-verify.xyz']);
    expect(join(parts)).toBe(msg);
    expect(parts.filter((p) => p.highlighted).map((p) => p.text)).toEqual([
      'SUSPENDED',
      'gcash-verify.xyz',
    ]);
  });

  it('merges overlapping evidence', () => {
    const parts = highlightParts('send your OTP now', ['send your OTP', 'OTP now']);
    expect(parts).toEqual([{ text: 'send your OTP now', highlighted: true }]);
  });

  it('ignores evidence not found and empty evidence', () => {
    expect(highlightParts('hello', ['bye', ''])).toEqual([{ text: 'hello', highlighted: false }]);
    expect(highlightParts('', ['x'])).toEqual([]);
  });
});
