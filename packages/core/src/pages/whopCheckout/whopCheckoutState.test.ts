import { describe, expect, it } from 'vitest';
import { isWhopCheckoutState } from './whopCheckoutState';

const valid = { checkoutConfigurationId: 'ch_1', email: 'payer@test.com', selectedPeriod: 30 };

describe('isWhopCheckoutState', () => {
  it('accepts what the start-checkout page hands over', () => {
    expect(isWhopCheckoutState(valid)).toBe(true);
  });

  it.each([
    ['no state at all (a reload or a shared link)', null],
    ['a non-object', 'ch_1'],
    ['a missing checkout configuration', { ...valid, checkoutConfigurationId: undefined }],
    ['an empty checkout configuration', { ...valid, checkoutConfigurationId: '' }],
    ['a missing email', { ...valid, email: undefined }],
    ['an empty email', { ...valid, email: '' }],
    ['a missing period', { ...valid, selectedPeriod: undefined }],
    [
      "Paddle's checkout state",
      { priceId: 'pri_1', customData: {}, email: 'a@b.co', selectedPeriod: 30 },
    ],
  ])('rejects %s', (_case, value) => {
    expect(isWhopCheckoutState(value)).toBe(false);
  });
});
