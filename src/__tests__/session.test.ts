import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import {
  acknowledgeSession,
  boundText,
  clearSessions,
  createSession,
  discardSession,
  editSession,
  enhanceSession,
  getSession,
  readScreenshot,
  submitSession,
} from '../session';
import { runAnalysis, runReadyExplanation } from '../pipeline';
import { analyze } from '../core/analyze';
import { deleteTemporaryImage, recognizeScreenshot } from '../vision/images';

jest.mock('../pipeline', () => ({ runAnalysis: jest.fn(), runReadyExplanation: jest.fn() }));
jest.mock('../vision/images', () => ({
  recognizeScreenshot: jest.fn(),
  deleteTemporaryImage: jest.fn(),
}));
const analysis = jest.mocked(runAnalysis);
const enhance = jest.mocked(runReadyExplanation);
const recognize = jest.mocked(recognizeScreenshot);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  clearSessions();
  jest.clearAllMocks();
  analysis.mockImplementation((text) => analyze(text));
  enhance.mockResolvedValue(null);
});
afterEach(() => {
  clearSessions();
  jest.useRealTimers();
});

test('empty input cannot become a result', () => {
  const id = createSession('  ');
  expect(submitSession(id)).toBe(false);
  expect(analysis).not.toHaveBeenCalled();
});
test('partial input requires acknowledgment and retains provenance after an edit', () => {
  const id = createSession('x'.repeat(2001), 'share');
  expect(getSession(id)?.text).toHaveLength(2000);
  expect(submitSession(id)).toBe(false);
  acknowledgeSession(id);
  expect(submitSession(id)).toBe(true);
  editSession(id, 'Reviewed excerpt');
  expect(getSession(id)?.truncated).toBe(true);
  expect(submitSession(id)).toBe(false);
  acknowledgeSession(id);
  expect(submitSession(id)).toBe(true);
});
test('input boundary never leaves half an emoji', () => {
  expect(boundText('x'.repeat(1999) + '😀').text).toHaveLength(1999);
});
test('opaque identity is independent of message content and templates are immediate', () => {
  const raw = 'Your OTP is 482913. Do not share this code with anyone.';
  const id = createSession(raw);
  expect(id).not.toContain('482913');
  expect(submitSession(id)).toBe(true);
  expect(analysis).toHaveBeenCalledTimes(1);
  expect(getSession(id)?.explained?.explanation.source).toBe('template');
  expect(getSession(id)?.enhancing).toBe(false);
});
test('stale enhancement cannot overwrite an edited and resubmitted input', async () => {
  const pending = deferred<Awaited<ReturnType<typeof runReadyExplanation>>>();
  enhance.mockReturnValueOnce(pending.promise);
  const id = createSession('old input');
  submitSession(id);
  const first = enhanceSession(id);
  editSession(id, 'new input');
  submitSession(id);
  pending.resolve({
    explanation: { source: 'llm', explanationTl: 'Old answer', actionTl: 'Old action' },
    verdict: 'scam',
    llmRaised: false,
    ms: 1,
  });
  await first;
  expect(getSession(id)?.text).toBe('new input');
  expect(getSession(id)?.explained?.explanation.source).toBe('template');
});
test('the complete UI enhancement request has an eight-second deadline', async () => {
  jest.useFakeTimers();
  const pending = deferred<Awaited<ReturnType<typeof runReadyExplanation>>>();
  enhance.mockReturnValue(pending.promise);
  const id = createSession('message');
  submitSession(id);
  const work = enhanceSession(id);
  expect(getSession(id)?.enhancing).toBe(true);
  await jest.advanceTimersByTimeAsync(8000);
  await work;
  expect(getSession(id)?.enhancing).toBe(false);
  pending.resolve({
    explanation: { source: 'llm', explanationTl: 'Late', actionTl: 'Late' },
    verdict: 'scam',
    llmRaised: false,
    ms: 9000,
  });
  await Promise.resolve();
  expect(getSession(id)?.explained?.explanation.source).toBe('template');
});
test('duplicate enhancement calls do not start another generation', async () => {
  const id = createSession('message');
  submitSession(id);
  await Promise.all([enhanceSession(id), enhanceSession(id)]);
  expect(enhance).toHaveBeenCalledTimes(1);
});
test('discarded sessions cannot be resurrected by delayed OCR and copies are cleaned', async () => {
  const pending = deferred<string>();
  recognize.mockReturnValue(pending.promise);
  const id = createSession('', 'screenshot', 'file:///cache/owned.image');
  const work = readScreenshot(id);
  expect(readScreenshot(id)).toBe(work);
  discardSession(id);
  pending.resolve('Extracted text');
  await work;
  expect(getSession(id)).toBeUndefined();
  expect(deleteTemporaryImage).toHaveBeenCalledWith('file:///cache/owned.image');
});
test('OCR failure produces a recoverable state and still cleans the copy', async () => {
  recognize.mockRejectedValueOnce(new Error('native path must remain private'));
  const id = createSession('', 'screenshot', 'file:///cache/owned.image');
  await readScreenshot(id);
  expect(getSession(id)?.extraction).toBe('error');
  expect(getSession(id)?.imageUri).toBeUndefined();
  expect(deleteTemporaryImage).toHaveBeenCalledWith('file:///cache/owned.image');
});
