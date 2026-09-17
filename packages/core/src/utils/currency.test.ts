import { afterEach, describe, expect, it } from 'vitest';
import { formatIntlPrice } from './currency';

function withDisplayLanguage(language: string): () => void {
  const original = document.documentElement.lang;
  document.documentElement.lang = language;
  return () => {
    document.documentElement.lang = original;
  };
}

describe('formatIntlPrice', () => {
  let restoreLanguage: (() => void) | null = null;

  afterEach(() => {
    restoreLanguage?.();
    restoreLanguage = null;
  });

  it('formats a major-unit amount with its currency symbol via Intl', () => {
    expect(formatIntlPrice('9.99', 'USD')).toBe('$9.99');
  });

  it('formats a zero-decimal currency without cents', () => {
    expect(formatIntlPrice('1200', 'JPY')).toBe('¥1,200');
  });

  it('renders whole roubles without kopecks, following the amount the backend quoted', () => {
    expect(formatIntlPrice('500', 'RUB')).toMatch(/^\D*500\D*$/);
  });

  it('follows the language the UI is showing, not the device — an RU page reads 1 200 ₽', () => {
    restoreLanguage = withDisplayLanguage('ru');

    // Russian groups thousands with a non-breaking space, so match the shape
    // rather than pasting an invisible codepoint into the expectation.
    expect(formatIntlPrice('1200', 'RUB')).toMatch(/^1\s200\s₽$/u);
  });

  it("places the symbol per the currency's own convention (e.g. trailing for kr)", () => {
    expect(formatIntlPrice('99.50', 'SEK')).toMatch(/99[.,]50/);
  });

  it('uses the plain "$" for USD regardless of the visitor\'s own locale', () => {
    restoreLanguage = withDisplayLanguage('en-GB');

    // Without forcing narrowSymbol, Intl disambiguates USD as "US$" for a
    // non-US locale — the exact bug this pins down (desktop "$4.15" vs.
    // mobile "US$4.15" for the same price, purely from OS locale, not IP).
    expect(formatIntlPrice('4.15', 'USD')).toBe('$4.15');
  });
});
