import { describe, expect, it } from '@jest/globals';

import { analyze } from '../analyze';
import { applyQwenClassification } from '../qwen';

describe('Qwen classification with rule safeguards', () => {
  it('uses the Qwen label when the message has no rule flags', () => {
    const rules = analyze('Magandang umaga.', null);
    const result = applyQwenClassification(rules, 'scam', 'verified-qwen', 2500);

    expect(rules.verdict).toBe('low_risk');
    expect(result.verdict).toBe('scam');
    expect(result.qwenVerdict).toBe('scam');
    expect(result.mlProbability).toBeNull();
    expect(result.timingsMs.ml).toBeNull();
    expect(result.classificationModel).toBe('verified-qwen');
    expect(result.classificationMs).toBe(2500);
  });

  it('keeps the rules floor when Qwen predicts Low risk for an OTP request', () => {
    const rules = analyze('Ipadala ang iyong OTP para ma-verify ang account.', null);
    const result = applyQwenClassification(rules, 'low_risk', 'verified-qwen', 2000);

    expect(rules.verdict).toBe('scam');
    expect(result.verdict).toBe('scam');
    expect(result.qwenVerdict).toBe('low_risk');
    expect(result.score).toBe(rules.score);
    expect(rules.timingsMs.llm).toBeNull();
  });

  it('rejects an analysis that already contains an ML probability', () => {
    const legacy = analyze('Magandang umaga.', () => 0.5);

    expect(() => applyQwenClassification(legacy, 'suspicious', 'verified-qwen', 2000)).toThrow(
      'rules-only analysis',
    );
  });
});
