import type { IpStatusDto } from '@workspace/types';
import { describe, expect, it } from 'vitest';
import {
  billingCountryOptions,
  defaultBillingCountry,
  preselectedBillingCountry,
} from './billingCountry';

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

describe('preselectedBillingCountry', () => {
  const ipStatus = (overrides: Partial<IpStatusDto>): IpStatusDto => ({
    ip: '203.0.113.7',
    countryCode: 'FR',
    city: null,
    isp: null,
    latitude: null,
    longitude: null,
    protected: false,
    ...overrides,
  });

  it("takes the country the visitor's address is in over the one their language suggests", () => {
    expect(preselectedBillingCountry({ ipStatus: ipStatus({}), language: 'es' })).toBe('FR');
  });

  it("falls back to the language while the visitor's address is still unknown", () => {
    expect(preselectedBillingCountry({ ipStatus: null, language: 'es' })).toBe('ES');
    expect(
      preselectedBillingCountry({ ipStatus: ipStatus({ countryCode: null }), language: 'es' }),
    ).toBe('ES');
  });

  it("ignores the address of one of our VPN nodes, which is the node's country, not the payer's", () => {
    expect(
      preselectedBillingCountry({ ipStatus: ipStatus({ protected: true }), language: 'es' }),
    ).toBe('ES');
    expect(
      preselectedBillingCountry({ ipStatus: ipStatus({ protected: null }), language: 'es' }),
    ).toBe('ES');
  });

  it('ignores an address in a place a card cannot be billed to', () => {
    expect(
      preselectedBillingCountry({ ipStatus: ipStatus({ countryCode: 'XK' }), language: 'es' }),
    ).toBe('ES');
  });
});
