import { afterEach, describe, expect, it, vi } from 'vitest';
import { grantAdsConsent, trackPurchaseConversion } from '../gtag';

describe('trackPurchaseConversion', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
  });

  it('reports the purchase with its transaction id, value and currency via window.gtag', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchaseConversion({ transactionId: 'pay_1', value: 7.99, currency: 'USD' });

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/ZKs7CPXg350dEOjKjsxE',
      transaction_id: 'pay_1',
      value: 7.99,
      currency: 'USD',
    });
  });

  it('reports the transaction id alone when the amount paid is unknown', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchaseConversion({ transactionId: 'pay_1' });

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/ZKs7CPXg350dEOjKjsxE',
      transaction_id: 'pay_1',
    });
  });

  it.each([
    ['a value without a currency', { transactionId: 'pay_1', value: 7.99 }],
    ['a currency without a value', { transactionId: 'pay_1', currency: 'USD' }],
  ])('leaves out an amount given as %s, since Google needs both', (_, purchase) => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchaseConversion(purchase);

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/ZKs7CPXg350dEOjKjsxE',
      transaction_id: 'pay_1',
    });
  });

  it('does not throw when window.gtag is not loaded (e.g. blocked by an ad blocker)', () => {
    expect(() => trackPurchaseConversion({ transactionId: 'pay_1' })).not.toThrow();
  });

  describe('Microsoft Ads', () => {
    afterEach(() => {
      Reflect.deleteProperty(window, 'uetq');
    });

    it('reports the purchase with its revenue and currency via window.uetq', () => {
      const push = vi.fn();
      window.uetq = { push };

      trackPurchaseConversion({ transactionId: 'pay_1', value: 7.99, currency: 'USD' });

      expect(push).toHaveBeenCalledWith('event', 'purchase', {
        revenue_value: 7.99,
        currency: 'USD',
      });
    });

    it('reports the purchase alone when the amount paid is unknown', () => {
      const push = vi.fn();
      window.uetq = { push };

      trackPurchaseConversion({ transactionId: 'pay_1' });

      expect(push).toHaveBeenCalledWith('event', 'purchase', {});
    });

    it('does not throw when window.uetq is not loaded (e.g. blocked by an ad blocker)', () => {
      expect(() => trackPurchaseConversion({ transactionId: 'pay_1' })).not.toThrow();
    });
  });
});

describe('grantAdsConsent', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'uetq');
  });

  it('tells Microsoft Ads ad storage is granted', () => {
    const push = vi.fn();
    window.uetq = { push };

    grantAdsConsent();

    expect(push).toHaveBeenCalledWith('consent', 'update', { ad_storage: 'granted' });
  });

  it('does not throw when window.uetq is not loaded', () => {
    expect(() => grantAdsConsent()).not.toThrow();
  });
});
