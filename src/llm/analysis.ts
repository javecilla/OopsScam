// Shared by the phone and laptop GGUF evaluation; no React Native or legacy ML dependency.

import { analyze } from '../core/analyze';
import { applyQwenClassification, type QwenAnalysisResult } from '../core/qwen';
import { classifyWithQwen, type ClassificationEngine } from './classify';

export async function runQwenAnalysis(
  message: string,
  engine: ClassificationEngine,
  timeoutMs: number,
): Promise<QwenAnalysisResult> {
  const rules = analyze(message, null);
  const classification = await classifyWithQwen(message, engine, timeoutMs);
  return applyQwenClassification(
    rules,
    classification.verdict,
    classification.model,
    classification.ms,
  );
}
