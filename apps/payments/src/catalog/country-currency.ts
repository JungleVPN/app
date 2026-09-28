const EURO_COUNTRIES = [
  'AD',
  'AT',
  'BE',
  'BG',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MC',
  'ME',
  'MT',
  'NL',
  'PT',
  'SI',
  'SK',
  'SM',
  'VA',
  'XK',
] as const;

/**
 * The currency each country is priced in, by ISO 3166-1 alpha-2 code. A
 * country here is only priced in its currency once a provider has plans on
 * sale in it; until then it pays the provider's default currency.
 */
const COUNTRY_CURRENCY: ReadonlyMap<string, string> = new Map([
  ...EURO_COUNTRIES.map((country) => [country, 'EUR'] as const),
  ['US', 'USD'],
  ['GB', 'GBP'],
]);

/** The currency a visitor from `countryCode` is priced in, or null when unmapped. */
export const currencyForCountry = (countryCode: string | null): string | null =>
  countryCode === null ? null : (COUNTRY_CURRENCY.get(countryCode.toUpperCase()) ?? null);
