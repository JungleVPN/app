import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaddleProvider } from './paddle.provider';

const ENV_KEYS = ['PADDLE_PRICE_ID_MONTH_1', 'PADDLE_PRICE_ID_MONTH_3'] as const;

describe('PaddleProvider', () => {
  let originalEnv: Record<string, string | undefined>;
  let paddleClientService: { hasActiveSubscription: ReturnType<typeof vi.fn> };
  let paddleWebhookService: { handleWebhook: ReturnType<typeof vi.fn> };
  let provider: PaddleProvider;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    paddleClientService = { hasActiveSubscription: vi.fn().mockResolvedValue(false) };
    paddleWebhookService = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
    provider = new PaddleProvider(paddleClientService as never, paddleWebhookService as never);
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
});
