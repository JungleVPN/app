import { describe, expect, it } from 'vitest';
import { getButtonLabel } from './getButtonLabel';

const t = (key: string, params?: Record<string, unknown>): string => {
  if (!params) return key;
  const parts = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${key}:${parts}`;
};

const plan = { months: 12, priceEur: 43.2, priceRub: 1440 };

describe('getButtonLabel', () => {
  it('uses EUR price for stripe', () => {
    expect(getButtonLabel('stripe', plan, t)).toBe(
      'payment.planPriceEurButton:amount=43.2,count=12',
    );
  });

  it('uses RUB price for yookassa', () => {
    expect(getButtonLabel('yookassa', plan, t)).toBe(
      'payment.planPriceRubButton:amount=1440,count=12',
    );
  });

  it('uses EUR price for stars', () => {
    expect(getButtonLabel('stars', plan, t)).toBe(
      'payment.planPriceEurButton:amount=43.2,count=12',
    );
  });

  it('uses correct prices for 1-month plan', () => {
    const singleMonth = { months: 1, priceEur: 6, priceRub: 200 };
    expect(getButtonLabel('yookassa', singleMonth, t)).toBe(
      'payment.planPriceRubButton:amount=200,count=1',
    );
  });
});
