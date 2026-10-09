import { MAX_INPUT_CHARS } from './config';
import type { AnalysisResult } from './core/types';
import { buildTemplateExplanation } from './core/templates';
import type { ExplainOutput } from './llm/explain';
import { runAnalysis, runReadyExplanation } from './pipeline';
import { deleteTemporaryImage, recognizeScreenshot } from './vision/images';

export type InputSource = 'text' | 'share' | 'sample' | 'screenshot' | 'qr';
export interface InputSession {
  id: string;
  source: InputSource;
  text: string;
  truncated: boolean;
  acknowledged: boolean;
  version: number;
  result: AnalysisResult | null;
  explained: ExplainOutput | null;
  enhancing: boolean;
  enhancementStarted: boolean;
  imageUri?: string;
  extraction: 'idle' | 'busy' | 'done' | 'error';
  ocrMs?: number;
  notice?: string;
}

const sessions = new Map<string, InputSession>();
const listeners = new Set<() => void>();
const reads = new Map<string, Promise<void>>();
let nextId = 0;
let homeId: string | undefined;
export const PARTIAL_NOTICE = `Message is very long. Only the first ${MAX_INPUT_CHARS.toLocaleString()} characters will be checked. Unchecked parts may contain hidden risks.`;

export function boundText(raw: string): { text: string; truncated: boolean } {
  let text = raw.slice(0, MAX_INPUT_CHARS);
  // Do not split an emoji's UTF-16 surrogate pair at the boundary.
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1);
  return { text, truncated: raw.length > MAX_INPUT_CHARS };
}

export function subscribeSessions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(session: InputSession): void {
  if (!sessions.has(session.id)) return;
  sessions.set(session.id, session);
  listeners.forEach((listener) => listener());
}
export function getSession(id: string | undefined): InputSession | undefined {
  return id ? sessions.get(id) : undefined;
}
export function createSession(raw = '', source: InputSource = 'text', imageUri?: string): string {
  const id = `check-${Date.now().toString(36)}-${++nextId}`;
  sessions.set(id, {
    id,
    source,
    ...boundText(raw),
    acknowledged: false,
    version: 0,
    result: null,
    explained: null,
    enhancing: false,
    enhancementStarted: false,
    imageUri,
    extraction: imageUri ? 'idle' : 'done',
  });
  return id;
}
export function getHomeSession(): InputSession {
  if (!getSession(homeId)) homeId = createSession();
  return sessions.get(homeId!)!;
}
export function replaceHomeInput(raw: string, source: InputSource = 'text'): string {
  const previous = homeId;
  homeId = createSession(raw, source);
  if (previous) discardSession(previous);
  publish(sessions.get(homeId)!);
  return homeId;
}
export function setSessionNotice(id: string, notice: string | null): void {
  const session = getSession(id);
  if (session) publish({ ...session, notice: notice ?? undefined });
}
export function editSession(id: string, raw: string): void {
  const session = getSession(id);
  if (!session) return;
  const bounded = boundText(raw);
  publish({
    ...session,
    ...bounded,
    truncated: session.truncated || bounded.truncated,
    acknowledged: false,
    version: session.version + 1,
    result: null,
    explained: null,
    enhancing: false,
    enhancementStarted: false,
    notice: undefined,
  });
}
export function acknowledgeSession(id: string): void {
  const session = getSession(id);
  if (session) publish({ ...session, acknowledged: true });
}
export function discardSession(id: string): void {
  const session = getSession(id);
  sessions.delete(id);
  if (session?.imageUri && session.extraction === 'idle') {
    try {
      deleteTemporaryImage(session.imageUri);
    } catch {
      /* Startup cleanup retries app-owned copies. */
    }
  }
  listeners.forEach((listener) => listener());
}
export function clearSessions(): void {
  for (const session of sessions.values()) {
    if (session.imageUri && session.extraction === 'idle') {
      try {
        deleteTemporaryImage(session.imageUri);
      } catch {
        /* Startup cleanup retries owned copies. */
      }
    }
  }
  sessions.clear();
  homeId = undefined;
  listeners.forEach((listener) => listener());
}

export function submitSession(id: string): boolean {
  const session = getSession(id);
  if (
    !session?.text.trim() ||
    (session.truncated && !session.acknowledged) ||
    session.extraction === 'busy'
  )
    return false;
  const result = runAnalysis(session.text);
  publish({
    ...session,
    result,
    version: session.version + 1,
    enhancementStarted: false,
    enhancing: false,
    explained: {
      explanation: buildTemplateExplanation(result.verdict, result.flags),
      verdict: result.verdict,
      llmRaised: false,
      ms: 0,
    },
  });
  return true;
}

export async function enhanceSession(id: string): Promise<void> {
  const session = getSession(id);
  if (!session?.result || session.enhancementStarted) return;
  const version = session.version;
  const started = performance.now();
  publish({ ...session, enhancing: true, enhancementStarted: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const out = await Promise.race([
      runReadyExplanation(session.text, session.result, 8000),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), 8000);
      }),
    ]);
    const current = getSession(id);
    if (!current || current.version !== version) return;
    publish({
      ...current,
      enhancing: false,
      explained: out && performance.now() - started <= 8000 ? out : current.explained,
    });
  } catch {
    const current = getSession(id);
    if (current?.version === version) publish({ ...current, enhancing: false });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function readScreenshot(id: string): Promise<void> {
  const existing = reads.get(id);
  if (existing) return existing;
  const session = getSession(id);
  if (!session?.imageUri || session.extraction !== 'idle') return Promise.resolve();
  const uri = session.imageUri;
  publish({ ...session, extraction: 'busy' });
  const reading = (async () => {
    const start = performance.now();
    try {
      const raw = await recognizeScreenshot(uri);
      const current = getSession(id);
      if (current)
        publish({
          ...current,
          ...boundText(raw),
          extraction: 'done',
          imageUri: undefined,
          ocrMs: performance.now() - start,
        });
    } catch {
      const current = getSession(id);
      if (current) publish({ ...current, extraction: 'error', imageUri: undefined });
    } finally {
      try {
        deleteTemporaryImage(uri);
      } catch {
        /* Owned copies are retried by startup cleanup. */
      }
      reads.delete(id);
    }
  })();
  reads.set(id, reading);
  return reading;
}
