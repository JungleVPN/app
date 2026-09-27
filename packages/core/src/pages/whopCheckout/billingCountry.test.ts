import { describe, expect, it } from 'vitest';
import { billingCountryOptions, defaultBillingCountry } from './billingCountry';

describe('billingCountryOptions', () => {
  it("names every country in the visitor's language", () => {
    const options = billingCountryOptions('de');

    expect(options).toContainEqual({ code: 'DE', name: 'Deutschland' });
    expect(options).toContainEqual({ code: 'US', name: 'Vereinigte Staaten' });
  });

  it('orders countries alphabetically for that language', () => {
    const names = billingCountryOptions('en').map(({ name }) => name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('offers only real two-letter countries, each once', () => {
    const codes = billingCountryOptions('en').map(({ code }) => code);

    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.length).toBeGreaterThan(200);
  });
});

describe('defaultBillingCountry', () => {
  it('takes the region the browser language names', () => {
    expect(defaultBillingCountry('pt-BR')).toBe('BR');
  });

  it("falls back to the language's most likely region", () => {
    expect(defaultBillingCountry('ru')).toBe('RU');
  });

  it('leaves the choice to the payer when the language names no known country', () => {
    expect(defaultBillingCountry('')).toBe('');
    expect(defaultBillingCountry('not a locale')).toBe('');
    expect(defaultBillingCountry('es-419')).toBe('');
  });
});
