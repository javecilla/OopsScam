// The single analysis entry point for the app (T12) and the Node evaluation script (T15).
// Produces the verdict without the language model (FR-FU-04); the explanation is added later.

import { fuse, verdictFor } from './fusion';
import { analyzeRules } from './rules';
import type { AnalysisResult } from './types';

// Returns a scam probability 0..1. Pass nothing to run on rules alone (FR-ML-03).
export type ClassifyFn = (text: string) => number;

export function analyze(text: string, classify?: ClassifyFn | null): AnalysisResult {
  const t0 = performance.now();
  const rules = analyzeRules(text);
  const t1 = performance.now();

  let mlProbability: number | null = null;
  let mlMs: number | null = null;
  if (classify) {
    mlProbability = classify(text);
    mlMs = performance.now() - t1;
  }

  const score = fuse(rules.score, mlProbability, rules.flags);
  return {
    verdict: verdictFor(score),
    score,
    mlProbability,
    flags: rules.flags,
    links: rules.links,
    explanation: null,
    llmRaised: false,
    timingsMs: { rules: t1 - t0, ml: mlMs, llm: null, total: performance.now() - t0 },
  };
}
