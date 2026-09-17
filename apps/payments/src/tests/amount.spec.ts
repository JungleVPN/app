import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  amountToMonths,
  buildPricing,
  getExtraDevicePrice,
  getPriceForPeriod,
} from '../utils/amount';

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

  // A device slot is a one-off purchase with its own price, unrelated to any
  // subscription period. Recording it at a period price misstates the sale
  // everywhere it is later read back — payment history and admin search.
  describe('getExtraDevicePrice', () => {
    afterEach(() => {
      delete process.env.EXTRA_DEVICE_PRICE_EUR;
      delete process.env.EXTRA_DEVICE_PRICE_RUB;
    });

    it('returns the configured price per currency', () => {
      process.env.EXTRA_DEVICE_PRICE_EUR = '1';
      process.env.EXTRA_DEVICE_PRICE_RUB = '100';

      expect(getExtraDevicePrice('EUR')).toBe('1');
      expect(getExtraDevicePrice('RUB')).toBe('100');
    });

    it('throws rather than falling back to a subscription price', () => {
      expect(() => getExtraDevicePrice('EUR')).toThrow();
    });

    it('throws on a non-positive price', () => {
      process.env.EXTRA_DEVICE_PRICE_EUR = '0';
      expect(() => getExtraDevicePrice('EUR')).toThrow();
    });
  });

  describe('buildPricing', () => {
    it('has no discount for the base (1-month) plan, whose total is its own baseline', () => {
      const pricing = buildPricing({ currency: 'EUR', months: 1, total: 6, basePrice: 6 });

      expect(pricing).toEqual({
        total: '6.00',
        monthly: '6.00',
        fullTotal: '6.00',
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('rounds EUR to 2 decimals and computes the discount vs. the base price', () => {
      const pricing = buildPricing({ currency: 'EUR', months: 12, total: 43.2, basePrice: 6 });

      expect(pricing).toEqual({
        total: '43.20',
        monthly: '3.60',
        fullTotal: '72.00',
        discountPercent: 40,
        currencyCode: 'EUR',
      });
    });

    it('rounds RUB to whole rubles, since we never quote kopecks', () => {
      const pricing = buildPricing({ currency: 'RUB', months: 6, total: 882, basePrice: 200 });

      expect(pricing).toEqual({
        total: '882',
        monthly: '147',
        fullTotal: '1200',
        discountPercent: 27,
        currencyCode: 'RUB',
      });
    });

    it('returns a null fullTotal and zero discount when there is no base price', () => {
      const pricing = buildPricing({ currency: 'EUR', months: 6, total: 26.4, basePrice: null });

      expect(pricing).toEqual({
        total: '26.40',
        monthly: '4.40',
        fullTotal: null,
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('renders a zero-decimal Paddle currency without cents', () => {
      const pricing = buildPricing({ currency: 'JPY', months: 3, total: 3600, basePrice: 1500 });

      expect(pricing).toEqual({
        total: '3600',
        monthly: '1200',
        fullTotal: '4500',
        discountPercent: 20,
        currencyCode: 'JPY',
      });
    });

    it('carries the currency it was quoted in, so nothing downstream has to guess', () => {
      expect(
        buildPricing({ currency: 'GBP', months: 1, total: 8.5, basePrice: null }),
      ).toMatchObject({ currencyCode: 'GBP' });
    });

    it('falls back to 2 decimals for a Paddle currency it has no display rule for', () => {
      const pricing = buildPricing({ currency: 'GBP', months: 1, total: 8.5, basePrice: null });

      expect(pricing.total).toBe('8.50');
    });
  });
});
