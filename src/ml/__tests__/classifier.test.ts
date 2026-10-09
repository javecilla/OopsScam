import { describe, expect, it } from '@jest/globals';

import weights from '../../../assets/classifier.json';
import emailWeights from '../../../assets/classifier_email.json';
import parity from '../../../training/parity.json';
import emailParity from '../../../training/parity_email.json';
import { analyze } from '../../core/analyze';
import { loadClassifier } from '../classifier';

const classifier = loadClassifier(weights);
const emailClassifier = loadClassifier(emailWeights);

describe('classifier parity with Python (FR-ML-04)', () => {
  it('loads the exported weights', () => {
    expect(classifier).not.toBeNull();
  });

  it('has at least 20 parity samples', () => {
    expect(parity.length).toBeGreaterThanOrEqual(20);
  });

  it.each(parity.map((s, i) => [i, s.text, s.p] as const))(
    'sample %i matches within 0.01',
    (_, text, p) => {
      expect(Math.abs(classifier!.score(text) - p)).toBeLessThan(0.01);
    },
  );
});

describe('email classifier parity with Python (training/train_email.py)', () => {
  it('loads the exported weights', () => {
    expect(emailClassifier).not.toBeNull();
  });

  it('has at least 20 parity samples', () => {
    expect(emailParity.length).toBeGreaterThanOrEqual(20);
  });

  it.each(emailParity.map((s, i) => [i, s.text, s.p] as const))(
    'sample %i matches within 0.01',
    (_, text, p) => {
      expect(Math.abs(emailClassifier!.score(text) - p)).toBeLessThan(0.01);
    },
  );
});

describe('loadClassifier (FR-ML-03)', () => {
  it.each([null, undefined, 42, 'x', {}, { ...weights, version: 2 }, { ...weights, word: null }])(
    'returns null for invalid weights',
    (bad) => {
      expect(loadClassifier(bad)).toBeNull();
    },
  );

  it('rejects an invalid normalize regex', () => {
    expect(loadClassifier({ ...weights, normalize: { url: '(', num: '[0-9]+' } })).toBeNull();
  });
});

describe('scoring', () => {
  it('scores under 100 ms (PERF-01)', () => {
    const t0 = performance.now();
    classifier!.score('GCash: account suspended. Verify at gcash-verify.xyz '.repeat(40));
    expect(performance.now() - t0).toBeLessThan(100);
  });

  it('plugs into analyze() and reports a probability', () => {
    const r = analyze('Hi po, pakisend ng OTP para ma-claim ang premyo.', classifier!.score);
    expect(r.mlProbability).not.toBeNull();
    expect(r.timingsMs.ml).not.toBeNull();
    expect(r.verdict).toBe('scam');
  });
});
