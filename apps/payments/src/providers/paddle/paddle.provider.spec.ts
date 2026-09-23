import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaddleProvider } from './paddle.provider';

const ENV_KEYS = ['PADDLE_PRICE_ID_DAYS_30', 'PADDLE_PRICE_ID_DAYS_180'] as const;

describe('PaddleProvider', () => {
  let originalEnv: Record<string, string | undefined>;
  let paddleClientService: {
    hasActiveSubscription: ReturnType<typeof vi.fn>;
    findActiveSubscriptionId: ReturnType<typeof vi.fn>;
    createPortalUrl: ReturnType<typeof vi.fn>;
  };
  let paddleWebhookService: { handleWebhook: ReturnType<typeof vi.fn> };
  let repository: { findOne: ReturnType<typeof vi.fn> };
  let savedMethodRepo: { find: ReturnType<typeof vi.fn> };
  let provider: PaddleProvider;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    paddleClientService = {
      hasActiveSubscription: vi.fn().mockResolvedValue(false),
      findActiveSubscriptionId: vi.fn().mockResolvedValue(null),
      createPortalUrl: vi.fn().mockResolvedValue('https://portal.paddle.test/session'),
    };
    paddleWebhookService = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
    repository = { findOne: vi.fn().mockResolvedValue(null) };
    savedMethodRepo = { find: vi.fn().mockResolvedValue([]) };
    provider = new PaddleProvider(
      paddleClientService as never,
      paddleWebhookService as never,
      repository as never,
      savedMethodRepo as never,
    );
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  describe('getPriceId', () => {
    it('resolves the configured catalog price id for the period', () => {
      process.env.PADDLE_PRICE_ID_DAYS_3 = 'pri_month_3';

      expect(provider.getPriceId(3)).toBe('pri_month_3');
    });

    it('refuses a period with no configured price, rather than falling back to another plan', () => {
      delete process.env.PADDLE_PRICE_ID_DAYS_3;

      expect(() => provider.getPriceId(3)).toThrow(BadRequestException);
    });
  });

  describe('buildCheckoutPayload', () => {
    beforeEach(() => {
      process.env.PADDLE_PRICE_ID_DAYS_1 = 'pri_month_1';
    });

    it('returns the price id to bill', () => {
      const payload = provider.buildCheckoutPayload({ email: 'payer@test.com', selectedPeriod: 1 });

      expect(payload.priceId).toBe('pri_month_1');
    });

    it('carries the payer email as custom data, so a webhook can identify them', () => {
      const payload = provider.buildCheckoutPayload({ email: 'payer@test.com', selectedPeriod: 1 });

      expect(payload.customData).toMatchObject({ email: 'payer@test.com' });
    });

    it('carries the affiliate referral when present', () => {
      const payload = provider.buildCheckoutPayload({
        email: 'payer@test.com',
        selectedPeriod: 1,
        toltReferralId: 'tolt_9',
      });

      expect(payload.customData).toMatchObject({ toltReferralId: 'tolt_9' });
    });

    it('omits the referral field entirely rather than sending it empty', () => {
      const payload = provider.buildCheckoutPayload({ email: 'payer@test.com', selectedPeriod: 1 });

      expect(payload.customData).not.toHaveProperty('toltReferralId');
    });

    it('carries the inviter id, stringified for custom data', () => {
      const payload = provider.buildCheckoutPayload({
        email: 'payer@test.com',
        selectedPeriod: 1,
        inviterId: 1337,
      });

      expect(payload.customData).toMatchObject({ inviterId: '1337' });
    });

    it('carries the signup origin when the request supplied one', () => {
      const payload = provider.buildCheckoutPayload({
        email: 'payer@test.com',
        selectedPeriod: 1,
        origin: 'https://jungle-vpn.com',
      });

      expect(payload.customData).toMatchObject({ signupOrigin: 'https://jungle-vpn.com' });
    });
  });

  describe('hasActiveSubscription', () => {
    it('delegates to the Paddle client', async () => {
      paddleClientService.hasActiveSubscription.mockResolvedValue(true);

      await expect(provider.hasActiveSubscription('payer@test.com')).resolves.toBe(true);
      expect(paddleClientService.hasActiveSubscription).toHaveBeenCalledWith('payer@test.com');
    });
  });

  describe('handleWebhook', () => {
    it('delegates to the webhook service', async () => {
      const event = { eventType: 'transaction.completed' };

      await provider.handleWebhook(event as never);

      expect(paddleWebhookService.handleWebhook).toHaveBeenCalledWith(event);
    });
  });

  describe('getCustomerId', () => {
    it('returns the customer id off the most recent payment row', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });

      await expect(provider.getCustomerId(1000)).resolves.toBe('ctm_1');
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 1000 },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns null for a user who has never paid via Paddle', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(provider.getCustomerId(1000)).resolves.toBeNull();
    });
  });

  /**
   * Status comes from the `saved_payment_methods` rows the Paddle webhooks
   * maintain, not from Paddle's API — mirrors Stripe.
   */
  describe('getSubscriptionStatus', () => {
    const paddleRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'row-1',
      userId: 1000,
      provider: 'paddle',
      paymentMethodId: 'sub_1',
      paymentMethodType: 'paddle',
      title: null,
      card: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    });

    it('reports an active subscription from the row the webhook wrote', async () => {
      savedMethodRepo.find.mockResolvedValue([paddleRow()]);

      const status = await provider.getSubscriptionStatus(1000);

      expect(status.active).toBe(true);
      expect(status.methods[0]?.paymentMethodId).toBe('sub_1');
    });

    it('reports no subscription for a user with no saved Paddle row', async () => {
      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: false,
        methods: [],
      });
    });

    // The reason for reading our own rows: this runs on every profile load.
    it('never calls the Paddle API to answer the question', async () => {
      savedMethodRepo.find.mockResolvedValue([paddleRow()]);

      await provider.getSubscriptionStatus(1000);

      expect(paddleClientService.findActiveSubscriptionId).not.toHaveBeenCalled();
      expect(paddleClientService.createPortalUrl).not.toHaveBeenCalled();
    });

    // YooKassa cards and Paddle subscriptions share one table, so an unscoped
    // read would report a YooKassa payer as a Paddle subscriber.
    it("asks only for this user's rows, scoped to Paddle and still active", async () => {
      await provider.getSubscriptionStatus(1000);

      expect(savedMethodRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1000, provider: 'paddle', isActive: true } }),
      );
    });

    // Dates cross the wire as strings; the DTO says so, the entity does not.
    it('serialises timestamps the way the client receives them', async () => {
      savedMethodRepo.find.mockResolvedValue([paddleRow()]);

      const status = await provider.getSubscriptionStatus(1000);

      expect(status.methods[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  /**
   * The portal is the one thing only Paddle can mint, so it stays a live call —
   * made when the user presses "manage", not on every page load.
   */
  describe('getPortalUrl', () => {
    it('reports no URL for a user with no recorded Paddle customer', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(provider.getPortalUrl(1000)).resolves.toEqual({ portalUrl: null });
      expect(paddleClientService.findActiveSubscriptionId).not.toHaveBeenCalled();
    });

    it('reports no URL when the customer has no live subscription', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue(null);

      await expect(provider.getPortalUrl(1000)).resolves.toEqual({ portalUrl: null });
      expect(paddleClientService.createPortalUrl).not.toHaveBeenCalled();
    });

    it('returns a fresh portal URL for an active subscription', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue('sub_1');

      await expect(provider.getPortalUrl(1000)).resolves.toEqual({
        portalUrl: 'https://portal.paddle.test/session',
      });
      expect(paddleClientService.createPortalUrl).toHaveBeenCalledWith('ctm_1', 'sub_1');
    });

    // A Paddle outage must not read as "your subscription is gone" — the
    // subscription is reported by the DB, independently of this call.
    it('reports no URL rather than failing when minting the portal session fails', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue('sub_1');
      paddleClientService.createPortalUrl.mockRejectedValue(new Error('paddle down'));

      await expect(provider.getPortalUrl(1000)).resolves.toEqual({ portalUrl: null });
    });
  });
});
