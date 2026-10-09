// On-device scoring of the exported TF-IDF + logistic regression model (SRS 3.4).
// Mirrors scikit-learn exactly (training/train.py) so probabilities match within 0.01 (FR-ML-04).
// Pure TypeScript: the app, Jest and the Node eval script share it.

type TermTable = Record<string, [idf: number, coef: number]>;

interface Block {
  ngram: [number, number];
  terms: TermTable;
}

export interface ClassifierWeights {
  version: number;
  normalize: { url: string; num: string };
  word: Block;
  char: Block;
  intercept: number;
}

export interface Classifier {
  score: (text: string) => number; // scam probability 0..1
}

// Python's (?u)\b\w\w+\b: runs of 2+ word characters (letters, digits, underscore).
const WORD_TOKEN_RE = /[\p{L}\p{N}_]{2,}/gu;

function wordNgrams(text: string, [minN, maxN]: [number, number]): string[] {
  const tokens = text.match(WORD_TOKEN_RE) ?? [];
  const grams: string[] = [];
  for (let n = minN; n <= Math.min(maxN, tokens.length); n++) {
    for (let i = 0; i + n <= tokens.length; i++) grams.push(tokens.slice(i, i + n).join(' '));
  }
  return grams;
}

// sklearn's _char_wb_ngrams, counting code points (Array.from) like Python strings do.
function charWbNgrams(text: string, [minN, maxN]: [number, number]): string[] {
  const grams: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    const w = Array.from(' ' + word + ' ');
    for (let n = minN; n <= maxN; n++) {
      let offset = 0;
      grams.push(w.slice(offset, offset + n).join(''));
      while (offset + n < w.length) {
        offset++;
        grams.push(w.slice(offset, offset + n).join(''));
      }
      if (offset === 0) break; // word shorter than n: counted once
    }
  }
  return grams;
}

// Sublinear TF * IDF, L2-normalised within the block, dotted with the coefficients.
function blockDot(grams: string[], terms: TermTable): number {
  const counts = new Map<string, number>();
  for (const g of grams) if (g in terms) counts.set(g, (counts.get(g) ?? 0) + 1);
  let norm = 0;
  let dot = 0;
  for (const [g, tf] of counts) {
    const [idf, coef] = terms[g];
    const v = (1 + Math.log(tf)) * idf;
    norm += v * v;
    dot += v * coef;
  }
  return norm > 0 ? dot / Math.sqrt(norm) : 0;
}

function isBlock(b: unknown): b is Block {
  if (typeof b !== 'object' || b === null) return false;
  const { ngram, terms } = b as Block;
  return (
    Array.isArray(ngram) &&
    ngram.length === 2 &&
    ngram.every(Number.isInteger) &&
    typeof terms === 'object' &&
    terms !== null
  );
}

// FR-ML-03: invalid or missing weights -> null, and the app runs on rules alone.
export function loadClassifier(json: unknown): Classifier | null {
  if (typeof json !== 'object' || json === null) return null;
  const w = json as ClassifierWeights;
  if (
    w.version !== 1 ||
    typeof w.intercept !== 'number' ||
    typeof w.normalize?.url !== 'string' ||
    typeof w.normalize?.num !== 'string' ||
    !isBlock(w.word) ||
    !isBlock(w.char)
  ) {
    return null;
  }

  let urlRe: RegExp;
  let numRe: RegExp;
  try {
    urlRe = new RegExp(w.normalize.url, 'g');
    numRe = new RegExp(w.normalize.num, 'g');
  } catch {
    return null;
  }

  // FR-ML-02: same masking as training.
  const normalize = (text: string) =>
    text.toLowerCase().replace(urlRe, ' url ').replace(numRe, ' num ');

  return {
    score: (text: string) => {
      const t = normalize(text);
      const z =
        w.intercept +
        blockDot(wordNgrams(t, w.word.ngram), w.word.terms) +
        blockDot(charWbNgrams(t, w.char.ngram), w.char.terms);
      return 1 / (1 + Math.exp(-z));
    },
  };
}
