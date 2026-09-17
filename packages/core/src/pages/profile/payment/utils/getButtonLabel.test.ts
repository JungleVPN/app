import type { PlanPricing } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import { getButtonLabel } from './getButtonLabel';

const t = (key: string, params?: Record<string, unknown>): string => {
  if (!params) return key;
  const parts = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${key}:${parts}`;
};

function pricing(overrides: Partial<PlanPricing> = {}): PlanPricing {
  return {
    total: '43.20',
    monthly: '3.60',
    fullTotal: '72.00',
    discountPercent: 40,
    currencyCode: 'EUR',
    ...overrides,
  };
}

describe('getButtonLabel', () => {
  it("labels the button with the plan's total in the currency the backend quoted", () => {
    expect(getButtonLabel({ period: 12, pricing: pricing() }, t)).toBe(
      'payment.planPriceButton:price=€43.20,count=12',
    );
  });

  it('follows the quoted currency rather than the payment method', () => {
    const label = getButtonLabel(
      { period: 3, pricing: pricing({ total: '1200', currencyCode: 'RUB' }) },
      t,
    );

    expect(label).toMatch(/^payment\.planPriceButton:price=.*1[\s,]?200.*,count=3$/);
  });

  it('pluralises against the selected period', () => {
    expect(getButtonLabel({ period: 1, pricing: pricing({ total: '6.00' }) }, t)).toBe(
      'payment.planPriceButton:price=€6.00,count=1',
    );
  });
});
