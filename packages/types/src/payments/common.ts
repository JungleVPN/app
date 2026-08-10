/** Payment method the user can pick in the checkout UI. */
export type PaymentMethod = 'yookassa' | 'stripe' | 'stars';
/** Determines what action is taken after a successful payment. */
export type PaymentPurpose = 'subscription' | 'extra_device';

/** A single available subscription plan returned by the common /plans endpoint. */
export type SubscriptionPlanDto = {
  months: number;
  priceEur: string;
  priceRub: string;
  priceStars: number;
};
