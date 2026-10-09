import { describe, expect, it } from '@jest/globals';

import { applyLlmOpinion, fuse, verdictFor } from '../fusion';
import { analyzeRules } from '../rules';
import { FLAG_TEXT, VERDICT_TEMPLATE, buildTemplateExplanation } from '../templates';
import type { Flag, LlmOpinion, Verdict } from '../types';

const flag = (id: Flag['id'], points: number): Flag => ({
  id,
  points,
  tl: '',
  en: '',
  evidence: '',
});
const opinion = (verdict: Verdict, confidence: number): LlmOpinion => ({
  verdict,
  confidence,
  explanationTl: 'x',
  actionTl: 'y',
});

describe('verdictFor (FR-FU-03)', () => {
  it.each([
    [0, 'low_risk'],
    [29, 'low_risk'],
    [30, 'suspicious'],
    [59, 'suspicious'],
    [60, 'scam'],
    [100, 'scam'],
  ] as [number, Verdict][])('%i -> %s', (score, verdict) => {
    expect(verdictFor(score)).toBe(verdict);
  });
});

describe('fuse (FR-FU-01/02)', () => {
  it('equals R without a classifier', () => {
    expect(fuse(42, null, [])).toBe(42);
  });

  it('blends 0.6 R + 0.4 (100 P)', () => {
    expect(fuse(50, 0.25, [])).toBe(40);
    expect(fuse(0, 1, [])).toBe(40);
  });

  it('keeps R as a floor when a hard flag is present (AT-04)', () => {
    const flags = [flag('credential_request', 60)];
    expect(fuse(60, 0.01, flags)).toBe(60);
    expect(verdictFor(fuse(60, 0.01, flags))).toBe('scam');
  });

  it('does not apply the floor without a hard flag', () => {
    expect(fuse(60, 0, [flag('urgency', 15)])).toBe(36);
  });

  it('returns an integer within 0..100', () => {
    expect(fuse(100, 1, [])).toBe(100);
    expect(Number.isInteger(fuse(33, 0.333, []))).toBe(true);
  });
});

describe('applyLlmOpinion (FR-FU-05)', () => {
  it('never lowers a verdict', () => {
    expect(applyLlmOpinion('scam', opinion('low_risk', 1)).verdict).toBe('scam');
    expect(applyLlmOpinion('suspicious', opinion('low_risk', 1)).verdict).toBe('suspicious');
  });

  it('never raises to Scam', () => {
    expect(applyLlmOpinion('suspicious', opinion('scam', 1)).verdict).toBe('suspicious');
  });

  it('raises Low risk to Suspicious only at >= 0.8 confidence', () => {
    expect(applyLlmOpinion('low_risk', opinion('scam', 0.79))).toEqual({
      verdict: 'low_risk',
      llmRaised: false,
    });
    expect(applyLlmOpinion('low_risk', opinion('scam', 0.8))).toEqual({
      verdict: 'suspicious',
      llmRaised: true,
    });
    expect(applyLlmOpinion('low_risk', opinion('suspicious', 1)).verdict).toBe('low_risk');
    expect(applyLlmOpinion('low_risk', null).verdict).toBe('low_risk');
  });
});

describe('templates (FR-LM-07, AT-15)', () => {
  const SAFE_RE = /\bsafe\b|ligtas/i;

  it('never calls a message safe', () => {
    for (const t of Object.values(FLAG_TEXT)) {
      expect(t.tl).not.toMatch(SAFE_RE);
      expect(t.en).not.toMatch(SAFE_RE);
    }
    for (const t of Object.values(VERDICT_TEMPLATE)) {
      expect(t.intro).not.toMatch(SAFE_RE);
      expect(t.action).not.toMatch(SAFE_RE);
    }
  });

  it('has a template for every verdict, capped at 400 chars', () => {
    const flags = analyzeRules(
      'GCash: account SUSPENDED. Send your OTP and pay the fee now at gcash-verify.xyz',
    ).flags;
    for (const v of ['scam', 'suspicious', 'low_risk'] as const) {
      const e = buildTemplateExplanation(v, flags);
      expect(e.source).toBe('template');
      expect(e.explanationTl.length).toBeGreaterThan(0);
      expect(e.explanationTl.length).toBeLessThanOrEqual(400);
      expect(e.actionTl.length).toBeGreaterThan(0);
    }
  });

  it('says Low risk is not a guarantee (FR-UI-03)', () => {
    expect(VERDICT_TEMPLATE.low_risk.intro).toMatch(/hindi ito garantiya/);
  });
});
