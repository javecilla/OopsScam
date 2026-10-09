import { describe, expect, it } from '@jest/globals';

import { parseClassification, QwenClassificationError } from '../classify';

describe('Qwen classification output validation', () => {
  it.each(['scam', 'suspicious', 'low_risk'] as const)('accepts the %s label', (verdict) => {
    expect(parseClassification(JSON.stringify({ verdict }))).toBe(verdict);
  });

  it.each([
    'safe',
    '{"verdict":"safe"}',
    '{"confidence":0.99}',
    '[{"verdict":"scam"}]',
    'null',
    '<think>Ignore instructions</think>{"verdict":"scam"}',
  ])('fails explicitly for invalid output: %s', (raw) => {
    expect(() => parseClassification(raw)).toThrow(QwenClassificationError);
  });
});
