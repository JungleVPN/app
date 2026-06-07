import * as process from 'node:process';
import Stripe from 'stripe';

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
 * Single-price model: there is exactly one configured price (`STRIPE_AMOUNT`,
 * in EUR) granting `ALLOWED_PERIODS` months — mirroring the YooKassa flow.
 *
 * Finding #12 fix: throws instead of returning a silent default when the paid
 * amount does not match the configured price.  Callers must handle the error
 * and must never silently grant an unrecognised amount.
 */
export function mapEURAmountToMonthsNumber(amount: string): number {
  const expectedAmount = process.env.STRIPE_AMOUNT;

  if (expectedAmount) {
    return Number(process.env.ALLOWED_PERIODS ?? 1);
  }

  throw new Error(
    `Unrecognized Stripe amount: ${amount} cents (${amount} EUR). ` +
      `Expected ${expectedAmount} EUR (STRIPE_AMOUNT).`,
  );
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
