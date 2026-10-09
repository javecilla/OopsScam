// Validate the model's JSON (FR-LM-04/06). Anything off-schema is a model failure -> null.

import { MAX_EXPLANATION_CHARS } from '../core/templates';
import type { LlmOpinion, Verdict } from '../core/types';

const VERDICTS: readonly Verdict[] = ['scam', 'suspicious', 'low_risk'];

// FR-LM-06 / AGENTS rule 4: never display text that calls the message safe.
export const SAFE_WORDING_RE = /\bsafe\b|ligtas/i;

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_EXPLANATION_CHARS);
  return text.length > 0 ? text : null;
}

export function parseLlmOutput(raw: string): LlmOpinion | null {
  const withoutThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  const start = withoutThinking.indexOf('{');
  const end = withoutThinking.lastIndexOf('}');
  if (start < 0 || end <= start) return null;

  let data: unknown;
  try {
    data = JSON.parse(withoutThinking.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  const verdict = obj.verdict;
  const confidence = obj.confidence;
  if (typeof verdict !== 'string' || !VERDICTS.includes(verdict as Verdict)) return null;
  if (typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)) return null;

  const explanationTl = cleanText(obj.explanation_tl);
  const actionTl = cleanText(obj.action_tl);
  if (!explanationTl || !actionTl) return null;
  if (SAFE_WORDING_RE.test(explanationTl) || SAFE_WORDING_RE.test(actionTl)) return null;

  return { verdict: verdict as Verdict, confidence, explanationTl, actionTl };
}
