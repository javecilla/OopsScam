// SMS auto-check background task (SRS 3.13). Rules and classifier only, never the LLM (FR-SM-03):
// do not import @/pipeline or @/llm here. The text stays in memory (SEC-08).

import classifierWeights from '@/assets/classifier.json';

import { MAX_INPUT_CHARS } from '../config';
import { analyze } from '../core/analyze';
import type { Verdict } from '../core/types';
import { loadClassifier } from '../ml/classifier';

const classifier = loadClassifier(classifierWeights);

const NO_FLAG_TL = 'Kahina-hinala ang text na ito. I-tap para makita kung bakit.';

export type NotifyFn = (verdict: Verdict, flagTl: string, text: string) => void;

// FR-SM-04: notify only for Suspicious or Scam, with the top red flag in Taglish.
export function smsCheckTask(raw: string, notify: NotifyFn): void {
  const text = raw.slice(0, MAX_INPUT_CHARS);
  const result = analyze(text, classifier?.score);
  if (result.verdict === 'low_risk') return;
  const top = [...result.flags].sort((a, b) => b.points - a.points)[0];
  notify(result.verdict, top?.tl ?? NO_FLAG_TL, text);
}
