import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackLoginConversion } from './gtag';

describe('trackLoginConversion', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
  });

  it('reports the login conversion via window.gtag when it is present', () => {
    const gtag = vi.fn();
    window.gtag = gtag;

    trackLoginConversion();

    expect(gtag).toHaveBeenCalledWith('event', 'conversion', {
      send_to: 'AW-18413233512/296KCJf2pu4cEOjKjsxE',
    });
  });

  it('does not throw when window.gtag is not loaded (e.g. blocked by an ad blocker)', () => {
    expect(() => trackLoginConversion()).not.toThrow();
  });
});
