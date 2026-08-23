import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentsClient } from '../main/payments.client';

const mockAxiosGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: unknown[]) => mockAxiosGet(...args) },
}));

const USER_ID = 2000;

describe('PaymentsClient.hasEverPaid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the endpoint reports a settled subscription payment', async () => {
    mockAxiosGet.mockResolvedValue({ data: { result: true } });

    const client = new PaymentsClient();
    const result = await client.hasEverPaid(USER_ID);

    expect(result).toBe(true);
  });

  it('returns false when the endpoint reports no settled subscription payment', async () => {
    mockAxiosGet.mockResolvedValue({ data: { result: false } });

    const client = new PaymentsClient();
    const result = await client.hasEverPaid(USER_ID);

    expect(result).toBe(false);
  });

  it('sends the x-service-secret header', async () => {
    process.env.INTER_SERVICE_SECRET = 'test-secret';
    mockAxiosGet.mockResolvedValue({ data: { result: true } });

    const client = new PaymentsClient();
    await client.hasEverPaid(USER_ID);

    expect(mockAxiosGet).toHaveBeenCalledWith(
      expect.stringContaining('internal/has-ever-paid'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-service-secret': 'test-secret' }),
      }),
    );
  });

  it('returns false and does not throw when the request fails', async () => {
    mockAxiosGet.mockRejectedValue(new Error('network error'));

    const client = new PaymentsClient();
    const result = await client.hasEverPaid(USER_ID);

    expect(result).toBe(false);
  });
});
