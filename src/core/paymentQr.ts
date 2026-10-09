// Recognizes QR Ph / EMVCo merchant-presented payment QR codes (GCash, Maya, banks).
// Pure TypeScript (AGENTS rule 5). It only reads the fields; it does not judge the receiver.

export interface PaymentQr {
  merchantName: string | null;
  city: string | null;
  amount: string | null;
  currency: string | null; // ISO 4217 numeric, e.g. 608 for PHP
  country: string | null;
  networkId: string | null; // e.g. ph.ppmi.p2m
  dynamic: boolean; // point of initiation 12: the amount is preset for one payment
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), the EMVCo checksum, as 4 uppercase hex chars.
export function crc16Ccitt(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Tag-length-value list: 2-digit id, 2-digit length, value. Null if malformed.
function parseTlv(data: string): Map<string, string> | null {
  const fields = new Map<string, string>();
  let i = 0;
  while (i < data.length) {
    const id = data.slice(i, i + 2);
    const lengthText = data.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lengthText)) return null;
    const end = i + 4 + Number(lengthText);
    if (end > data.length) return null;
    if (!fields.has(id)) fields.set(id, data.slice(i + 4, end));
    i = end;
  }
  return fields;
}

// Null when the text is not a valid payment QR, including a failed checksum (broken or edited code).
export function parsePaymentQr(data: string): PaymentQr | null {
  const text = data.trim();
  if (!text.startsWith('000201') || !/6304[0-9A-Fa-f]{4}$/.test(text)) return null;
  const body = text.slice(0, -4);
  if (crc16Ccitt(body) !== text.slice(-4).toUpperCase()) return null;

  const fields = parseTlv(text);
  if (!fields) return null;

  let networkId: string | null = null;
  for (let tag = 26; tag <= 51 && networkId === null; tag++) {
    const template = fields.get(String(tag));
    if (template) networkId = parseTlv(template)?.get('00') ?? null;
  }

  const field = (id: string): string | null => fields.get(id)?.trim() || null;
  return {
    merchantName: field('59'),
    city: field('60'),
    amount: field('54'),
    currency: field('53'),
    country: field('58'),
    networkId,
    dynamic: fields.get('01') === '12',
  };
}
