import { describe, expect, it } from '@jest/globals';

import { BRANDS, extractLinks, hostOf, lookalikeBrand, registeredDomain } from '../links';

describe('registeredDomain (FR-LK-02)', () => {
  it.each([
    ['www.lto.gov.ph', 'lto.gov.ph'],
    ['online.bdo.com.ph', 'bdo.com.ph'],
    ['m.gcash.com', 'gcash.com'],
    ['gcash.com', 'gcash.com'],
    ['a.b.example.co.uk', 'example.co.uk'],
    ['192.168.1.1', '192.168.1.1'],
  ])('%s -> %s', (host, domain) => {
    expect(registeredDomain(host)).toBe(domain);
  });
});

describe('extractLinks (FR-LK-01)', () => {
  it('finds http, www and bare links and strips trailing punctuation', () => {
    const links = extractLinks(
      'Go to https://Example.com/a?b=1, or www.bdo.com.ph. Also gcash-verify.xyz!',
    );
    expect(links.map((l) => l.host)).toEqual(['example.com', 'www.bdo.com.ph', 'gcash-verify.xyz']);
    expect(links[1].domain).toBe('bdo.com.ph');
  });

  it('uses the real host after an @ trick', () => {
    expect(hostOf('https://gcash.com@evil.xyz/login')).toBe('evil.xyz');
  });
});

describe('lookalikeBrand (FR-LK-04/05)', () => {
  it.each([
    'gcash-verify.xyz',
    'gcashph.com',
    'gcassh.com',
    'bdo-online.top',
    'secure.gcash.help.com',
  ])('flags %s', (host) => {
    expect(lookalikeBrand(host)).not.toBeNull();
  });

  it.each([
    'gcash.com',
    'm.gcash.com',
    'online.bdo.com.ph',
    'example.com',
    'globetrotter.com',
    'smartphone-deals.com',
  ])('does not flag %s', (host) => {
    expect(lookalikeBrand(host)).toBeNull();
  });
});

describe('reserved test domains (.example, .test, .invalid)', () => {
  it('extracts bare reserved-domain links used in test data', () => {
    const links = extractLinks(
      'Verify at gcash-verify-login.example or promo.test, not x.invalid.',
    );
    expect(links.map((l) => l.host)).toEqual([
      'gcash-verify-login.example',
      'promo.test',
      'x.invalid',
    ]);
  });

  it('still detects a lookalike on a reserved domain', () => {
    expect(lookalikeBrand('gcash-verify-login.example')?.id).toBe('gcash');
  });
});

describe('brands.json schema', () => {
  it('has the required fields and only marks verified entries with a source and date', () => {
    for (const b of BRANDS) {
      expect(b.name).toBeTruthy();
      expect(b.keywords.length).toBeGreaterThan(0);
      expect(b.domains.length).toBeGreaterThan(0);
      expect(typeof b.ambiguous).toBe('boolean');
      if (b.verified) {
        expect(b.verified_source).toMatch(/^https:\/\//);
        expect(b.verified_on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
