import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaddleClientService } from './paddle-client.service';

const nextCustomers = vi.fn();
const nextSubscriptions = vi.fn();
const customersList = vi.fn(() => ({ next: nextCustomers }));
const subscriptionsList = vi.fn(() => ({ next: nextSubscriptions }));

vi.mock('@paddle/paddle-node-sdk', () => ({
  Environment: { sandbox: 'sandbox', production: 'production' },
  Paddle: vi.fn().mockImplementation(function PaddleMock() {
    return {
      customers: { list: customersList },
      subscriptions: { list: subscriptionsList },
    };
  }),
}));

const ENV_KEYS = ['PADDLE_API_KEY', 'PADDLE_ENVIRONMENT'] as const;

describe('PaddleClientService', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    vi.clearAllMocks();
    process.env.PADDLE_API_KEY = 'test_key';
    process.env.PADDLE_ENVIRONMENT = 'sandbox';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  describe('construction', () => {
    it('refuses to start without a Paddle API key, rather than call Paddle with an empty one', async () => {
      delete process.env.PADDLE_API_KEY;

      expect(() => new PaddleClientService()).toThrow(/PADDLE_API_KEY/);
    });

    it('refuses to start with no environment configured, rather than default to a real Paddle account', async () => {
      delete process.env.PADDLE_ENVIRONMENT;

      expect(() => new PaddleClientService()).toThrow(/PADDLE_ENVIRONMENT/);
    });

    it('refuses an environment value that is neither sandbox nor production', async () => {
      process.env.PADDLE_ENVIRONMENT = 'staging';

      expect(() => new PaddleClientService()).toThrow(/PADDLE_ENVIRONMENT/);
    });
  });

  describe('hasActiveSubscription', () => {
    it('reports no subscription when Paddle has no customer for the email', async () => {
      nextCustomers.mockResolvedValue([]);
      const service = new PaddleClientService();

      await expect(service.hasActiveSubscription('nobody@test.com')).resolves.toBe(false);
      expect(subscriptionsList).not.toHaveBeenCalled();
    });

    it('reports no subscription when the known customer has none live', async () => {
      nextCustomers.mockResolvedValue([{ id: 'ctm_1' }]);
      nextSubscriptions.mockResolvedValue([]);
      const service = new PaddleClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).resolves.toBe(false);
      expect(subscriptionsList).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: ['ctm_1'], status: ['active', 'trialing'] }),
      );
    });

    it('reports a subscription when the customer has an active or trialing one', async () => {
      nextCustomers.mockResolvedValue([{ id: 'ctm_1' }]);
      nextSubscriptions.mockResolvedValue([{ id: 'sub_1', status: 'active' }]);
      const service = new PaddleClientService();

      await expect(service.hasActiveSubscription('payer@test.com')).resolves.toBe(true);
    });
  });
});
