// Shared analysis types (SRS Appendix B). Pure TypeScript: no React Native imports (AGENTS rule 5).

export type Verdict = 'scam' | 'suspicious' | 'low_risk';

export type FlagId =
  | 'credential_request'
  | 'lookalike_domain'
  | 'apk_link'
  | 'remote_access'
  | 'brand_link_mismatch'
  | 'fee_request'
  | 'money_request'
  | 'punycode_host'
  | 'ip_host'
  | 'account_threat'
  | 'prize'
  | 'emergency_relative'
  | 'urgency'
  | 'shortener'
  | 'odd_tld'
  | 'secrecy'
  | 'job_loan_investment'
  | 'gov_agency'
  | 'unknown_link'
  | 'parcel_topic'
  | 'combo_parcel_fee_link'
  | 'combo_threat_link'
  | 'combo_prize_link_or_payment'
  | 'combo_gov_action'
  | 'combo_relative_secrecy_or_money';

// SRS 1.3: a hard flag keeps the rules score as a floor in fusion.
export const HARD_FLAG_IDS: readonly FlagId[] = [
  'credential_request',
  'lookalike_domain',
  'apk_link',
  'remote_access',
];

export interface Flag {
  id: FlagId;
  points: number;
  tl: string; // Taglish explanation of this flag
  en: string; // English explanation
  evidence: string; // up to 80 characters from the message
}

export interface LinkInfo {
  raw: string;
  host: string;
  domain: string; // registered domain, e.g. gcash.com or lto.gov.ph
}

export interface RulesResult {
  score: number; // 0 to 100
  flags: Flag[];
  links: LinkInfo[];
  realOtp: boolean;
}

export interface Explanation {
  source: 'llm' | 'template';
  explanationTl: string;
  actionTl: string;
  model?: string;
}

export interface AnalysisResult {
  verdict: Verdict;
  score: number; // fused score, integer 0 to 100
  mlProbability: number | null; // null when the weights are missing
  flags: Flag[];
  links: LinkInfo[];
  explanation: Explanation | null; // null until ready
  llmRaised: boolean; // true if the model raised Low risk to Suspicious
  timingsMs: {
    rules: number;
    ml: number | null;
    llm: number | null;
    total: number;
  };
}

// What the LLM returns after validation (FR-LM-03).
export interface LlmOpinion {
  verdict: Verdict;
  confidence: number; // 0 to 1
  explanationTl: string;
  actionTl: string;
}
