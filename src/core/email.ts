// Email input (pure TypeScript, AGENTS rule 5): spots a pasted email so the app can use the email classifier,
// and reads the sender addresses that the sender check in rules.ts inspects.

// Header lines, as copied from an email client or a forwarded message.
const HEADER_RE = /^[ \t]*(?:from|subject|reply-to|sender)[ \t]*:/im;
// A body-only paste: a greeting as the first line and a sign-off among the last three lines.
const GREETING_RE =
  /^(?:dear|hi|hello|good (?:morning|afternoon|evening|day)|greetings|magandang (?:araw|umaga|hapon|gabi))\b.{0,60}$/i;
const SIGNOFF_RE =
  /^(?:(?:best|kind|warm|warmest) regards|regards|sincerely(?: yours)?|respectfully(?: yours)?|yours truly|thank you|thanks|best|cheers|love|maraming salamat(?: po)?|salamat(?: po)?)[,.!]?$/i;

export function looksLikeEmail(text: string): boolean {
  if (HEADER_RE.test(text)) return true;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 3) return false;
  return GREETING_RE.test(lines[0]) && lines.slice(-3).some((l) => SIGNOFF_RE.test(l));
}

const SENDER_LINE_RE = /^[ \t]*(?:from|reply-to|sender)[ \t]*:([^\n]*)$/gim;
const ADDRESS_RE = /[a-z0-9._%+-]+@((?:[a-z0-9-]+\.)+[a-z0-9-]+)/gi;

export interface SenderAddress {
  address: string;
  host: string; // everything after the @, lowercased
}

// Addresses on From, Reply-To and Sender lines only; addresses elsewhere in the text are not the sender.
export function senderAddresses(text: string): SenderAddress[] {
  const out: SenderAddress[] = [];
  for (const line of text.matchAll(SENDER_LINE_RE)) {
    for (const m of line[1].matchAll(ADDRESS_RE))
      out.push({ address: m[0], host: m[1].toLowerCase() });
  }
  return out;
}
