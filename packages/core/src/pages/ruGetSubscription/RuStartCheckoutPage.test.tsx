/**
 * RuStartCheckoutPage — what happens between a validated payer and YooKassa.
 *
 * The shared parts (email validation, the active-subscription dialog, plan
 * resolution) belong to `useCheckout` and are exercised through it; what is
 * specific to this page is the redirect out of the app, and the payment id it
 * has to leave behind first — `/payment/success` sees the same return URL
 * whether the payer paid or cancelled, and that id is all that tells them apart.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheckoutRequest } from '../getSubscription/useCheckout';
import RuStartCheckoutPage from './RuStartCheckoutPage';

const { createPublicYookassaSession, rememberPendingYookassaPayment, phCapture, useCheckout } =
  vi.hoisted(() => ({
    createPublicYookassaSession: vi.fn(),
    rememberPendingYookassaPayment: vi.fn(),
    phCapture: vi.fn(),
    useCheckout: vi.fn(),
  }));

vi.mock('../../runtime', () => ({
  usePaymentsApi: () => ({ createPublicYookassaSession }),
  useAppRoutes: () => ({ paymentReturnPath: '/payment/success' }),
}));
vi.mock('../../utils', () => ({
  rememberPendingYookassaPayment,
  phCapture,
  getReferralUserId: () => 42,
}));
vi.mock('../../components', () => ({ Loading: () => null }));
vi.mock('../getSubscription/CheckoutForm', () => ({ CheckoutForm: () => null }));
vi.mock('../getSubscription/ActiveSubscriptionDialog', () => ({
  ActiveSubscriptionDialog: () => null,
}));
vi.mock('../getSubscription/useCheckout', () => ({ useCheckout }));

/** Renders the page and hands back the `startCheckout` it gave `useCheckout`. */
function renderPage(): (request: CheckoutRequest) => Promise<void> {
  let startCheckout: ((request: CheckoutRequest) => Promise<void>) | undefined;
  useCheckout.mockImplementation((start: (request: CheckoutRequest) => Promise<void>) => {
    startCheckout = start;
    return { isLoading: false, plan: undefined, activeSubscriptionEmail: null };
  });

  render(<RuStartCheckoutPage />);

  if (!startCheckout) throw new Error('the page never handed useCheckout a startCheckout');
  return startCheckout;
}

describe('RuStartCheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://ru.jungle.test', href: '' },
    });
    window.tolt_referral = 'tolt-1';
    createPublicYookassaSession.mockResolvedValue({ id: 'pay-1', url: 'https://yookassa/pay-1' });
  });

  afterEach(cleanup);

  it('asks the backend for a payment against this domain’s return URL', async () => {
    await renderPage()({ email: 'payer@test.com', selectedPeriod: 3 });

    expect(createPublicYookassaSession).toHaveBeenCalledWith({
      email: 'payer@test.com',
      selectedPeriod: 3,
      returnUrl: 'https://ru.jungle.test/payment/success',
      toltReferralId: 'tolt-1',
      inviterId: 42,
    });
  });

  it('remembers the payment before handing the payer to YooKassa', async () => {
    await renderPage()({ email: 'payer@test.com', selectedPeriod: 1 });

    expect(rememberPendingYookassaPayment).toHaveBeenCalledWith('pay-1');
    expect(window.location.href).toBe('https://yookassa/pay-1');
  });

  it('reports the checkout starting, with the plan being bought', async () => {
    await renderPage()({ email: 'payer@test.com', selectedPeriod: 6 });

    expect(phCapture).toHaveBeenCalledWith('checkout_started', {
      payment_provider: 'yookassa',
      months: 6,
    });
  });

  // A session with no confirmation URL is nothing to send anyone to: staying
  // put leaves the form usable, where a redirect to `undefined` would not.
  it('stays on the page when the backend returns no confirmation URL', async () => {
    createPublicYookassaSession.mockResolvedValue({ id: 'pay-2', url: '' });

    await renderPage()({ email: 'payer@test.com', selectedPeriod: 1 });

    expect(rememberPendingYookassaPayment).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });

  // useCheckout turns a rejection into the right message or the
  // active-subscription dialog, so the failure has to reach it.
  it('lets a refused checkout propagate to useCheckout', async () => {
    const refusal = new Error('refused');
    createPublicYookassaSession.mockRejectedValue(refusal);

    await expect(renderPage()({ email: 'payer@test.com', selectedPeriod: 1 })).rejects.toBe(
      refusal,
    );
  });
});
