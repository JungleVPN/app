/**
 * Checkout analytics — a checkout reports starting, and leaves behind the
 * provider and plan length it started with, so the return pages can report
 * how it ended. Reading it clears it, so a reload reports nothing twice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/auth';
import {
  checkoutEventProperties,
  takePendingCheckout,
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
    sessionStorage.clear();
  });

  it('reports the checkout starting, with the provider and plan length', () => {
    trackCheckoutStarted({ paymentProvider: 'whop', days: 90 });

    expect(phCapture).toHaveBeenCalledWith('checkout_started', {
      payment_provider: 'whop',
      days: 90,
    });
  });

  it('leaves the started checkout behind for the return pages', () => {
    trackCheckoutStarted({ paymentProvider: 'yookassa', days: 30 });

    expect(takePendingCheckout()).toEqual({ paymentProvider: 'yookassa', days: 30 });
  });

  it('hands the checkout over once, so a reload of a return page reports nothing', () => {
    trackCheckoutStarted({ paymentProvider: 'whop', days: 30 });

    takePendingCheckout();

    expect(takePendingCheckout()).toBeNull();
  });

  it('has nothing to hand over when no checkout started in this tab', () => {
    expect(takePendingCheckout()).toBeNull();
  });

  it('ignores a stored checkout it cannot read', () => {
    sessionStorage.setItem('jungle.pendingCheckout', '{"paymentProvider":"whop"}');

    expect(takePendingCheckout()).toBeNull();
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

  describe('which method the checkout was paid with', () => {
    it('is handed to the return pages with the checkout', () => {
      trackCheckoutStarted({ paymentProvider: 'whop', days: 30 });

      trackPaymentMethodSubmitted('apple_pay', { paymentProvider: 'whop', days: 30 });

      expect(takePendingCheckout()).toEqual({
        paymentProvider: 'whop',
        days: 30,
        paymentMethod: 'apple_pay',
      });
    });

    it('is the last one tried when the payer switches method', () => {
      trackCheckoutStarted({ paymentProvider: 'whop', days: 30 });

      trackPaymentMethodSubmitted('card', { paymentProvider: 'whop', days: 30 });
      trackPaymentMethodSubmitted('google_pay', { paymentProvider: 'whop', days: 30 });

      expect(takePendingCheckout()?.paymentMethod).toBe('google_pay');
    });

    it('names the payment method in the properties of every checkout event', () => {
      expect(
        checkoutEventProperties({ paymentProvider: 'whop', days: 30, paymentMethod: 'card' }),
      ).toEqual({ payment_provider: 'whop', days: 30, payment_method: 'card' });
    });

    it('starts no checkout of its own when none was started in this tab', () => {
      trackPaymentMethodSubmitted('card', { paymentProvider: 'whop', days: 30 });

      expect(takePendingCheckout()).toBeNull();
    });

    it('ignores a stored method it does not recognise', () => {
      sessionStorage.setItem(
        'jungle.pendingCheckout',
        '{"paymentProvider":"whop","days":30,"paymentMethod":"cash"}',
      );

      expect(takePendingCheckout()).toEqual({ paymentProvider: 'whop', days: 30 });
    });
  });
});
