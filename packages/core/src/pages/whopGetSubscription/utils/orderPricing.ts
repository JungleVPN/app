import type { PlanPricing } from '@workspace/types';
import type { TFunction } from 'i18next';
import { formatIntlPrice } from '../../../utils';
import type { PromoDiscount } from '../../getSubscription/components/CheckoutOrderSummary';
import type { WhopCheckoutCharge } from '../../whopCheckout/whopCheckoutState';
import type { PromoPrice } from './promoPrice';

/** A promo's fixed amount as a price string: whole amounts as they are, others to the cent. */
const amountString = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

/**
 * The total the order summary shows — the promo total when a code reprices
 * it — or undefined when a fixed amount in another currency leaves it unknown.
 */
export function shownCharge(
  pricing: PlanPricing,
  price: PromoPrice | null,
): WhopCheckoutCharge | undefined {
  if (!price) return { amount: pricing.total, currency: pricing.currencyCode };
  return 'total' in price ? { amount: price.total, currency: pricing.currencyCode } : undefined;
}

/** What the order summary says a promo code does: the new total and the share off, or just the amount off. */
export function promoDiscount(price: PromoPrice, t: TFunction): PromoDiscount {
  if ('total' in price) {
    return {
      total: price.total,
      label: t('getSubscription.promo_discount', { percent: price.percentOff }),
    };
  }
  return {
    label: t('getSubscription.promo_discount_amount', {
      amount: formatIntlPrice(amountString(price.amountOff), price.currency),
    }),
  };
}
