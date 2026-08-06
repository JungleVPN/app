/** Payment method the user can pick in the checkout UI. */
export type PaymentMethod = 'yookassa' | 'stripe' | 'stars';
/** Determines what action is taken after a successful payment. */
export type PaymentPurpose = 'subscription' | 'extra_device';
