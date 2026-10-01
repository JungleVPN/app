/**
 * useTelegramStarsPayment — paying for a plan with Telegram Stars inside the
 * mini app. The backend creates the invoice; Telegram's own sheet takes the
 * payment.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTelegramStarsPayment } from './useTelegramStarsPayment';

const { createInvoice, openInvoice, trackCheckoutStarted } = vi.hoisted(() => ({
  createInvoice: vi.fn(),
  openInvoice: vi.fn(),
  trackCheckoutStarted: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@heroui/react', () => ({ useOverlayState: () => ({ open: vi.fn() }) }));
vi.mock('@tma.js/sdk-react', () => ({ invoice: { openUrl: openInvoice } }));
vi.mock('../../../../api', () => ({ useRemnawaveApi: () => ({}) }));
vi.mock('../../../../env', () => ({ coreEnv: { extraDevicePriceStars: 50 } }));
vi.mock('../../../../hooks', () => ({
  useCreateTelegramStarsInvoice: () => ({ isLoading: false, execute: createInvoice }),
}));
vi.mock('../../../../runtime', () => ({ usePaymentsApi: () => ({}) }));
vi.mock('../../../../stores', () => ({
  useAuthStoreInfo: () => ({
    rmnUser: { id: 42, telegramId: 777, shortUuid: 'short-1', status: 'ACTIVE' },
  }),
  usePlatformStore: () => ({ platformType: 'tma' }),
  useSubscriptionInfoStore: () => ({ setSubscriptionInfo: vi.fn() }),
}));
vi.mock('../../../../utils', () => ({ trackCheckoutStarted }));

describe('useTelegramStarsPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInvoice.mockResolvedValue({ invoiceLink: 'https://t.me/$invoice' });
    openInvoice.mockResolvedValue('cancelled');
  });

  it('reports the checkout starting once the invoice is created, with the plan being bought', async () => {
    const { result } = renderHook(() => useTelegramStarsPayment(90));

    await act(() => result.current.handleStarsPayment());

    expect(trackCheckoutStarted).toHaveBeenCalledWith({ paymentProvider: 'stars', days: 90 });
    expect(openInvoice).toHaveBeenCalledWith('https://t.me/$invoice');
  });

  it('reports no checkout starting when no invoice could be created', async () => {
    createInvoice.mockResolvedValue(null);
    const { result } = renderHook(() => useTelegramStarsPayment(90));

    await act(() => result.current.handleStarsPayment());

    expect(trackCheckoutStarted).not.toHaveBeenCalled();
  });
});
