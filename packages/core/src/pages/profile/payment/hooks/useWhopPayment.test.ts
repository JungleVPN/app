/**
 * useWhopPayment — starting a Whop checkout from the profile payment page.
 * The backend validates the checkout; the page hands the result to the one
 * checkout route that mounts Whop's card fields.
 */
import { act, renderHook } from '@testing-library/react';
import { ACTIVE_SUBSCRIPTION_CODE, type SubscriptionPlanDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../../api';
import { useWhopPayment } from './useWhopPayment';

const { paymentsApi, navigate, trackCheckoutStarted, auth } = vi.hoisted(() => ({
  paymentsApi: { createPublicWhopCheckout: vi.fn() },
  navigate: vi.fn(),
  trackCheckoutStarted: vi.fn(),
  auth: {
    rmnUser: { id: 42, email: 'account@test.com' } as { id: number; email: string | null } | null,
  },
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../../../runtime', () => ({
  usePaymentsApi: () => paymentsApi,
  useAppRoutes: () => ({ profilePaddleCheckoutPath: '/profile/checkout' }),
}));
vi.mock('../../../../stores', () => ({ useAuthStoreInfo: () => auth }));
vi.mock('../../../../utils', () => ({ getReferralUserId: () => 7, trackCheckoutStarted }));

const plan = {
  planId: 'plan-90',
  days: 90,
  planPricing: {
    total: '14.99',
    monthly: '5.00',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'EUR',
  },
  countryCode: null,
  isTrial: false,
} satisfies SubscriptionPlanDto;

describe('useWhopPayment', () => {
  beforeEach(() => {
    auth.rmnUser = { id: 42, email: 'account@test.com' };
    paymentsApi.createPublicWhopCheckout.mockResolvedValue({
      accountId: 'biz_1',
      planId: 'plan_q',
      renews: true,
    });
  });

  it("creates a Whop checkout for the plan, billed to the account's email", async () => {
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(paymentsApi.createPublicWhopCheckout).toHaveBeenCalledWith({
      email: 'account@test.com',
      planId: 'plan-90',
      toltReferralId: null,
      inviterId: 7,
    });
  });

  it('opens the profile checkout route with the validated checkout', async () => {
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(navigate).toHaveBeenCalledWith('/profile/checkout', {
      state: {
        accountId: 'biz_1',
        whopPlanId: 'plan_q',
        renews: true,
        request: {
          email: 'account@test.com',
          planId: 'plan-90',
          toltReferralId: null,
          inviterId: 7,
        },
        selectedPeriod: 90,
        charge: { amount: '14.99', currency: 'EUR' },
      },
    });
    expect(trackCheckoutStarted).toHaveBeenCalledWith({ paymentProvider: 'whop', days: 90 });
  });

  it("marks a one-time plan as not renewing, so a wallet isn't saved for renewals", async () => {
    paymentsApi.createPublicWhopCheckout.mockResolvedValue({
      accountId: 'biz_1',
      planId: 'plan_once',
      renews: false,
    });
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(navigate).toHaveBeenCalledWith(
      '/profile/checkout',
      expect.objectContaining({ state: expect.objectContaining({ renews: false }) }),
    );
  });

  it('prefers an email the payer typed in over the account email', async () => {
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment('typed@test.com'));

    expect(paymentsApi.createPublicWhopCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'typed@test.com' }),
    );
  });

  it('shows why the checkout was refused, and stops pending', async () => {
    paymentsApi.createPublicWhopCheckout.mockRejectedValue(
      new ApiClientError({
        status: 409,
        message: 'Conflict',
        data: { code: ACTIVE_SUBSCRIPTION_CODE },
      }),
    );
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(result.current.whopError).toBe('getSubscription.active_subscription_error');
    expect(result.current.isWhopPaying).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing without a plan to buy', async () => {
    const { result } = renderHook(() => useWhopPayment(undefined));

    await act(() => result.current.handleWhopPayment());

    expect(paymentsApi.createPublicWhopCheckout).not.toHaveBeenCalled();
  });

  it('does nothing when there is no email to bill', async () => {
    auth.rmnUser = { id: 42, email: null };
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(paymentsApi.createPublicWhopCheckout).not.toHaveBeenCalled();
  });
});
