import type { SubscriptionPlanDto } from '@workspace/types';
import { formatPlanPrice } from '../../utils';

export type PriceCalculation = {
  price: string;
  discount?: string;
  originalTotal?: string;
  discountedTotal?: string;
  noDiscountLabel?: string;
};

/**
 * One plan's price card content.
 *
 * The backend already resolved the currency this visitor pays in, so there is
 * nothing to choose here — every amount is formatted the same way, whether it
 * came from our rouble table, our EUR table, or a provider's own local quote.
 */
export function calculatePricing(
  plan: SubscriptionPlanDto,
  labels: { discountLabel: (percent: number) => string; noDiscountLabel: string },
): PriceCalculation {
  const pricing = plan.planPricing;
  const format = (amount: string) => formatPlanPrice(pricing, amount);
  const price = format(pricing.monthly);

  if (plan.period === 1) {
    return { price, noDiscountLabel: labels.noDiscountLabel };
  }

  if (pricing.discountPercent <= 0 || !pricing.fullTotal) {
    return { price };
  }

  return {
    price,
    discount: labels.discountLabel(pricing.discountPercent),
    originalTotal: format(pricing.fullTotal),
    discountedTotal: format(pricing.total),
  };
}
