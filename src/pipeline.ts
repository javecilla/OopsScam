// App-side glue: runs the pure analysis (src/core, src/ml) and the local LLM (src/llm) on the phone.
// Nothing here touches the network; messages are kept in memory only (SEC-03).

import classifierWeights from '@/assets/classifier.json';
import emailClassifierWeights from '@/assets/classifier_email.json';

import { analyze } from './core/analyze';
import { looksLikeEmail } from './core/email';
import type { AnalysisResult } from './core/types';
import type { QwenAnalysisResult } from './core/qwen';
import { loadClassifier } from './ml/classifier';
import { explain, explainQwenVerdict, LLM_TIMEOUT_MS, type ExplainOutput } from './llm/explain';
import { getLlmEngine, getLlmStatus, type LlmStatus } from './llm/llama';
import { runQwenAnalysis as analyzeWithQwen } from './llm/analysis';
import { loadVerifiedQwenRuntime, type QwenLoadStage, type QwenRuntime } from './llm/qwen-runtime';

// FR-ML-03: invalid weights -> null -> rules only.
const classifier = loadClassifier(classifierWeights);
// Emails get their own model; if its weights are invalid, emails use the SMS model.
const emailClassifier = loadClassifier(emailClassifierWeights) ?? classifier;

export interface PipelineStatus {
  classifier: 'loaded' | 'rules_only';
  llm: LlmStatus;
}

export function getPipelineStatus(): PipelineStatus {
  return { classifier: classifier ? 'loaded' : 'rules_only', llm: getLlmStatus() };
}

// Verdict and score, without the LLM (FR-FU-04).
export function runAnalysis(text: string): AnalysisResult {
  return analyze(text, (looksLikeEmail(text) ? emailClassifier : classifier)?.score);
}

// Taglish explanation from the LLM, or the template fallback. Never throws.
export async function runExplanation(text: string, result: AnalysisResult): Promise<ExplainOutput> {
  const engine = await getLlmEngine().catch(() => null);
  return explain({ message: text, flags: result.flags, verdict: result.verdict }, engine);
}

// Start loading the model early so the first explanation is faster.
export function preloadLlm(): void {
  getLlmEngine().catch(() => {});
}

const LLM_LABEL: Record<LlmStatus, string> = {
  not_loaded: 'LLM not loaded',
  copying_model: 'Copying model… (first launch)',
  loading: 'LLM loading…',
  ready: 'LLM: Qwen3 0.6B',
  missing_model: 'Templates only (no model file)',
  failed: 'Templates only (model failed)',
};

// Labels for the status strip (FR-UI-05).
export function statusLabels(): { llmLabel: string; classifierLabel: string } {
  const s = getPipelineStatus();
  return {
    llmLabel: LLM_LABEL[s.llm],
    classifierLabel: s.classifier === 'loaded' ? 'Classifier loaded' : 'Rules only',
  };
}

const ms = (n: number) => `${Math.round(n)} ms`;

export function formatTimings(t: AnalysisResult['timingsMs']): string {
  const parts = [`Rules ${ms(t.rules)}`];
  if (t.ml !== null) parts.push(`ML ${ms(t.ml)}`);
  if (t.llm !== null) parts.push(`Explanation ${(t.llm / 1000).toFixed(1)} s`);
  return parts.join(' · ');
}

// ─── Qwen production pipeline ────────────────────────────────────────────────

export type { QwenLoadStage, QwenRuntime, QwenAnalysisResult };

/** Combines the load stages with 'classifying' for UI progress reporting. */
export type QwenStage = QwenLoadStage | 'classifying';

export const QWEN_CLASSIFY_TIMEOUT_MS = 8_000;

export const QWEN_STAGE_LABEL: Record<QwenStage, string> = {
  checking_manifest: 'Sinusuri ang manifest…',
  checking_model: 'Sinusuri ang modelo…',
  copying_model: 'Kina-copy ang modelo… (unang pagkakataon)',
  loading: 'Ino-load ang Qwen AI…',
  ready: 'Handa na ang Qwen AI',
  classifying: 'Inaanalisa ng Qwen…',
};

/**
 * Loads the verified fine-tuned Qwen runtime and classifies the message with rules floor.
 * Returns the result and the live runtime — the caller MUST release() it after use.
 * Throws with a user-readable message if the validated model is not yet packaged (AGENTS rule 3).
 */
export async function runQwenPipeline(
  text: string,
  onStage: (stage: QwenStage) => void,
  signal?: AbortSignal,
): Promise<{ result: QwenAnalysisResult; runtime: QwenRuntime }> {
  let runtime: QwenRuntime | null = null;
  try {
    runtime = await loadVerifiedQwenRuntime((stage) => {
      if (signal?.aborted) {
        throw Object.assign(new Error('Qwen analysis cancelled'), { name: 'AbortError' });
      }
      onStage(stage);
    });
    if (signal?.aborted) {
      await runtime.release().catch(() => {});
      throw Object.assign(new Error('Qwen analysis cancelled'), { name: 'AbortError' });
    }
    onStage('classifying');
    const result = await analyzeWithQwen(text, runtime.classification, QWEN_CLASSIFY_TIMEOUT_MS);
    return { result, runtime };
  } catch (err) {
    await runtime?.release().catch(() => {});
    throw err;
  }
}

/**
 * Gets the Taglish explanation for a Qwen result using the same runtime context.
 * The explanation verdict is locked to the Qwen verdict and cannot raise or lower it (AGENTS rule 3).
 */
export async function runQwenExplanation(
  text: string,
  result: QwenAnalysisResult,
  runtime: QwenRuntime,
): Promise<ExplainOutput> {
  return explainQwenVerdict(
    { message: text, flags: result.flags, verdict: result.verdict },
    runtime.explanation,
    LLM_TIMEOUT_MS,
  );
}

/** Timing string for Qwen-based results, labelling classification and explanation separately. */
export function formatQwenTimings(
  rulesMs: number,
  classifyMs: number | null,
  explainMs: number | null,
): string {
  const parts = [`Rules ${Math.round(rulesMs)} ms`];
  if (classifyMs !== null) parts.push(`Qwen ${Math.round(classifyMs)} ms`);
  if (explainMs !== null) parts.push(`Explanation ${(explainMs / 1000).toFixed(1)} s`);
  return parts.join(' · ');
}

/** Status strip labels for the Qwen production path. */
export function qwenStatusLabels(
  stage: QwenStage | null,
  error: string | null,
): { llmLabel: string; classifierLabel: string } {
  return {
    llmLabel: error
      ? 'Qwen: hindi available'
      : stage
        ? QWEN_STAGE_LABEL[stage]
        : 'Qwen3 0.6B fine-tuned',
    classifierLabel: error ? 'Rules lang (Qwen error)' : 'Qwen AI classification',
  };
}
