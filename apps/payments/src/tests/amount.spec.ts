import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  amountToDays,
  buildPricing,
  getExtraDevicePrice,
  getPriceForPeriod,
} from '../utils/amount';

describe('provider-agnostic amount config', () => {
  beforeEach(() => {
    process.env.ALLOWED_PERIODS_IN_DAYS = '30,180';
    process.env.GLOBAL_PAYMENT_PROVIDER = 'paddle';
    process.env.PRICE_RUB_DAYS_30 = '200';
    process.env.PRICE_RUB_DAYS_180 = '882';
    process.env.PRICE_EUR_DAYS_30 = '6';
    process.env.PRICE_EUR_DAYS_180 = '15';
    process.env.PADDLE_PRICE_ID_DAYS_30 = '6';
    process.env.PADDLE_PRICE_ID_DAYS_180 = '15';
  });

  afterEach(() => {
    delete process.env.ALLOWED_PERIODS_IN_DAYS;
    delete process.env.GLOBAL_PAYMENT_PROVIDER;
    delete process.env.PRICE_RUB_DAYS_30;
    delete process.env.PRICE_RUB_DAYS_180;
    delete process.env.PRICE_RUB_DAYS_365;
    delete process.env.PRICE_EUR_DAYS_30;
    delete process.env.PRICE_EUR_DAYS_180;
    delete process.env.PRICE_EUR_DAYS_365;
    delete process.env.PADDLE_PRICE_ID_DAYS_30;
    delete process.env.PADDLE_PRICE_ID_DAYS_180;
    delete process.env.PADDLE_PRICE_ID_DAYS_365;
  });

  describe('amountToDays', () => {
    it('maps each configured amount to its period in days', () => {
      expect(amountToDays(200, 'RUB')).toBe(30);
      expect(amountToDays(882, 'RUB')).toBe(180);
      expect(amountToDays(6, 'EUR')).toBe(30);
      expect(amountToDays(15, 'EUR')).toBe(180);
    });

    it('maps 6-month and 12-month amounts correctly', () => {
      process.env.ALLOWED_PERIODS_IN_DAYS = '1,3,6,12';
      process.env.PRICE_RUB_DAYS_6 = '882';
      process.env.PRICE_RUB_DAYS_12 = '1440';
      process.env.PRICE_EUR_DAYS_6 = '26.4';
      process.env.PRICE_EUR_DAYS_12 = '43.2';

      expect(amountToDays(882, 'RUB')).toBe(6);
      expect(amountToDays(1440, 'RUB')).toBe(12);
      expect(amountToDays(26.4, 'EUR')).toBe(6);
      expect(amountToDays(43.2, 'EUR')).toBe(12);
    });

    it('throws on an unrecognised amount', () => {
      expect(() => amountToDays(999, 'EUR')).toThrow();
      expect(() => amountToDays(0, 'EUR')).toThrow();
    });

    it('rejects every amount when no periods are configured', () => {
      delete process.env.ALLOWED_PERIODS_IN_DAYS;
      expect(() => amountToDays(6, 'EUR')).toThrow();
    });
  });

  describe('getPriceForPeriod', () => {
    it('returns the configured price for a given period', () => {
      expect(getPriceForPeriod('RUB', 30)).toBe('200');
      expect(getPriceForPeriod('RUB', 180)).toBe('882');
      expect(getPriceForPeriod('EUR', 30)).toBe('6');
      expect(getPriceForPeriod('EUR', 180)).toBe('15');
    });

    it('returns prices for 6-month and 12-month plans', () => {
      process.env.PRICE_RUB_DAYS_180 = '882';
      process.env.PRICE_RUB_DAYS_365 = '1440';
      process.env.PRICE_EUR_DAYS_180 = '26.4';
      process.env.PRICE_EUR_DAYS_365 = '43.2';
      process.env.PADDLE_PRICE_ID_DAYS_180 = '26.4';
      process.env.PADDLE_PRICE_ID_DAYS_365 = '43.2';

      expect(getPriceForPeriod('RUB', 180)).toBe('882');
      expect(getPriceForPeriod('RUB', 365)).toBe('1440');
      expect(getPriceForPeriod('EUR', 180)).toBe('26.4');
      expect(getPriceForPeriod('EUR', 365)).toBe('43.2');
    });

    it('throws for an unknown period', () => {
      expect(() => getPriceForPeriod('RUB', 99)).toThrow();
    });

    it('throws when the price env var is not set', () => {
      delete process.env.PADDLE_PRICE_ID_DAYS_1;
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
      const pricing = buildPricing({ currency: 'EUR', days: 30, total: 6, basePrice: 6 });

      expect(pricing).toEqual({
        total: '6',
        monthly: '6',
        fullTotal: '6',
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('rounds EUR to 2 decimals and computes the discount vs. the base price', () => {
      const pricing = buildPricing({ currency: 'EUR', days: 365, total: 43.2, basePrice: 6 });

      expect(pricing).toEqual({
        currencyCode: 'EUR',
        discountPercent: 41,
        fullTotal: '73',
        monthly: '3.55',
        total: '43.2',
      });
    });

    it('rounds RUB to whole rubles, since we never quote kopecks', () => {
      const pricing = buildPricing({ currency: 'RUB', days: 180, total: 882, basePrice: 200 });

      expect(pricing).toEqual({
        total: '882',
        monthly: '147',
        fullTotal: '1200',
        discountPercent: 27,
        currencyCode: 'RUB',
      });
    });

    it('returns a null fullTotal and zero discount when there is no base price', () => {
      const pricing = buildPricing({ currency: 'EUR', days: 180, total: 26.4, basePrice: null });

      expect(pricing).toEqual({
        total: '26.4',
        monthly: '4.40',
        fullTotal: null,
        discountPercent: 0,
        currencyCode: 'EUR',
      });
    });

    it('renders a zero-decimal Paddle currency without cents', () => {
      const pricing = buildPricing({ currency: 'JPY', days: 180, total: 3600, basePrice: 1500 });

      expect(pricing).toEqual({
        discountPercent: 60,
        fullTotal: '9000',
        monthly: '600',
        total: '3600',
        currencyCode: 'JPY',
      });
    });

    it('carries the currency it was quoted in, so nothing downstream has to guess', () => {
      expect(
        buildPricing({ currency: 'GBP', days: 30, total: 8.5, basePrice: null }),
      ).toMatchObject({ currencyCode: 'GBP' });
    });

    it('falls back to 2 decimals for a Paddle currency it has no display rule for', () => {
      const pricing = buildPricing({ currency: 'GBP', days: 30, total: 8.5, basePrice: null });

      expect(pricing.total).toBe('8.5');
    });
  });
});
