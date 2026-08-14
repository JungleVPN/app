import Stripe from 'stripe';
import { amountToMonths } from '../../utils/amount';

/**
 * Converts a Stripe amount (in cents) to the display amount.
 * Stripe amounts are always in the smallest currency unit (e.g., cents for EUR).
 */
export function mapToCorrectAmount(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Maps a paid Stripe EUR amount (in cents) to the subscription period in months.
 *
 * Delegates to the shared, provider-agnostic price config so YooKassa and
 * Stripe share one validation path. Throws when the paid amount does not match
 * a configured EUR price (finding #12) — callers must never silently grant an
 * unrecognised amount.
 */
export function mapEURAmountToMonthsNumber(amount: string): number {
  return amountToMonths(mapToCorrectAmount(Number(amount)), 'EUR');
}

export const customerToId = (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) => {
  if (!customer) return null;

  if (typeof customer === 'string') {
    return customer;
  } else if (customer.deleted) {
    return null;
  } else {
    return customer.id;
  }
};

export const subscriptionToId = (subscription: string | Stripe.Subscription | undefined) => {
  if (!subscription) return null;

  if (typeof subscription === 'string') {
    return subscription;
  } else {
    return subscription.id;
  }
};

/** Narrows Stripe's `string | PaymentIntent | null` union to a plain id. */
export const paymentIntentToId = (
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
): string | null => {
  if (!paymentIntent) return null;
  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
};
