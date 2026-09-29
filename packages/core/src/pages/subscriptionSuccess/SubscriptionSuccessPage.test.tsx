/**
 * SubscriptionSuccessPage — where every provider lands after checkout, and so
 * the one place a completed payment is reported to Google Ads.
 *
 * Stripe and Paddle only send the payer here on success. YooKassa sends them
 * here either way, so the conversion must wait for its status to come back.
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, useSubscriptionInfoStore, type ExtendedSubscription } from '../../stores';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';

const { paymentsApi, remnawaveApi, takePendingYookassaPayment, trackPurchaseConversion, navigate } =
  vi.hoisted(() => ({
    paymentsApi: { getPublicYookassaPaymentStatus: vi.fn() },
    remnawaveApi: { getMe: vi.fn(), getSubscriptionInfoByShortUuid: vi.fn() },
    takePendingYookassaPayment: vi.fn(),
    trackPurchaseConversion: vi.fn(),
    navigate: vi.fn(),
  }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../runtime', () => ({
  usePaymentsApi: () => paymentsApi,
  useAppRoutes: () => ({ profileSubscriptionPath: '/profile', paymentFailPath: '/payment/fail' }),
}));
vi.mock('../../api', () => ({ useRemnawaveApi: () => remnawaveApi }));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../utils', () => ({ takePendingYookassaPayment, trackPurchaseConversion }));
vi.mock('../../env', () => ({ coreEnv: {}, getTelegramStickerUrl: () => null }));
vi.mock('../../components', () => ({ Loading: () => <p>loading</p> }));
vi.mock('../../ui', () => ({
  TgsSticker: () => null,
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  Paragraph: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const OLD_EXPIRY = '2026-10-01T00:00:00.000Z';
const NEW_EXPIRY = '2026-11-01T00:00:00.000Z';

const profile = (expireAt: string) => ({ id: 1, shortUuid: 'short-1', expireAt });
const subscription = (expiresAt: string) =>
  ({ user: { shortUuid: 'short-1', expiresAt } }) as unknown as ExtendedSubscription;

describe('SubscriptionSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takePendingYookassaPayment.mockReturnValue(null);
    remnawaveApi.getMe.mockResolvedValue(null);
    useAuthStore.setState({ rmnUser: null });
    useSubscriptionInfoStore.getState().actions.resetState();
  });

  it('refetches the profile so the new expiry shows without a page reload', async () => {
    useSubscriptionInfoStore.getState().actions.setSubscriptionInfo({
      subscription: subscription(OLD_EXPIRY),
    });
    remnawaveApi.getMe.mockResolvedValue(profile(NEW_EXPIRY));
    remnawaveApi.getSubscriptionInfoByShortUuid
      .mockResolvedValueOnce(subscription(OLD_EXPIRY))
      .mockResolvedValue(subscription(NEW_EXPIRY));

    render(<SubscriptionSuccessPage />);

    await waitFor(
      () =>
        expect(useSubscriptionInfoStore.getState().subscription?.user.expiresAt).toBe(NEW_EXPIRY),
      { timeout: 3000 },
    );
    expect(useAuthStore.getState().rmnUser?.expireAt).toBe(NEW_EXPIRY);
  });

  it('keeps the cached profile when YooKassa says the payment was cancelled', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'canceled' });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
    expect(remnawaveApi.getMe).not.toHaveBeenCalled();
  });

  it('reports the purchase conversion when the payer lands here from Stripe or Paddle', () => {
    render(<SubscriptionSuccessPage />);

    expect(trackPurchaseConversion).toHaveBeenCalledTimes(1);
  });

  it('reports the purchase conversion once YooKassa confirms the payment succeeded', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'succeeded' });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(trackPurchaseConversion).toHaveBeenCalledTimes(1));
  });

  it.each(['canceled', 'pending'])(
    'does not report a conversion when YooKassa says the payment is %s',
    async (status) => {
      takePendingYookassaPayment.mockReturnValue('pay-1');
      paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status });

      render(<SubscriptionSuccessPage />);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
      expect(trackPurchaseConversion).not.toHaveBeenCalled();
    },
  );
});
