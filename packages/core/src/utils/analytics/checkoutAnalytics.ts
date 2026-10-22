import { useAuthStore } from '../../stores/auth';
import { phCapture } from './posthog';

/** How a payer pays: a card, or one of the wallets. */
export type SubmittedPaymentMethod = 'card' | 'apple_pay' | 'google_pay';

/** The checkout a payer started, as PostHog reports it. */
export type CheckoutAnalytics = {
  paymentProvider: string;
  days: number;
};

const PAYMENT_METHOD_SUBMITTED_EVENTS: Record<SubmittedPaymentMethod, string> = {
  card: 'card_submitted',
  apple_pay: 'apple_pay_submitted',
  google_pay: 'google_pay_submitted',
};

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
