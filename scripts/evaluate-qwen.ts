// Laptop-only GGUF evaluation using the same pure Qwen analysis path intended for the phone.
// Start training/qwen/serve.py first, then pass its GGUF path and an output JSON path.

import { createHash } from 'node:crypto';
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type { Verdict } from '../src/core/types';
import { runQwenAnalysis } from '../src/llm/analysis';
import type { ClassificationEngine } from '../src/llm/classify';
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

function loadValidation(): ValidationRow[] {
  return readFileSync('training/qwen/artifacts/data/validation.jsonl', 'utf8')
    .trim()
    .split('\n')
    .map((line, index): ValidationRow => {
      const row: ValidationRow | null = JSON.parse(line);
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
        const response = await fetch('http://127.0.0.1:8765/v1/chat/completions', {
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
        if (!response.ok) {
          const body = await response.text();
          const error = new Error(
            `Local GGUF completion failed: status=${response.status}, body=${body}`,
          );
          if (attempt === 3 || (response.status < 500 && response.status !== 429)) throw error;
          console.warn(
            JSON.stringify({ stage: 'local_gguf_retry', attempt, status: response.status }),
          );
          continue;
        }
        const parsed: CompletionResponse | null = await response.json();
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

function metrics(confusion: Confusion) {
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
  if (!positives || !negatives)
    throw new RangeError('GGUF validation requires flagged and Low risk examples.');
  const perClass = Object.fromEntries(
    verdicts.map((verdict) => {
      const actual = verdicts.reduce((sum, predicted) => sum + confusion[verdict][predicted], 0);
      const predicted = verdicts.reduce((sum, truth) => sum + confusion[truth][verdict], 0);
      const correct = confusion[verdict][verdict];
      return [
        verdict,
        {
          precision: predicted ? correct / predicted : null,
          recall: actual ? correct / actual : null,
          f1: actual + predicted ? (2 * correct) / (actual + predicted) : null,
        },
      ];
    }),
  );
  return {
    accuracy: verdicts.reduce((sum, verdict) => sum + confusion[verdict][verdict], 0) / total,
    flagged_precision:
      truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : null,
    flagged_recall: truePositive / positives,
    false_alarm_rate: falsePositive / negatives,
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
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(modelPath)) hash.update(chunk);
  const modelSha = hash.digest('hex');
  const engine = new LocalGgufEngine(modelSha);
  const rows = loadValidation();
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
  const report = {
    model_sha256: modelSha,
    prompt_sha256: createHash('sha256')
      .update(readFileSync('src/llm/classification-prompt.json'))
      .digest('hex'),
    validation_sha256: createHash('sha256')
      .update(readFileSync('training/qwen/artifacts/data/validation.jsonl'))
      .digest('hex'),
    n: rows.length,
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
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ qwen_only: qwenMetrics, qwen_with_rule_safeguards: finalMetrics }));
  if (
    qwenMetrics.flagged_recall < 0.9 ||
    qwenMetrics.false_alarm_rate > 0.1 ||
    finalMetrics.flagged_recall < 0.9 ||
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
