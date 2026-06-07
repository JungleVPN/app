import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { amountToMonths, getConfiguredAmounts, isAllowedAmount } from '../utils/amount';

describe('provider-agnostic amount config', () => {
  beforeEach(() => {
    process.env.YOOKASSA_AMOUNT = '299.00,599.00';
    process.env.STRIPE_AMOUNT = '2';
    process.env.ALLOWED_PERIODS = '1';
  });

  afterEach(() => {
    delete process.env.YOOKASSA_AMOUNT;
    delete process.env.STRIPE_AMOUNT;
    delete process.env.ALLOWED_PERIODS;
  });

  describe('getConfiguredAmounts', () => {
    it('parses the RUB list and drops blanks / non-positive entries', () => {
      process.env.YOOKASSA_AMOUNT = '299.00, ,0,599.00';
      expect(getConfiguredAmounts('RUB')).toEqual(['299.00', '599.00']);
    });

    it('parses the single EUR price', () => {
      expect(getConfiguredAmounts('EUR')).toEqual(['2']);
    });

    it('returns an empty list when unset', () => {
      delete process.env.STRIPE_AMOUNT;
      expect(getConfiguredAmounts('EUR')).toEqual([]);
    });
  });

  describe('isAllowedAmount', () => {
    it('matches a configured price regardless of currency', () => {
      expect(isAllowedAmount(299, 'RUB')).toBe(true);
      expect(isAllowedAmount(2, 'EUR')).toBe(true);
    });

    it('rejects unconfigured amounts', () => {
      expect(isAllowedAmount(123, 'RUB')).toBe(false);
      expect(isAllowedAmount(999, 'EUR')).toBe(false);
      expect(isAllowedAmount(0, 'EUR')).toBe(false);
    });
  });

  describe('amountToMonths', () => {
    it('returns ALLOWED_PERIODS months for a configured price', () => {
      expect(amountToMonths(2, 'EUR')).toBe(1);
      process.env.ALLOWED_PERIODS = '3';
      expect(amountToMonths(299, 'RUB')).toBe(3);
    });

    it('throws on an unrecognised amount (finding #12)', () => {
      expect(() => amountToMonths(999, 'EUR')).toThrow();
      expect(() => amountToMonths(0, 'EUR')).toThrow();
    });

    it('rejects every amount when the price is unconfigured (fail-safe)', () => {
      delete process.env.STRIPE_AMOUNT;
      expect(() => amountToMonths(2, 'EUR')).toThrow();
    });
  });
});
