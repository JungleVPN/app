import type { PromoEffect } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import { bonusMonthsFromEffect } from './promo.applier';

describe('bonusMonthsFromEffect', () => {
  it('returns the configured months for a bonus_months effect', () => {
    expect(bonusMonthsFromEffect({ type: 'bonus_months', days: 2 })).toBe(2);
    expect(bonusMonthsFromEffect({ type: 'bonus_months', days: 0 })).toBe(0);
  });

  it('returns 0 for discounts, which take money off instead of adding days', () => {
    expect(bonusMonthsFromEffect({ type: 'percentage', percent: 10 })).toBe(0);
    expect(bonusMonthsFromEffect({ type: 'fixed_amount', amount: 2, currency: 'EUR' })).toBe(0);
  });

  it('returns 0 for an unknown effect type (forward-compat guard)', () => {
    expect(bonusMonthsFromEffect({ type: 'mystery' } as unknown as PromoEffect)).toBe(0);
  });
});
