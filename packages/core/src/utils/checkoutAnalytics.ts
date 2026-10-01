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

const PENDING_CHECKOUT_KEY = 'jungle.pendingCheckout';

export function checkoutEventProperties({ paymentProvider, days }: CheckoutAnalytics) {
  return { payment_provider: paymentProvider, days };
}

export function trackCheckoutStarted(checkout: CheckoutAnalytics): void {
  phCapture('checkout_started', checkoutEventProperties(checkout));
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(checkout));
  } catch {
    // Storage disabled — the return pages then report nothing rather than guess.
  }
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
