// Loads only the validated, fine-tuned Qwen package. No network or ML fallback.

import * as FileSystem from 'expo-file-system/legacy';
import { Paths } from 'expo-file-system';
import { initLlama } from 'llama.rn';

import classificationPrompt from './classification-prompt.json';
import type { ClassificationEngine } from './classify';
import type { LlmEngine } from './explain';
import { createClassificationEngine, createExplanationEngine } from './llama';

interface ModelManifest {
  status: string;
  filename: string;
  asset_filename: string;
  bytes: number;
  sha256: string;
  md5: string;
  classification_system_prompt: string;
}

export interface QwenRuntime {
  classification: ClassificationEngine;
  explanation: LlmEngine;
  release: () => Promise<void>;
}

export type QwenLoadStage =
  'checking_manifest' | 'checking_model' | 'copying_model' | 'loading' | 'ready';

const MODEL_FILENAME = 'OopsScam-Qwen3-0.6B-Q4_K_M.gguf';
// Reuse the APK asset path so the final build replaces its existing model asset.
const ASSET_FILENAME = 'Qwen_Qwen3-0.6B-Q4_K_M.gguf';
const MANIFEST_URI = 'asset:///OopsScam-Qwen3-0.6B-Q4_K_M.json';

async function readManifest(): Promise<ModelManifest> {
  const bundled = await FileSystem.getInfoAsync(MANIFEST_URI);
  if (!bundled.exists) {
    throw new Error(
      'The validated fine-tuned Qwen package is not bundled. Finish model validation and rebuild the APK before analyzing.',
    );
  }
  const raw = await FileSystem.readAsStringAsync(MANIFEST_URI);
  const manifest: ModelManifest | null = JSON.parse(raw);
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    Array.isArray(manifest) ||
    manifest.status !== 'gguf_validated' ||
    manifest.filename !== MODEL_FILENAME ||
    manifest.asset_filename !== ASSET_FILENAME ||
    !Number.isSafeInteger(manifest.bytes) ||
    manifest.bytes < 100_000_000 ||
    typeof manifest.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
    typeof manifest.md5 !== 'string' ||
    !/^[a-f0-9]{32}$/.test(manifest.md5) ||
    manifest.classification_system_prompt !== classificationPrompt.system
  ) {
    throw new Error(
      'The bundled Qwen manifest is invalid or uses a different classification prompt. Rebuild with the validated fine-tuned package.',
    );
  }
  return manifest;
}

async function installModel(
  manifest: ModelManifest,
  onStage: (stage: QwenLoadStage) => void,
): Promise<string> {
  onStage('checking_model');
  const destination = Paths.document.uri + manifest.filename;
  const cached = await FileSystem.getInfoAsync(destination, { md5: true });
  if (!cached.exists || cached.size !== manifest.bytes || cached.md5 !== manifest.md5) {
    onStage('copying_model');
    await FileSystem.copyAsync({ from: `asset:///${manifest.asset_filename}`, to: destination });
  }
  const installed = await FileSystem.getInfoAsync(destination, { md5: true });
  if (!installed.exists || installed.size !== manifest.bytes || installed.md5 !== manifest.md5) {
    throw new Error(
      'The installed Qwen model does not match the validated APK package. Reinstall the APK before retrying.',
    );
  }
  return destination;
}

/** The caller owns this context and must release it when analysis is no longer needed. */
export async function loadVerifiedQwenRuntime(
  onStage: (stage: QwenLoadStage) => void,
): Promise<QwenRuntime> {
  onStage('checking_manifest');
  const manifest = await readManifest();
  const model = await installModel(manifest, onStage);
  onStage('loading');
  const context = await initLlama({ model, n_ctx: 2048, n_gpu_layers: 0 });
  let releasePromise: Promise<void> | null = null;
  onStage('ready');
  return {
    classification: createClassificationEngine(context, manifest.sha256),
    explanation: createExplanationEngine(context, manifest.sha256),
    release: (): Promise<void> => {
      releasePromise ??= (async (): Promise<void> => {
        await context.stopCompletion();
        await context.release();
      })();
      return releasePromise;
    },
  };
}
