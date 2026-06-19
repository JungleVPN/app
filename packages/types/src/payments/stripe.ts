import type { PaymentPurpose } from './yookassa';

export type { PaymentPurpose };

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
  /** Defaults to 'subscription'. Use 'extra_device' for one-time device-slot purchases. */
  purchaseType?: PaymentPurpose;
  payment: {
    amount: number | string;
    currency: 'EUR';
  };
  metadata: {
    email: string;
    [key: string]: string;
  };
  /** Optional promo code entered by the user; validated server-side. */
  promoCode?: string | null;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  userStatus?: string;
}

/**
 * Response from GET /payments/stripe/subscription/:userId.
 * Reports whether the user has an active (or trialing) Stripe subscription and,
 * if so, a freshly-minted Billing Portal URL for self-service management.
 */
export interface StripeSubscriptionStatusDto {
  active: boolean;
  portalUrl: string | null;
}
