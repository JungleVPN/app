import type Stripe from 'stripe';

export type BillingPortalSession = Stripe.Response<Stripe.BillingPortal.Session>;
export type CheckoutSession = Stripe.Response<Stripe.Checkout.Session>;
export type Session = BillingPortalSession | CheckoutSession;

/**
 * Which of the two session kinds `createPayment` returned.
 *
 * Stripe stamps every object with its own type, so this reads the answer off
 * the payload rather than inferring it from an id prefix.
 */
export const isCheckoutSession = (session: Session): session is CheckoutSession =>
  session.object === 'checkout.session';

export interface StripeInvoicePayload {
  id: string;
  userId: number | null;
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
