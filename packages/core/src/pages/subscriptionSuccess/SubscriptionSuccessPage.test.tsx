/**
 * SubscriptionSuccessPage — where every provider lands after checkout, and so
 * the one place a completed payment is reported to Google Ads.
 *
 * Stripe and Paddle only send the payer here on success. YooKassa sends them
 * here either way, so the conversion must wait for its status to come back.
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';

const { paymentsApi, takePendingYookassaPayment, trackPurchaseConversion, navigate } = vi.hoisted(
  () => ({
    paymentsApi: { getPublicYookassaPaymentStatus: vi.fn() },
    takePendingYookassaPayment: vi.fn(),
    trackPurchaseConversion: vi.fn(),
    navigate: vi.fn(),
  }),
);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../runtime', () => ({
  usePaymentsApi: () => paymentsApi,
  useAppRoutes: () => ({ profileSubscriptionPath: '/profile', paymentFailPath: '/payment/fail' }),
}));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../utils', () => ({ takePendingYookassaPayment, trackPurchaseConversion }));
vi.mock('../../env', () => ({ coreEnv: {}, getTelegramStickerUrl: () => null }));
vi.mock('../../components', () => ({ Loading: () => <p>loading</p> }));
vi.mock('../../ui', () => ({ TgsSticker: () => null }));

describe('SubscriptionSuccessPage', () => {
  beforeEach(() => {
    takePendingYookassaPayment.mockReturnValue(null);
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
