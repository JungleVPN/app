import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackPurchaseConversion } from './gtag';

describe('trackPurchaseConversion', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
  });

  it('reports the purchase conversion via window.gtag when it is present', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackPurchaseConversion();

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/296KCJf2pu4cEOjKjsxE',
    });
  });

  it('does not throw when window.gtag is not loaded (e.g. blocked by an ad blocker)', () => {
    expect(() => trackPurchaseConversion()).not.toThrow();
  });
});
