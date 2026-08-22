import type Stripe from 'stripe';

export type BillingPortalSession = Stripe.Response<Stripe.BillingPortal.Session>;
export type CheckoutSession = Stripe.Response<Stripe.Checkout.Session>;
export type Session = BillingPortalSession | CheckoutSession;

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
