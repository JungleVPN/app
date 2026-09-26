import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    cancelMembership: vi
      .fn()
      .mockResolvedValue({ cancelAtPeriodEnd: true, accessUntil: '2026-10-26T10:00:00Z' }),
  };
  const savedMethodRepo = { find: vi.fn().mockResolvedValue([]) };
  const whopWebhookService = { handleWebhook: vi.fn().mockResolvedValue(undefined) };
  const provider = new WhopProvider(
    whopClientService as never,
    whopWebhookService as never,
    new PlanService({ find: async () => CATALOG } as never),
    savedMethodRepo as never,
  );
  return { provider, whopClientService, whopWebhookService, savedMethodRepo };
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

  /**
   * Status comes from the `saved_payment_methods` rows the Whop webhooks
   * maintain, not from Whop's API — mirrors Paddle.
   */
  describe('getSubscriptionStatus', () => {
    const whopRow = (overrides: Record<string, unknown> = {}) => ({
      id: 'row-1',
      userId: 1000,
      provider: 'whop',
      paymentMethodId: 'mem_1',
      paymentMethodType: 'whop',
      title: null,
      card: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ...overrides,
    });

    it('reports an active subscription from the row the webhook wrote', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([whopRow()]);

      const status = await provider.getSubscriptionStatus(1000);

      expect(status.active).toBe(true);
      expect(status.methods[0]?.paymentMethodId).toBe('mem_1');
      expect(status.methods[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('reports no subscription for a user with no saved Whop row', async () => {
      const { provider } = providerWith();

      await expect(provider.getSubscriptionStatus(1000)).resolves.toEqual({
        active: false,
        methods: [],
      });
    });

    it("asks only for this user's rows, scoped to Whop and still active, newest first", async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();

      await provider.getSubscriptionStatus(1000);

      expect(savedMethodRepo.find).toHaveBeenCalledWith({
        where: { userId: 1000, provider: 'whop', isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(whopClientService.cancelMembership).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    it("cancels the user's active membership at period end", async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        { paymentMethodId: 'mem_2' },
        { paymentMethodId: 'mem_1' },
      ]);

      await expect(provider.cancelSubscription(1000)).resolves.toEqual({
        cancelAtPeriodEnd: true,
        accessUntil: '2026-10-26T10:00:00Z',
      });
      expect(savedMethodRepo.find).toHaveBeenCalledWith({
        where: { userId: 1000, provider: 'whop', isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(whopClientService.cancelMembership).toHaveBeenCalledWith('mem_2');
    });

    it('refuses when the user has no active Whop membership, without calling Whop', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(provider.cancelSubscription(1000)).rejects.toBeInstanceOf(NotFoundException);
      expect(whopClientService.cancelMembership).not.toHaveBeenCalled();
    });
  });
});
