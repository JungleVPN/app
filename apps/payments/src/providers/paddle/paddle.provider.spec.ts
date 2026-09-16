import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaddleProvider } from './paddle.provider';

const ENV_KEYS = ['PADDLE_PRICE_ID_MONTH_1', 'PADDLE_PRICE_ID_MONTH_3'] as const;

describe('PaddleProvider', () => {
  let originalEnv: Record<string, string | undefined>;
  let paddleClientService: {
    hasActiveSubscription: ReturnType<typeof vi.fn>;
    findActiveSubscriptionId: ReturnType<typeof vi.fn>;
    createPortalUrl: ReturnType<typeof vi.fn>;
  };
  let paddleWebhookService: { handleWebhook: ReturnType<typeof vi.fn> };
  let repository: { findOne: ReturnType<typeof vi.fn> };
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
    provider = new PaddleProvider(
      paddleClientService as never,
      paddleWebhookService as never,
      repository as never,
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
      process.env.PADDLE_PRICE_ID_MONTH_3 = 'pri_month_3';

      expect(provider.getPriceId(3)).toBe('pri_month_3');
    });

    it('refuses a period with no configured price, rather than falling back to another plan', () => {
      delete process.env.PADDLE_PRICE_ID_MONTH_3;

      expect(() => provider.getPriceId(3)).toThrow(BadRequestException);
    });
  });

  describe('buildCheckoutPayload', () => {
    beforeEach(() => {
      process.env.PADDLE_PRICE_ID_MONTH_1 = 'pri_month_1';
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

  describe('getSubscriptionStatus', () => {
    it('reports inactive for a user with no recorded Paddle customer', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: false,
        portalUrl: null,
      });
      expect(paddleClientService.findActiveSubscriptionId).not.toHaveBeenCalled();
    });

    it('reports inactive when the customer has no live subscription', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue(null);

      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: false,
        portalUrl: null,
      });
      expect(paddleClientService.createPortalUrl).not.toHaveBeenCalled();
    });

    it('returns a fresh portal URL for an active subscription', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue('sub_1');

      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: true,
        portalUrl: 'https://portal.paddle.test/session',
      });
      expect(paddleClientService.createPortalUrl).toHaveBeenCalledWith('ctm_1', 'sub_1');
    });

    it('still reports active when minting the portal session fails', async () => {
      repository.findOne.mockResolvedValue({ customer: 'ctm_1' });
      paddleClientService.findActiveSubscriptionId.mockResolvedValue('sub_1');
      paddleClientService.createPortalUrl.mockRejectedValue(new Error('paddle down'));

      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: true,
        portalUrl: null,
      });
    });
  });
});
