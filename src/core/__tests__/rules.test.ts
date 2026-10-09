import { describe, expect, it } from '@jest/globals';

import { analyze } from '../analyze';
import { analyzeRules } from '../rules';

const ids = (text: string) => analyzeRules(text).flags.map((f) => f.id);

// Synthetic messages written for tests; not real people's messages (AGENTS rule 7).
const FAKE_GCASH =
  'GCash Advisory: Your account will be SUSPENDED within 24 hours due to unusual activity. Verify now at gcash-verify.xyz/login to avoid deactivation.';
const GENUINE_OTP =
  'Your GCash OTP is 482913. Do not share this code with anyone, including GCash employees. It expires in 5 minutes.';

describe('credential request (FR-RL-02/03)', () => {
  it('flags an English OTP request', () => {
    expect(ids('Hi! To process your refund, please send your OTP to this number.')).toContain(
      'credential_request',
    );
  });

  it('flags Tagalog and Taglish OTP requests', () => {
    expect(ids('Pakisend po ang OTP na natanggap mo para ma-verify ang account.')).toContain(
      'credential_request',
    );
    expect(ids('Ibigay mo lang ang MPIN mo para ma-claim ang premyo.')).toContain(
      'credential_request',
    );
  });

  it('does not flag negated phrases (AT-03)', () => {
    expect(ids('Do not share your OTP with anyone.')).not.toContain('credential_request');
    expect(ids('Huwag ibigay ang OTP kahit kanino.')).not.toContain('credential_request');
    expect(ids('BDO will never ask you to send your OTP or password.')).not.toContain(
      'credential_request',
    );
  });

  it('still flags a request that follows a warning in a new sentence', () => {
    expect(
      ids('Do not share your OTP with anyone. To verify, reply with your OTP here.'),
    ).toContain('credential_request');
  });

  it('makes an OTP request a Scam verdict (AT-04)', () => {
    expect(analyze('Send me the OTP you received now, urgent.').verdict).toBe('scam');
  });
});

describe('real-OTP rule (FR-RL-06)', () => {
  it('marks a genuine OTP text and keeps it Low risk (AT-02)', () => {
    const r = analyzeRules(GENUINE_OTP);
    expect(r.realOtp).toBe(true);
    expect(analyze(GENUINE_OTP).verdict).toBe('low_risk');
  });

  it('does not apply when the message has a link', () => {
    expect(analyzeRules('Code 482913. Do not share. Login at gcash-login.xyz').realOtp).toBe(false);
  });

  it('handles the Tagalog form', () => {
    expect(analyzeRules('Ang iyong code ay 5521. Huwag ibigay sa iba.').realOtp).toBe(true);
  });
});

describe('link flags', () => {
  it('flags a lookalike domain', () => {
    expect(ids(FAKE_GCASH)).toEqual(expect.arrayContaining(['lookalike_domain', 'odd_tld']));
  });

  it('does not flag an official subdomain as a lookalike', () => {
    expect(ids('Open m.gcash.com to see your GCash promo.')).not.toContain('lookalike_domain');
    expect(ids('Open m.gcash.com to see your GCash promo.')).not.toContain('unknown_link');
  });

  it('flags a shortener', () => {
    expect(ids('Claim here: bit.ly/3xYzAbc')).toContain('shortener');
  });

  it('flags an .apk link', () => {
    expect(ids('Download the update: https://update-app.top/gcash-new.apk')).toContain('apk_link');
  });

  it('flags a brand-link mismatch', () => {
    expect(ids('BDO: Your card is on hold. Visit https://secure-login-ph.com/card')).toContain(
      'brand_link_mismatch',
    );
  });

  it('flags IP and punycode hosts', () => {
    expect(ids('Login: http://192.168.10.5/bank')).toContain('ip_host');
    expect(ids('Visit https://xn--gcsh-pqa.com now')).toContain('punycode_host');
  });

  it('ignores email domains', () => {
    expect(analyzeRules('Email me at juan@example.com').links).toHaveLength(0);
  });
});

describe('content flags and combos (FR-RL-04/05)', () => {
  it('flags the fake GCash text as Scam with threat + link combo (AT-01)', () => {
    const r = analyze(FAKE_GCASH);
    expect(r.verdict).toBe('scam');
    expect(r.flags.map((f) => f.id)).toEqual(
      expect.arrayContaining(['account_threat', 'urgency', 'combo_threat_link']),
    );
  });

  it('flags a prize text with shortener and fee (AT-05)', () => {
    const r = analyze(
      'Congratulations! Nanalo ka ng P50,000 sa raffle. Magbayad ng processing fee na P500 dito: bit.ly/claimprize',
    );
    expect(r.flags.map((f) => f.id)).toEqual(
      expect.arrayContaining(['prize', 'shortener', 'fee_request', 'combo_prize_link_or_payment']),
    );
    expect(['scam', 'suspicious']).toContain(r.verdict);
  });

  it('flags a parcel fee scam', () => {
    expect(
      ids('LBC: Your parcel is on hold. Pay the redelivery fee of P85 at lbc-ph.top/pay'),
    ).toEqual(expect.arrayContaining(['parcel_topic', 'fee_request', 'combo_parcel_fee_link']));
  });

  it('flags an emergency-relative story with secrecy', () => {
    expect(
      ids(
        'Ma, si anak ito, bagong number ko. Naaksidente ako, padalhan mo ako ng 5,000. Huwag mong sabihin kay papa.',
      ),
    ).toEqual(
      expect.arrayContaining(['emergency_relative', 'secrecy', 'combo_relative_secrecy_or_money']),
    );
  });

  it('flags remote-access requests', () => {
    expect(ids('Please install AnyDesk so our agent can fix your account.')).toContain(
      'remote_access',
    );
  });

  it('flags government name plus action', () => {
    expect(ids('DSWD ayuda: i-claim ang P8,000 sa dswd-ayuda.online')).toEqual(
      expect.arrayContaining(['gov_agency', 'combo_gov_action']),
    );
  });

  it('keeps a personal Taglish chat Low risk', () => {
    expect(analyze('Uy, nasa bahay ka na? Kain tayo mamaya sa labas, libre ko.').verdict).toBe(
      'low_risk',
    );
  });

  it('keeps evidence within 80 characters and from the message (FR-RL-07)', () => {
    for (const f of analyzeRules(FAKE_GCASH + ' ' + 'x'.repeat(200)).flags) {
      expect(f.evidence.length).toBeLessThanOrEqual(80);
      expect(f.tl.length).toBeGreaterThan(0);
      expect(f.en.length).toBeGreaterThan(0);
    }
  });
});

describe('robustness (REL-05, PERF-01)', () => {
  it.each(['', '   ', '😀😀😀', '你好世界', 'a'.repeat(5000), FAKE_GCASH.repeat(40)])(
    'does not throw and runs under 50 ms',
    (text) => {
      const t0 = performance.now();
      const r = analyzeRules(text);
      expect(performance.now() - t0).toBeLessThan(50);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    },
  );
});
