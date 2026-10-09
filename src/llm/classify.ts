// Qwen classification protocol shared with training/qwen/runtime.py through the JSON prompt.

import prompt from './classification-prompt.json';
import type { Verdict } from '../core/types';
import type { ChatMessage } from './prompt';

export interface ClassificationEngine {
  model: string;
  completeClassification: (messages: ChatMessage[]) => Promise<string>;
  stopClassification: () => Promise<void>;
}

export interface QwenClassification {
  verdict: Verdict;
  model: string;
  ms: number;
}

export class QwenClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QwenClassificationError';
  }
}

interface ClassificationJson {
  verdict?: string;
}

export function buildClassificationMessages(message: string): ChatMessage[] {
  const escaped = message.replace(/</g, '‹').replace(/>/g, '›');
  return [
    { role: 'system', content: prompt.system },
    { role: 'user', content: `<message>\n${escaped}\n</message>\n/no_think` },
  ];
}

export function parseClassification(raw: string): Verdict {
  let parsed: ClassificationJson | null;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new QwenClassificationError('Qwen returned invalid classification JSON. Please retry.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new QwenClassificationError('Qwen classification must be a JSON object. Please retry.');
  }
  const verdict = parsed.verdict;
  if (verdict !== 'scam' && verdict !== 'suspicious' && verdict !== 'low_risk') {
    throw new QwenClassificationError('Qwen returned an unsupported classification label. Please retry.');
  }
  return verdict;
}

export async function classifyWithQwen(
  message: string,
  engine: ClassificationEngine,
  timeoutMs: number,
): Promise<QwenClassification> {
  const started = performance.now();
  const timeout = Symbol('classification_timeout');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const expired = new Promise<typeof timeout>((resolve) => {
      timer = setTimeout(() => resolve(timeout), timeoutMs);
    });
    const raw = await Promise.race([
      engine.completeClassification(buildClassificationMessages(message)),
      expired,
    ]);
    if (raw === timeout) {
      await engine.stopClassification();
      throw new QwenClassificationError(
        `Qwen classification exceeded ${timeoutMs / 1000} seconds. Please retry with a shorter message.`,
      );
    }
    return { verdict: parseClassification(raw), model: engine.model, ms: performance.now() - started };
  } finally {
    clearTimeout(timer);
  }
}
