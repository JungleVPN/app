import { PaymentPurpose } from './common';

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

  metadata: Record<string, string>;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  userStatus?: string;
  /** Subscription plan in months (1, 3, 6, 12). Defaults to the first allowed period. */
  selectedPeriod: number;
  /** Tolt affiliate referral id (`window.tolt_referral`), when the visitor came via a referral link. */
  toltReferralId?: string | null;
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
