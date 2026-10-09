import { expect, jest, test } from '@jest/globals';
import { runReadyExplanation } from '../pipeline';
import { getLlmEngine, getLlmStatus } from '../llm/llama';
import { analyze } from '../core/analyze';

jest.mock('../llm/llama', () => ({ getLlmEngine: jest.fn(), getLlmStatus: jest.fn() }));
const engine = jest.mocked(getLlmEngine);
const status = jest.mocked(getLlmStatus);
const result = analyze('message');
test('model preparation does not start or await generation', async () => {
  status.mockReturnValue('loading');
  expect(await runReadyExplanation('message', result, 8000)).toBeNull();
  expect(engine).not.toHaveBeenCalled();
});
test('timeout does not release native generation ownership before completion settles', async () => {
  jest.useFakeTimers();
  status.mockReturnValue('ready');
  let resolve!: (text: string) => void;
  const completion = new Promise<string>((yes) => {
    resolve = yes;
  });
  const complete = jest.fn<() => Promise<string>>().mockReturnValue(completion);
  const stop = jest.fn<() => void>();
  engine.mockResolvedValue({ model: 'test', complete, stop });
  const first = runReadyExplanation('message', result, 8000);
  await jest.advanceTimersByTimeAsync(8000);
  expect((await first)?.explanation.source).toBe('template');
  expect(stop).toHaveBeenCalledTimes(1);
  expect(await runReadyExplanation('second', result, 8000)).toBeNull();
  expect(complete).toHaveBeenCalledTimes(1);
  resolve('invalid');
  await Promise.resolve();
  await Promise.resolve();
  complete.mockResolvedValue('invalid');
  expect((await runReadyExplanation('third', result, 8000))?.explanation.source).toBe('template');
  expect(complete).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
