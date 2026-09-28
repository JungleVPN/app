import { describe, expect, it } from 'vitest';
import { isWhopCheckoutState } from './whopCheckoutState';

const valid = {
  accountId: 'biz_1',
  whopPlanId: 'plan_1',
  request: { email: 'payer@test.com', planId: 'whop-30', toltReferralId: null },
  selectedPeriod: 30,
};

describe('isWhopCheckoutState', () => {
  it('accepts what the start-checkout page hands over', () => {
    expect(isWhopCheckoutState(valid)).toBe(true);
  });

  it('accepts a promo code the start-checkout page already checked', () => {
    const promo = { code: 'SPRING20', promoType: 'percentage', amountOff: 20, currency: 'usd' };

    expect(isWhopCheckoutState({ ...valid, promo })).toBe(true);
  });

  it('accepts the total the payer was shown', () => {
    expect(isWhopCheckoutState({ ...valid, charge: { amount: '8.00', currency: 'USD' } })).toBe(
      true,
    );
  });

  it.each([
    ['a total that is not an object', { ...valid, charge: '8.00' }],
    ['a total with no amount', { ...valid, charge: { amount: '', currency: 'USD' } }],
    ['a total with no currency', { ...valid, charge: { amount: '8.00', currency: '' } }],
    ['no state at all (a reload or a shared link)', null],
    ['a non-object', 'biz_1'],
    ['a missing account', { ...valid, accountId: undefined }],
    ['an empty account', { ...valid, accountId: '' }],
    ['a missing Whop plan', { ...valid, whopPlanId: undefined }],
    ['an empty Whop plan', { ...valid, whopPlanId: '' }],
    ['a missing checkout request', { ...valid, request: undefined }],
    ['a checkout request with no email', { ...valid, request: { ...valid.request, email: '' } }],
    ['a checkout request with no plan', { ...valid, request: { ...valid.request, planId: '' } }],
    ['a missing period', { ...valid, selectedPeriod: undefined }],
    ['a promo code that is not an object', { ...valid, promo: 'SPRING20' }],
    ['a promo code with no code', { ...valid, promo: { code: '' } }],
    [
      'the old checkout-configuration state',
      { checkoutConfigurationId: 'ch_1', email: 'payer@test.com', selectedPeriod: 30 },
    ],
    [
      "Paddle's checkout state",
      { priceId: 'pri_1', customData: {}, email: 'a@b.co', selectedPeriod: 30 },
    ],
  ])('rejects %s', (_case, value) => {
    expect(isWhopCheckoutState(value)).toBe(false);
  });
});
