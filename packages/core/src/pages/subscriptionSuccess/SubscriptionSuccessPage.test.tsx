/**
 * SubscriptionSuccessPage — where every provider lands after checkout, and so
 * the one place a completed payment is reported to Google Ads.
 *
 * Stripe and Paddle only send the payer here on success. YooKassa sends them
 * here either way, so the conversion must wait for its status to come back.
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ExtendedSubscription,
  useAuthStore,
  useSavedMethodsStore,
  useSubscriptionInfoStore,
} from '../../stores';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';

const { paymentsApi, remnawaveApi, takePendingYookassaPayment, trackPurchaseConversion, navigate } =
  vi.hoisted(() => ({
    paymentsApi: {
      getPublicYookassaPaymentStatus: vi.fn(),
      getYookassaSavedMethods: vi.fn(),
      getStripeSubscription: vi.fn(),
      getPaddleSubscription: vi.fn(),
      getWhopSubscription: vi.fn(),
    },
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
const NO_BILLING = { active: false, methods: [] };

const signInOnWeb = () =>
  useAuthStore.setState({ loading: false, authUser: { id: 'auth-1' }, tgInitDataRaw: null });
const browseAsGuest = () =>
  useAuthStore.setState({ loading: false, authUser: null, tgInitDataRaw: null });
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const ACTIVE_BILLING = { active: true, methods: [] };

describe('SubscriptionSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takePendingYookassaPayment.mockReturnValue(null);
    remnawaveApi.getMe.mockResolvedValue(null);
    useAuthStore.setState({ rmnUser: null });
    signInOnWeb();
    useSubscriptionInfoStore.getState().actions.resetState();
    useSavedMethodsStore.getState().actions.resetState();
    paymentsApi.getYookassaSavedMethods.mockResolvedValue([]);
    paymentsApi.getStripeSubscription.mockResolvedValue(NO_BILLING);
    paymentsApi.getPaddleSubscription.mockResolvedValue(NO_BILLING);
    paymentsApi.getWhopSubscription.mockResolvedValue(NO_BILLING);
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

  it('refetches billing so the payment page shows the new subscription instead of plans', async () => {
    useSavedMethodsStore.getState().actions.setBillingState({
      yookassa: NO_BILLING,
      stripe: NO_BILLING,
      paddle: NO_BILLING,
      whop: NO_BILLING,
    });
    remnawaveApi.getMe.mockResolvedValue(profile(NEW_EXPIRY));
    remnawaveApi.getSubscriptionInfoByShortUuid.mockResolvedValue(subscription(NEW_EXPIRY));
    paymentsApi.getWhopSubscription.mockResolvedValue(ACTIVE_BILLING);

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(useSavedMethodsStore.getState().whop.active).toBe(true));
  });

  it('leaves a guest from the public checkout alone, as they have no profile to refetch', async () => {
    browseAsGuest();

    render(<SubscriptionSuccessPage />);
    await settle();

    expect(remnawaveApi.getMe).not.toHaveBeenCalled();
    expect(paymentsApi.getWhopSubscription).not.toHaveBeenCalled();
  });

  it('refetches the profile for a Telegram user', async () => {
    useAuthStore.setState({ loading: false, authUser: null, tgInitDataRaw: 'init-data' });
    remnawaveApi.getMe.mockResolvedValue(profile(NEW_EXPIRY));
    remnawaveApi.getSubscriptionInfoByShortUuid.mockResolvedValue(subscription(NEW_EXPIRY));

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(useAuthStore.getState().rmnUser?.expireAt).toBe(NEW_EXPIRY));
  });

  it('waits for the session to resolve before deciding whether to refetch', async () => {
    useAuthStore.setState({ loading: true, authUser: null, tgInitDataRaw: null });
    remnawaveApi.getMe.mockResolvedValue(profile(NEW_EXPIRY));
    remnawaveApi.getSubscriptionInfoByShortUuid.mockResolvedValue(subscription(NEW_EXPIRY));

    render(<SubscriptionSuccessPage />);
    useAuthStore.setState({ userScope: null });
    await settle();
    expect(remnawaveApi.getMe).not.toHaveBeenCalled();

    signInOnWeb();

    await waitFor(() => expect(useAuthStore.getState().rmnUser?.expireAt).toBe(NEW_EXPIRY));
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

  it.each([
    'canceled',
    'pending',
  ])('does not report a conversion when YooKassa says the payment is %s', async (status) => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });
});
