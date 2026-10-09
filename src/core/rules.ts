// Rules engine (SRS 3.2): a deterministic function of the message text only (FR-RL-01).

import { senderAddresses } from './email';
import { checkLinks, extractLinks, hasNonOfficialLink, lookalikeBrand } from './links';
import { rulesScore } from './scoring';
import { FLAG_TEXT } from './templates';
import type { Flag, FlagId, RulesResult } from './types';

// SRS Appendix A starting points. Tune on data/dev only, never on data/test.
export const POINTS: Record<FlagId, number> = {
  credential_request: 60,
  lookalike_domain: 45,
  sender_lookalike: 45,
  apk_link: 35,
  remote_access: 30,
  brand_link_mismatch: 30,
  fee_request: 25,
  money_request: 25,
  punycode_host: 25,
  ip_host: 25,
  account_threat: 20,
  prize: 20,
  emergency_relative: 20,
  urgency: 15,
  shortener: 15,
  odd_tld: 15,
  secrecy: 15,
  job_loan_investment: 15,
  gov_agency: 10,
  unknown_link: 8,
  parcel_topic: 5,
  combo_parcel_fee_link: 25,
  combo_threat_link: 20,
  combo_prize_link_or_payment: 20,
  combo_gov_action: 20,
  combo_relative_secrecy_or_money: 15,
};

const MAX_EVIDENCE = 80;

const rx = (source: string) => new RegExp(source, 'i');

// Credential request (FR-RL-02). "enter/type" are left out on purpose: genuine OTP texts say "enter this code".
const CRED_NOUN = String.raw`(?:\botp\b|one[- ]?time[- ]?(?:pin|password|code)|\bm-?pin\b|\bpin code\b|\batm pin\b|\bpassword\b|\bpasscode\b|verification code|security code|\b[46][- ]digit code|\bcvv\b|card number|card details|valid id|code (?:you received|na natanggap|sent to you|na pinadala))`;
const CRED_VERB = String.raw`(?:send|give|share|reply(?: with)?|provide|forward|tell|i-?send|pakisend|paki-?send|ipadala|ibigay|i-?reply|sabihin|i-?forward|i-?share)`;
const CREDENTIAL_PATTERNS = [
  new RegExp(String.raw`\b${CRED_VERB}\b[^.!?\n]{0,40}?${CRED_NOUN}`, 'gi'),
  new RegExp(
    String.raw`${CRED_NOUN}[^.!?\n]{0,25}?\b(?:i-?send|ipadala|ibigay|i-?reply|send|reply)\b`,
    'gi',
  ),
];

// FR-RL-03: a credential phrase preceded by one of these (in the same sentence) is a warning, not a request.
const NEGATION_RE =
  /\b(?:not|don'?t|never|no one|nobody|won'?t|huwag|wag|hindi|di|bawal|walang)\b/i;

const PATTERNS: Partial<Record<FlagId, RegExp>> = {
  urgency: rx(
    String.raw`\b(?:urgent|immediately|right away|asap|within \d+ ?(?:hours?|hrs?|minutes?|mins?|days?)|today only|last chance|final (?:notice|warning)|expires? (?:today|soon|in)|ngayon din|ngayon na|agad-agad|kaagad|bilisan|before midnight|hanggang mamaya|hanggang ngayong araw)\b`,
  ),
  prize: rx(
    String.raw`\b(?:congratulations|congrats|you(?:'ve| have)? won|winner|nanalo|panalo ka|napili ka|raffle|premyo|prize|jackpot|ayuda|cash gift|free gift|libreng regalo|claim your)\b`,
  ),
  fee_request: rx(
    String.raw`\b(?:\w+ fee|bayad|magbayad|bayaran|singil|customs|redelivery|re-delivery|unpaid|outstanding balance|penalty|multa)\b`,
  ),
  money_request: rx(
    String.raw`\b(?:pahiram|pautang|send money|(?:send|transfer|padalhan|magpadala|ipadala|i-?send|pasaload|pa-?load|cash ?in)\b[^.!?\n]{0,30}?(?:money|pera|₱|php|\bp ?\d|\d[\d,]{2,}|load))`,
  ),
  account_threat: rx(
    String.raw`\b(?:suspend(?:ed)?|deactivat(?:e|ed|ion)|blocked|locked|restricted|disabled|terminated|will be closed|isasara|masususpend|ma-?suspend|ma-?block|ma-?lock|ide-?deactivate|forfeited|unauthori[sz]ed (?:login|access|transaction)|unusual activity)\b`,
  ),
  remote_access: rx(
    String.raw`\b(?:anydesk|teamviewer|rustdesk|quick ?support|airdroid|remote access|screen ?share|(?:install|download|i-?install|i-?download) (?:this|the|our|ang|itong) app)\b`,
  ),
  secrecy: rx(
    String.raw`\b(?:don'?t tell|do not tell|keep (?:this|it) (?:a )?(?:secret|confidential|between us)|huwag (?:mong |nyong |niyong )?sabihin|'?wag (?:mong )?sabihin|atin-atin lang|sikreto|ilihim|huwag ipaalam|'?wag ipaalam)\b`,
  ),
  gov_agency: rx(
    String.raw`\b(?:SSS|GSIS|Pag-?IBIG|PhilHealth|BIR|LTO|LTFRB|DSWD|DOLE|DTI|DOH|DepEd|CHED|NBI|PNP|CICC|DICT|BSP|OWWA|DFA|COMELEC|NTC|Bureau of Customs|PSA)\b`,
  ),
  parcel_topic: rx(
    String.raw`\b(?:parcel|package|delivery|deliver|shipment|courier|waybill|tracking|pakete)\b`,
  ),
  job_loan_investment: rx(
    String.raw`\b(?:hiring|part[- ]time|work from home|wfh|sideline|daily (?:income|salary|sahod)|kumita|kikita|earn (?:up to|₱|php|\d)|loan|lending|investment|invest|double your|crypto|forex|guaranteed (?:income|return|profit)|tubo)\b`,
  ),
};

const RELATIVE_RE = rx(
  String.raw`\b(?:anak|nanay|tatay|mama|papa|mommy|daddy|nay|tay|tita|tito|lola|lolo|kuya|ate|pinsan|mom|dad|your (?:son|daughter|child|relative))\b`,
);
const EMERGENCY_RE = rx(
  String.raw`\b(?:hospital|ospital|na-?ospital|naaksidente|aksidente|accident|nahuli|kulong|nakakulong|police|pulis|emergency|operasyon|operation|new number|bagong number|bago kong number)\b`,
);

// FR-RL-06: a genuine OTP text has a code, a "do not share" phrase and no link.
const OTP_CODE_RE = /\b\d{4,8}\b/;
const DO_NOT_SHARE_RE =
  /\b(?:do not|don'?t|never|huwag|'?wag)\s+(?:share|give|disclose|tell|ibigay|ibahagi|sabihin|ipakita|i-?share)\b/i;

const evidenceOf = (s: string) => s.trim().slice(0, MAX_EVIDENCE);

function findCredentialRequest(text: string): string | null {
  for (const re of CREDENTIAL_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      // Look back to the start of the sentence (at most 30 chars) plus the match itself.
      const before =
        text
          .slice(Math.max(0, start - 30), start)
          .split(/[.!?\n]/)
          .pop() ?? '';
      if (!NEGATION_RE.test(before + ' ' + m[0])) return evidenceOf(m[0]);
    }
  }
  return null;
}

export function analyzeRules(text: string): RulesResult {
  const hits = new Map<FlagId, string>();
  const add = (id: FlagId, evidence: string) => {
    if (!hits.has(id)) hits.set(id, evidenceOf(evidence));
  };

  const links = extractLinks(text);

  const credential = findCredentialRequest(text);
  if (credential) add('credential_request', credential);

  for (const [id, re] of Object.entries(PATTERNS) as [FlagId, RegExp][]) {
    const m = re.exec(text);
    if (m) add(id, m[0]);
  }

  const relative = RELATIVE_RE.exec(text);
  const emergency = EMERGENCY_RE.exec(text);
  if (relative && emergency) add('emergency_relative', emergency[0]);

  for (const hit of checkLinks(links, text)) add(hit.id, hit.evidence);

  // Email sender check. Not a hard flag: brands send email from domains our brand list may not have yet.
  for (const sender of senderAddresses(text)) {
    if (lookalikeBrand(sender.host)) add('sender_lookalike', sender.address);
  }

  // Combination bonuses (FR-RL-05). Links to official brand domains do not count here.
  const riskyLink = hasNonOfficialLink(links);
  const has = (id: FlagId) => hits.has(id);
  const payment = has('fee_request') || has('money_request');
  if (has('parcel_topic') && has('fee_request') && riskyLink) {
    add('combo_parcel_fee_link', hits.get('fee_request') ?? '');
  }
  if (has('account_threat') && riskyLink) {
    add('combo_threat_link', hits.get('account_threat') ?? '');
  }
  if (has('prize') && (riskyLink || payment)) {
    add('combo_prize_link_or_payment', hits.get('prize') ?? '');
  }
  if (has('gov_agency') && (riskyLink || payment || has('credential_request'))) {
    add('combo_gov_action', hits.get('gov_agency') ?? '');
  }
  if (has('emergency_relative') && (has('secrecy') || has('money_request'))) {
    add('combo_relative_secrecy_or_money', hits.get('emergency_relative') ?? '');
  }

  const realOtp = links.length === 0 && OTP_CODE_RE.test(text) && DO_NOT_SHARE_RE.test(text);

  const flags: Flag[] = [...hits]
    .map(([id, evidence]) => ({ id, points: POINTS[id], ...FLAG_TEXT[id], evidence }))
    .sort((a, b) => b.points - a.points);

  return { score: rulesScore(flags, realOtp), flags, links, realOtp };
}
