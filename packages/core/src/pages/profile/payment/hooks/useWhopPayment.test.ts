/**
 * useWhopPayment — starting a Whop checkout from the profile payment page.
 * The backend creates the checkout configuration; the page only hands it to
 * the one checkout route that mounts Whop's embedded checkout.
 */
import { act, renderHook } from '@testing-library/react';
import { ACTIVE_SUBSCRIPTION_CODE } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../../api';
import { useWhopPayment } from './useWhopPayment';

const { paymentsApi, navigate, phCapture, auth } = vi.hoisted(() => ({
  paymentsApi: { createPublicWhopCheckout: vi.fn() },
  navigate: vi.fn(),
  phCapture: vi.fn(),
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
vi.mock('../../../../utils', () => ({ getReferralUserId: () => 7, phCapture }));

const plan = { planId: 'plan-90', days: 90 } as never;

describe('useWhopPayment', () => {
  beforeEach(() => {
    auth.rmnUser = { id: 42, email: 'account@test.com' };
    paymentsApi.createPublicWhopCheckout.mockResolvedValue({ checkoutConfigurationId: 'ch_1' });
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

  it('opens the profile checkout route with the checkout it created', async () => {
    const { result } = renderHook(() => useWhopPayment(plan));

    await act(() => result.current.handleWhopPayment());

    expect(navigate).toHaveBeenCalledWith('/profile/checkout', {
      state: { checkoutConfigurationId: 'ch_1', email: 'account@test.com', selectedPeriod: 90 },
    });
    expect(phCapture).toHaveBeenCalledWith('checkout_started', {
      payment_provider: 'whop',
      days: 90,
    });
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
