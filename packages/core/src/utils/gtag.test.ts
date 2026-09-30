import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackPurchaseConversion } from './gtag';

describe('trackPurchaseConversion', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
  });

  it('reports the purchase with its transaction id, value and currency via window.gtag', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchaseConversion({ transactionId: 'pay_1', value: 7.99, currency: 'USD' });

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/296KCJf2pu4cEOjKjsxE',
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
      send_to: 'AW-18413233512/296KCJf2pu4cEOjKjsxE',
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
      send_to: 'AW-18413233512/296KCJf2pu4cEOjKjsxE',
      transaction_id: 'pay_1',
    });
  });

  it('does not throw when window.gtag is not loaded (e.g. blocked by an ad blocker)', () => {
    expect(() => trackPurchaseConversion({ transactionId: 'pay_1' })).not.toThrow();
  });
});
