// Explanation step (FR-LM-05): try the local LLM within the time limit, else fall back to templates.
// Never throws, and the verdict can only change through applyLlmOpinion (AGENTS rule 3).

import { applyLlmOpinion } from '../core/fusion';
import { buildTemplateExplanation } from '../core/templates';
import type { Explanation, Flag, LlmOpinion, Verdict } from '../core/types';
import { parseLlmOutput } from './parse';
import { buildMessages, type ChatMessage } from './prompt';

export const LLM_TIMEOUT_MS = 8000;

// The engine behind the explainer. llama.ts provides the real one; tests pass a fake.
export interface LlmEngine {
  model: string;
  complete: (messages: ChatMessage[]) => Promise<string>;
  stop?: () => void | Promise<void>;
}

export interface ExplainInput {
  message: string;
  flags: Flag[];
  verdict: Verdict;
}

export interface ExplainOutput {
  explanation: Explanation;
  verdict: Verdict;
  llmRaised: boolean;
  ms: number;
}

const TIMEOUT = Symbol('timeout');
const RANK: Record<Verdict, number> = { low_risk: 0, suspicious: 1, scam: 2 };

async function requestOpinion(
  input: ExplainInput,
  engine: LlmEngine,
  timeoutMs: number,
): Promise<LlmOpinion | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<typeof TIMEOUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMEOUT), timeoutMs);
    });
    const raw = await Promise.race([
      engine.complete(buildMessages(input.message, input.flags, input.verdict)),
      timeout,
    ]);
    if (raw === TIMEOUT) {
      await engine.stop?.();
      return null;
    }
    return parseLlmOutput(raw);
  } catch {
    // Explanation failures may use the explicitly authorized template fallback.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Explanation text may describe the final Qwen verdict but cannot change it. */
export function fixedVerdictExplanation(
  input: ExplainInput,
  opinion: LlmOpinion | null,
  model: string,
  ms: number,
): ExplainOutput {
  return {
    explanation:
      opinion?.verdict === input.verdict
        ? {
            source: 'llm',
            explanationTl: opinion.explanationTl,
            actionTl: opinion.actionTl,
            model,
          }
        : buildTemplateExplanation(input.verdict, input.flags),
    verdict: input.verdict,
    llmRaised: false,
    ms,
  };
}

export async function explainQwenVerdict(
  input: ExplainInput,
  engine: LlmEngine,
  timeoutMs: number,
): Promise<ExplainOutput> {
  const started = performance.now();
  const opinion = await requestOpinion(input, engine, timeoutMs);
  return fixedVerdictExplanation(input, opinion, engine.model, performance.now() - started);
}

export async function explain(
  input: ExplainInput,
  engine: LlmEngine | null,
  timeoutMs: number = LLM_TIMEOUT_MS,
): Promise<ExplainOutput> {
  const t0 = performance.now();
  const fallback = (): ExplainOutput => ({
    explanation: buildTemplateExplanation(input.verdict, input.flags),
    verdict: input.verdict,
    llmRaised: false,
    ms: performance.now() - t0,
  });

  // Missing model file or not enough memory: templates only.
  if (!engine) return fallback();

  const opinion = await requestOpinion(input, engine, timeoutMs);
  if (!opinion) return fallback();

  const { verdict, llmRaised } = applyLlmOpinion(input.verdict, opinion);
  // An explanation that argues for a lower verdict would contradict the screen; use the template.
  if (RANK[opinion.verdict] < RANK[verdict]) return fallback();
  return {
    explanation: {
      source: 'llm',
      explanationTl: opinion.explanationTl,
      actionTl: opinion.actionTl,
      model: engine.model,
    },
    verdict,
    llmRaised,
    ms: performance.now() - t0,
  };
}
