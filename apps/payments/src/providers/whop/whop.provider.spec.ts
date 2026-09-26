import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { PlanService } from '@payments/catalog/plan.service';
import type { Plan } from '@workspace/database';
import { describe, expect, it, vi } from 'vitest';
import { WhopProvider } from './whop.provider';

const plan = (id: string, overrides: Partial<Plan> = {}): Plan => ({
  id,
  type: 'recurring',
  billingPeriod: 30,
  basePrice: 6,
  provider: 'whop',
  providerPriceId: 'plan_month_1',
  availableForPurchase: true,
  customData: {},
  ...overrides,
});

const CATALOG: Plan[] = [
  plan('whop-30'),
  plan('whop-180', { billingPeriod: 180, providerPriceId: 'plan_month_6' }),
  plan('whop-retired', { billingPeriod: 90, availableForPurchase: false }),
  plan('paddle-30', { provider: 'paddle', providerPriceId: 'pri_month_1' }),
];

const providerWith = () => {
  const whopClientService = {
    hasActiveSubscription: vi.fn().mockResolvedValue(false),
    createCheckoutConfiguration: vi.fn().mockResolvedValue('ch_1'),
  };
  const whopWebhookService = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
  const provider = new WhopProvider(
    whopClientService as never,
    whopWebhookService as never,
    new PlanService({ find: async () => CATALOG } as never),
  );
  return { provider, whopClientService, whopWebhookService };
};

describe('WhopProvider', () => {
  describe('resolveCheckoutPlanId', () => {
    it("returns the chosen plan's Whop plan id to bill", async () => {
      const { provider } = providerWith();

      await expect(provider.resolveCheckoutPlanId('whop-180')).resolves.toBe('plan_month_6');
    });

    it.each([
      ['an unknown plan', 'nope'],
      ['a plan taken off sale', 'whop-retired'],
    ])('refuses %s, rather than falling back to another plan', async (_case, planId) => {
      const { provider } = providerWith();

      await expect(provider.resolveCheckoutPlanId(planId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('createCheckout', () => {
    const checkout = (overrides: Partial<Parameters<WhopProvider['createCheckout']>[0]> = {}) => ({
      email: 'payer@test.com',
      whopPlanId: 'plan_month_1',
      ...overrides,
    });

    it('returns the id of the checkout configuration Whop created for the plan', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(provider.createCheckout(checkout())).resolves.toEqual({
        checkoutConfigurationId: 'ch_1',
      });
      expect(whopClientService.createCheckoutConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan_month_1' }),
      );
    });

    it('carries the payer email as metadata, so a webhook can identify them', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.createCheckout(checkout());

      expect(whopClientService.createCheckoutConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { email: 'payer@test.com' } }),
      );
    });

    it('carries the affiliate referral, inviter and signup origin when present', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.createCheckout(
        checkout({ toltReferralId: 'tolt_9', inviterId: 1337, origin: 'https://jungle-vpn.com' }),
      );

      expect(whopClientService.createCheckoutConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            email: 'payer@test.com',
            toltReferralId: 'tolt_9',
            inviterId: '1337',
            signupOrigin: 'https://jungle-vpn.com',
          },
        }),
      );
    });

    it('omits absent optional fields entirely rather than sending them empty', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.createCheckout(checkout({ toltReferralId: null }));

      const [{ metadata }] = whopClientService.createCheckoutConfiguration.mock.calls[0];
      expect(Object.keys(metadata)).toEqual(['email']);
    });
  });

  describe('hasActiveSubscription', () => {
    it('delegates to the Whop client', async () => {
      const { provider, whopClientService } = providerWith();
      whopClientService.hasActiveSubscription.mockResolvedValue(true);

      await expect(provider.hasActiveSubscription('payer@test.com')).resolves.toBe(true);
      expect(whopClientService.hasActiveSubscription).toHaveBeenCalledWith('payer@test.com');
    });
  });

  describe('handleWebhook', () => {
    it('delegates to the webhook service', async () => {
      const { provider, whopWebhookService } = providerWith();
      const event = { type: 'payment.succeeded', data: {} };

      await provider.handleWebhook(event);

      expect(whopWebhookService.handleWebhook).toHaveBeenCalledWith(event);
    });
  });
});
