/** Payment method the user can pick in the checkout UI. */
export type PaymentMethod = 'yookassa' | 'stripe' | 'stars' | 'paddle';
/** Determines what action is taken after a successful payment. */
export type PaymentPurpose = 'subscription' | 'extra_device';

/**
 * Ready-to-render pricing for a plan, already resolved to the one currency
 * this visitor will be charged in. Amounts are formatted strings at that
 * currency's own precision — never re-round or re-compute them client-side.
 */
export type PlanPricing = {
  /** Formatted total price for the period. */
  total: string;
  /** Formatted price per month. */
  monthly: string;
  /** Formatted undiscounted total for comparison, or null when there's no baseline (e.g. no 1-month plan configured). */
  fullTotal: string | null;
  /** Percentage saved vs. the undiscounted rate; 0 when there's no discount. */
  discountPercent: number;
  /** ISO 4217 code the amounts above are quoted in, for locale-correct formatting. */
  currencyCode: string;
};

/**
 * A single available subscription plan returned by the common /plans endpoint.
 *
 * Deliberately says nothing about which provider will take the payment: the
 * backend picks that from the request's Origin (RU domain vs. global) and,
 * for global visitors, has the provider quote the price for their IP. The
 * client renders what it is given and asks the backend to start a checkout.
 */
export type SubscriptionPlanDto = {
  /** Subscription length in months. */
  days: number;
  planPricing: PlanPricing;
  /**
   * Country detected for this visitor while pricing, or null when it could not
   * be. Used to prefill checkout so the payer skips the address step.
   */
  countryCode: string | null;
};
