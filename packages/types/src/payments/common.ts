/** Payment method the user can pick in the checkout UI. */
export type PaymentMethod = 'yookassa' | 'stripe' | 'stars';

/** A single available subscription plan returned by the common /plans endpoint. */
export type SubscriptionPlanDto = {
  months: number;
  priceEur: string;
  priceRub: string;
  priceStars: number;
};
