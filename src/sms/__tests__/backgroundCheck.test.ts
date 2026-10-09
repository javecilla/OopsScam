import { describe, expect, it, jest } from '@jest/globals';

import { smsCheckTask } from '../backgroundCheck';

// FR-SM-03: the background path must never load the language model or the app pipeline.
jest.mock('../../llm/llama', () => {
  throw new Error('LLM loaded in the background SMS check');
});
jest.mock('../../llm/explain', () => {
  throw new Error('LLM loaded in the background SMS check');
});
jest.mock('../../pipeline', () => {
  throw new Error('App pipeline (with LLM) loaded in the background SMS check');
});

// Fictional samples, the same as the Home screen.
const FAKE_GCASH =
  'GCash Advisory: Your account will be SUSPENDED within 24 hours due to unusual activity. Verify now at gcash-verify.xyz/login to avoid deactivation.';
const REAL_OTP =
  'Your GCash OTP is 482913. Do not share this code with anyone, including GCash employees. It expires in 5 minutes.';

describe('SMS auto-check background task (SRS 3.13)', () => {
  it('posts no notification for a Low risk text (FR-SM-04)', () => {
    const notify = jest.fn();
    smsCheckTask(REAL_OTP, notify);
    expect(notify).not.toHaveBeenCalled();
  });

  it('notifies a Scam text with the top red flag in Taglish', () => {
    const notify = jest.fn();
    smsCheckTask(FAKE_GCASH, notify);
    expect(notify).toHaveBeenCalledTimes(1);
    const [verdict, flagTl, text] = notify.mock.calls[0] as [string, string, string];
    expect(verdict).toBe('scam');
    expect(flagTl.length).toBeGreaterThan(0);
    expect(text).toBe(FAKE_GCASH);
  });
});
