// Splits a message into plain and highlighted parts using each flag's evidence (FR-UI-01).

export interface TextPart {
  text: string;
  highlighted: boolean;
}

export function highlightParts(message: string, evidence: string[]): TextPart[] {
  const lower = message.toLowerCase();
  const ranges: [number, number][] = [];
  for (const e of evidence) {
    const needle = e.toLowerCase();
    if (!needle) continue;
    const start = lower.indexOf(needle);
    if (start >= 0) ranges.push([start, start + needle.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  // Merge overlapping ranges.
  const merged: [number, number][] = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  const parts: TextPart[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) parts.push({ text: message.slice(pos, s), highlighted: false });
    parts.push({ text: message.slice(s, e), highlighted: true });
    pos = e;
  }
  if (pos < message.length) parts.push({ text: message.slice(pos), highlighted: false });
  return parts;
}
