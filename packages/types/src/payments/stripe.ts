import type { RemnaUserId } from '../remnawave';
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
  /**
   * The account being billed, or null for an anonymous checkout whose account
   * does not exist yet — the public route defers creating it until a payment
   * webhook confirms the charge settled.
   */
  userId: RemnaUserId | null;
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
 * Public Stripe create-session request — POST /payments/stripe/public-create-session.
 *
 * Unauthenticated checkout for the standalone payment page: the visitor has no
 * account yet, so the backend find-or-creates the Remnawave user from `email`
 * before opening the same Stripe session an authenticated caller would get.
 */
export interface CreatePublicStripeSessionDto {
  /** Payer's email. The account is found-or-created from this address. */
  email: string;
  /** Subscription plan in months (1, 3, 6, 12). */
  selectedPeriod: number;
  /** Tolt affiliate referral id (`window.tolt_referral`), when present. */
  toltReferralId?: string | null;
  /** Referring user id captured from a `?ref=` link, when present. */
  inviterId?: number;
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

/**
 * Body of the 409 the public checkout answers with when the payer email already
 * has an active subscription. The anonymous caller proved nothing but knowledge
 * of the address, so it is never given a Billing Portal session — the page asks
 * the visitor to log in and manage the subscription from their profile instead.
 */
export const ACTIVE_SUBSCRIPTION_CODE = 'active_subscription';
