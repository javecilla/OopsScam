// Data-only Taglish/English text for flags and the template explanation fallback (SRS MNT-03, FR-LM-07).
// Never describe a message as "safe" (AGENTS rule 4); a test checks every string here.

import type { Explanation, FlagId, Verdict } from './types';

export const FLAG_TEXT: Record<FlagId, { tl: string; en: string }> = {
  credential_request: {
    tl: 'Hinihingi ang OTP, MPIN, password o ID mo. Walang totoong bangko o e-wallet ang hihingi nito.',
    en: 'It asks for your OTP, MPIN, password or ID. Real banks and e-wallets never ask for these.',
  },
  lookalike_domain: {
    tl: 'Ginagaya ng link ang pangalan ng kilalang brand, pero hindi ito ang official website nila.',
    en: 'The link imitates a known brand but is not its official website.',
  },
  sender_lookalike: {
    tl: 'Ginagaya ng email address ng nagpadala ang pangalan ng kilalang brand, pero hindi ito ang official domain nila.',
    en: 'The sender’s email address imitates a known brand but is not its official domain.',
  },
  apk_link: {
    tl: 'May link para mag-download ng app (.apk) sa labas ng Play Store. Puwede itong malware.',
    en: 'It links to an app file (.apk) outside the Play Store, which may be malware.',
  },
  remote_access: {
    tl: 'Pinapa-install ka ng app o remote-access tool. Puwede nilang makontrol ang phone mo.',
    en: 'It asks you to install an app or remote-access tool that could control your phone.',
  },
  brand_link_mismatch: {
    tl: 'Binanggit ang isang brand, pero ang link ay hindi papunta sa official website nila.',
    en: 'It names a brand, but the link does not go to that brand’s official website.',
  },
  fee_request: {
    tl: 'May hinihinging bayad o fee (halimbawa: delivery o processing fee) bago mo makuha ang isang bagay.',
    en: 'It asks for a fee (for example, a delivery or processing fee) before you get something.',
  },
  money_request: {
    tl: 'Pinapadala ka ng pera o load.',
    en: 'It asks you to send money or load.',
  },
  punycode_host: {
    tl: 'Ang link ay gumagamit ng kakaibang letra para magmukhang ibang website.',
    en: 'The link uses look-alike characters to pose as another website.',
  },
  ip_host: {
    tl: 'Ang link ay numero (IP address) imbes na pangalan ng website. Bihira ito sa totoong kumpanya.',
    en: 'The link is a bare IP address instead of a website name, which real companies rarely use.',
  },
  account_threat: {
    tl: 'Tinatakot ka na isasara, iba-block o sasuspindihin ang account mo.',
    en: 'It threatens that your account will be closed, blocked or suspended.',
  },
  prize: {
    tl: 'Sinasabing nanalo ka ng premyo, raffle o ayuda na hindi mo naman sinalihan.',
    en: 'It says you won a prize, raffle or aid you did not apply for.',
  },
  emergency_relative: {
    tl: 'May kuwento ng emergency ng kamag-anak para madaliin kang magpadala.',
    en: 'It tells an emergency story about a relative to rush you into sending something.',
  },
  urgency: {
    tl: 'Minamadali ka (halimbawa: "ngayon din", "within 24 hours").',
    en: 'It pressures you to act right away.',
  },
  shortener: {
    tl: 'Naka-short link ito, kaya hindi mo makita kung saan talaga papunta.',
    en: 'It uses a link shortener that hides the real destination.',
  },
  odd_tld: {
    tl: 'Kakaiba ang dulo ng link (halimbawa: .xyz, .top), na madalas gamitin sa scam.',
    en: 'The link has an unusual ending (for example .xyz or .top) often used in scams.',
  },
  secrecy: {
    tl: 'Sinasabihan kang ilihim ito o huwag sabihin sa iba.',
    en: 'It asks you to keep this secret.',
  },
  job_loan_investment: {
    tl: 'May alok na trabaho, loan o investment na sobrang dali o laki ng kita.',
    en: 'It offers a job, loan or investment that sounds too easy or too profitable.',
  },
  gov_agency: {
    tl: 'Binanggit ang isang ahensya ng gobyerno.',
    en: 'It mentions a government agency.',
  },
  unknown_link: {
    tl: 'May link na hindi namin kilala.',
    en: 'It contains a link we do not recognize.',
  },
  parcel_topic: {
    tl: 'Tungkol ito sa parcel o delivery.',
    en: 'It is about a parcel or delivery.',
  },
  combo_parcel_fee_link: {
    tl: 'Parcel + bayad + link: karaniwang anyo ng pekeng delivery scam.',
    en: 'Parcel plus fee plus link: a common fake-delivery scam pattern.',
  },
  combo_threat_link: {
    tl: 'Tinatakot ka tungkol sa account mo at pinapa-click ka ng link.',
    en: 'It threatens your account and asks you to click a link.',
  },
  combo_prize_link_or_payment: {
    tl: 'Premyo na kailangan ng link o bayad para makuha: karaniwang scam.',
    en: 'A prize that needs a link or payment to claim: a common scam.',
  },
  combo_gov_action: {
    tl: 'Gamit ang pangalan ng gobyerno para humingi ng bayad, impormasyon o pag-click ng link.',
    en: 'It uses a government name to ask for payment, details or a link click.',
  },
  combo_relative_secrecy_or_money: {
    tl: 'Emergency ng kamag-anak na may kasamang lihim o padala ng pera.',
    en: 'A relative’s emergency combined with secrecy or a money request.',
  },
};

export const VERDICT_TEMPLATE: Record<Verdict, { intro: string; action: string }> = {
  scam: {
    intro: 'Mukhang SCAM ito.',
    action:
      'Huwag i-click ang link, huwag magbigay ng OTP o MPIN, at huwag magpadala ng pera. I-delete ang message at i-report sa CICC hotline 1326.',
  },
  suspicious: {
    intro: 'Kahina-hinala ang message na ito.',
    action:
      'Huwag munang sumunod. I-verify muna sa official app o hotline ng brand o ahensya, hindi gamit ang link o number sa message.',
  },
  low_risk: {
    intro: 'Walang nakitang malinaw na red flag, pero hindi ito garantiya na totoo ang message.',
    action:
      'Mag-ingat pa rin: huwag ibigay ang OTP o MPIN kahit kanino, at i-verify sa official app kung may duda ka.',
  },
};

export const MAX_EXPLANATION_CHARS = 400;

const MAX_REASONS = 3;

// FR-LM-05: the fallback explanation, built from the verdict and the top flags (already sorted by points).
export function buildTemplateExplanation(verdict: Verdict, flags: { tl: string }[]): Explanation {
  const { intro, action } = VERDICT_TEMPLATE[verdict];
  const reasons = flags.slice(0, MAX_REASONS).map((f) => f.tl);
  return {
    source: 'template',
    explanationTl: [intro, ...reasons].join(' ').slice(0, MAX_EXPLANATION_CHARS),
    actionTl: action.slice(0, MAX_EXPLANATION_CHARS),
  };
}
