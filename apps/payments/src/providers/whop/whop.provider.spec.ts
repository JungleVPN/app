import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PlanService } from '@payments/catalog/plan.service';
import { VisitorCurrencyService } from '@payments/catalog/visitor-currency.service';
import type { Plan } from '@workspace/database';
import { PROMO_CODE_INVALID_CODE } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { WhopProvider } from './whop.provider';

const plan = (id: string, overrides: Partial<Plan> = {}): Plan => ({
  id,
  type: 'recurring',
  billingPeriod: 30,
  basePrice: 6,
  provider: 'whop',
  currency: 'EUR',
  providerPriceId: 'plan_month_1',
  availableForPurchase: true,
  customData: {},
  ...overrides,
});

const CATALOG: Plan[] = [
  plan('whop-30'),
  plan('whop-180', { billingPeriod: 180, providerPriceId: 'plan_month_6' }),
  plan('whop-usd-30', { currency: 'USD', providerPriceId: 'plan_usd_1' }),
  plan('whop-retired', { billingPeriod: 90, availableForPurchase: false }),
  plan('paddle-30', { provider: 'paddle', providerPriceId: 'pri_month_1' }),
  plan('whop-7-once', { type: 'one_time', billingPeriod: 7, providerPriceId: 'plan_once_1' }),
];

const PAYER_IP = '203.0.113.5';

const providerWith = (countryCode: string | null = null) => {
  const whopClientService = {
    hasActiveSubscription: vi.fn().mockResolvedValue(false),
    accountId: 'biz_test',
    createPayment: vi
      .fn()
      .mockResolvedValue({ paymentId: 'pay_1', status: 'open', clientSecret: 'sec_1' }),
    findPromoCode: vi.fn().mockResolvedValue({
      id: 'promo_1',
      code: 'SPRING20',
      promoType: 'percentage',
      amountOff: 20,
      currency: 'usd',
    }),
    cancelMembership: vi
      .fn()
      .mockResolvedValue({ cancelAtPeriodEnd: true, accessUntil: '2026-10-26T10:00:00Z' }),
    uncancelMembership: vi.fn().mockResolvedValue({ cancelAtPeriodEnd: false }),
  };
  const savedMethodRepo = {
    find: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };
  const whopWebhookService = {
    handleWebhook: vi.fn().mockResolvedValue(undefined),
    isPaymentFulfilled: vi.fn().mockResolvedValue(false),
  };
  const userResolver = { findByEmail: vi.fn().mockResolvedValue(null) };
  const planService = new PlanService({ find: async () => CATALOG } as never);
  const provider = new WhopProvider(
    whopClientService as never,
    whopWebhookService as never,
    planService,
    new VisitorCurrencyService(planService, { countryOf: async () => countryCode } as never),
    savedMethodRepo as never,
    userResolver as never,
  );
  return { provider, whopClientService, whopWebhookService, savedMethodRepo, userResolver };
};

describe('WhopProvider', () => {
  describe('resolveCheckoutPlanId', () => {
    it("returns the chosen plan's Whop plan id to bill", async () => {
      const { provider } = providerWith();

      await expect(provider.resolveCheckoutPlanId('whop-180', PAYER_IP)).resolves.toBe(
        'plan_month_6',
      );
    });

    it("bills the plan in the payer's currency when the page sent another currency's", async () => {
      const { provider } = providerWith('US');

      await expect(provider.resolveCheckoutPlanId('whop-30', PAYER_IP)).resolves.toBe('plan_usd_1');
    });

    it("bills the default currency's plan when the payer's country is priced in none on sale", async () => {
      const { provider } = providerWith(null);

      await expect(provider.resolveCheckoutPlanId('whop-usd-30', PAYER_IP)).resolves.toBe(
        'plan_month_1',
      );
    });

    it.each([
      ['an unknown plan', 'nope'],
      ['a plan taken off sale', 'whop-retired'],
    ])('refuses %s, rather than falling back to another plan', async (_case, planId) => {
      const { provider } = providerWith();

      await expect(provider.resolveCheckoutPlanId(planId, PAYER_IP)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('checkoutTarget', () => {
    it('names the account we sell from and the Whop plan to mount the card form for', async () => {
      const { provider } = providerWith();

      await expect(provider.checkoutTarget('plan_month_1')).resolves.toEqual({
        accountId: 'biz_test',
        planId: 'plan_month_1',
        renews: true,
      });
    });

    it('says a one-time plan does not renew, so a wallet saves no card for it', async () => {
      const { provider } = providerWith();

      await expect(provider.checkoutTarget('plan_once_1')).resolves.toMatchObject({
        renews: false,
      });
    });
  });

  describe('checkPromoCode', () => {
    it('describes the discount a code gives the Whop plan, without its Whop id', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(
        provider.checkPromoCode({ promoCode: 'spring20', whopPlanId: 'plan_month_1' }),
      ).resolves.toEqual({
        code: 'SPRING20',
        promoType: 'percentage',
        amountOff: 20,
        currency: 'usd',
      });
      expect(whopClientService.findPromoCode).toHaveBeenCalledWith({
        code: 'spring20',
        planId: 'plan_month_1',
      });
    });

    it('refuses a code the plan does not offer, with a code the page recognises', async () => {
      const { provider, whopClientService } = providerWith();
      whopClientService.findPromoCode.mockResolvedValue(null);

      const refusal = provider.checkPromoCode({ promoCode: 'NOPE', whopPlanId: 'plan_month_1' });

      await expect(refusal).rejects.toThrow(BadRequestException);
      await expect(refusal).rejects.toMatchObject({
        response: { code: PROMO_CODE_INVALID_CODE },
      });
    });
  });

  describe('payCheckout', () => {
    const payment = (overrides: Partial<Parameters<WhopProvider['payCheckout']>[0]> = {}) => ({
      email: 'payer@test.com',
      whopPlanId: 'plan_month_1',
      confirmationToken: 'ctok_1',
      returnUrl: 'https://app.test/payment/success',
      ...overrides,
    });

    it('charges the tokenised card for the Whop plan and returns the payment', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(provider.payCheckout(payment())).resolves.toEqual({
        paymentId: 'pay_1',
        status: 'open',
        clientSecret: 'sec_1',
      });
      expect(whopClientService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          planId: 'plan_month_1',
          confirmationToken: 'ctok_1',
          email: 'payer@test.com',
          returnUrl: 'https://app.test/payment/success',
        }),
      );
    });

    it('carries the payer email as metadata, so a webhook can identify them', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.payCheckout(payment());

      expect(whopClientService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { email: 'payer@test.com' } }),
      );
    });

    it('carries the affiliate referral, inviter and signup origin when present', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.payCheckout(
        payment({ toltReferralId: 'tolt_9', inviterId: 1337, origin: 'https://jungle-vpn.com' }),
      );

      expect(whopClientService.createPayment).toHaveBeenCalledWith(
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

    it('charges with the promo code the payer applied', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.payCheckout(payment({ promoCode: 'spring20' }));

      expect(whopClientService.findPromoCode).toHaveBeenCalledWith({
        code: 'spring20',
        planId: 'plan_month_1',
      });
      expect(whopClientService.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({ promoCodeId: 'promo_1' }),
      );
    });

    it('refuses a promo code that no longer applies, without charging', async () => {
      const { provider, whopClientService } = providerWith();
      whopClientService.findPromoCode.mockResolvedValue(null);

      await expect(provider.payCheckout(payment({ promoCode: 'NOPE' }))).rejects.toMatchObject({
        response: { code: PROMO_CODE_INVALID_CODE },
      });
      expect(whopClientService.createPayment).not.toHaveBeenCalled();
    });

    it('charges full price without looking anything up when no code was applied', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.payCheckout(payment());

      expect(whopClientService.findPromoCode).not.toHaveBeenCalled();
      expect(whopClientService.createPayment).toHaveBeenCalledWith(
        expect.not.objectContaining({ promoCodeId: expect.anything() }),
      );
    });

    it('omits absent optional fields entirely rather than sending them empty', async () => {
      const { provider, whopClientService } = providerWith();

      await provider.payCheckout(payment({ toltReferralId: null }));

      const [{ metadata }] = whopClientService.createPayment.mock.calls[0];
      expect(Object.keys(metadata)).toEqual(['email']);
    });
  });

  /**
   * Whop files a wallet payment under the wallet owner's Whop account, not the
   * checkout email, so the guard reads our own rows — keyed by the checkout
   * email the webhook resolved from the payment metadata.
   */
  describe('hasActiveSubscription', () => {
    it('reports a subscription when the checkout email has an active Whop method with us', async () => {
      const { provider, userResolver, savedMethodRepo } = providerWith();
      userResolver.findByEmail.mockResolvedValue(1000);
      savedMethodRepo.find.mockResolvedValue([{ id: 'row-1', userId: 1000 }]);

      await expect(provider.hasActiveSubscription('payer@test.com')).resolves.toBe(true);
      expect(userResolver.findByEmail).toHaveBeenCalledWith('payer@test.com');
      expect(savedMethodRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1000, provider: 'whop', isActive: true },
        }),
      );
    });

    it('reports none when the checkout email has no active Whop method', async () => {
      const { provider, userResolver, savedMethodRepo } = providerWith();
      userResolver.findByEmail.mockResolvedValue(1000);
      savedMethodRepo.find.mockResolvedValue([]);

      await expect(provider.hasActiveSubscription('payer@test.com')).resolves.toBe(false);
    });

    it('reports none for an email we have no user for, without reading saved methods', async () => {
      const { provider, userResolver, savedMethodRepo } = providerWith();
      userResolver.findByEmail.mockResolvedValue(null);

      await expect(provider.hasActiveSubscription('new@test.com')).resolves.toBe(false);
      expect(savedMethodRepo.find).not.toHaveBeenCalled();
    });

    it("does not ask Whop, whose member for a wallet payment is the wallet owner's account", async () => {
      const { provider, userResolver, whopClientService } = providerWith();
      userResolver.findByEmail.mockResolvedValue(null);
      whopClientService.hasActiveSubscription.mockResolvedValue(true);

      await expect(provider.hasActiveSubscription('checkout@test.com')).resolves.toBe(false);
      expect(whopClientService.hasActiveSubscription).not.toHaveBeenCalled();
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

  describe('getPaymentStatus', () => {
    it('reports whether the webhook has fulfilled the payment', async () => {
      const { provider, whopWebhookService } = providerWith();
      whopWebhookService.isPaymentFulfilled.mockResolvedValue(true);

      await expect(provider.getPaymentStatus('pay_1')).resolves.toEqual({
        paymentId: 'pay_1',
        fulfilled: true,
      });
      expect(whopWebhookService.isPaymentFulfilled).toHaveBeenCalledWith('pay_1');
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

    it('reports the product, price, renewal date and card the webhook stored, without asking Whop', async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        whopRow({
          productName: 'Jungle VPN',
          amount: 0.4,
          currency: 'EUR',
          billingPeriod: 30,
          renewsAt: new Date('2026-10-27T10:00:00.000Z'),
          title: 'Visa •••• 1303',
          card: { last4: '1303', cardType: 'visa' },
        }),
      ]);

      const [method] = (await provider.getSubscriptionStatus(1000)).methods;

      expect(method).toMatchObject({
        productName: 'Jungle VPN',
        amount: 0.4,
        currency: 'EUR',
        billingPeriod: 30,
        renewsAt: '2026-10-27T10:00:00.000Z',
        title: 'Visa •••• 1303',
        card: { last4: '1303', cardType: 'visa' },
      });
      expect(whopClientService.cancelMembership).not.toHaveBeenCalled();
    });

    it('reports no renewal date for a row the webhook has not filled in yet', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([whopRow()]);

      const [method] = (await provider.getSubscriptionStatus(1000)).methods;

      expect(method).toMatchObject({
        productName: null,
        amount: null,
        currency: null,
        billingPeriod: null,
        renewsAt: null,
      });
    });

    it('reports whether the subscription is active or canceled at period end', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([whopRow({ status: 'canceled' })]);

      const status = await provider.getSubscriptionStatus(1000);

      expect(status.active).toBe(true);
      expect(status.methods[0]?.status).toBe('canceled');
    });

    it('reports no status for a row saved before statuses were tracked', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([whopRow()]);

      const [method] = (await provider.getSubscriptionStatus(1000)).methods;

      expect(method?.status).toBeNull();
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
        { id: 'row-2', paymentMethodId: 'mem_2', status: 'active' },
        { id: 'row-1', paymentMethodId: 'mem_1', status: 'active' },
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

    it('marks the membership canceled, so a reload shows it as canceled', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([{ id: 'row-2', paymentMethodId: 'mem_2' }]);

      await provider.cancelSubscription(1000);

      expect(savedMethodRepo.update).toHaveBeenCalledWith({ id: 'row-2' }, { status: 'canceled' });
    });

    it('leaves the row as it was when Whop refuses the cancellation', async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([{ id: 'row-2', paymentMethodId: 'mem_2' }]);
      whopClientService.cancelMembership.mockRejectedValue(new Error('whop down'));

      await expect(provider.cancelSubscription(1000)).rejects.toThrow('whop down');
      expect(savedMethodRepo.update).not.toHaveBeenCalled();
    });

    it('refuses to cancel a membership already canceled, without calling Whop', async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        { id: 'row-2', paymentMethodId: 'mem_2', status: 'canceled' },
      ]);

      await expect(provider.cancelSubscription(1000)).rejects.toBeInstanceOf(ConflictException);
      expect(whopClientService.cancelMembership).not.toHaveBeenCalled();
    });

    it('refuses when the user has no active Whop membership, without calling Whop', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(provider.cancelSubscription(1000)).rejects.toBeInstanceOf(NotFoundException);
      expect(whopClientService.cancelMembership).not.toHaveBeenCalled();
    });
  });

  describe('resumeSubscription', () => {
    it("reverses the cancellation of the user's canceled membership", async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        { id: 'row-2', paymentMethodId: 'mem_2', status: 'canceled' },
      ]);

      await expect(provider.resumeSubscription(1000)).resolves.toEqual({
        cancelAtPeriodEnd: false,
      });
      expect(whopClientService.uncancelMembership).toHaveBeenCalledWith('mem_2');
    });

    it('marks the membership active again, so a reload shows it renewing', async () => {
      const { provider, savedMethodRepo } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        { id: 'row-2', paymentMethodId: 'mem_2', status: 'canceled' },
      ]);

      await provider.resumeSubscription(1000);

      expect(savedMethodRepo.update).toHaveBeenCalledWith({ id: 'row-2' }, { status: 'active' });
    });

    it('leaves the row canceled when Whop refuses to resume it', async () => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([
        { id: 'row-2', paymentMethodId: 'mem_2', status: 'canceled' },
      ]);
      whopClientService.uncancelMembership.mockRejectedValue(new Error('whop down'));

      await expect(provider.resumeSubscription(1000)).rejects.toThrow('whop down');
      expect(savedMethodRepo.update).not.toHaveBeenCalled();
    });

    it.each([
      ['active'],
      [null],
    ])('refuses to resume a membership that is %s, without calling Whop', async (status) => {
      const { provider, savedMethodRepo, whopClientService } = providerWith();
      savedMethodRepo.find.mockResolvedValue([{ id: 'row-2', paymentMethodId: 'mem_2', status }]);

      await expect(provider.resumeSubscription(1000)).rejects.toBeInstanceOf(ConflictException);
      expect(whopClientService.uncancelMembership).not.toHaveBeenCalled();
    });

    it('refuses when the user has no Whop membership left to resume', async () => {
      const { provider, whopClientService } = providerWith();

      await expect(provider.resumeSubscription(1000)).rejects.toBeInstanceOf(NotFoundException);
      expect(whopClientService.uncancelMembership).not.toHaveBeenCalled();
    });
  });
});
