import type { PlanPricing, WhopPromoCodeDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import { promoPrice } from './promoPrice';

const pricing = (overrides: Partial<PlanPricing> = {}): PlanPricing => ({
  total: '10.00',
  monthly: '10.00',
  fullTotal: null,
  discountPercent: 0,
  currencyCode: 'USD',
  ...overrides,
});

const promo = (overrides: Partial<WhopPromoCodeDto> = {}): WhopPromoCodeDto => ({
  code: 'SPRING20',
  promoType: 'percentage',
  amountOff: 20,
  currency: 'usd',
  ...overrides,
});

describe('promoPrice', () => {
  it('takes a percentage off the total the payer would pay', () => {
    expect(promoPrice(pricing(), promo())).toEqual({ total: '8.00', percentOff: 20 });
  });

  it('discounts the plan price the payer sees, not the undiscounted baseline', () => {
    expect(
      promoPrice(pricing({ total: '50.00', fullTotal: '60.00', discountPercent: 17 }), promo()),
    ).toEqual({ total: '40.00', percentOff: 20 });
  });

  it.each([
    ['12.99', 20, '10.39'],
    ['1200', 15, '1020'],
    ['9.99', 12.5, '8.74'],
  ])('keeps the precision %s is quoted in after %s%% off', (total, percent, expected) => {
    expect(promoPrice(pricing({ total }), promo({ amountOff: percent }))).toMatchObject({
      total: expected,
    });
  });

  it('brings the total to zero for a code that takes everything off', () => {
    expect(promoPrice(pricing(), promo({ amountOff: 100 }))).toEqual({
      total: '0.00',
      percentOff: 100,
    });
  });

  it('subtracts a fixed amount in the currency the plan is quoted in', () => {
    expect(
      promoPrice(pricing(), promo({ promoType: 'flat_amount', amountOff: 2.5, currency: 'usd' })),
    ).toEqual({ total: '7.50', percentOff: 25 });
  });

  it('rounds the share a fixed amount takes off to a whole percent', () => {
    expect(
      promoPrice(pricing({ total: '12.99' }), promo({ promoType: 'flat_amount', amountOff: 2 })),
    ).toEqual({ total: '10.99', percentOff: 15 });
  });

  it('never takes a fixed amount below zero', () => {
    expect(
      promoPrice(pricing(), promo({ promoType: 'flat_amount', amountOff: 25 })),
    ).toEqual({ total: '0.00', percentOff: 100 });
  });

  it('leaves the total alone for a fixed amount in another currency', () => {
    expect(
      promoPrice(
        pricing({ currencyCode: 'EUR' }),
        promo({ promoType: 'flat_amount', amountOff: 5, currency: 'usd' }),
      ),
    ).toEqual({ amountOff: 5, currency: 'USD' });
  });
});
