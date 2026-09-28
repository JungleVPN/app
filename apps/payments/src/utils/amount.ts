import * as process from 'node:process';
import type { PlanPricing } from '@workspace/types';

export type Currency = 'RUB' | 'EUR';

const DISPLAY_DECIMALS: Record<string, number> = {
  RUB: 0,
  JPY: 0,
  KRW: 0,
  CLP: 0,
  INR: 0,
  IDR: 0,
};

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

const formatPrice = (value: number, currency: string): string => {
  // Settle floating-point noise before truncating: 16.99 / 30 * 30 is
  // 16.989999…, which would otherwise truncate a cent below the real price.
  const truncated = Math.floor(Math.round(value * 1e6) / 1e4) / 100;

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
