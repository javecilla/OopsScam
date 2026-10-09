import { describe, expect, it } from '@jest/globals';

import { analyze } from '../analyze';
import { looksLikeEmail, senderAddresses } from '../email';
import { analyzeRules } from '../rules';

const ids = (text: string) => analyzeRules(text).flags.map((f) => f.id);

// Synthetic messages written for tests; not real people's messages (AGENTS rule 7).
const SPOOFED =
  'From: GCash Support <support@gcash-help.example>\nSubject: Account review\n\nPlease review your account details today.';
const OFFICIAL =
  'From: GCash <no-reply@mail.gcash.com>\nSubject: Receipt\n\nYou paid PHP 120.00 to Juan Store.';
const LETTER = 'Dear Customer,\n\nYour statement is ready in the app.\n\nRegards,\nCustomer Care';

describe('looksLikeEmail', () => {
  it('detects header lines', () => {
    expect(looksLikeEmail(SPOOFED)).toBe(true);
    expect(looksLikeEmail('Subject: Meeting moved\n\nSee you at 3 PM.')).toBe(true);
  });

  it('detects a body-only email: greeting first, sign-off at the end', () => {
    expect(looksLikeEmail(LETTER)).toBe(true);
    expect(
      looksLikeEmail(
        'Magandang araw po,\n\nBukas na ang enrollment.\n\nMaraming salamat,\nRegistrar',
      ),
    ).toBe(true);
  });

  it.each([
    'GCash Advisory: Your account will be SUSPENDED within 24 hours due to unusual activity. Verify now at gcash-verify.xyz/login to avoid deactivation.',
    'Your GCash OTP is 482913. Do not share this code with anyone, including GCash employees. It expires in 5 minutes.',
    'Uy, nasa bahay ka na? Kain tayo mamaya sa labas, libre ko.',
    'Hi po! Available pa po ba yung bike? Salamat po',
    'Email me at juan@example.com',
    '',
  ])('treats a text message as not an email: %s', (text) => {
    expect(looksLikeEmail(text)).toBe(false);
  });
});

describe('senderAddresses', () => {
  it('reads From, Reply-To and Sender lines only', () => {
    const text =
      'From: Ana <ana@one.example>\nReply-To: help@two.example\nTo: me@three.example\nContact us at desk@four.example';
    expect(senderAddresses(text).map((s) => s.host)).toEqual(['one.example', 'two.example']);
  });
});

describe('sender check (sender_lookalike)', () => {
  it('flags a sender domain that imitates a brand', () => {
    expect(ids(SPOOFED)).toContain('sender_lookalike');
  });

  it('flags a lookalike Reply-To behind an official From', () => {
    expect(
      ids('From: BDO <estatement@bdo.com.ph>\nReply-To: help@bdo-support.example\n\nPlease reply.'),
    ).toContain('sender_lookalike');
  });

  it('does not flag official sender domains or their subdomains', () => {
    expect(ids(OFFICIAL)).not.toContain('sender_lookalike');
    expect(ids('From: BDO <estatement@bdo.com.ph>\nSubject: Statement')).not.toContain(
      'sender_lookalike',
    );
  });

  it('ignores addresses outside the sender lines', () => {
    expect(ids('Email us at support@gcash-help.example')).not.toContain('sender_lookalike');
  });

  it('makes a spoofed sender at least Suspicious on rules alone', () => {
    expect(analyze(SPOOFED).verdict).not.toBe('low_risk');
  });

  it('keeps the evidence to the address', () => {
    const flag = analyzeRules(SPOOFED).flags.find((f) => f.id === 'sender_lookalike');
    expect(flag?.evidence).toBe('support@gcash-help.example');
  });
});
