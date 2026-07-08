import 'reflect-metadata';
import * as process from 'node:process';
import { PaymentStatusService } from '@payments/payment-status/payment-status.service';
import type { PromoService } from '@payments/promo/promo.service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAxiosPatch = vi.fn();
const mockAxiosPost = vi.fn();
vi.mock('axios', () => ({
  default: {
    patch: (...args: any[]) => mockAxiosPatch(...args),
    post: (...args: any[]) => mockAxiosPost(...args),
  },
}));

describe('PaymentStatusService — referral reward uses userId, not telegramId', () => {
  let service: PaymentStatusService;
  const USER_ID = 'uuid-user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTER_SERVICE_SECRET = 'secret';
    mockAxiosPatch.mockResolvedValue({ data: { telegramId: 12345 } });
    mockAxiosPost.mockResolvedValue({ data: { rewarded: true } });

    service = new PaymentStatusService({} as PromoService);
  });

  it('triggers the referral reward with the remnawave userId in the request body', async () => {
    await service.handleUserUpdates({ selectedPeriod: 1, userId: USER_ID });

    expect(mockAxiosPost).toHaveBeenCalledWith(
      expect.stringContaining('/reward-after-payment'),
      { invitedId: USER_ID },
      expect.anything(),
    );
  });

  it('triggers the reward even when remnawave reports no telegramId for the user', async () => {
    mockAxiosPatch.mockResolvedValue({ data: { telegramId: null } });

    const result = await service.handleUserUpdates({ selectedPeriod: 1, userId: USER_ID });

    expect(result.success).toBe(true);
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('does not trigger the reward when the user is not found', async () => {
    mockAxiosPatch.mockResolvedValue({ data: null });

    const result = await service.handleUserUpdates({ selectedPeriod: 1, userId: USER_ID });

    expect(result.success).toBe(false);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });
});
