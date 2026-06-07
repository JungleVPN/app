/**
 * Stripe create-session request — POST /payments/stripe/create-session.
 *
 * Mirrors the backend `CreateStripePaymentDto` contract. `metadata.email` is
 * required for the web/TMA flow so the Stripe webhook can identify the payer;
 * any additional string fields (e.g. `userId`, `telegramId`) are forwarded to
 * the Stripe customer metadata.
 */
export interface CreateStripeSessionDto {
  userId: string;
  payment: {
    amount: number | string;
    currency: 'EUR';
  };
  metadata: {
    email: string;
    [key: string]: string;
  };
}
