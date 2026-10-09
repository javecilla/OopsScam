// Evaluation script (SRS FR-EV-01..03): runs the app's own src/core + src/ml code over labeled CSVs.
// Reports precision, recall, F1, false-alarm rate, a confusion matrix and per-stage latency.
// It never changes a rule, weight or threshold.
//
// Run from the repo root (Node 22.15+ or 24, no build step):
//   node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts            (all sets that exist)
//   node --import ./scripts/ts-hooks.mjs scripts/evaluate.ts dev        (one set)
// Results are written to data/results/<date>_<set>.md and .json.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import weights from '../assets/classifier.json';
import { analyze, type ClassifyFn } from '../src/core/analyze';
import type { Verdict } from '../src/core/types';
import { loadClassifier } from '../src/ml/classifier';

const SETS: Record<string, string> = {
  dev: 'data/dev',
  test: 'data/test', // the original frozen set (not created yet)
  test_v2: 'data/test_v2',
  adversarial: 'data/adversarial',
};

interface Row {
  id: string;
  text: string;
  label: 'scam' | 'legit';
  category: string;
}

// Minimal RFC 4180 parser: quoted fields, "" escapes, newlines inside quotes.
function parseCsv(src: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}

function loadSet(dir: string): Row[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.csv'))
    .sort()
    .flatMap((f) => parseCsv(readFileSync(join(dir, f), 'utf8')))
    .map((r) => ({
      id: r.id,
      text: r.text,
      label: r.label as Row['label'],
      category: r.category || 'unlabeled',
    }));
}

const pct = (n: number, d: number) => (d === 0 ? null : n / d);
const fmt = (x: number | null) => (x === null ? 'n/a' : `${(x * 100).toFixed(1)}%`);
const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function evaluate(rows: Row[], classify: ClassifyFn | null) {
  const results = rows.map((r) => ({ row: r, out: analyze(r.text, classify) }));
  const confusion: Record<string, Record<Verdict, number>> = {
    scam: { scam: 0, suspicious: 0, low_risk: 0 },
    legit: { scam: 0, suspicious: 0, low_risk: 0 },
  };
  for (const { row, out } of results) confusion[row.label][out.verdict]++;

  const metrics = (flagged: (v: Verdict) => boolean) => {
    let tp = 0,
      fp = 0,
      tn = 0,
      fn = 0;
    for (const { row, out } of results) {
      const f = flagged(out.verdict);
      if (row.label === 'scam') f ? tp++ : fn++;
      else f ? fp++ : tn++;
    }
    const precision = pct(tp, tp + fp);
    const recall = pct(tp, tp + fn);
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;
    return { tp, fp, tn, fn, precision, recall, f1, falseAlarmRate: pct(fp, fp + tn) };
  };

  const perCategory: Record<string, { label: string; n: number; flagged: number }> = {};
  for (const { row, out } of results) {
    const c = (perCategory[row.category] ??= { label: row.label, n: 0, flagged: 0 });
    c.n++;
    if (out.verdict !== 'low_risk') c.flagged++;
  }

  const rulesMs = results.map((r) => r.out.timingsMs.rules);
  const mlMs = results.flatMap((r) => (r.out.timingsMs.ml === null ? [] : [r.out.timingsMs.ml]));
  return {
    n: rows.length,
    scam: rows.filter((r) => r.label === 'scam').length,
    legit: rows.filter((r) => r.label === 'legit').length,
    flaggedIsSuspiciousOrScam: metrics((v) => v !== 'low_risk'),
    scamOnly: metrics((v) => v === 'scam'),
    confusion,
    perCategory,
    latencyMs: {
      rulesMedian: median(rulesMs),
      rulesMax: rulesMs.length ? Math.max(...rulesMs) : null,
      mlMedian: median(mlMs),
      mlMax: mlMs.length ? Math.max(...mlMs) : null,
    },
    missedScams: results
      .filter((r) => r.row.label === 'scam' && r.out.verdict === 'low_risk')
      .map((r) => ({ id: r.row.id, score: r.out.score, text: r.row.text })),
    falseAlarms: results
      .filter((r) => r.row.label === 'legit' && r.out.verdict !== 'low_risk')
      .map((r) => ({
        id: r.row.id,
        verdict: r.out.verdict,
        score: r.out.score,
        flags: r.out.flags.map((f) => f.id),
        text: r.row.text,
      })),
  };
}

type Report = ReturnType<typeof evaluate>;

function markdown(set: string, date: string, app: Report, rulesOnly: Report): string {
  const m = (r: Report) => r.flaggedIsSuspiciousOrScam;
  const s = (r: Report) => r.scamOnly;
  const lines = [
    `# Evaluation: ${set} (${date})`,
    '',
    `${app.n} messages (${app.scam} scam, ${app.legit} legit). Same \`src/core\` + \`src/ml\` code as the app; no rule, weight or threshold was changed.`,
    'Targets (PLAN.md): recall 90% or more, false alarms 10% or less. These are measured numbers on a small, AI-written set; they are a smoke check, not a benchmark.',
    '',
    '| Config | Recall | Precision | F1 | False-alarm rate | Recall (Scam verdict only) | False alarms (Scam verdict only) |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...[
      ['App (rules + classifier)', app],
      ['Rules only', rulesOnly],
    ].map(
      ([name, r]) =>
        `| ${name as string} | ${fmt(m(r as Report).recall)} | ${fmt(m(r as Report).precision)} | ${fmt(m(r as Report).f1)} | ${fmt(m(r as Report).falseAlarmRate)} | ${fmt(s(r as Report).recall)} | ${fmt(s(r as Report).falseAlarmRate)} |`,
    ),
    '',
    '"Flagged" = verdict Suspicious or Scam (FR-EV-02).',
    '',
    '## Confusion matrix (app config)',
    '',
    '| Label \\ Verdict | Scam | Suspicious | Low risk |',
    '| --- | --- | --- | --- |',
    `| scam | ${app.confusion.scam.scam} | ${app.confusion.scam.suspicious} | ${app.confusion.scam.low_risk} |`,
    `| legit | ${app.confusion.legit.scam} | ${app.confusion.legit.suspicious} | ${app.confusion.legit.low_risk} |`,
    '',
    '## Per category (app config): share flagged',
    '',
    '| Category | Label | n | Flagged |',
    '| --- | --- | --- | --- |',
    ...Object.entries(app.perCategory)
      .sort(([a, x], [b, y]) => x.label.localeCompare(y.label) || a.localeCompare(b))
      .map(
        ([c, v]) => `| ${c} | ${v.label} | ${v.n} | ${v.flagged} (${fmt(pct(v.flagged, v.n))}) |`,
      ),
    '',
    '## Latency on this laptop (Node), not the phone',
    '',
    `Rules: median ${app.latencyMs.rulesMedian?.toFixed(2)} ms, worst ${app.latencyMs.rulesMax?.toFixed(2)} ms. Classifier: median ${app.latencyMs.mlMedian?.toFixed(2)} ms, worst ${app.latencyMs.mlMax?.toFixed(2)} ms.`,
    '',
    `## Missed scams (${app.missedScams.length})`,
    '',
    ...app.missedScams.map((x) => `- \`${x.id}\` (score ${x.score}): ${x.text}`),
    '',
    `## False alarms (${app.falseAlarms.length})`,
    '',
    ...app.falseAlarms.map(
      (x) => `- \`${x.id}\` ${x.verdict} (score ${x.score}; ${x.flags.join(', ')}): ${x.text}`,
    ),
    '',
  ];
  return lines.join('\n');
}

function main() {
  const classifier = loadClassifier(weights);
  if (!classifier) throw new Error('assets/classifier.json is invalid');
  const wanted = process.argv.slice(2);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; // local date
  mkdirSync('data/results', { recursive: true });

  for (const [set, dir] of Object.entries(SETS)) {
    if (wanted.length && !wanted.includes(set)) continue;
    if (!existsSync(dir)) {
      console.log(`${set}: skipped (${dir} does not exist)`);
      continue;
    }
    const rows = loadSet(dir);
    const app = evaluate(rows, classifier.score);
    const rulesOnly = evaluate(rows, null);
    const base = `data/results/${date}_${set}`;
    writeFileSync(`${base}.json`, JSON.stringify({ set, date, app, rulesOnly }, null, 2) + '\n');
    writeFileSync(`${base}.md`, markdown(set, date, app, rulesOnly));
    const a = app.flaggedIsSuspiciousOrScam;
    console.log(
      `${set}: n=${app.n} recall ${fmt(a.recall)} precision ${fmt(a.precision)} ` +
        `false alarms ${fmt(a.falseAlarmRate)} -> ${base}.md`,
    );
  }
}

main();
