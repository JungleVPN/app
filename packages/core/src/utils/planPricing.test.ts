import type { PlanPricing, SubscriptionPlanDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import { calculatePricing } from './planPricing';

const labels = {
  discountLabel: (percent: number) => `-${percent}%`,
  noDiscountLabel: 'no discount',
};

function plan(period: number, pricing: Partial<PlanPricing> = {}): SubscriptionPlanDto {
  return {
    period,
    countryCode: null,
    planPricing: {
      total: '6.00',
      monthly: '6.00',
      fullTotal: null,
      discountPercent: 0,
      currencyCode: 'EUR',
      ...pricing,
    },
  };
}

describe('calculatePricing', () => {
  it('shows the no-discount label for the 1-month plan, which is its own baseline', () => {
    expect(calculatePricing(plan(1), labels)).toEqual({
      price: '€6.00',
      noDiscountLabel: 'no discount',
    });
  });

  it('formats the discount lines in whatever currency the backend quoted', () => {
    const result = calculatePricing(
      plan(12, {
        total: '38.40',
        monthly: '3.20',
        fullTotal: '64.00',
        discountPercent: 40,
        currencyCode: 'GBP',
      }),
      labels,
    );

    expect(result).toEqual({
      price: '£3.20',
      discount: '-40%',
      originalTotal: '£64.00',
      discountedTotal: '£38.40',
    });
  });

  it('renders a rouble price without kopecks, following the backend precision', () => {
    const result = calculatePricing(
      plan(3, {
        total: '1200',
        monthly: '400',
        fullTotal: '1500',
        discountPercent: 20,
        currencyCode: 'RUB',
      }),
      labels,
    );

    expect(result.price).toMatch(/^\D*400\D*$/);
    expect(result.discountedTotal).toMatch(/1[\s,]?200/);
  });

  it('omits the discount lines when a longer period has no saving to show', () => {
    const result = calculatePricing(plan(6, { monthly: '5.00', discountPercent: 0 }), labels);

    expect(result).toEqual({ price: '€5.00' });
  });
});
