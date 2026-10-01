/**
 * Checkout analytics — a checkout reports starting, and leaves behind the
 * provider and plan length it started with, so the return pages can report
 * how it ended. Reading it clears it, so a reload reports nothing twice.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkoutEventProperties,
  takePendingCheckout,
  trackCheckoutStarted,
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
});
