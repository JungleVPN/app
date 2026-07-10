import 'reflect-metadata';
import type { AdminPaymentDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsClient } from '../main/payments.client';

const mockAxiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

const USER_ID = 'uuid-inviter-1';

const makePayment = (overrides: Partial<AdminPaymentDto> = {}): AdminPaymentDto =>
  ({
    paymentId: 'pay-1',
    provider: 'yookassa',
    userId: USER_ID,
    telegramId: null,
    status: 'succeeded',
    purpose: 'subscription',
    selectedPeriod: 1,
    createdAt: new Date(),
    paidAt: new Date(),
    ...overrides,
  }) as AdminPaymentDto;

describe('PaymentsClient.hasPaidWithinDays', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when a settled subscription payment falls within the window', async () => {
    mockAxiosGet.mockResolvedValue({ data: [makePayment()] });

    const client = new PaymentsClient();
    const result = await client.hasPaidWithinDays(USER_ID, 30);

    expect(result).toBe(true);
  });

  it('ignores extra-device payments — an add-on purchase is not a paid subscription', async () => {
    mockAxiosGet.mockResolvedValue({
      data: [makePayment({ purpose: 'extra_device' })],
    });

    const client = new PaymentsClient();
    const result = await client.hasPaidWithinDays(USER_ID, 30);

    expect(result).toBe(false);
  });

  it('ignores subscription payments outside the window', async () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    mockAxiosGet.mockResolvedValue({ data: [makePayment({ paidAt: old })] });

    const client = new PaymentsClient();
    const result = await client.hasPaidWithinDays(USER_ID, 30);

    expect(result).toBe(false);
  });

  it('returns false and does not throw when the request fails', async () => {
    mockAxiosGet.mockRejectedValue(new Error('network error'));

    const client = new PaymentsClient();
    const result = await client.hasPaidWithinDays(USER_ID, 30);

    expect(result).toBe(false);
  });
});
