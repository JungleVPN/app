/**
 * useWhopWalletSheet — the wallet sheet for a checkout and the wallets this
 * browser can pay with. Only Apple Pay and Google Pay are offered, so only
 * they are probed: probing every wallet would also load PayPal's scripts.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { WhopCheckoutState } from '../whopCheckoutState';
import { useWhopWalletSheet } from './useWhopWalletSheet';

const { whop } = vi.hoisted(() => ({
  whop: {
    current: null as {
      payments: { paymentRequest: { create: ReturnType<typeof vi.fn> } };
    } | null,
  },
}));

vi.mock('@whop/elements-react', () => ({ useWhop: () => whop.current }));

const checkoutState = (overrides: Partial<WhopCheckoutState> = {}): WhopCheckoutState => ({
  accountId: 'biz_1',
  whopPlanId: 'plan_1',
  request: { email: 'payer@test.com', planId: 'whop-30' },
  selectedPeriod: 30,
  charge: { amount: '9.99', currency: 'USD' },
  ...overrides,
});

const withWhop = (availability: object | Promise<never> = { applePay: true, googlePay: false }) => {
  const request = {
    canMakePayment: vi
      .fn()
      .mockImplementation(() =>
        availability instanceof Promise ? availability : Promise.resolve(availability),
      ),
  };
  const create = vi.fn().mockReturnValue(request);
  whop.current = { payments: { paymentRequest: { create } } };
  return { create, request };
};

describe('useWhopWalletSheet', () => {
  it('probes only the wallets the checkout offers', async () => {
    const { request } = withWhop();

    const { result } = renderHook(() => useWhopWalletSheet({ checkout: checkoutState() }));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(request.canMakePayment).toHaveBeenCalledWith({ types: ['apple_pay', 'google_pay'] });
  });

  it('offers the wallets this browser can pay with, on the probed sheet', async () => {
    const { request } = withWhop({ applePay: true, googlePay: true, order: ['apple_pay'] });

    const { result } = renderHook(() => useWhopWalletSheet({ checkout: checkoutState() }));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.wallets).toEqual(['apple_pay']);
    expect(result.current.sheet).toBe(request);
  });

  it('asks for the total in minor units, saved for renewals when the plan renews', async () => {
    const { create } = withWhop();

    renderHook(() =>
      useWhopWalletSheet({
        checkout: checkoutState({ renews: true, charge: { amount: '1500', currency: 'JPY' } }),
      }),
    );

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        accountId: 'biz_1',
        amount: 1500,
        currency: 'JPY',
        requestPayerEmail: false,
        setupFutureUsage: 'off_session',
      }),
    );
  });

  it('probes nothing until enabled', () => {
    const { create } = withWhop();

    const { result } = renderHook(() =>
      useWhopWalletSheet({ checkout: checkoutState(), enabled: false }),
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.current.isReady).toBe(false);
  });

  it('offers no wallet when the total is unknown', async () => {
    const { create } = withWhop();

    const { result } = renderHook(() =>
      useWhopWalletSheet({ checkout: checkoutState({ charge: undefined }) }),
    );

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(create).not.toHaveBeenCalled();
    expect(result.current.wallets).toEqual([]);
  });

  it('is ready with no wallet when the probe fails', async () => {
    withWhop(Promise.reject(new Error('blocked')));

    const { result } = renderHook(() => useWhopWalletSheet({ checkout: checkoutState() }));

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.wallets).toEqual([]);
    expect(result.current.sheet).toBeNull();
  });
});
