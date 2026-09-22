import { type PlanPricing } from '@workspace/types';

export type Currency = 'RUB' | 'EUR';

/**
 * Decimal places a price is rendered at, by currency code — two unless listed
 * here: RUB because we quote whole rubles, the others because they have no
 * minor unit at all.
 *
 * This is a display choice, not a claim about a currency's minor unit. For
 * that question — converting a Paddle amount out of its lowest unit — see
 * `paddleCurrencyDecimals` in `paddle.utils`.
 */
const DISPLAY_DECIMALS: Record<string, number> = { RUB: 0, JPY: 0, KRW: 0, CLP: 0 };

const priceEnvKey = (currency: Currency, months: number) => `PRICE_${currency}_MONTH_${months}`;

/**
 * The subscription periods currently on sale, in configured order.
 *
 * This is the only list of periods in the app — there is no hardcoded set of
 * supported lengths. A period exists for a currency exactly when its
 * `PRICE_<CURRENCY>_MONTH_<N>` env var is set, which is what
 * `getPriceForPeriod` checks; ALLOWED_PERIOD narrows that to what is on sale
 * right now. The two are deliberately separate: delisting a period from sale
 * must not stop an existing subscriber from renewing it.
 */
export function enabledPeriodMonths(): number[] {
  if (!process.env.ALLOWED_PERIOD) {
    throw new Error('No period months selected.');
  }

  return process.env.ALLOWED_PERIOD.split(',')
    .map((period) => Number(period.trim()))
    .filter((period) => period > 0);
}

/**
 * Months granted by a paid `amount` (major units) for the currency.
 *
 * Matches the amount against each enabled period's `PRICE_*_MONTH_N` env var.
 * Throws when nothing matches — callers must never grant an unrecognised
 * amount. An unconfigured ALLOWED_PERIOD rejects every amount (fail-safe).
 */
export function amountToMonths(amount: number, currency: Currency): number {
  const months = enabledPeriodMonths().find((period) => {
    const price = process.env[priceEnvKey(currency, period)];
    return Boolean(price) && Number(price) === amount;
  });

  if (months === undefined) {
    throw new Error(`Unrecognized ${currency} amount: ${amount}`);
  }

  return months;
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
 * The configured price (as string) for a given number of months — the env var
 * is the whole definition of whether that period exists for this currency.
 *
 * Intentionally not gated on ALLOWED_PERIOD: renewals re-price an existing
 * subscriber's own period, which may since have been taken off sale.
 * Throws when the period has no price configured.
 */
export function getPriceForPeriod(currency: Currency, months: number): string {
  const price = process.env[priceEnvKey(currency, months)];
  if (!price || Number(price) <= 0) {
    throw new Error(`No ${currency} price configured for a ${months} month plan`);
  }

  return price;
}

const formatPrice = (value: number, currency: string): string => {
  const truncated = Math.floor(value * 100) / 100;

  const decimals = DISPLAY_DECIMALS[currency] ?? 2;

  return truncated.toFixed(decimals).replace(/\.00$/, '');
};

export function buildPricing(input: {
  currency: string;
  months: number;
  total: number;
  basePrice: number | null;
}): PlanPricing {
  const { currency, months, total, basePrice } = input;

  const fullTotal = basePrice !== null ? basePrice * months : null;

  const discountPercent =
    fullTotal !== null && fullTotal > 0 ? Math.round((1 - total / fullTotal) * 100) : 0;

  const monthly = total / months;

  return {
    total: total.toString(),
    monthly: formatPrice(monthly, currency),
    fullTotal: fullTotal !== null ? formatPrice(fullTotal, currency) : null,
    discountPercent,
    currencyCode: currency,
  };
}
