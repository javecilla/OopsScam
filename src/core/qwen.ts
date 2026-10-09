// Apply rule safeguards to a Qwen classification. No ML classifier or React Native dependency.

import { verdictFor } from './fusion';
import type { AnalysisResult, Verdict } from './types';

export interface QwenAnalysisResult extends AnalysisResult {
  qwenVerdict: Verdict;
  classificationModel: string;
  classificationMs: number;
}

const VERDICT_SCORE: Record<Verdict, number> = { low_risk: 0, suspicious: 30, scam: 60 };

export function applyQwenClassification(
  rulesResult: AnalysisResult,
  qwenVerdict: Verdict,
  model: string,
  classificationMs: number,
): QwenAnalysisResult {
  if (rulesResult.mlProbability !== null || rulesResult.timingsMs.ml !== null) {
    throw new TypeError('Qwen rule safeguards require a rules-only analysis with no ML probability.');
  }
  const score = Math.max(rulesResult.score, VERDICT_SCORE[qwenVerdict]);
  const verdict = verdictFor(score);
  return {
    ...rulesResult,
    score,
    verdict,
    qwenVerdict,
    classificationModel: model,
    classificationMs,
    llmRaised: verdict !== rulesResult.verdict,
    timingsMs: {
      ...rulesResult.timingsMs,
      llm: classificationMs,
      total: rulesResult.timingsMs.total + classificationMs,
    },
  };
}
