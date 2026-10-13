import { describe, expect, it } from 'vitest';
import { availableWallets } from './whopWallets';

describe('availableWallets', () => {
  it('puts Apple Pay first even where Whop ranks Google Pay as the native wallet', () => {
    expect(
      availableWallets({
        applePay: true,
        googlePay: true,
        order: ['google_pay', 'apple_pay'],
      }),
    ).toEqual(['apple_pay', 'google_pay']);
  });

  it('offers Apple Pay alone where it is the native wallet', () => {
    expect(
      availableWallets({
        applePay: true,
        googlePay: true,
        order: ['apple_pay', 'google_pay'],
      }),
    ).toEqual(['apple_pay']);
  });

  it('offers only the wallets this browser can pay with', () => {
    expect(
      availableWallets({ applePay: false, googlePay: true, order: ['google_pay', 'apple_pay'] }),
    ).toEqual(['google_pay']);
  });

  it('offers both, Apple Pay first, when Whop gives no order', () => {
    expect(availableWallets({ applePay: true, googlePay: true })).toEqual([
      'apple_pay',
      'google_pay',
    ]);
  });
});
