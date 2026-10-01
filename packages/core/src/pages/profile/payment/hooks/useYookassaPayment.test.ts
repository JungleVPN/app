/**
 * useYookassaPayment — paying for a plan with YooKassa from the profile.
 * The payer leaves the app for YooKassa, which sends them back to one URL
 * whether they paid or cancelled; on the web that is `/payment/success`, which
 * checks the outcome and reports the purchase to Google Ads.
 */
import { act, renderHook } from '@testing-library/react';
import type { SubscriptionPlanDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useYookassaPayment } from './useYookassaPayment';

const {
  createSession,
  openLink,
  rememberPendingYookassaPayment,
  rememberPendingPurchase,
  trackCheckoutStarted,
  platform,
} = vi.hoisted(() => ({
  createSession: vi.fn(),
  openLink: vi.fn(),
  rememberPendingYookassaPayment: vi.fn(),
  rememberPendingPurchase: vi.fn(),
  trackCheckoutStarted: vi.fn(),
  platform: { platformType: 'web', clientPlatform: 'web' },
}));

vi.mock('@tma.js/sdk-react', () => ({ openLink }));
vi.mock('../../../../api', () => ({ useRemnawaveApi: () => ({ linkEmail: vi.fn() }) }));
vi.mock('../../../../env', () => ({ coreEnv: { tmaAppUrl: 'https://t.me/jungle_bot/app' } }));
vi.mock('../../../../hooks', () => ({
  useCreatePaymentSession: () => ({ isLoading: false, execute: createSession }),
  useDeleteSavedMethod: () => ({ isLoading: false, execute: vi.fn() }),
  useNavigation: () => vi.fn(),
}));
vi.mock('../../../../runtime', () => ({
  usePaymentsApi: () => ({}),
  useAppRoutes: () => ({
    profileSubscriptionPath: '/profile/subscription',
    profilePlansPath: '/profile/plans',
    paymentReturnPath: '/payment/success',
  }),
}));
vi.mock('../../../../stores', () => ({
  useAuthStoreInfo: () => ({
    rmnUser: { id: 42, email: 'account@test.com', status: 'ACTIVE' },
    tgUser: null,
  }),
  useAuthStoreActions: () => ({ setRmnUser: vi.fn() }),
  usePlatformStore: () => platform,
  useSavedMethodsStoreActions: () => ({ setYookassaMethods: vi.fn() }),
}));
vi.mock('../../../../utils', () => ({
  phCapture: vi.fn(),
  rememberPendingYookassaPayment,
  rememberPendingPurchase,
  trackCheckoutStarted,
}));

const plan = {
  planId: 'ru-90',
  days: 90,
  planPricing: {
    total: '1490',
    monthly: '497',
    fullTotal: null,
    discountPercent: 0,
    currencyCode: 'RUB',
  },
  countryCode: null,
  isTrial: false,
} satisfies SubscriptionPlanDto;

const returnUrl = () => createSession.mock.calls[0]?.[0].confirmation.return_url;

describe('useYookassaPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.platformType = 'web';
    platform.clientPlatform = 'web';
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://ru.jungle.test', href: '' },
    });
    createSession.mockResolvedValue({ id: 'pay-1', url: 'https://yookassa/pay-1' });
  });

  it('returns a web payer to the success page, which checks whether they paid', async () => {
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment());

    expect(returnUrl()).toBe('https://ru.jungle.test/payment/success');
    expect(rememberPendingYookassaPayment).toHaveBeenCalledWith('pay-1');
    expect(window.location.href).toBe('https://yookassa/pay-1');
  });

  it('returns a native app payer to the app', async () => {
    platform.platformType = 'tma';
    platform.clientPlatform = 'ios';
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment());

    expect(returnUrl()).toBe('https://t.me/jungle_bot/app');
    expect(openLink).toHaveBeenCalledWith('https://yookassa/pay-1');
  });

  it('leaves the purchase behind for Google Ads, with the payment id and the plan total', async () => {
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment());

    expect(rememberPendingPurchase).toHaveBeenCalledWith({
      transactionId: 'pay-1',
      value: 1490,
      currency: 'RUB',
    });
  });

  it('leaves the purchase behind without an amount when a promo code changes the total', async () => {
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment(undefined, 'SPRING20'));

    expect(rememberPendingPurchase).toHaveBeenCalledWith({ transactionId: 'pay-1' });
  });

  it('leaves nothing behind when YooKassa returns no payment page to go to', async () => {
    createSession.mockResolvedValue({ id: 'pay-1', url: '' });
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment());

    expect(rememberPendingPurchase).not.toHaveBeenCalled();
    expect(window.location.href).toBe('');
  });

  it('reports the checkout starting, with the plan being bought', async () => {
    const { result } = renderHook(() => useYookassaPayment(plan));

    await act(() => result.current.handleYookassaPayment());

    expect(trackCheckoutStarted).toHaveBeenCalledWith({ paymentProvider: 'yookassa', days: 90 });
  });
});
