// Link extraction and checks (SRS 3.3). Pure TypeScript, no network: a link is only inspected, never opened.

import brandsData from './brands.json';
import type { FlagId, LinkInfo } from './types';

export interface Brand {
  id: string;
  name: string;
  keywords: string[];
  domains: string[];
  ambiguous: boolean;
  text_pattern?: string | null;
  verified: boolean;
  verified_source: string;
  verified_on: string | null;
}

export const BRANDS: Brand[] = brandsData.brands;

// A brand is "named in the text" via its text_pattern, or its keywords as whole words if it has none.
const BRAND_TEXT_RES = new Map(
  BRANDS.map((b) => [
    b.id,
    new RegExp(b.text_pattern || String.raw`\b(?:${b.keywords.join('|')})\b`, 'i'),
  ]),
);

// Two-label public suffixes we expect in PH messages (FR-LK-02).
const MULTI_PART_SUFFIXES = new Set([
  'com.ph',
  'gov.ph',
  'net.ph',
  'org.ph',
  'edu.ph',
  'mil.ph',
  'co.uk',
  'org.uk',
  'com.au',
  'com.sg',
  'com.my',
  'co.id',
  'co.jp',
]);

const SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'is.gd',
  'cutt.ly',
  'rb.gy',
  's.id',
  'ow.ly',
  'shorturl.at',
  'tiny.cc',
  'rebrand.ly',
  'bit.do',
  't.ly',
  'short.gy',
  'tny.im',
  'v.gd',
  'shorte.st',
  'urlz.fr',
  'qrco.de',
]);

const ODD_TLDS = new Set([
  'xyz',
  'top',
  'click',
  'link',
  'icu',
  'buzz',
  'vip',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'rest',
  'cfd',
  'sbs',
  'lol',
  'mom',
  'cyou',
  'shop',
  'online',
  'site',
  'live',
  'club',
  'monster',
  'work',
  'fun',
  'pw',
]);

// Endings that let us recognise bare domains like "gcash-verify.xyz" without http:// (FR-LK-01).
const BARE_TLDS = [
  'com',
  'net',
  'org',
  'ph',
  'info',
  'biz',
  'io',
  'co',
  'me',
  'app',
  'ly',
  'gl',
  'gy',
  'gd',
  'at',
  'cc',
  'id',
  'do',
  'im',
  'de',
  'st',
  'fr',
  ...ODD_TLDS,
  // Reserved test endings (RFC 2606) so test data never points at a real site; they get no odd-ending flag.
  'example',
  'test',
  'invalid',
].join('|');

const URL_RE = new RegExp(
  String.raw`(?:https?://[^\s<>"']+|www\.[^\s<>"']+|\b(?:[a-z0-9][a-z0-9-]{0,62}\.){1,6}(?:${BARE_TLDS})\b(?:/[^\s<>"']*)?)`,
  'gi',
);

const TRAILING_PUNCT_RE = /[.,;:!?)\]}'"’”]+$/;
const IP_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function hostOf(raw: string): string {
  let rest = raw.replace(/^https?:\/\//i, '');
  rest = rest.split(/[/?#]/)[0];
  // "gcash.com@evil.xyz" really goes to evil.xyz.
  const at = rest.lastIndexOf('@');
  if (at >= 0) rest = rest.slice(at + 1);
  rest = rest.split(':')[0];
  return rest.toLowerCase().replace(/\.$/, '');
}

export function isIpHost(host: string): boolean {
  return IP_RE.test(host);
}

export function registeredDomain(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (isIpHost(h)) return h;
  const labels = h.split('.');
  if (labels.length >= 3 && MULTI_PART_SUFFIXES.has(labels.slice(-2).join('.'))) {
    return labels.slice(-3).join('.');
  }
  return labels.slice(-2).join('.');
}

export function extractLinks(text: string): LinkInfo[] {
  const links: LinkInfo[] = [];
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    // Skip the domain part of an email address.
    if (start > 0 && text[start - 1] === '@') continue;
    const raw = m[0].replace(TRAILING_PUNCT_RE, '');
    const host = hostOf(raw);
    if (!host.includes('.')) continue;
    links.push({ raw, host, domain: registeredDomain(host) });
  }
  return links;
}

function isOfficialFor(host: string, brand: Brand): boolean {
  return brand.domains.some((d) => host === d || host.endsWith('.' + d));
}

export function isOfficialHost(host: string): boolean {
  return BRANDS.some((b) => isOfficialFor(host, b));
}

export function mentionedBrands(text: string): Brand[] {
  return BRANDS.filter((b) => BRAND_TEXT_RES.get(b.id)?.test(text));
}

// Edit distance capped at 2, enough to spot one-letter typos like "gcassh".
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Letter-only tokens of the host without its public suffix: "gcash-verify.xyz" -> ["gcash", "verify"].
function hostTokens(host: string): string[] {
  const labels = host.split('.');
  const suffixLen =
    labels.length >= 3 && MULTI_PART_SUFFIXES.has(labels.slice(-2).join('.')) ? 2 : 1;
  return labels
    .slice(0, -suffixLen)
    .join('.')
    .split(/[^a-z]+/)
    .filter(Boolean);
}

// FR-LK-04: imitates a brand but is neither its official domain nor a subdomain of it.
export function lookalikeBrand(host: string): Brand | null {
  if (isIpHost(host)) return null;
  const tokens = hostTokens(host);
  for (const brand of BRANDS) {
    if (isOfficialFor(host, brand)) continue;
    for (const kw of brand.keywords) {
      const hit = tokens.some((t) => {
        if (t === kw) return true;
        if (brand.ambiguous) return false;
        if (kw.length >= 4 && t.includes(kw)) return true;
        return kw.length >= 5 && editDistance(t, kw) === 1;
      });
      if (hit) return brand;
    }
  }
  return null;
}

export interface LinkFlagHit {
  id: FlagId;
  evidence: string;
}

// One hit per flag id; evidence is the first link that triggered it.
export function checkLinks(links: LinkInfo[], text: string): LinkFlagHit[] {
  const hits = new Map<FlagId, string>();
  const add = (id: FlagId, evidence: string) => {
    if (!hits.has(id)) hits.set(id, evidence);
  };
  const lookalikeHosts = new Set<string>();

  for (const link of links) {
    const { host, raw } = link;
    if (isOfficialHost(host)) continue;
    add('unknown_link', raw);
    if (SHORTENERS.has(host) || SHORTENERS.has(link.domain)) add('shortener', raw);
    if (isIpHost(host)) add('ip_host', raw);
    if (host.split('.').some((l) => l.startsWith('xn--'))) add('punycode_host', raw);
    if (!isIpHost(host) && ODD_TLDS.has(host.split('.').pop() ?? '')) add('odd_tld', raw);
    if (/\.apk(?:$|[?#])/i.test(raw)) add('apk_link', raw);
    if (lookalikeBrand(host)) {
      add('lookalike_domain', raw);
      lookalikeHosts.add(host);
    }
  }

  // Brand named in the text, but a link goes elsewhere (not already counted as a lookalike).
  if (mentionedBrands(text).length > 0) {
    const other = links.find((l) => !isOfficialHost(l.host) && !lookalikeHosts.has(l.host));
    if (other) add('brand_link_mismatch', other.raw);
  }

  return [...hits].map(([id, evidence]) => ({ id, evidence }));
}

export function hasNonOfficialLink(links: LinkInfo[]): boolean {
  return links.some((l) => !isOfficialHost(l.host));
}
