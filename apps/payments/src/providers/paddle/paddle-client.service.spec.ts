import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaddleClientService } from './paddle-client.service';

const nextCustomers = vi.fn();
const nextSubscriptions = vi.fn();
const customersList = vi.fn(() => ({ next: nextCustomers }));
const subscriptionsList = vi.fn(() => ({ next: nextSubscriptions }));
const portalSessionsCreate = vi.fn();
const pricingPreviewPreview = vi.fn();

vi.mock('@paddle/paddle-node-sdk', () => ({
  Environment: { sandbox: 'sandbox', production: 'production' },
  Paddle: vi.fn().mockImplementation(function PaddleMock() {
    return {
      customers: { list: customersList },
      subscriptions: { list: subscriptionsList },
      customerPortalSessions: { create: portalSessionsCreate },
      pricingPreview: { preview: pricingPreviewPreview },
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

  describe('findActiveSubscriptionId', () => {
    it('returns the id of the live subscription', async () => {
      nextSubscriptions.mockResolvedValue([{ id: 'sub_1', status: 'active' }]);
      const service = new PaddleClientService();

      await expect(service.findActiveSubscriptionId('ctm_1')).resolves.toBe('sub_1');
      expect(subscriptionsList).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: ['ctm_1'], status: ['active', 'trialing'] }),
      );
    });

    it('returns null when the customer has no live subscription', async () => {
      nextSubscriptions.mockResolvedValue([]);
      const service = new PaddleClientService();

      await expect(service.findActiveSubscriptionId('ctm_1')).resolves.toBeNull();
    });
  });

  describe('createPortalUrl', () => {
    it('mints a portal session and returns the overview URL', async () => {
      portalSessionsCreate.mockResolvedValue({
        urls: { general: { overview: 'https://portal.paddle.test/overview' } },
      });
      const service = new PaddleClientService();

      await expect(service.createPortalUrl('ctm_1', 'sub_1')).resolves.toBe(
        'https://portal.paddle.test/overview',
      );
      expect(portalSessionsCreate).toHaveBeenCalledWith('ctm_1', ['sub_1']);
    });
  });

  describe('getPricePreview', () => {
    const items = [{ priceId: 'pri_1', quantity: 1 }];

    it("previews against the visitor's IP so Paddle geolocates the currency", async () => {
      pricingPreviewPreview.mockResolvedValue({ currencyCode: 'USD' });
      const service = new PaddleClientService();

      const result = await service.getPricePreview(items, '203.0.113.5');

      expect(pricingPreviewPreview).toHaveBeenCalledWith({
        items,
        customerIpAddress: '203.0.113.5',
      });
      expect(result).toEqual({ currencyCode: 'USD' });
    });

    it('skips the IP lookup and prices in EUR outright when no client IP is known', async () => {
      pricingPreviewPreview.mockResolvedValue({ currencyCode: 'EUR' });
      const service = new PaddleClientService();

      await service.getPricePreview(items, null);

      expect(pricingPreviewPreview).toHaveBeenCalledOnce();
      expect(pricingPreviewPreview).toHaveBeenCalledWith({ items, currencyCode: 'EUR' });
    });

    it('falls back to a forced EUR preview when the IP-based lookup fails (e.g. an unsupported country)', async () => {
      pricingPreviewPreview
        .mockRejectedValueOnce(new Error('country_and_ip_address_mismatch'))
        .mockResolvedValueOnce({ currencyCode: 'EUR' });
      const service = new PaddleClientService();

      const result = await service.getPricePreview(items, '203.0.113.5');

      expect(pricingPreviewPreview).toHaveBeenCalledTimes(2);
      expect(pricingPreviewPreview).toHaveBeenNthCalledWith(2, { items, currencyCode: 'EUR' });
      expect(result).toEqual({ currencyCode: 'EUR' });
    });

    it('lets a failure in the EUR fallback itself propagate, rather than hide that Paddle is unreachable', async () => {
      pricingPreviewPreview
        .mockRejectedValueOnce(new Error('network down'))
        .mockRejectedValueOnce(new Error('network down'));
      const service = new PaddleClientService();

      await expect(service.getPricePreview(items, '203.0.113.5')).rejects.toThrow('network down');
    });

    /**
     * The SDK bounds nothing itself — no timeout option, no abort signal — so
     * a stalled connection would otherwise hang the pricing page until the
     * gateway gives up and serves a 502.
     */
    describe('when the connection stalls rather than failing', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('gives up instead of waiting on Paddle forever', async () => {
        pricingPreviewPreview.mockReturnValue(new Promise(() => {}));
        const service = new PaddleClientService();

        const preview = service.getPricePreview(items, '203.0.113.5');
        const assertion = expect(preview).rejects.toThrow(/timed out/);
        await vi.advanceTimersByTimeAsync(3_000);

        await assertion;
      });

      it('does not retry a stall in the fallback currency, which would only stall again', async () => {
        pricingPreviewPreview.mockReturnValue(new Promise(() => {}));
        const service = new PaddleClientService();

        const preview = service.getPricePreview(items, '203.0.113.5');
        const assertion = expect(preview).rejects.toThrow(/timed out/);
        await vi.advanceTimersByTimeAsync(3_000);
        await assertion;

        expect(pricingPreviewPreview).toHaveBeenCalledOnce();
      });

      it('bounds the no-IP path too, which goes straight to the fallback currency', async () => {
        pricingPreviewPreview.mockReturnValue(new Promise(() => {}));
        const service = new PaddleClientService();

        const preview = service.getPricePreview(items, null);
        const assertion = expect(preview).rejects.toThrow(/timed out/);
        await vi.advanceTimersByTimeAsync(3_000);

        await assertion;
      });

      it('still resolves normally when Paddle answers within the budget', async () => {
        pricingPreviewPreview.mockResolvedValue({ currencyCode: 'USD' });
        const service = new PaddleClientService();

        await expect(service.getPricePreview(items, '203.0.113.5')).resolves.toEqual({
          currencyCode: 'USD',
        });
      });
    });
  });
});
