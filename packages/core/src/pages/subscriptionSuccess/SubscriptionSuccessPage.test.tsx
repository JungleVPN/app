/**
 * SubscriptionSuccessPage — whether the payer actually paid.
 *
 * YooKassa returns every payer to this page, paid or not. "Exit the payment
 * process" leaves the payment 'pending' rather than cancelling it, so a page
 * that only reacts to 'canceled' congratulates people who paid nothing.
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionSuccessPage from './SubscriptionSuccessPage';

const { getPublicYookassaPaymentStatus, navigate, takePendingYookassaPayment } = vi.hoisted(() => ({
  getPublicYookassaPaymentStatus: vi.fn(),
  navigate: vi.fn(),
  takePendingYookassaPayment: vi.fn(),
}));

vi.mock('../../runtime', () => ({
  usePaymentsApi: () => ({ getPublicYookassaPaymentStatus }),
  useAppRoutes: () => ({
    profileSubscriptionPath: '/profile/subscription',
    paymentFailPath: '/payment/fail',
  }),
}));
vi.mock('../../hooks', () => ({ useNavigation: () => navigate }));
vi.mock('../../utils', () => ({ takePendingYookassaPayment }));
vi.mock('../../env', () => ({ coreEnv: {}, getTelegramStickerUrl: () => null }));
vi.mock('../../ui', () => ({ TgsSticker: () => null }));

describe('SubscriptionSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    takePendingYookassaPayment.mockReturnValue('pay-1');
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('keeps the success state for a settled payment', async () => {
    getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'succeeded' });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(getPublicYookassaPaymentStatus).toHaveBeenCalledWith('pay-1'));
    await vi.advanceTimersByTimeAsync(10_000);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the success state while the bank has yet to capture', async () => {
    getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'waiting_for_capture' });

    render(<SubscriptionSuccessPage />);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('sends a cancelled payer to the failure page without waiting', async () => {
    getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'canceled' });

    render(<SubscriptionSuccessPage />);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
    expect(getPublicYookassaPaymentStatus).toHaveBeenCalledTimes(1);
  });

  // Leaving the checkout is what produces this: the payment never cancels, it
  // just never settles either.
  it('sends a payer whose payment never settles to the failure page', async () => {
    getPublicYookassaPaymentStatus.mockResolvedValue({ status: 'pending' });

    render(<SubscriptionSuccessPage />);
    await vi.advanceTimersByTimeAsync(10_000);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/payment/fail', { replace: true }));
    expect(getPublicYookassaPaymentStatus.mock.calls.length).toBeGreaterThan(1);
  });

  // 3-D Secure can land the payer here a moment before the bank confirms.
  it('waits out a payment that settles just after the payer returns', async () => {
    getPublicYookassaPaymentStatus
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValue({ status: 'succeeded' });

    render(<SubscriptionSuccessPage />);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the optimistic success in place when the status cannot be read', async () => {
    getPublicYookassaPaymentStatus.mockRejectedValue(new Error('offline'));

    render(<SubscriptionSuccessPage />);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(navigate).not.toHaveBeenCalled();
  });

  it('checks nothing when no checkout was started in this tab', async () => {
    takePendingYookassaPayment.mockReturnValue(null);

    render(<SubscriptionSuccessPage />);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(getPublicYookassaPaymentStatus).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
