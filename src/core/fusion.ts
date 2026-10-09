// Fusion and verdict (SRS 3.5). The LLM can never lower a verdict (AGENTS rule 3).

import { clamp100 } from './scoring';
import { HARD_FLAG_IDS, type Flag, type LlmOpinion, type Verdict } from './types';

export const SCAM_THRESHOLD = 60;
export const SUSPICIOUS_THRESHOLD = 30;
export const LLM_RAISE_MIN_CONFIDENCE = 0.8;

const RULES_WEIGHT = 0.6;
const ML_WEIGHT = 0.4;

// FR-FU-01/02: blend rules and ML; a hard flag keeps R as the floor.
export function fuse(rules: number, mlProbability: number | null, flags: Flag[]): number {
  let score =
    mlProbability === null ? rules : RULES_WEIGHT * rules + ML_WEIGHT * 100 * mlProbability;
  if (flags.some((f) => HARD_FLAG_IDS.includes(f.id))) score = Math.max(score, rules);
  return Math.round(clamp100(score));
}

// FR-FU-03
export function verdictFor(score: number): Verdict {
  if (score >= SCAM_THRESHOLD) return 'scam';
  if (score >= SUSPICIOUS_THRESHOLD) return 'suspicious';
  return 'low_risk';
}

// FR-FU-05: only Low risk -> Suspicious, only on a confident "scam" opinion. Never lowers, never reaches Scam.
export function applyLlmOpinion(
  verdict: Verdict,
  opinion: LlmOpinion | null,
): { verdict: Verdict; llmRaised: boolean } {
  if (
    verdict === 'low_risk' &&
    opinion?.verdict === 'scam' &&
    opinion.confidence >= LLM_RAISE_MIN_CONFIDENCE
  ) {
    return { verdict: 'suspicious', llmRaised: true };
  }
  return { verdict, llmRaised: false };
}
