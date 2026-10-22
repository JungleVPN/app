import type { PlanPricing, WhopPromoCodeDto } from '@workspace/types';

/**
 * What a promo code does to the order: the new total with the share it takes
 * off, or — for a fixed amount in a currency other than the one the plan is
 * quoted in, which cannot be subtracted — just the amount it takes off.
 */
export type PromoPrice =
  | { total: string; percentOff: number }
  | { amountOff: number; currency: string };

/** Decimals `amount` is quoted with, so the discounted total keeps the currency's precision. */
const decimalsOf = (amount: string): number => (amount.split('.')[1] ?? '').length;

/** The whole-percent share of `total` a fixed amount took off, bringing it to `discounted`. */
function shareTakenOff(total: number, discounted: number): number {
  if (total <= 0) return 0;
  return Math.round(((total - discounted) / total) * 100);
}

/**
 * The order total after `promo`, taken off the price the payer would pay for
 * the plan (`pricing.total`) — a promo code replaces the plan's own discount
 * rather than stacking on its undiscounted baseline.
 */
export function promoPrice(pricing: PlanPricing, promo: WhopPromoCodeDto): PromoPrice {
  const total = Number(pricing.total);
  const isPercentage = promo.promoType === 'percentage';

  if (!isPercentage && promo.currency.toUpperCase() !== pricing.currencyCode.toUpperCase()) {
    return { amountOff: promo.amountOff, currency: promo.currency.toUpperCase() };
  }

  const discounted = Math.max(
    0,
    isPercentage ? total * (1 - promo.amountOff / 100) : total - promo.amountOff,
  );
  const decimals = decimalsOf(pricing.total);
  const scale = 10 ** decimals;
  const rounded = Math.round(discounted * scale) / scale;

  return {
    total: rounded.toFixed(decimals),
    percentOff: isPercentage ? promo.amountOff : shareTakenOff(total, rounded),
  };
}
