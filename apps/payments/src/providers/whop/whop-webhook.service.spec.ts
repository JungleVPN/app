import 'reflect-metadata';
import { PlanService } from '@payments/catalog/plan.service';
import type { Plan } from '@workspace/database';
import { WebhookEventEnum } from '@workspace/types';
import { In, Not } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { UnfulfilledPaymentError, WhopWebhookService } from './whop-webhook.service';

vi.mock('@workspace/database', () => ({
  WhopPayment: class {},
  PaddlePayment: class {},
  StripePayment: class {},
  YookassaPayment: class {},
  TelegramStarsPayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
  ToltReferral: class {},
  ToltTransaction: class {},
  FxRate: class {},
  Plan: class {},
}));

/** The account the webhook creates for a payer who had none. */
const NEW_ACCOUNT_ID = 9001;

const uniqueViolationError = () =>
  Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

const whopPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'whop-30',
  type: 'recurring',
  billingPeriod: 30,
  basePrice: 6,
  provider: 'whop',
  providerPriceId: 'plan_month_1',
  availableForPurchase: true,
  customData: {},
  ...overrides,
});

const paymentData = (overrides: Record<string, unknown> = {}) => ({
  id: 'pay_1',
  total: 6,
  currency: 'eur',
  billing_reason: 'subscription_create',
  metadata: { email: 'payer@test.com' },
  plan: { id: 'plan_month_1' },
  membership: { id: 'mem_1' },
  user: { id: 'user_1', email: 'whop-user@test.com' },
  ...overrides,
});

const paymentSucceeded = (overrides: Record<string, unknown> = {}) => ({
  type: 'payment.succeeded',
  data: paymentData(overrides),
});

const setup = (options: { catalog?: Plan[] } = {}) => {
  const paymentRepo = {
    insert: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    save: vi.fn(async (row: unknown) => row),
    create: vi.fn((row: unknown) => row),
  };
  const savedMethodRepo = {
    findOneBy: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ affected: 0 }),
    save: vi.fn(async (row: unknown) => row),
    create: vi.fn((row: unknown) => row),
  };
  const paymentStatusService = {
    handleUserUpdates: vi.fn().mockResolvedValue({ success: true }),
  };
  const eventEmitter = { emit: vi.fn() };
  const analyticsClient = { track: vi.fn().mockResolvedValue(undefined) };
  const toltService = { reportConversion: vi.fn().mockResolvedValue(undefined) };
  const remnaUserResolver = { resolveOrCreate: vi.fn().mockResolvedValue(NEW_ACCOUNT_ID) };
  const planService = new PlanService({
    find: async () => options.catalog ?? [whopPlan()],
  } as never);

  const service = new WhopWebhookService(
    paymentStatusService as never,
    eventEmitter as never,
    paymentRepo as never,
    savedMethodRepo as never,
    analyticsClient as never,
    toltService as never,
    remnaUserResolver as never,
    planService,
  );

  return {
    service,
    paymentRepo,
    savedMethodRepo,
    paymentStatusService,
    eventEmitter,
    analyticsClient,
    toltService,
    remnaUserResolver,
  };
};

describe('WhopWebhookService', () => {
  describe('payment.succeeded', () => {
    it("extends the payer's subscription by the paid plan's period", async () => {
      const { service, paymentStatusService } = setup({
        catalog: [whopPlan({ billingPeriod: 180, providerPriceId: 'plan_month_6' })],
      });

      await service.handleWebhook(paymentSucceeded({ plan: { id: 'plan_month_6' } }));

      expect(paymentStatusService.handleUserUpdates).toHaveBeenCalledWith({
        selectedPeriod: 180,
        userId: NEW_ACCOUNT_ID,
        purpose: 'subscription',
      });
    });

    it('resolves the payer from the checkout email, carrying inviter and signup origin', async () => {
      const { service, remnaUserResolver } = setup();

      await service.handleWebhook(
        paymentSucceeded({
          metadata: {
            email: ' payer@test.com ',
            inviterId: '1337',
            signupOrigin: 'https://jungle-vpn.com',
          },
        }),
      );

      expect(remnaUserResolver.resolveOrCreate).toHaveBeenCalledWith(undefined, 'payer@test.com', {
        inviterId: 1337,
        origin: 'https://jungle-vpn.com',
      });
    });

    it("falls back to the Whop user's email when the payment carries no checkout metadata", async () => {
      const { service, remnaUserResolver } = setup();

      await service.handleWebhook(paymentSucceeded({ metadata: null }));

      expect(remnaUserResolver.resolveOrCreate).toHaveBeenCalledWith(
        undefined,
        'whop-user@test.com',
        { inviterId: undefined, origin: null },
      );
    });

    it('records the payment as paid, in major units and an uppercase currency', async () => {
      const { service, paymentRepo } = setup();

      await service.handleWebhook(paymentSucceeded({ total: 5.99 }));

      expect(paymentRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'pay_1',
          status: 'paid',
          amount: 5.99,
          currency: 'EUR',
          userId: NEW_ACCOUNT_ID,
          customer: 'user_1',
          membershipId: 'mem_1',
          paidAt: expect.any(Date),
        }),
      );
    });

    it('saves the membership as the active Whop method, retiring any previous one', async () => {
      const { service, savedMethodRepo } = setup();

      await service.handleWebhook(paymentSucceeded());

      expect(savedMethodRepo.update).toHaveBeenCalledWith(
        { userId: NEW_ACCOUNT_ID, provider: 'whop', isActive: true },
        { isActive: false },
      );
      expect(savedMethodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: NEW_ACCOUNT_ID,
          provider: 'whop',
          paymentMethodId: 'mem_1',
          paymentMethodType: 'whop',
          isActive: true,
        }),
      );
    });

    it('reactivates a known membership instead of saving it twice', async () => {
      const { service, savedMethodRepo } = setup();
      savedMethodRepo.findOneBy.mockResolvedValue({ id: 42, isActive: false });

      await service.handleWebhook(paymentSucceeded());

      expect(savedMethodRepo.update).toHaveBeenCalledWith({ id: 42 }, { isActive: true });
      expect(savedMethodRepo.save).not.toHaveBeenCalled();
    });

    it('announces the payment to the rest of the system', async () => {
      const { service, eventEmitter } = setup();

      await service.handleWebhook(paymentSucceeded());

      expect(eventEmitter.emit).toHaveBeenCalledWith(WebhookEventEnum['payment.succeeded'], {
        userId: NEW_ACCOUNT_ID,
        provider: 'whop',
        selectedPeriod: 30,
      });
    });

    it.each([
      ['subscription_create', false],
      ['subscription_cycle', true],
    ])('tracks a %s charge with isAutoPayment=%s', async (billingReason, isAutoPayment) => {
      const { service, analyticsClient } = setup();

      await service.handleWebhook(paymentSucceeded({ billing_reason: billingReason }));

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_succeeded',
        userId: NEW_ACCOUNT_ID,
        provider: 'whop',
        purpose: 'subscription',
        selectedPeriod: 30,
        isAutoPayment,
        amount: '6',
        currency: 'EUR',
      });
    });

    it('reports a paid EUR conversion to Tolt', async () => {
      const { service, toltService } = setup();

      await service.handleWebhook(paymentSucceeded());

      expect(toltService.reportConversion).toHaveBeenCalledWith({
        userId: NEW_ACCOUNT_ID,
        provider: 'whop',
        chargeId: 'pay_1',
        amount: 6,
        currency: 'EUR',
        period: 30,
        purpose: 'subscription',
      });
    });

    it.each([
      ['a non-EUR sale', { currency: 'usd' }],
      ['a free charge', { total: 0 }],
    ])('does not report %s to Tolt', async (_case, overrides) => {
      const { service, toltService } = setup();

      await service.handleWebhook(paymentSucceeded(overrides));

      expect(toltService.reportConversion).not.toHaveBeenCalled();
    });

    it('ignores a duplicate delivery of a payment already paid or in progress', async () => {
      const { service, paymentRepo, paymentStatusService } = setup();
      paymentRepo.insert.mockRejectedValue(uniqueViolationError());
      paymentRepo.update.mockResolvedValue({ affected: 0 });

      await service.handleWebhook(paymentSucceeded());

      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: 'pay_1', status: Not(In(['paid', 'processing'])) },
        { status: 'processing' },
      );
      expect(paymentStatusService.handleUserUpdates).not.toHaveBeenCalled();
    });

    it('retries a payment a previous delivery left unfulfilled', async () => {
      const { service, paymentRepo, paymentStatusService } = setup();
      paymentRepo.insert.mockRejectedValue(uniqueViolationError());
      paymentRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleWebhook(paymentSucceeded());

      expect(paymentStatusService.handleUserUpdates).toHaveBeenCalled();
    });

    it('records the payment as unfulfilled and throws when the subscription could not be extended', async () => {
      const { service, paymentRepo, paymentStatusService, eventEmitter } = setup();
      paymentStatusService.handleUserUpdates.mockResolvedValue({ success: false });

      await expect(service.handleWebhook(paymentSucceeded())).rejects.toBeInstanceOf(
        UnfulfilledPaymentError,
      );
      expect(paymentRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'pay_1', status: 'unfulfilled', paidAt: null }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it.each([
      ['no email anywhere', { metadata: null, user: { id: 'user_1', email: null } }],
      ['a plan we do not sell', { plan: { id: 'plan_unknown' } }],
      ['no plan at all', { plan: null }],
    ])('refuses to fulfil a payment with %s, releasing it for a retry', async (_case, overrides) => {
      const { service, paymentRepo, paymentStatusService } = setup();

      await expect(service.handleWebhook(paymentSucceeded(overrides))).rejects.toThrow();
      expect(paymentStatusService.handleUserUpdates).not.toHaveBeenCalled();
      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: 'pay_1', status: 'processing' },
        { status: 'unfulfilled' },
      );
    });

    it('rejects a payload that does not match the payment shape, before claiming anything', async () => {
      const { service, paymentRepo } = setup();

      await expect(
        service.handleWebhook({ type: 'payment.succeeded', data: { id: 'pay_1' } }),
      ).rejects.toThrow();
      expect(paymentRepo.insert).not.toHaveBeenCalled();
    });
  });

  it('ignores events it does not handle', async () => {
    const { service, paymentRepo } = setup();

    await service.handleWebhook({ type: 'membership.activated', data: {} });

    expect(paymentRepo.insert).not.toHaveBeenCalled();
  });

  it('rejects a body that is not a Whop event at all', async () => {
    const { service } = setup();

    await expect(service.handleWebhook({ nope: true })).rejects.toThrow();
  });
});
