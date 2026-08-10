import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { amountToMonths, getPriceForPeriod } from '../utils/amount';

describe('provider-agnostic amount config', () => {
  beforeEach(() => {
    process.env.ALLOWED_PERIOD = '1,3';
    process.env.PRICE_RUB_MONTH_1 = '200';
    process.env.PRICE_RUB_MONTH_3 = '501';
    process.env.PRICE_EUR_MONTH_1 = '6';
    process.env.PRICE_EUR_MONTH_3 = '15';
  });

  afterEach(() => {
    delete process.env.ALLOWED_PERIOD;
    delete process.env.PRICE_RUB_MONTH_1;
    delete process.env.PRICE_RUB_MONTH_3;
    delete process.env.PRICE_RUB_MONTH_6;
    delete process.env.PRICE_RUB_MONTH_12;
    delete process.env.PRICE_EUR_MONTH_1;
    delete process.env.PRICE_EUR_MONTH_3;
    delete process.env.PRICE_EUR_MONTH_6;
    delete process.env.PRICE_EUR_MONTH_12;
  });

  describe('amountToMonths', () => {
    it('maps each configured amount to its period in months', () => {
      expect(amountToMonths(200, 'RUB')).toBe(1);
      expect(amountToMonths(501, 'RUB')).toBe(3);
      expect(amountToMonths(6, 'EUR')).toBe(1);
      expect(amountToMonths(15, 'EUR')).toBe(3);
    });

    it('maps 6-month and 12-month amounts correctly', () => {
      process.env.ALLOWED_PERIOD = '1,3,6,12';
      process.env.PRICE_RUB_MONTH_6 = '882';
      process.env.PRICE_RUB_MONTH_12 = '1440';
      process.env.PRICE_EUR_MONTH_6 = '26.4';
      process.env.PRICE_EUR_MONTH_12 = '43.2';

      expect(amountToMonths(882, 'RUB')).toBe(6);
      expect(amountToMonths(1440, 'RUB')).toBe(12);
      expect(amountToMonths(26.4, 'EUR')).toBe(6);
      expect(amountToMonths(43.2, 'EUR')).toBe(12);
    });

    it('throws on an unrecognised amount', () => {
      expect(() => amountToMonths(999, 'EUR')).toThrow();
      expect(() => amountToMonths(0, 'EUR')).toThrow();
    });

    it('rejects every amount when no periods are configured', () => {
      delete process.env.ALLOWED_PERIOD;
      expect(() => amountToMonths(6, 'EUR')).toThrow();
    });
  });

  describe('getPriceForPeriod', () => {
    it('returns the configured price for a given period', () => {
      expect(getPriceForPeriod('RUB', 1)).toBe('200');
      expect(getPriceForPeriod('RUB', 3)).toBe('501');
      expect(getPriceForPeriod('EUR', 1)).toBe('6');
      expect(getPriceForPeriod('EUR', 3)).toBe('15');
    });

    it('returns prices for 6-month and 12-month plans', () => {
      process.env.PRICE_RUB_MONTH_6 = '882';
      process.env.PRICE_RUB_MONTH_12 = '1440';
      process.env.PRICE_EUR_MONTH_6 = '26.4';
      process.env.PRICE_EUR_MONTH_12 = '43.2';

      expect(getPriceForPeriod('RUB', 6)).toBe('882');
      expect(getPriceForPeriod('RUB', 12)).toBe('1440');
      expect(getPriceForPeriod('EUR', 6)).toBe('26.4');
      expect(getPriceForPeriod('EUR', 12)).toBe('43.2');
    });

    it('throws for an unknown period', () => {
      expect(() => getPriceForPeriod('RUB', 99)).toThrow();
    });

    it('throws when the price env var is not set', () => {
      delete process.env.PRICE_EUR_MONTH_1;
      expect(() => getPriceForPeriod('EUR', 1)).toThrow();
    });
  });
});
