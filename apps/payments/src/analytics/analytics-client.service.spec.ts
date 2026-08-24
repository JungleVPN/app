import type { AxiosInstance } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsClientService } from './analytics-client.service';

function buildClient(post = vi.fn().mockResolvedValue({ status: 204 })) {
  return { post } as unknown as AxiosInstance;
}

function buildService(client = buildClient()) {
  return { service: new AnalyticsClientService(client), client };
}

describe('AnalyticsClientService', () => {
  it('POSTs the event to /events', async () => {
    const post = vi.fn().mockResolvedValue({ status: 204 });
    const { service } = buildService(buildClient(post));

    await service.track({
      event: 'payment_succeeded',
      userId: 1000,
      provider: 'stripe',
      selectedPeriod: 30,
      isFirstPayment: true,
      isAutoPayment: false,
    });

    expect(post).toHaveBeenCalledWith('/events', {
      event: 'payment_succeeded',
      userId: 1000,
      provider: 'stripe',
      selectedPeriod: 30,
      isFirstPayment: true,
      isAutoPayment: false,
    });
  });

  it('does not throw when the POST rejects', async () => {
    const post = vi.fn().mockRejectedValue(new Error('network error'));
    const { service } = buildService(buildClient(post));

    await expect(
      service.track({ event: 'subscription_expired', userId: 1000 }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when the POST returns a non-2xx status', async () => {
    const post = vi.fn().mockResolvedValue({ status: 500 });
    const { service } = buildService(buildClient(post));

    await expect(
      service.track({ event: 'subscription_expired', userId: 1000 }),
    ).resolves.toBeUndefined();
  });
});
