import { useAuthStore } from '../stores';
import { phCapture } from './posthog';

/**
 * The checkout a payer started in this tab, as PostHog reports it. The return
 * pages (`/payment/success`, `/payment/fail`) only see a URL, so the checkout
 * leaves this behind for them to report how it ended. Kept in sessionStorage
 * so it survives a provider's redirect yet dies with the tab.
 */
export type CheckoutAnalytics = {
  paymentProvider: string;
  days: number;
};

/** How a payer pays: a card, or one of the wallets. */
export type SubmittedPaymentMethod = 'card' | 'apple_pay' | 'google_pay';

const PAYMENT_METHOD_SUBMITTED_EVENTS: Record<SubmittedPaymentMethod, string> = {
  card: 'card_submitted',
  apple_pay: 'apple_pay_submitted',
  google_pay: 'google_pay_submitted',
};

const PENDING_CHECKOUT_KEY = 'jungle.pendingCheckout';

export function checkoutEventProperties({ paymentProvider, days }: CheckoutAnalytics) {
  return { payment_provider: paymentProvider, days };
}

/** Adds the signed-in payer's id; a visitor with no account yet has none to add. */
export function withUserId<T extends Record<string, unknown>>(
  properties: T,
): T | (T & { user_id: number }) {
  const userId = useAuthStore.getState().rmnUser?.id;
  return userId == null ? properties : { ...properties, user_id: userId };
}

export function trackCheckoutStarted(checkout: CheckoutAnalytics): void {
  phCapture('checkout_started', withUserId(checkoutEventProperties(checkout)));
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(checkout));
  } catch {
    // Storage disabled — the return pages then report nothing rather than guess.
  }
}

export function trackEmailStepViewed({ days }: { days: number | null }): void {
  phCapture('email_step_viewed', withUserId({ days }));
}

export function trackEmailStepSubmitted({ days }: { days: number | null }): void {
  phCapture('email_step_submitted', withUserId({ days }));
}

export function trackPaymentMethodSubmitted(
  method: SubmittedPaymentMethod,
  checkout: CheckoutAnalytics,
): void {
  phCapture(PAYMENT_METHOD_SUBMITTED_EVENTS[method], withUserId(checkoutEventProperties(checkout)));
}

/** Reads and clears the started checkout, so a reload of a return page reports nothing twice. */
export function takePendingCheckout(): CheckoutAnalytics | null {
  try {
    const stored = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
    return stored === null ? null : toCheckout(JSON.parse(stored));
  } catch {
    return null;
  }
}

function toCheckout(stored: unknown): CheckoutAnalytics | null {
  if (typeof stored !== 'object' || stored === null) return null;
  if (!('paymentProvider' in stored) || !('days' in stored)) return null;
  const { paymentProvider, days } = stored;
  if (typeof paymentProvider !== 'string' || typeof days !== 'number') return null;
  return { paymentProvider, days };
}
