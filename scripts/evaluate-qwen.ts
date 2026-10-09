// Laptop-only GGUF evaluation using the same pure Qwen analysis path intended for the phone.
// Start training/qwen/serve.py first, then pass its GGUF path and an output JSON path.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

import type { Verdict } from '../src/core/types';
import { runQwenAnalysis } from '../src/llm/analysis';
import type { ClassificationEngine } from '../src/llm/classify';
import classificationPrompt from '../src/llm/classification-prompt.json';
import type { ChatMessage } from '../src/llm/prompt';

interface ValidationRow {
  text: string;
  verdict: Verdict;
}

interface CompletionResponse {
  model: string;
  choices: { message: { content: string }; finish_reason: string }[];
}

interface Prediction {
  fingerprint: string;
  expected: Verdict;
  qwen: Verdict;
  final: Verdict;
  classification_ms: number;
}

type Confusion = Record<Verdict, Record<Verdict, number>>;

interface ClassMetrics {
  precision: number | null;
  recall: number;
  f1: number;
}

interface Metrics {
  accuracy: number;
  flagged_precision: number | null;
  flagged_recall: number;
  scam_flagged_recall: number;
  false_alarm_rate: number;
  macro_f1: number;
  per_class: Record<Verdict, ClassMetrics>;
  confusion: Confusion;
}

interface RunProvenance {
  source_run: string;
  model_sha256: string;
  prompt_sha256: string;
  validation_data_sha256: string;
  data_manifest_sha256: string;
  adapter_sha256: string;
  selected_run_sha256: string;
  metadata_sha256: string;
  validation_report_sha256: string;
  validation_provenance_sha256: string;
  merged_provenance_sha256: string;
  export_provenance_sha256: string;
}

// Reuse the exporter's integrity gates without importing training libraries or running export.
const VERIFY_EXPORT = `
import json
import sys
from dataclasses import asdict
from pathlib import Path

sys.path.insert(0, str(Path("training/qwen").resolve()))
from export import (ARTIFACTS, LLAMA_COMMIT, TOOLS_ARCHIVE_SHA256,
                    check_training_integrity, file_sha256, read_object,
                    selected_run, validated_metrics)

run = selected_run()
integrity = check_training_integrity(run)
recall, false_alarm = validated_metrics(run, integrity)
merged = run / "merged"
merged_path = merged / "oopsscam-provenance.json"
merged_provenance = read_object(merged_path)
expected_merged = {**asdict(integrity), "source_run": str(run), "precision": "BF16",
                   "validation_sha256": file_sha256(run / "validation.json"),
                   "weights_sha256": file_sha256(merged / "model.safetensors"),
                   "validation_recall": recall, "validation_false_alarm_rate": false_alarm}
for field, actual in expected_merged.items():
    if merged_provenance.get(field) != actual:
        raise ValueError(f"Merged Qwen provenance mismatch: field={field}, run={run}")

model = Path(sys.argv[1]).resolve(strict=True)
expected_model = (run / "gguf/OopsScam-Qwen3-0.6B-Q4_K_M.gguf").resolve(strict=True)
if model != expected_model:
    raise ValueError("Evaluation requires the selected run's exported Q4_K_M GGUF, not a pretrained or BF16 model")
with model.open("rb") as stream:
    if stream.read(4) != b"GGUF":
        raise ValueError(f"Invalid quantized GGUF header: {model}")
export_path = run / "gguf/provenance.json"
exported = read_object(export_path)
model_sha = file_sha256(model)
expected_export = {**asdict(integrity), "status": "exported_not_gguf_validated",
                   "source_run": str(run), "merged_provenance_sha256": file_sha256(merged_path),
                   "llama_cpp_commit": LLAMA_COMMIT, "tools_archive_sha256": TOOLS_ARCHIVE_SHA256,
                   "quantizer_sha256": file_sha256(ARTIFACTS / "tools/llama-quantize.exe"),
                   "quantization": "Q4_K_M", "gguf_file": str(expected_model),
                   "gguf_sha256": model_sha, "gguf_bytes": model.stat().st_size,
                   "bf16_sha256": file_sha256(run / "gguf/OopsScam-Qwen3-0.6B-BF16.gguf")}
for field, actual in expected_export.items():
    if exported.get(field) != actual:
        raise ValueError(f"Exported Qwen provenance mismatch: field={field}, run={run}")
print(json.dumps({**asdict(integrity), "source_run": str(run), "model_sha256": model_sha,
                  "selected_run_sha256": file_sha256(ARTIFACTS / "selected_run.json"),
                  "metadata_sha256": file_sha256(run / "metadata.json"),
                  "validation_report_sha256": file_sha256(run / "validation.json"),
                  "validation_provenance_sha256": file_sha256(run / "validation-provenance.json"),
                  "merged_provenance_sha256": file_sha256(merged_path),
                  "export_provenance_sha256": file_sha256(export_path)}))
`;

async function verifyExport(modelPath: string): Promise<RunProvenance> {
  const { stdout } = await promisify(execFile)(
    resolve('training/.qwen-venv/Scripts/python.exe'),
    ['-c', VERIFY_EXPORT, resolve(modelPath)],
    { windowsHide: true },
  );
  const provenance: RunProvenance | null = JSON.parse(stdout);
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
    throw new TypeError('Qwen export verifier did not return an object.');
  }
  const hashes: string[] = [
    provenance.model_sha256,
    provenance.prompt_sha256,
    provenance.validation_data_sha256,
    provenance.data_manifest_sha256,
    provenance.adapter_sha256,
    provenance.selected_run_sha256,
    provenance.metadata_sha256,
    provenance.validation_report_sha256,
    provenance.validation_provenance_sha256,
    provenance.merged_provenance_sha256,
    provenance.export_provenance_sha256,
  ];
  if (
    typeof provenance.source_run !== 'string' ||
    !provenance.source_run ||
    hashes.some((hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
  ) {
    throw new TypeError('Qwen export verifier returned missing or invalid provenance fields.');
  }
  const prompt = readFileSync('src/llm/classification-prompt.json');
  if (
    createHash('sha256').update(prompt).digest('hex') !== provenance.prompt_sha256 ||
    JSON.stringify(JSON.parse(prompt.toString('utf8'))) !== JSON.stringify(classificationPrompt)
  ) {
    throw new Error(
      'Classification prompt changed after loading. Restart with the trained prompt.',
    );
  }
  return provenance;
}

function loadValidation(expectedSha: string): ValidationRow[] {
  const data = readFileSync('training/qwen/artifacts/data/validation.jsonl');
  if (createHash('sha256').update(data).digest('hex') !== expectedSha) {
    throw new Error('Qwen validation data changed after provenance verification.');
  }
  return data
    .toString('utf8')
    .trim()
    .split('\n')
    .map((line, index): ValidationRow => {
      let row: ValidationRow | null;
      try {
        row = JSON.parse(line);
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        throw new TypeError(`Invalid Qwen validation JSON at row ${index + 1}.`);
      }
      if (
        !row ||
        typeof row !== 'object' ||
        typeof row.text !== 'string' ||
        !row.text.trim() ||
        !['scam', 'suspicious', 'low_risk'].includes(row.verdict)
      ) {
        throw new TypeError(`Invalid Qwen validation row ${index + 1}. Recreate the data split.`);
      }
      return { text: row.text, verdict: row.verdict };
    });
}

class LocalGgufEngine implements ClassificationEngine {
  readonly model: string;
  private controller: AbortController | null = null;

  constructor(model: string) {
    this.model = model;
  }

  async completeClassification(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    this.controller = controller;
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        controller.signal.throwIfAborted();
        let response: Response;
        try {
          response = await fetch('http://127.0.0.1:8765/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              model: this.model,
              messages,
              temperature: 0,
              max_tokens: 24,
              chat_template_kwargs: { enable_thinking: false },
              response_format: {
                type: 'json_schema',
                json_schema: {
                  name: 'classification',
                  strict: true,
                  schema: {
                    type: 'object',
                    properties: {
                      verdict: { type: 'string', enum: ['scam', 'suspicious', 'low_risk'] },
                    },
                    required: ['verdict'],
                    additionalProperties: false,
                  },
                },
              },
            }),
          });
        } catch (error) {
          if (controller.signal.aborted || !(error instanceof TypeError) || attempt === 3) {
            throw error;
          }
          console.warn(
            JSON.stringify({ stage: 'local_gguf_retry', attempt, error_type: 'TypeError' }),
          );
          continue;
        }
        if (!response.ok) {
          const body = await response.text();
          const error = new Error(
            `Local GGUF completion failed: status=${response.status}, response_bytes=${Buffer.byteLength(body)}. Inspect the local server; response text is omitted to protect message content.`,
          );
          if (attempt === 3 || (response.status < 500 && response.status !== 429)) throw error;
          console.warn(
            JSON.stringify({ stage: 'local_gguf_retry', attempt, status: response.status }),
          );
          continue;
        }
        let parsed: CompletionResponse | null;
        try {
          parsed = await response.json();
        } catch (error) {
          if (!(error instanceof SyntaxError)) throw error;
          throw new TypeError('Local GGUF response is not valid JSON. Inspect the local server.');
        }
        if (
          !parsed ||
          parsed.model !== this.model ||
          !Array.isArray(parsed.choices) ||
          parsed.choices.length !== 1 ||
          typeof parsed.choices[0]?.message?.content !== 'string' ||
          parsed.choices[0].finish_reason !== 'stop'
        ) {
          throw new TypeError(
            'Local GGUF response has the wrong model, invalid content or truncated output.',
          );
        }
        return parsed.choices[0].message.content;
      }
      throw new Error('Local GGUF retry loop ended without a response.');
    } finally {
      this.controller = null;
    }
  }

  async stopClassification(): Promise<void> {
    this.controller?.abort();
  }
}

function classMetrics(confusion: Confusion, verdict: Verdict): ClassMetrics {
  const verdicts: Verdict[] = ['scam', 'suspicious', 'low_risk'];
  const actual = verdicts.reduce((sum, predicted) => sum + confusion[verdict][predicted], 0);
  const predicted = verdicts.reduce((sum, truth) => sum + confusion[truth][verdict], 0);
  const correct = confusion[verdict][verdict];
  if (!actual) throw new RangeError(`GGUF validation has no examples for class=${verdict}.`);
  return {
    precision: predicted ? correct / predicted : null,
    recall: correct / actual,
    f1: (2 * correct) / (actual + predicted),
  };
}

function metrics(confusion: Confusion): Metrics {
  const verdicts: Verdict[] = ['scam', 'suspicious', 'low_risk'];
  const total = verdicts.reduce(
    (sum, truth) => sum + verdicts.reduce((n, predicted) => n + confusion[truth][predicted], 0),
    0,
  );
  const positives = verdicts.reduce(
    (sum, predicted) => sum + confusion.scam[predicted] + confusion.suspicious[predicted],
    0,
  );
  const negatives = verdicts.reduce((sum, predicted) => sum + confusion.low_risk[predicted], 0);
  const truePositive =
    confusion.scam.scam +
    confusion.scam.suspicious +
    confusion.suspicious.scam +
    confusion.suspicious.suspicious;
  const falsePositive = confusion.low_risk.scam + confusion.low_risk.suspicious;
  const scamTotal = verdicts.reduce((sum, predicted) => sum + confusion.scam[predicted], 0);
  if (!scamTotal) throw new RangeError('GGUF validation requires explicit Scam examples.');
  if (!positives || !negatives)
    throw new RangeError('GGUF validation requires flagged and Low risk examples.');
  const perClass: Record<Verdict, ClassMetrics> = {
    scam: classMetrics(confusion, 'scam'),
    suspicious: classMetrics(confusion, 'suspicious'),
    low_risk: classMetrics(confusion, 'low_risk'),
  };
  return {
    accuracy: verdicts.reduce((sum, verdict) => sum + confusion[verdict][verdict], 0) / total,
    flagged_precision:
      truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null,
    flagged_recall: truePositive / positives,
    scam_flagged_recall: (confusion.scam.scam + confusion.scam.suspicious) / scamTotal,
    false_alarm_rate: falsePositive / negatives,
    macro_f1: verdicts.reduce((sum, verdict) => sum + perClass[verdict].f1, 0) / verdicts.length,
    per_class: perClass,
    confusion,
  };
}

async function main(): Promise<void> {
  const [modelPath, outputPath] = process.argv.slice(2);
  if (!modelPath || !outputPath)
    throw new Error(
      'Usage: node --import ./scripts/ts-hooks.mjs scripts/evaluate-qwen.ts <GGUF path> <report JSON path>',
    );
  if (existsSync(outputPath))
    throw new Error(`GGUF evaluation report already exists; refusing to overwrite: ${outputPath}`);
  if (!existsSync('training/qwen/artifacts/selected_run.json'))
    throw new Error(
      'Qwen training has not completed and selected an adapter. Finish training before GGUF evaluation.',
    );
  const provenance = await verifyExport(modelPath);
  const engine = new LocalGgufEngine(provenance.model_sha256);
  const rows = loadValidation(provenance.validation_data_sha256);
  const predictions: Prediction[] = [];
  const qwen: Confusion = {
    scam: { scam: 0, suspicious: 0, low_risk: 0 },
    suspicious: { scam: 0, suspicious: 0, low_risk: 0 },
    low_risk: { scam: 0, suspicious: 0, low_risk: 0 },
  };
  const final: Confusion = structuredClone(qwen);
  for (const [index, row] of rows.entries()) {
    const result = await runQwenAnalysis(row.text, engine, 60_000);
    qwen[row.verdict][result.qwenVerdict]++;
    final[row.verdict][result.verdict]++;
    const normalized = row.text.toLowerCase().replace(/[0-9]/g, '0').replace(/\s+/g, ' ').trim();
    predictions.push({
      fingerprint: createHash('sha256').update(normalized).digest('hex'),
      expected: row.verdict,
      qwen: result.qwenVerdict,
      final: result.verdict,
      classification_ms: result.classificationMs,
    });
    if ((index + 1) % 25 === 0 || index + 1 === rows.length)
      console.log(
        JSON.stringify({ stage: 'gguf_validation', completed: index + 1, total: rows.length }),
      );
  }
  const qwenMetrics = metrics(qwen);
  const finalMetrics = metrics(final);
  if (JSON.stringify(await verifyExport(modelPath)) !== JSON.stringify(provenance)) {
    throw new Error(
      'Qwen run, weights, prompt, data or provenance changed during GGUF evaluation.',
    );
  }
  const latency: { mean_ms: number; worst_ms: number } = {
    mean_ms:
      predictions.reduce((sum, prediction) => sum + prediction.classification_ms, 0) / rows.length,
    worst_ms: predictions.reduce(
      (worst, prediction) => Math.max(worst, prediction.classification_ms),
      0,
    ),
  };
  const report = {
    ...provenance,
    validation_sha256: provenance.validation_data_sha256,
    n: rows.length,
    latency,
    qwen_only: qwenMetrics,
    qwen_with_rule_safeguards: finalMetrics,
    predictions,
    limitations: [
      'Public SMS datasets and source-derived labels; spam means Suspicious.',
      'Laptop CPU latency does not measure phone performance.',
      'Validation is acceptance evidence, never data for tuning. No legacy ML classifier was used.',
    ],
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(
    JSON.stringify({ qwen_only: qwenMetrics, qwen_with_rule_safeguards: finalMetrics, latency }),
  );
  if (
    qwenMetrics.flagged_recall < 0.9 ||
    qwenMetrics.scam_flagged_recall < 0.9 ||
    qwenMetrics.false_alarm_rate > 0.1 ||
    finalMetrics.flagged_recall < 0.9 ||
    finalMetrics.scam_flagged_recall < 0.9 ||
    finalMetrics.false_alarm_rate > 0.1
  )
    throw new Error(
      'GGUF classification failed the 90% recall / 10% false-alarm acceptance gates. Do not activate this model.',
    );
}

main().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
