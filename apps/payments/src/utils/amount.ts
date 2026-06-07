/**
 * Provider-agnostic subscription-price configuration.
 *
 * The two payment providers price the same subscription in different
 * currencies (YooKassa in RUB, Stripe in EUR), so each currency has its own
 * configured price held in its own env var. Everything else — parsing,
 * validation, and the amount→period mapping — is shared here so neither
 * provider duplicates the logic.
 *
 * Single-price model: any configured price grants `ALLOWED_PERIODS` months.
 */
export type Currency = 'RUB' | 'EUR';

/** The env var holding the configured price(s) for each currency. */
const PRICE_ENV: Record<Currency, string> = {
  RUB: 'YOOKASSA_AMOUNT', // YooKassa — comma-separated list, first entry is canonical
  EUR: 'STRIPE_AMOUNT', // Stripe — single price
};

/** Configured prices for a currency, in major units (e.g. EUR, RUB), as strings. */
export function getConfiguredAmounts(currency: Currency): string[] {
  return (process.env[PRICE_ENV[currency]] || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => Number(value) > 0);
}

/** True when `amount` (major units) matches a configured price for the currency. */
export function isAllowedAmount(amount: number, currency: Currency): boolean {
  return getConfiguredAmounts(currency).some((configured) => Number(configured) === amount);
}

/**
 * Months granted by a paid `amount` (major units) for the currency.
 *
 * Finding #12: throws instead of silently returning a default when the amount
 * does not match a configured price — callers must never grant an unrecognised
 * amount. An empty/missing price config rejects every amount (fail-safe).
 */
export function amountToMonths(amount: number, currency: Currency): number {
  if (!isAllowedAmount(amount, currency)) {
    throw new Error(
      `Unrecognized ${currency} amount: ${amount}. ` +
        `Allowed: ${getConfiguredAmounts(currency).join(', ') || '(none configured)'}.`,
    );
  }

  return Number(process.env.ALLOWED_PERIODS ?? 1);
}
