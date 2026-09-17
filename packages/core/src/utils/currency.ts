/**
 * Locale-correct currency formatting for a backend-quoted price.
 *
 * `amount` arrives already rounded to its currency's own precision (whole
 * roubles, yen without cents, two decimals elsewhere), so the number of
 * decimals it carries is the number to render — this never re-rounds a price.
 *
 * Formatted for the language the UI is actually showing, not the browser's
 * own — an RU-domain visitor reads a Russian page and so should read
 * `1 200 ₽`, even on an English-language device.
 *
 * `currencyDisplay: 'narrowSymbol'` pins the symbol itself: by default `Intl`
 * disambiguates an unfamiliar currency for the visitor's own locale (USD
 * renders as "US$" for a non-US locale, plain "$" for a US one) — same price,
 * same currency, different string purely from the visitor's OS/browser
 * language setting. narrowSymbol forces the currency's own short glyph
 * everywhere, so the price reads identically on every device.
 */
/**
 * The language the UI is rendering in, read off `<html lang>` — i18n keeps it
 * in sync (see `core/i18n`), so this needs no import and stays usable from a
 * leaf util. Falls back to the device's own language, then to en-US.
 */
function displayLocale(): string {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  return typeof navigator !== 'undefined' ? navigator.language : 'en-US';
}

export function formatIntlPrice(amount: string, currencyCode: string): string {
  const decimals = (amount.split('.')[1] ?? '').length;

  return new Intl.NumberFormat(displayLocale(), {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(amount));
}

/** Formats a plan's pricing amount in the currency the backend quoted it in. */
export function formatPlanPrice(pricing: { currencyCode: string }, amount: string): string {
  return formatIntlPrice(amount, pricing.currencyCode);
}
