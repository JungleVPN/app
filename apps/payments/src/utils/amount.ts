import { type PlanPricing } from '@workspace/types';

export type Currency = 'RUB' | 'EUR';

const DISPLAY_DECIMALS: Record<string, number> = { RUB: 0, JPY: 0, KRW: 0, CLP: 0 };

const priceEnvKeys = (currency: Currency, period: number) => [`PRICE_${currency}_DAYS_${period}`];

const priceForPeriod = (currency: Currency, period: number): string | undefined =>
  priceEnvKeys(currency, period)
    .map((key) => process.env[key])
    .find(Boolean);

export function enabledPeriods(): number[] {
  const configuredPeriods = process.env.ALLOWED_PERIODS_IN_DAYS;
  if (!configuredPeriods) {
    throw new Error('No period months selected.');
  }

  return configuredPeriods
    .split(',')
    .map((period) => Number(period.trim()))
    .filter((period) => period > 0);
}

export function amountToDays(amount: number, currency: Currency): number {
  const days = enabledPeriods().find((days) => {
    const price = priceForPeriod(currency, days);
    return Boolean(price) && Number(price) === amount;
  });

  if (days === undefined) {
    throw new Error(`Unrecognized ${currency} amount: ${amount}`);
  }

  return days;
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
 * Intentionally not gated on ALLOWED_PERIODS_IN_DAYS: renewals re-price an existing
 * subscriber's own period, which may since have been taken off sale.
 * Throws when the period has no price configured.
 */
export function getPriceForPeriod(currency: Currency, days: number): string {
  const price = priceForPeriod(currency, days);
  if (!price || Number(price) <= 0) {
    throw new Error(`No ${currency} price configured for a ${days} month plan`);
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
  days: number;
  total: number;
  basePrice: number | null;
}): PlanPricing {
  const { currency, days, total, basePrice } = input;

  const fullTotal = basePrice !== null ? basePrice * (days / 30) : null;

  const discountPercent =
    fullTotal !== null && fullTotal > 0 ? Math.round((1 - total / fullTotal) * 100) : 0;

  const monthly = (total / days) * 30;

  return {
    total: total.toString(),
    monthly: formatPrice(monthly, currency),
    fullTotal: fullTotal !== null ? formatPrice(fullTotal, currency) : null,
    discountPercent,
    currencyCode: currency,
  };
}
