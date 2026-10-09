// App-side glue: runs the pure analysis (src/core, src/ml) and the local LLM (src/llm) on the phone.
// Nothing here touches the network; messages are kept in memory only (SEC-03).

import classifierWeights from '@/assets/classifier.json';

import { analyze } from './core/analyze';
import type { AnalysisResult } from './core/types';
import { loadClassifier } from './ml/classifier';
import { explain, type ExplainOutput } from './llm/explain';
import { getLlmEngine, getLlmStatus, type LlmStatus } from './llm/llama';

// FR-ML-03: invalid weights -> null -> rules only.
const classifier = loadClassifier(classifierWeights);

export interface PipelineStatus {
  classifier: 'loaded' | 'rules_only';
  llm: LlmStatus;
}

export function getPipelineStatus(): PipelineStatus {
  return { classifier: classifier ? 'loaded' : 'rules_only', llm: getLlmStatus() };
}

// Verdict and score, without the LLM (FR-FU-04).
export function runAnalysis(text: string): AnalysisResult {
  return analyze(text, classifier?.score);
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
