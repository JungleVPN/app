import { type PlanPricing } from '@workspace/types';

export type Currency = 'RUB' | 'EUR';

/** Decimal places used when formatting a currency's prices for display. */
const CURRENCY_DECIMALS: Record<Currency, number> = { RUB: 0, EUR: 2 };

const PERIOD_KEYS = [
  { key: 'MONTH_1', months: 1 },
  { key: 'MONTH_3', months: 3 },
  { key: 'MONTH_6', months: 6 },
  { key: 'MONTH_12', months: 12 },
] as const;

export const enabledPeriodMonths = (): number[] => {
  if (!process.env.ALLOWED_PERIOD) {
    throw new Error('No period months selected.');
  }
  return process.env.ALLOWED_PERIOD.split(',')
    .map((p) => Number(p.trim()))
    .filter((p) => p > 0);
};

/**
 * Months granted by a paid `amount` (major units) for the currency.
 *
 * Iterates enabled periods and matches the amount against the corresponding
 * PRICE_*_MONTH_N env var. Throws when no match is found — callers must never
 * grant an unrecognised amount. An unconfigured ALLOWED_PERIOD rejects
 * every amount (fail-safe).
 */
export function amountToMonths(amount: number, currency: Currency): number {
  const enabled = enabledPeriodMonths();
  for (const { key, months } of PERIOD_KEYS) {
    if (!enabled.includes(months)) continue;
    const price = process.env[`PRICE_${currency}_${key}`];
    if (price && Number(price) === amount) return months;
  }
  throw new Error(`Unrecognized ${currency} amount: ${amount}. `);
}

/**
 * The configured price of one extra device slot.
 *
 * A one-off purchase with its own price, unrelated to any subscription period —
 * so it must never be recorded at a period price, which would misstate the sale
 * in payment history and admin search. Throws when unconfigured.
 */
export function getExtraDevicePrice(currency: Currency): string {
  const price = process.env[`EXTRA_DEVICE_PRICE_${currency}`];
  if (!price || Number(price) <= 0) {
    throw new Error(`Missing extra device price for ${currency}`);
  }
  return price;
}

/**
 * The configured price (as string) for a given number of months.
 * Throws when the period is unknown or its price env var is not set.
 */
export function getPriceForPeriod(currency: Currency, months: number): string {
  const entry = PERIOD_KEYS.find((p) => p.months === months);
  if (!entry) throw new Error(`Unknown period: ${months} months`);
  const price = process.env[`PRICE_${currency}_${entry.key}`];
  if (!price || Number(price) <= 0) {
    throw new Error(`Missing price for ${currency} and ${months} month(s)`);
  }
  return price;
}

/**
 * Ready-to-render pricing for a plan: formatted total/monthly price, the
 * undiscounted total for comparison, and the percentage saved.
 *
 * `basePrice` is the 1-month price in the same currency (or null when no
 * 1-month plan is configured) — the baseline every other period is compared
 * against to compute the discount.
 */
export function buildPlanPricing(
  currency: Currency,
  months: number,
  totalPrice: number,
  basePrice: number | null,
): PlanPricing {
  const decimals = CURRENCY_DECIMALS[currency];
  const monthly = totalPrice / months;
  const fullTotal = basePrice !== null ? basePrice * months : null;
  const discountPercent =
    fullTotal !== null && fullTotal > 0 ? Math.round((1 - totalPrice / fullTotal) * 100) : 0;

  return {
    total: totalPrice.toFixed(decimals),
    monthly: monthly.toFixed(decimals),
    fullTotal: fullTotal !== null ? fullTotal.toFixed(decimals) : null,
    discountPercent,
  };
}
