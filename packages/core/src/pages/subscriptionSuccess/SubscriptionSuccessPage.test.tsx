/**
 * SubscriptionSuccessPage — where every provider lands after checkout, and so
 * the one place a completed payment is reported to Google Ads.
 *
 * Only a customer's first purchase is reported, with its id and amount, and
 * only one the checkout left behind — a direct visit or a reload is not a sale.
 * Whether it is a first is the backend's answer, alongside the payment status. YooKassa sends the payer
 * here whether they paid or cancelled, so its conversion also waits for the
 * payment status to come back. Whop's off-site steps, such as some 3D Secure
 * checks, also return here either way, with the outcome in the URL.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ExtendedSubscription,
  useAuthStore,
  useSavedMethodsStore,
  useSubscriptionInfoStore,
} from '../../stores';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';

const {
  paymentsApi,
  remnawaveApi,
  takePendingYookassaPayment,
  takePendingPurchase,
  trackPurchaseConversion,
  navigate,
  phCapture,
  takePendingCheckout,
} = vi.hoisted(() => ({
  paymentsApi: {
    getPublicYookassaPaymentStatus: vi.fn(),
    getPublicWhopPaymentStatus: vi.fn(),
    getYookassaSavedMethods: vi.fn(),
    getStripeSubscription: vi.fn(),
    getPaddleSubscription: vi.fn(),
    getWhopSubscription: vi.fn(),
  },
  remnawaveApi: { getMe: vi.fn(), getSubscriptionInfoByShortUuid: vi.fn() },
  takePendingYookassaPayment: vi.fn(),
  takePendingPurchase: vi.fn(),
  trackPurchaseConversion: vi.fn(),
  navigate: vi.fn(),
  phCapture: vi.fn(),
  takePendingCheckout: vi.fn(),
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
vi.mock('../../utils', async () => {
  const { checkoutEventProperties } = await import('../../utils/checkoutAnalytics');
  return {
    takePendingYookassaPayment,
    takePendingPurchase,
    trackPurchaseConversion,
    phCapture,
    takePendingCheckout,
    checkoutEventProperties,
  };
});
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
const PURCHASE = { transactionId: 'pay-1', value: 1490, currency: 'RUB' };

describe('SubscriptionSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    takePendingYookassaPayment.mockReturnValue(null);
    takePendingPurchase.mockReturnValue(null);
    takePendingCheckout.mockReturnValue(null);
    window.history.replaceState(null, '', '/payment/success');
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

  it('reports the purchase the checkout left behind, with its id and amount', async () => {
    takePendingPurchase.mockReturnValue(PURCHASE);

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(trackPurchaseConversion).toHaveBeenCalledWith(PURCHASE));
    expect(trackPurchaseConversion).toHaveBeenCalledTimes(1);
  });

  it('stays optimistic, reporting nothing, when the YooKassa status cannot be read', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    takePendingPurchase.mockReturnValue(PURCHASE);
    paymentsApi.getPublicYookassaPaymentStatus.mockRejectedValue(new Error('offline'));

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(screen.getByText('subscriptionSuccess.title')).toBeTruthy());
    expect(navigate).not.toHaveBeenCalled();
    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });

  it('reports no conversion for a visit no checkout led to, such as a reload', async () => {
    render(<SubscriptionSuccessPage />);
    await settle();

    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });

  it('reports the purchase once YooKassa confirms the first payment succeeded', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    takePendingPurchase.mockReturnValue(PURCHASE);
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({
      status: 'succeeded',
      firstPayment: true,
    });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(trackPurchaseConversion).toHaveBeenCalledWith(PURCHASE));
    expect(trackPurchaseConversion).toHaveBeenCalledTimes(1);
  });

  it('reports no conversion for a returning customer paying again through YooKassa', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    takePendingPurchase.mockReturnValue(PURCHASE);
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({
      status: 'succeeded',
      firstPayment: false,
    });

    render(<SubscriptionSuccessPage />);
    await waitFor(() => expect(screen.getByText('subscriptionSuccess.title')).toBeTruthy());

    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });

  it('reports no conversion when YooKassa succeeds for a checkout that left no purchase behind', async () => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({
      status: 'succeeded',
      firstPayment: true,
    });

    render(<SubscriptionSuccessPage />);
    await waitFor(() => expect(screen.getByText('subscriptionSuccess.title')).toBeTruthy());

    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });

  it.each([
    'canceled',
    'pending',
  ])('does not report a conversion when YooKassa says the payment is %s', async (status) => {
    takePendingYookassaPayment.mockReturnValue('pay-1');
    takePendingPurchase.mockReturnValue(PURCHASE);
    paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
    expect(trackPurchaseConversion).not.toHaveBeenCalled();
  });

  describe('returning from an off-site Whop step', () => {
    const WHOP_PURCHASE = { transactionId: 'pay_w1', value: 7.99, currency: 'USD' };
    const returnFromWhop = (payment: string, status: string) =>
      window.history.replaceState(
        null,
        '',
        `/payment/success?payment=${payment}&status=${status}&client_secret=sec_1`,
      );

    const whopStatus = (fulfilled: boolean, firstPayment: boolean) => ({
      paymentId: 'pay_w1',
      fulfilled,
      firstPayment,
    });

    it('reports the purchase once our webhook fulfils the first payment Whop says succeeded', async () => {
      returnFromWhop('pay_w1', 'succeeded');
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);
      paymentsApi.getPublicWhopPaymentStatus.mockResolvedValue(whopStatus(true, true));

      render(<SubscriptionSuccessPage />);

      await waitFor(() => expect(trackPurchaseConversion).toHaveBeenCalledWith(WHOP_PURCHASE));
      expect(trackPurchaseConversion).toHaveBeenCalledTimes(1);
      expect(paymentsApi.getPublicWhopPaymentStatus).toHaveBeenCalledWith('pay_w1');
    });

    it('waits for the webhook, which may land after the payer does', async () => {
      returnFromWhop('pay_w1', 'succeeded');
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);
      paymentsApi.getPublicWhopPaymentStatus
        .mockResolvedValueOnce(whopStatus(false, false))
        .mockResolvedValue(whopStatus(true, true));

      render(<SubscriptionSuccessPage />);

      await waitFor(() => expect(trackPurchaseConversion).toHaveBeenCalledWith(WHOP_PURCHASE), {
        timeout: 3000,
      });
    });

    it('reports no conversion for a returning customer paying again through Whop', async () => {
      returnFromWhop('pay_w1', 'succeeded');
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);
      paymentsApi.getPublicWhopPaymentStatus.mockResolvedValue(whopStatus(true, false));

      render(<SubscriptionSuccessPage />);
      await waitFor(() => expect(paymentsApi.getPublicWhopPaymentStatus).toHaveBeenCalled());
      await settle();

      expect(trackPurchaseConversion).not.toHaveBeenCalled();
    });

    it('ignores a URL missing the payment id Whop always sends', async () => {
      window.history.replaceState(null, '', '/payment/success?status=failed');
      takePendingPurchase.mockReturnValue(PURCHASE);

      render(<SubscriptionSuccessPage />);
      await settle();

      expect(navigate).not.toHaveBeenCalled();
      expect(trackPurchaseConversion).toHaveBeenCalledWith(PURCHASE);
    });

    it('reports nothing when the purchase left behind was for another payment', async () => {
      returnFromWhop('pay_other', 'succeeded');
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);

      render(<SubscriptionSuccessPage />);
      await settle();

      expect(trackPurchaseConversion).not.toHaveBeenCalled();
    });

    it('shows success but reports nothing while Whop is still processing the charge', async () => {
      returnFromWhop('pay_w1', 'processing');
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);

      render(<SubscriptionSuccessPage />);
      await settle();

      expect(trackPurchaseConversion).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
      expect(screen.getByText('subscriptionSuccess.title')).toBeTruthy();
    });

    it.each([
      'failed',
      'canceled',
    ])('sends the payer to the failure page, reporting nothing, when Whop says %s', async (status) => {
      returnFromWhop('pay_w1', status);
      takePendingPurchase.mockReturnValue(WHOP_PURCHASE);

      render(<SubscriptionSuccessPage />);

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }),
      );
      expect(trackPurchaseConversion).not.toHaveBeenCalled();
      expect(remnawaveApi.getMe).not.toHaveBeenCalled();
    });
  });

  describe('reporting the purchase to PostHog', () => {
    const WHOP_CHECKOUT = { paymentProvider: 'whop', days: 90 };
    const YOOKASSA_CHECKOUT = { paymentProvider: 'yookassa', days: 30 };

    it('reports a completed first purchase for the checkout this tab started', async () => {
      takePendingCheckout.mockReturnValue(WHOP_CHECKOUT);
      takePendingPurchase.mockReturnValue(PURCHASE);

      render(<SubscriptionSuccessPage />);

      await waitFor(() =>
        expect(phCapture).toHaveBeenCalledWith('purchase_completed', {
          payment_provider: 'whop',
          days: 90,
          first_payment: true,
        }),
      );
      expect(phCapture).toHaveBeenCalledTimes(1);
    });

    it('reports a returning customer paying again as not their first payment', async () => {
      takePendingCheckout.mockReturnValue(YOOKASSA_CHECKOUT);
      takePendingYookassaPayment.mockReturnValue('pay-1');
      takePendingPurchase.mockReturnValue(PURCHASE);
      paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({
        status: 'succeeded',
        firstPayment: false,
      });

      render(<SubscriptionSuccessPage />);

      await waitFor(() =>
        expect(phCapture).toHaveBeenCalledWith('purchase_completed', {
          payment_provider: 'yookassa',
          days: 30,
          first_payment: false,
        }),
      );
    });

    it('reports nothing for a visit no checkout led to, such as a reload', async () => {
      render(<SubscriptionSuccessPage />);
      await settle();

      expect(phCapture).not.toHaveBeenCalled();
    });

    it('leaves an unpaid checkout for the failure page to report', async () => {
      takePendingCheckout.mockReturnValue(YOOKASSA_CHECKOUT);
      takePendingYookassaPayment.mockReturnValue('pay-1');
      paymentsApi.getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'canceled' });

      render(<SubscriptionSuccessPage />);

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }),
      );
      expect(takePendingCheckout).not.toHaveBeenCalled();
      expect(phCapture).not.toHaveBeenCalled();
    });
  });
});
