/** Payment method the user can pick in the checkout UI. */
export type PaymentMethod = 'yookassa' | 'stripe' | 'stars';
/** Determines what action is taken after a successful payment. */
export type PaymentPurpose = 'subscription' | 'extra_device';

/** Ready-to-render pricing for a plan in a single currency. */
export type PlanPricing = {
  /** Formatted total price for the period. */
  total: string;
  /** Formatted price per month. */
  monthly: string;
  /** Formatted undiscounted total for comparison, or null when there's no baseline (e.g. no 1-month plan configured). */
  fullTotal: string | null;
  /** Percentage saved vs. the undiscounted rate; 0 when there's no discount. */
  discountPercent: number;
};

/** A single available subscription plan returned by the common /plans endpoint. */
export type SubscriptionPlanDto = {
  months: number;
  priceEur: string;
  priceRub: string;
  priceStars: number;
  eur: PlanPricing;
  rub: PlanPricing;
};
