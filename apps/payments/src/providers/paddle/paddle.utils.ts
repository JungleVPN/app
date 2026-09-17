import type { PaddleCustomData } from './paddle.types';

const PERIOD_MONTHS = [1, 3, 6, 12] as const;

/**
 * Reverse-maps a Paddle catalog price id back to the subscription period it
 * bills, by checking it against every configured `PADDLE_PRICE_ID_MONTH_*`
 * env var — the same set `PaddleProvider.getPriceId` builds the checkout from.
 * Returns null for an id that matches no configured period, so callers can
 * refuse an unrecognised price rather than guess a period (mirrors Stripe's
 * `mapEURAmountToMonthsNumber` fail-safe).
 */
export function priceIdToMonths(priceId: string | null | undefined): number | null {
  if (!priceId) return null;
  for (const months of PERIOD_MONTHS) {
    if (process.env[`PADDLE_PRICE_ID_MONTH_${months}`] === priceId) return months;
  }
  return null;
}

/**
 * Converts an optional Paddle amount string (its own lowest unit) to major
 * units for `currencyCode`, treating a missing amount as zero. The
 * null-tolerant wrapper around `paddleAmountToNumber` — zero-decimal
 * currencies must not be divided, see there.
 */
export function toMajorUnits(amount: string | null | undefined, currencyCode: string): number {
  if (!amount) return 0;
  return paddleAmountToNumber(amount, currencyCode);
}

/** Paddle's `customData` is typed `Record<string, any> | null` on the wire; narrows it to what checkout actually sends. */
export function toCustomData(customData: unknown): PaddleCustomData {
  return (customData && typeof customData === 'object' ? customData : {}) as PaddleCustomData;
}

/**
 * Tolt/FX reporting only supports these two currencies. Paddle settles in
 * whatever currency it localised the checkout to, so a sale in any other
 * currency is recorded locally but not reported to Tolt — reporting a wrong
 * currency would misstate the commission, and there is no reliable FX path
 * for arbitrary currencies today.
 */
export function isReportableCurrency(currency: string): currency is 'EUR' {
  return currency === 'EUR';
}

/** The Paddle currencies with no minor unit — see https://developer.paddle.com/concepts/sell/supported-currencies. */
const ZERO_DECIMAL_PADDLE_CURRENCIES = new Set(['JPY', 'KRW', 'CLP']);

/** Decimal places a Paddle-resolved currency displays at — 0 for JPY/KRW/CLP, 2 otherwise. */
export function paddleCurrencyDecimals(currencyCode: string): number {
  return ZERO_DECIMAL_PADDLE_CURRENCIES.has(currencyCode) ? 0 : 2;
}

/**
 * A Paddle pricing-preview amount (its own lowest-unit integer, as a string)
 * to a real number in major units — accounting for the zero-decimal
 * currencies, whose integer is already the whole amount (`1200` means 1200,
 * not 12.00).
 */
export function paddleAmountToNumber(amount: string, currencyCode: string): number {
  return paddleCurrencyDecimals(currencyCode) === 0 ? Number(amount) : Number(amount) / 100;
}
