import type Stripe from 'stripe';
import type { PaymentPurpose } from '@workspace/types';

/**
 * Metadata attached to a Stripe payment session.
 * Platform-specific: web flow requires `email` so the webhook can identify
 * the user without a telegramId.
 */
export interface WebStripeMetadata {
  readonly email: string;
  readonly [key: string]: string;
}

export interface CreateStripePaymentDto {
  readonly userId: string;
  /** Defaults to 'subscription'. Use 'extra_device' for one-time device-slot purchases. */
  readonly purchaseType?: PaymentPurpose;
  readonly payment: {
    readonly amount: number | string;
    readonly currency: 'EUR';
  };
  /** Required for web: must contain at least { email }. */
  readonly metadata: WebStripeMetadata;
  /** Optional promo code entered by the user; validated server-side. */
  readonly promoCode?: string | null;
  /** Subscription status from remnawave, when known — used to validate the promo. */
  readonly userStatus?: string;
  /** Tolt affiliate referral id (`window.tolt_referral`), when the visitor came via a referral link. */
  readonly toltReferralId?: string | null;
}

export type BillingPortalSession = Stripe.Response<Stripe.BillingPortal.Session>;
export type CheckoutSession = Stripe.Response<Stripe.Checkout.Session>;
export type Session = BillingPortalSession | CheckoutSession;

export interface StripeInvoicePayload {
  id: string;
  userId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  amount: number | null;
  currency: 'EUR' | null;
  status: Stripe.Invoice.Status | string;
  url: string | null;
  invoiceUrl: string | null;
  paidAt: Date | null;
  metadata: Stripe.Metadata;
}
