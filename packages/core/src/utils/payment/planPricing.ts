import type { PlanPricing, SubscriptionPlanDto } from '@workspace/types';
import { TFunction } from 'i18next';
import { formatPlanPrice } from './currency';

export type PlanAmounts = {
  /** Price per month, the headline figure on both the cards and the tabs. */
  monthly: string;
  total: string;
  /** Undiscounted total, absent when the plan has nothing to strike through. */
  fullTotal?: string;
  discountPercent: number;
  hasDiscount: boolean;
};

/**
 * The formatted amounts for one plan.
 *
 * The backend already resolved the currency this visitor pays in, so there is
 * nothing to choose here — every amount is formatted the same way, whether it
 * came from our rouble table, our EUR table, or a provider's own local quote.
 */
export function formatPlanAmounts(pricing: PlanPricing): PlanAmounts {
  const format = (amount: string) => formatPlanPrice(pricing, amount);
  const hasDiscount = pricing.discountPercent > 0 && Boolean(pricing.fullTotal);

  return {
    monthly: format(pricing.monthly),
    total: format(pricing.total),
    fullTotal: pricing.fullTotal ? format(pricing.fullTotal) : undefined,
    discountPercent: pricing.discountPercent,
    hasDiscount,
  };
}

/** Longest commitment first, the order the plan pickers present. */
export function mapPlans(plans: SubscriptionPlanDto[]): SubscriptionPlanDto[] {
  return [...plans].sort((a, b) => b.days - a.days).filter((plan) => !plan.isTrial);
}

export function formatPeriod(days: number, t: TFunction): string {
  if (days === 7) return t('landing.pricing.daysPeriod', { count: days });
  if (days === 30) return t('landing.pricing.period');
  if (days === 90 || days === 180) return t('landing.pricing.monthsPeriod', { count: days / 30 });
  if (days === 365) return t('landing.pricing.yearlyPeriod');
  return t('landing.pricing.monthsPeriod', { count: days });
}

export type PriceCalculation = {
  price: string;
  discount?: string;
  originalTotal?: string;
  discountedTotal?: string;
  noDiscountLabel?: string;
};

/** One plan's price card content, on top of the same amounts the tabs show. */
export function calculatePricing(
  plan: SubscriptionPlanDto,
  labels: { discountLabel: (percent: number) => string; noDiscountLabel: string },
): PriceCalculation {
  const amounts = formatPlanAmounts(plan.planPricing);
  const price = amounts.monthly;

  if (plan.days === 30) {
    return { price, noDiscountLabel: labels.noDiscountLabel };
  }

  if (!amounts.hasDiscount) {
    return { price };
  }

  return {
    price,
    discount: labels.discountLabel(amounts.discountPercent),
    originalTotal: amounts.fullTotal,
    discountedTotal: amounts.total,
  };
}
