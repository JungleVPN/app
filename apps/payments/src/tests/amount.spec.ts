import { afterEach, describe, expect, it } from 'vitest';
import { buildPricing, getExtraDevicePrice } from '../utils/amount';

describe('amount config', () => {
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

    // 16.99 / 30 * 30 is 16.989999… in floating point; truncating that to the
    // cent would advertise a monthly price below the one actually charged.
    it.each([
      16.99, 3.49, 23.99, 219.99, 0.29,
    ])("shows a 30-day plan's own total, %s, as its monthly price", (total) => {
      const pricing = buildPricing({ currency: 'EUR', days: 30, total, basePrice: total });

      expect(pricing.monthly).toBe(String(total));
      expect(pricing.fullTotal).toBe(String(total));
    });

    it('still truncates a monthly price that falls between two cents', () => {
      expect(
        buildPricing({ currency: 'EUR', days: 365, total: 24.49, basePrice: 3.99 }).monthly,
      ).toBe('2.01');
    });

    it.each([
      ['INR', 2669, '219'],
      ['IDR', 485500, '39904'],
    ])('quotes %s in whole units, as its prices are set', (currency, total, monthly) => {
      const pricing = buildPricing({ currency, days: 365, total, basePrice: null });

      expect(pricing.monthly).toBe(monthly);
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
