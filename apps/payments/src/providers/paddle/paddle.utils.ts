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

/** Converts a Paddle amount string (minor currency units, e.g. cents) to major units. */
export function toMajorUnits(amount: string | null | undefined): number {
  if (!amount) return 0;
  return Number(amount) / 100;
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
