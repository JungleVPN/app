/** Checkout analytics — the checkout funnel's frontend events: starting, the email step, and submitting a payment. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth';
import {
  checkoutEventProperties,
  trackCheckoutStarted,
  trackEmailStepSubmitted,
  trackEmailStepViewed,
  trackPaymentMethodSubmitted,
} from './checkoutAnalytics';

const { phCapture } = vi.hoisted(() => ({ phCapture: vi.fn() }));

vi.mock('./posthog', () => ({ phCapture }));

describe('checkout analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the checkout starting, with the provider and plan length', () => {
    trackCheckoutStarted({ paymentProvider: 'whop', days: 90 });

    expect(phCapture).toHaveBeenCalledWith('checkout_started', {
      payment_provider: 'whop',
      days: 90,
    });
  });

  it('names event properties the way every checkout event does', () => {
    expect(checkoutEventProperties({ paymentProvider: 'whop', days: 365 })).toEqual({
      payment_provider: 'whop',
      days: 365,
    });
  });

  it('reports the email step being shown', () => {
    trackEmailStepViewed({ days: 30 });

    expect(phCapture).toHaveBeenCalledWith('email_step_viewed', { days: 30 });
  });

  it('reports the email step being submitted', () => {
    trackEmailStepSubmitted({ days: 90 });

    expect(phCapture).toHaveBeenCalledWith('email_step_submitted', { days: 90 });
  });

  it.each([
    ['apple_pay', 'apple_pay_submitted'],
    ['google_pay', 'google_pay_submitted'],
    ['card', 'card_submitted'],
  ] as const)('reports a %s payment being submitted as %s', (method, event) => {
    trackPaymentMethodSubmitted(method, { paymentProvider: 'whop', days: 365 });

    expect(phCapture).toHaveBeenCalledWith(event, { payment_provider: 'whop', days: 365 });
  });

  describe('when the payer is known', () => {
    beforeEach(() => {
      useAuthStore.setState({ rmnUser: { id: 42 } as never });
    });

    afterEach(() => {
      useAuthStore.setState({ rmnUser: null });
    });

    it.each([
      ['checkout_started', () => trackCheckoutStarted({ paymentProvider: 'whop', days: 30 })],
      ['email_step_viewed', () => trackEmailStepViewed({ days: 30 })],
      ['email_step_submitted', () => trackEmailStepSubmitted({ days: 30 })],
      [
        'card_submitted',
        () => trackPaymentMethodSubmitted('card', { paymentProvider: 'whop', days: 30 }),
      ],
    ])('adds their user id to %s', (event, track) => {
      track();

      expect(phCapture).toHaveBeenCalledWith(event, expect.objectContaining({ user_id: 42 }));
    });
  });

  it('leaves the user id out when the payer is not known', () => {
    trackEmailStepViewed({ days: 30 });

    expect(phCapture).toHaveBeenCalledWith('email_step_viewed', { days: 30 });
  });
});
