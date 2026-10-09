import { describe, expect, it } from '@jest/globals';

import { crc16Ccitt, parsePaymentQr } from '../paymentQr';

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

// Fictional QR Ph payload: fields, then tag 63 with the computed checksum.
function payload(fields: string[]): string {
  const body = `${fields.join('')}6304`;
  return body + crc16Ccitt(body);
}

const ACCOUNT = tlv(
  '28',
  tlv('00', 'ph.ppmi.p2m') + tlv('01', 'GXCHPHM2XXX') + tlv('03', '777148'),
);
const STATIC_QR = payload([
  tlv('00', '01'),
  tlv('01', '11'),
  ACCOUNT,
  tlv('52', '6016'),
  tlv('53', '608'),
  tlv('58', 'PH'),
  tlv('59', 'SARI SARI STORE'),
  tlv('60', 'MANILA'),
]);
const AMOUNT_QR = payload([
  tlv('00', '01'),
  tlv('01', '12'),
  ACCOUNT,
  tlv('53', '608'),
  tlv('54', '500.00'),
  tlv('58', 'PH'),
  tlv('59', 'JUAN SANTOS'),
  tlv('60', 'MAKATI'),
]);

describe('payment QR recognition (QR Ph / EMVCo)', () => {
  it('computes the standard CRC-16/CCITT-FALSE check value', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1');
  });

  it('reads a static payment QR', () => {
    expect(parsePaymentQr(STATIC_QR)).toEqual({
      merchantName: 'SARI SARI STORE',
      city: 'MANILA',
      amount: null,
      currency: '608',
      country: 'PH',
      networkId: 'ph.ppmi.p2m',
      dynamic: false,
    });
  });

  it('reads a payment QR with a preset amount', () => {
    const qr = parsePaymentQr(AMOUNT_QR);
    expect(qr?.merchantName).toBe('JUAN SANTOS');
    expect(qr?.amount).toBe('500.00');
    expect(qr?.dynamic).toBe(true);
  });

  it('accepts a lowercase checksum', () => {
    expect(
      parsePaymentQr(STATIC_QR.slice(0, -4) + STATIC_QR.slice(-4).toLowerCase()),
    ).not.toBeNull();
  });

  it('rejects an edited payment QR (checksum mismatch)', () => {
    expect(parsePaymentQr(STATIC_QR.replace('SARI SARI STORE', 'SARI SARI STORF'))).toBeNull();
  });

  it.each([
    ['a link', 'https://gcash-verify.xyz/login'],
    ['plain text', 'Send GCash fee of P150 to 09171234567'],
    ['a Wi-Fi QR', 'WIFI:S:CafeWifi;T:WPA;P:secret123;;'],
    ['an empty string', ''],
    ['a bad length', payload([tlv('00', '01'), '5999SHORT'])],
  ])('ignores %s', (_label, text) => {
    expect(parsePaymentQr(text)).toBeNull();
  });
});
