import { describe, expect, it } from 'vitest';
import { countryName, flagEmoji } from './country';

describe('flagEmoji', () => {
  it('builds the flag from a country code in either case', () => {
    expect(flagEmoji('AT')).toBe('🇦🇹');
    expect(flagEmoji('pt')).toBe('🇵🇹');
  });

  it.each(['', 'A', 'AUT', '12'])('has no flag for %j, which is not a country code', (code) => {
    expect(flagEmoji(code)).toBe('');
  });
});

describe('countryName', () => {
  it('names the country in the given language', () => {
    expect(countryName('DE', 'en')).toBe('Germany');
    expect(countryName('DE', 'ru')).toBe('Германия');
  });

  it('falls back to the code when the input cannot be named', () => {
    expect(countryName('not a code', 'en')).toBe('not a code');
  });
});
