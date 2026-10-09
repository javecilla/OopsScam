// React Native adapter for llama.rn (FR-LM-01). Not imported by Jest or the Node eval script.
// The GGUF file is copied into the app's files folder with adb; it is not in the APK or the repo.

import { File, Paths } from 'expo-file-system';
import { initLlama, type LlamaContext } from 'llama.rn';

import { LLM_MODEL_FILENAME } from '@/config';

import type { LlmEngine } from './explain';
import type { ChatMessage } from './prompt';

export type LlmStatus = 'not_loaded' | 'loading' | 'ready' | 'missing_model' | 'failed';

// FR-LM-03: greedy decoding, capped output, thinking off.
const COMPLETION_PARAMS = {
  temperature: 0,
  n_predict: 256,
  stop: ['<|im_end|>'],
  jinja: true,
  enable_thinking: false,
};

// Grammar-constrained JSON. Unverified on the demo phone: set to false if it slows output or fails.
const USE_JSON_SCHEMA = true;
const RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    strict: true,
    schema: {
      type: 'object',
      properties: {
        verdict: { type: 'string', enum: ['scam', 'suspicious', 'low_risk'] },
        confidence: { type: 'number' },
        explanation_tl: { type: 'string' },
        action_tl: { type: 'string' },
      },
      required: ['verdict', 'confidence', 'explanation_tl', 'action_tl'],
    },
  },
};

let status: LlmStatus = 'not_loaded';
let contextPromise: Promise<LlamaContext | null> | null = null;

export function getLlmStatus(): LlmStatus {
  return status;
}

export function modelFile(): File {
  return new File(Paths.document, LLM_MODEL_FILENAME);
}

async function loadContext(): Promise<LlamaContext | null> {
  const file = modelFile();
  if (!file.exists) {
    status = 'missing_model';
    return null;
  }
  status = 'loading';
  try {
    const context = await initLlama({ model: file.uri, n_ctx: 2048, n_gpu_layers: 0 });
    status = 'ready';
    return context;
  } catch {
    // Not enough memory or a bad file: templates only (REL-02).
    status = 'failed';
    return null;
  }
}

// Returns null when the model cannot be used, so explain() falls back to templates.
export async function getLlmEngine(): Promise<LlmEngine | null> {
  contextPromise ??= loadContext();
  const context = await contextPromise;
  if (!context) return null;
  return {
    model: LLM_MODEL_FILENAME,
    complete: async (messages: ChatMessage[]) => {
      const result = await context.completion({
        messages,
        ...COMPLETION_PARAMS,
        ...(USE_JSON_SCHEMA ? { response_format: RESPONSE_FORMAT } : {}),
      });
      return result.content || result.text;
    },
    stop: () => {
      context.stopCompletion().catch(() => {});
    },
  };
}

export async function releaseLlm(): Promise<void> {
  const context = await contextPromise;
  contextPromise = null;
  status = 'not_loaded';
  await context?.release();
}
