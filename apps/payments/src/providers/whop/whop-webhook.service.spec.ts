import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { PlanService } from '@payments/catalog/plan.service';
import type { Plan } from '@workspace/database';
import { WebhookEventEnum } from '@workspace/types';
import { In, Not } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { UnfulfilledPaymentError, WhopWebhookService } from './whop-webhook.service';

vi.mock('@workspace/database', () => ({
  WhopPayment: class {},
  WhopRefund: class {},
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

/** The account an email already belongs to. */
const EXISTING_ACCOUNT_ID = 4242;

const uniqueViolationError = () =>
  Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

const whopPlan = (overrides: Partial<Plan> = {}): Plan => ({
  id: 'whop-30',
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

/** The display fields Whop sends on a card payment. */
const cardPaymentDetails = {
  paid_at: '2026-09-27T10:00:00.000Z',
  product: { id: 'prod_1', title: 'Jungle VPN' },
  card_brand: 'visa',
  card_last4: '1303',
  card_exp_month: 4,
  card_exp_year: 2029,
  payment_instrument: { display_name: 'Visa •••• 1303' },
};

const paymentSucceeded = (overrides: Record<string, unknown> = {}) => ({
  type: 'payment.succeeded',
  data: paymentData(overrides),
});

const paymentCreated = (status: string, overrides: Record<string, unknown> = {}) => ({
  type: 'payment.created',
  data: paymentData({ status, ...overrides }),
});

const paymentFailed = (overrides: Record<string, unknown> = {}) => ({
  type: 'payment.failed',
  data: paymentData({ billing_reason: 'subscription_cycle', ...overrides }),
});

const refundEvent = (
  type: 'refund.created' | 'refund.updated',
  overrides: Record<string, unknown> = {},
) => ({
  type,
  data: {
    id: 'rf_1',
    amount: 6,
    currency: 'eur',
    status: 'succeeded',
    payment: { id: 'pay_1' },
    ...overrides,
  },
});

const membershipDeactivated = (status: string) => ({
  type: 'membership.deactivated',
  data: { id: 'mem_1', status },
});

const setup = (options: { catalog?: Plan[] } = {}) => {
  const paymentRepo = {
    insert: vi.fn().mockResolvedValue({}),
    findOneBy: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    save: vi.fn(async (row: unknown) => row),
    create: vi.fn((row: unknown) => row),
  };
  const savedMethodRepo = {
    findOneBy: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ affected: 0 }),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    save: vi.fn(async (row: unknown) => row),
    create: vi.fn((row: unknown) => row),
  };
  const refundRepo = { insert: vi.fn().mockResolvedValue({}) };
  const paymentStatusService = {
    handleUserUpdates: vi.fn().mockResolvedValue({ success: true }),
  };
  const eventEmitter = { emit: vi.fn() };
  const analyticsClient = { track: vi.fn().mockResolvedValue(undefined) };
  const toltService = {
    reportConversion: vi.fn().mockResolvedValue(undefined),
    reportRefund: vi.fn().mockResolvedValue(undefined),
  };
  const remnaUserResolver = {
    resolveOrCreate: vi.fn().mockResolvedValue(NEW_ACCOUNT_ID),
    findByEmail: vi.fn().mockResolvedValue(EXISTING_ACCOUNT_ID),
  };
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
    refundRepo as never,
  );

  return {
    service,
    paymentRepo,
    savedMethodRepo,
    refundRepo,
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

    it('saves no subscription method for a one-time purchase, whose membership never renews', async () => {
      const { service, savedMethodRepo, paymentStatusService, paymentRepo, analyticsClient } =
        setup();

      await service.handleWebhook(paymentSucceeded({ billing_reason: 'one_time' }));

      expect(paymentStatusService.handleUserUpdates).toHaveBeenCalled();
      expect(paymentRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'paid', membershipId: 'mem_1' }),
      );
      expect(savedMethodRepo.findOneBy).not.toHaveBeenCalled();
      expect(savedMethodRepo.update).not.toHaveBeenCalled();
      expect(savedMethodRepo.save).not.toHaveBeenCalled();
      expect(analyticsClient.track).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'payment_method_saved' }),
      );
    });

    it('reactivates a known membership instead of saving it twice', async () => {
      const { service, savedMethodRepo } = setup();
      savedMethodRepo.findOneBy.mockResolvedValue({ id: 42, isActive: false });

      await service.handleWebhook(paymentSucceeded());

      expect(savedMethodRepo.update).toHaveBeenCalledWith(
        { id: 42 },
        expect.objectContaining({ isActive: true }),
      );
      expect(savedMethodRepo.save).not.toHaveBeenCalled();
    });

    it('keeps what the payment says about the subscription on the saved method, for the profile page', async () => {
      const { service, savedMethodRepo } = setup();

      await service.handleWebhook(paymentSucceeded(cardPaymentDetails));

      expect(savedMethodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Jungle VPN',
          amount: 6,
          currency: 'EUR',
          billingPeriod: 30,
          renewsAt: new Date('2026-10-27T10:00:00.000Z'),
          title: 'Visa •••• 1303',
          card: { last4: '1303', cardType: 'visa', expiryMonth: '4', expiryYear: '2029' },
        }),
      );
    });

    it("refreshes a known membership's details on every renewal", async () => {
      const { service, savedMethodRepo } = setup();
      savedMethodRepo.findOneBy.mockResolvedValue({ id: 42, isActive: true });

      await service.handleWebhook(
        paymentSucceeded({
          ...cardPaymentDetails,
          billing_reason: 'subscription_cycle',
          paid_at: '2026-10-27T10:00:00.000Z',
          card_last4: '9999',
        }),
      );

      expect(savedMethodRepo.update).toHaveBeenCalledWith(
        { id: 42 },
        expect.objectContaining({
          isActive: true,
          renewsAt: new Date('2026-11-26T10:00:00.000Z'),
          card: expect.objectContaining({ last4: '9999' }),
        }),
      );
    });

    it('reads a paid_at Whop sends as a Unix timestamp', async () => {
      const { service, savedMethodRepo } = setup();

      await service.handleWebhook(
        paymentSucceeded({ paid_at: Date.parse('2026-09-27T10:00:00.000Z') / 1000 }),
      );

      expect(savedMethodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ renewsAt: new Date('2026-10-27T10:00:00.000Z') }),
      );
    });

    it('counts the renewal from now when Whop omits paid_at', async () => {
      vi.useFakeTimers({ now: new Date('2026-09-27T12:00:00.000Z'), toFake: ['Date'] });
      try {
        const { service, savedMethodRepo } = setup();

        await service.handleWebhook(paymentSucceeded());

        expect(savedMethodRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ renewsAt: new Date('2026-10-27T12:00:00.000Z') }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('saves the method without card details when the payment was not made by card', async () => {
      const { service, savedMethodRepo } = setup();

      await service.handleWebhook(paymentSucceeded());

      expect(savedMethodRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ productName: null, title: null, card: null }),
      );
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
        { id: 'pay_1', status: Not(In(['paid', 'processing', 'canceled'])) },
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

  /**
   * An on-session checkout charges at once, so Whop creates the payment
   * already paid and sends `payment.created` for it — with no
   * `payment.succeeded` after. A paid `payment.created` fulfils; the claim
   * on the payment id keeps it from counting twice if both ever arrive.
   */
  describe('payment.created', () => {
    it('fulfils a payment Whop created already paid', async () => {
      const { service, paymentStatusService, paymentRepo } = setup();

      await service.handleWebhook(paymentCreated('paid'));

      expect(paymentStatusService.handleUserUpdates).toHaveBeenCalledWith({
        selectedPeriod: 30,
        userId: NEW_ACCOUNT_ID,
        purpose: 'subscription',
      });
      expect(paymentRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'pay_1', status: 'paid' }),
      );
    });

    it.each([
      ['open'],
      ['draft'],
      [undefined],
    ])('leaves a payment created as %s for payment.succeeded to fulfil', async (status) => {
      const { service, paymentStatusService, paymentRepo } = setup();

      await service.handleWebhook(paymentCreated(status as string));

      expect(paymentRepo.insert).not.toHaveBeenCalled();
      expect(paymentStatusService.handleUserUpdates).not.toHaveBeenCalled();
    });

    it('does not fulfil again when payment.succeeded follows for the same payment', async () => {
      const { service, paymentRepo, paymentStatusService } = setup();

      await service.handleWebhook(paymentCreated('paid'));
      paymentRepo.insert.mockRejectedValue(uniqueViolationError());
      paymentRepo.update.mockResolvedValue({ affected: 0 });
      await service.handleWebhook(paymentSucceeded());

      expect(paymentStatusService.handleUserUpdates).toHaveBeenCalledTimes(1);
    });
  });

  describe('payment.failed', () => {
    it('records the failure against the existing account, without creating one', async () => {
      const { service, paymentRepo, remnaUserResolver } = setup();

      await service.handleWebhook(paymentFailed({ total: 6 }));

      expect(remnaUserResolver.findByEmail).toHaveBeenCalledWith('payer@test.com');
      expect(remnaUserResolver.resolveOrCreate).not.toHaveBeenCalled();
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'pay_1',
          status: 'failed',
          userId: EXISTING_ACCOUNT_ID,
          amount: 6,
          currency: 'EUR',
          customer: 'user_1',
          membershipId: 'mem_1',
          paidAt: null,
        }),
      );
    });

    it('notifies the payer and tracks the failure when a renewal fails', async () => {
      const { service, eventEmitter, analyticsClient } = setup();

      await service.handleWebhook(paymentFailed());

      expect(eventEmitter.emit).toHaveBeenCalledWith(WebhookEventEnum['payment.canceled'], {
        userId: EXISTING_ACCOUNT_ID,
        provider: 'whop',
        reason: 'general_decline',
      });
      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_failed',
        userId: EXISTING_ACCOUNT_ID,
        provider: 'whop',
        paymentId: 'pay_1',
        reason: 'general_decline',
      });
    });

    it('stays quiet about a failed first checkout, which Whop shows the payer inline', async () => {
      const { service, paymentRepo, eventEmitter, analyticsClient } = setup();

      await service.handleWebhook(paymentFailed({ billing_reason: 'subscription_create' }));

      expect(paymentRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(analyticsClient.track).not.toHaveBeenCalled();
    });

    it('records but does not notify a failure for an email with no account', async () => {
      const { service, paymentRepo, remnaUserResolver, eventEmitter } = setup();
      remnaUserResolver.findByEmail.mockResolvedValue(null);

      await service.handleWebhook(paymentFailed());

      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', userId: null }),
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it.each([
      ['paid'],
      ['processing'],
    ])('never downgrades a payment already %s, so it cannot be fulfilled twice', async (status) => {
      const { service, paymentRepo, eventEmitter } = setup();
      paymentRepo.findOneBy.mockResolvedValue({ id: 'pay_1', status });

      await service.handleWebhook(paymentFailed());

      expect(paymentRepo.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('membership.deactivated', () => {
    it.each([
      ['canceled'],
      ['expired'],
      ['completed'],
    ])('marks the payments canceled and forgets the saved method once %s', async (status) => {
      const { service, paymentRepo, savedMethodRepo } = setup();

      await service.handleWebhook(membershipDeactivated(status));

      expect(paymentRepo.update).toHaveBeenCalledWith(
        { membershipId: 'mem_1' },
        { status: 'canceled' },
      );
      expect(savedMethodRepo.delete).toHaveBeenCalledWith({
        provider: 'whop',
        paymentMethodId: 'mem_1',
      });
    });

    it('leaves a past-due membership alone, since Whop may still recover the renewal', async () => {
      const { service, paymentRepo, savedMethodRepo } = setup();

      await service.handleWebhook(membershipDeactivated('past_due'));

      expect(paymentRepo.update).not.toHaveBeenCalled();
      expect(savedMethodRepo.delete).not.toHaveBeenCalled();
    });

    it('still marks the payments canceled when forgetting the saved method fails', async () => {
      const { service, savedMethodRepo } = setup();
      savedMethodRepo.delete.mockRejectedValue(new Error('db down'));

      await expect(
        service.handleWebhook(membershipDeactivated('canceled')),
      ).resolves.toBeUndefined();
    });
  });

  describe('refunds', () => {
    const paidRecord = (overrides: Record<string, unknown> = {}) => ({
      id: 'pay_1',
      userId: EXISTING_ACCOUNT_ID,
      amount: 6,
      ...overrides,
    });

    it.each([
      ['refund.created'],
      ['refund.updated'],
    ] as const)('reports a succeeded refund announced by %s', async (type) => {
      const { service, paymentRepo, refundRepo, analyticsClient, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord());

      await service.handleWebhook(refundEvent(type));

      expect(refundRepo.insert).toHaveBeenCalledWith({
        id: 'rf_1',
        paymentId: 'pay_1',
        amount: 6,
        currency: 'EUR',
      });
      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_refunded',
        userId: EXISTING_ACCOUNT_ID,
        provider: 'whop',
        isPartial: false,
        amount: '6',
        currency: 'EUR',
      });
      expect(toltService.reportRefund).toHaveBeenCalledWith({
        chargeId: 'pay_1',
        isPartial: false,
      });
    });

    it('flags a refund of less than was paid as partial', async () => {
      const { service, paymentRepo, analyticsClient, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord({ amount: 6 }));

      await service.handleWebhook(refundEvent('refund.created', { amount: 2 }));

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({ isPartial: true, amount: '2' }),
      );
      expect(toltService.reportRefund).toHaveBeenCalledWith({
        chargeId: 'pay_1',
        isPartial: true,
      });
    });

    it.each([
      ['pending'],
      ['requires_action'],
      ['failed'],
      ['canceled'],
    ])('waits while the refund is %s', async (status) => {
      const { service, paymentRepo, refundRepo, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord());

      await service.handleWebhook(refundEvent('refund.created', { status }));

      expect(refundRepo.insert).not.toHaveBeenCalled();
      expect(toltService.reportRefund).not.toHaveBeenCalled();
    });

    it('reports a refund only once, however many times Whop announces it', async () => {
      const { service, paymentRepo, refundRepo, analyticsClient, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord());
      refundRepo.insert.mockRejectedValue(uniqueViolationError());

      await service.handleWebhook(refundEvent('refund.updated'));

      expect(analyticsClient.track).not.toHaveBeenCalled();
      expect(toltService.reportRefund).not.toHaveBeenCalled();
    });

    it('surfaces a storage failure rather than treat it as already reported', async () => {
      const { service, paymentRepo, refundRepo, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord());
      refundRepo.insert.mockRejectedValue(new Error('db down'));

      await expect(service.handleWebhook(refundEvent('refund.created'))).rejects.toThrow('db down');
      expect(toltService.reportRefund).not.toHaveBeenCalled();
    });

    it.each([
      ['a payment we never recorded', null, { id: 'pay_1' }],
      ['a refund Whop no longer links to a payment', paidRecord(), null],
    ])('cannot attribute %s, and reports nothing', async (_case, record, payment) => {
      const { service, paymentRepo, refundRepo, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(record);

      await service.handleWebhook(refundEvent('refund.created', { payment }));

      expect(refundRepo.insert).not.toHaveBeenCalled();
      expect(toltService.reportRefund).not.toHaveBeenCalled();
    });

    it('still reverses the affiliate commission when the payment has no account', async () => {
      const { service, paymentRepo, analyticsClient, toltService } = setup();
      paymentRepo.findOneBy.mockResolvedValue(paidRecord({ userId: null }));

      await service.handleWebhook(refundEvent('refund.created'));

      expect(analyticsClient.track).not.toHaveBeenCalled();
      expect(toltService.reportRefund).toHaveBeenCalledWith({
        chargeId: 'pay_1',
        isPartial: false,
      });
    });
  });

  describe('logging', () => {
    it('names the event type of every delivery it receives', async () => {
      const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      const { service } = setup();

      await service.handleWebhook({ type: 'membership.activated', data: {} });

      expect(log).toHaveBeenCalledWith(expect.stringContaining('membership.activated'));
      log.mockRestore();
    });

    it('names the event and the fields it did receive when a payload does not match, without values', async () => {
      const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const { service } = setup();

      await expect(
        service.handleWebhook({
          type: 'payment.succeeded',
          data: { id: 'pay_1', currency: 'eur', user: { email: 'secret@test.com' } },
        }),
      ).rejects.toThrow();

      const message = String(error.mock.calls[0]?.[0]);
      expect(message).toContain('payment.succeeded');
      expect(message).toContain('currency, id, user');
      expect(message).toContain('total');
      expect(message).not.toContain('secret@test.com');
      error.mockRestore();
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
