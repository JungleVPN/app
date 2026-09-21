import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventEntity } from '@paddle/paddle-node-sdk';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { PaddlePayment } from '@workspace/database';
import { WebhookEventEnum } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemnaUserResolverService } from '../auth/remna-user-resolver.service';
import type { PaymentStatusService } from '../payment-status/payment-status.service';
import { PaddleWebhookService } from '../providers/paddle/paddle-webhook.service';
import type { ToltService } from '../tolt/tolt.service';

vi.mock('@workspace/database', () => ({
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
}));

/** The account the webhook creates for a payer who had none. */
const NEW_ACCOUNT_ID = 9001;

/** The error a Postgres unique-constraint conflict raises, however it got wrapped on the way up. */
const uniqueViolationError = () =>
  Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

const makeTransactionEvent = (
  type: 'transaction.completed' | 'transaction.payment_failed',
  overrides: Partial<any> = {},
): EventEntity =>
  ({
    eventType: type,
    data: {
      id: 'txn_1',
      customerId: 'ctm_1',
      subscriptionId: 'sub_1',
      customData: { email: 'payer@test.com' },
      currencyCode: 'EUR',
      origin: 'web',
      items: [{ price: { id: 'pri_month_1', customData: { selectedPeriod: 1 } } }],
      details: { totals: { total: '200', grandTotal: '200' } },
      ...overrides,
    },
  }) as unknown as EventEntity;

const makeSubscriptionCanceledEvent = (overrides: Partial<any> = {}): EventEntity =>
  ({
    eventType: 'subscription.canceled',
    data: { id: 'sub_1', ...overrides },
  }) as unknown as EventEntity;

const makeAdjustmentEvent = (overrides: Partial<any> = {}): EventEntity =>
  ({
    eventType: 'adjustment.created',
    data: {
      id: 'adj_1',
      action: 'refund',
      status: 'approved',
      transactionId: 'txn_1',
      currencyCode: 'EUR',
      totals: { total: '200' },
      ...overrides,
    },
  }) as unknown as EventEntity;

describe('PaddleWebhookService', () => {
  let service: PaddleWebhookService;
  let paymentStatusService: PaymentStatusService;
  let eventEmitter: EventEmitter2;
  let repo: Repository<PaddlePayment>;

  let mockFindOneBy: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockSave: any;
  let mockCreate: any;
  let mockHandleUserUpdates: any;
  let mockEmit: any;
  let mockResolveOrCreateByEmail: any;
  let mockFindByEmail: any;
  let remnaUserResolver: RemnaUserResolverService;

  let savedMethodRepo: Repository<any>;
  let mockSavedFindOneBy: any;
  let mockSavedUpdate: any;
  let mockSavedDelete: any;
  let mockSavedSave: any;
  let mockSavedCreate: any;
  let analyticsClient: AnalyticsClientService;
  let mockReportConversion: any;
  let mockReportRefund: any;
  let toltService: ToltService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PADDLE_PRICE_ID_MONTH_1 = 'pri_month_1';

    mockFindOneBy = vi.fn().mockResolvedValue(null);
    mockInsert = vi.fn().mockResolvedValue({});
    mockUpdate = vi.fn().mockResolvedValue({ affected: 1 });
    mockSave = vi.fn(async (v: any) => v);
    mockCreate = vi.fn((data: any) => data);
    repo = {
      findOneBy: mockFindOneBy,
      insert: mockInsert,
      update: mockUpdate,
      save: mockSave,
      create: mockCreate,
    } as unknown as Repository<PaddlePayment>;

    mockResolveOrCreateByEmail = vi.fn().mockResolvedValue(NEW_ACCOUNT_ID);
    mockFindByEmail = vi.fn().mockResolvedValue(NEW_ACCOUNT_ID);
    remnaUserResolver = {
      resolveOrCreateByEmail: mockResolveOrCreateByEmail,
      findByEmail: mockFindByEmail,
    } as unknown as RemnaUserResolverService;

    mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
    paymentStatusService = {
      handleUserUpdates: mockHandleUserUpdates,
    } as unknown as PaymentStatusService;

    mockEmit = vi.fn();
    eventEmitter = { emit: mockEmit } as unknown as EventEmitter2;

    mockSavedFindOneBy = vi.fn().mockResolvedValue(null);
    mockSavedUpdate = vi.fn().mockResolvedValue({ affected: 0 });
    mockSavedDelete = vi.fn().mockResolvedValue({ affected: 1 });
    mockSavedSave = vi.fn(async (v: any) => v);
    mockSavedCreate = vi.fn((data: any) => data);
    savedMethodRepo = {
      findOneBy: mockSavedFindOneBy,
      update: mockSavedUpdate,
      delete: mockSavedDelete,
      save: mockSavedSave,
      create: mockSavedCreate,
    } as unknown as Repository<any>;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    mockReportConversion = vi.fn().mockResolvedValue(undefined);
    mockReportRefund = vi.fn().mockResolvedValue(undefined);
    toltService = {
      reportConversion: mockReportConversion,
      reportRefund: mockReportRefund,
    } as unknown as ToltService;

    service = new PaddleWebhookService(
      paymentStatusService,
      eventEmitter,
      repo,
      savedMethodRepo,
      analyticsClient,
      toltService,
      remnaUserResolver,
    );
  });

  afterEach(() => {
    delete process.env.PADDLE_PRICE_ID_MONTH_1;
  });

  describe('transaction.completed', () => {
    it('resolves the payer, extends the subscription, persists it paid, and emits payment.succeeded', async () => {
      await service.handleWebhook(makeTransactionEvent('transaction.completed'));

      expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith('payer@test.com', {
        inviterId: undefined,
        origin: null,
      });
      expect(mockHandleUserUpdates).toHaveBeenCalledWith(
        expect.objectContaining({ selectedPeriod: 1, userId: NEW_ACCOUNT_ID }),
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'txn_1', status: 'paid', userId: NEW_ACCOUNT_ID }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: NEW_ACCOUNT_ID, provider: 'paddle', selectedPeriod: 1 }),
      );
    });

    it('forwards the inviter and signup origin captured at checkout', async () => {
      await service.handleWebhook(
        makeTransactionEvent('transaction.completed', {
          customData: {
            email: 'payer@test.com',
            inviterId: '1337',
            signupOrigin: 'https://jungle-vpn.com',
          },
        }),
      );

      expect(mockResolveOrCreateByEmail).toHaveBeenCalledWith('payer@test.com', {
        inviterId: 1337,
        origin: 'https://jungle-vpn.com',
      });
    });

    it('records the settled amount and auto-payment flag for analytics', async () => {
      await service.handleWebhook(
        makeTransactionEvent('transaction.completed', { origin: 'subscription_recurring' }),
      );

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment_succeeded',
          provider: 'paddle',
          userId: NEW_ACCOUNT_ID,
          selectedPeriod: 1,
          isAutoPayment: true,
          amount: '2',
          currency: 'EUR',
        }),
      );
    });

    it('does not treat the initial checkout as an auto-payment', async () => {
      await service.handleWebhook(makeTransactionEvent('transaction.completed', { origin: 'web' }));

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({ isAutoPayment: false }),
      );
    });

    it('ignores a redelivered transaction that already succeeded or is being processed elsewhere', async () => {
      // The primary-key insert conflicts (a row already exists for this
      // transaction id), and the fallback claim update matches nothing
      // because the existing row is already 'paid' or 'processing'.
      mockInsert.mockRejectedValueOnce(uniqueViolationError());
      mockUpdate.mockResolvedValueOnce({ affected: 0 });

      await service.handleWebhook(makeTransactionEvent('transaction.completed'));

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('does not lose two concurrent deliveries of the same transaction to a race', async () => {
      // Simulates two deliveries racing: the first delivery's insert wins,
      // the second's conflicts and can't reclaim a row that is 'processing'.
      mockInsert
        .mockResolvedValueOnce({}) // first delivery claims it
        .mockRejectedValueOnce(uniqueViolationError()); // second delivery loses the race
      mockUpdate.mockResolvedValueOnce({ affected: 0 }); // second delivery's fallback claim fails

      const event = makeTransactionEvent('transaction.completed');
      await Promise.all([service.handleWebhook(event), service.handleWebhook(event)]);

      expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
    });

    it('retries a transaction previously left unfulfilled, since that is not a duplicate', async () => {
      // Insert conflicts (a row already exists), but the fallback claim
      // update succeeds because the existing row is neither 'paid' nor
      // 'processing' — e.g. a prior attempt left it 'unfulfilled'.
      mockInsert.mockRejectedValueOnce(uniqueViolationError());
      mockUpdate.mockResolvedValueOnce({ affected: 1 });

      await service.handleWebhook(makeTransactionEvent('transaction.completed'));

      expect(mockHandleUserUpdates).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'txn_1', status: 'paid' }),
      );
    });

    it('throws on an unrecognised catalog price id, rather than guess a period', async () => {
      await expect(
        service.handleWebhook(
          makeTransactionEvent('transaction.completed', {
            items: [{ price: { id: 'pri_unknown' } }],
          }),
        ),
      ).rejects.toThrow(/unrecognised price id/);
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      // The row must not be left stuck at 'processing' — that would block
      // every future retry of this transaction id forever.
      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'txn_1', status: 'processing' },
        { status: 'unfulfilled' },
      );
    });

    it('releases the claim on an unexpected failure instead of leaving the row stuck processing', async () => {
      mockResolveOrCreateByEmail.mockRejectedValueOnce(new Error('remnawave unreachable'));

      await expect(
        service.handleWebhook(makeTransactionEvent('transaction.completed')),
      ).rejects.toThrow('remnawave unreachable');

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'txn_1', status: 'processing' },
        { status: 'unfulfilled' },
      );
    });

    it('throws on a transaction whose custom data carries no email to attribute it to', async () => {
      await expect(
        service.handleWebhook(makeTransactionEvent('transaction.completed', { customData: {} })),
      ).rejects.toThrow(/no email/);

      expect(mockResolveOrCreateByEmail).not.toHaveBeenCalled();
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      // Must not be left stuck at 'processing' — same release path as the
      // unrecognised-price-id guard.
      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'txn_1', status: 'processing' },
        { status: 'unfulfilled' },
      );
    });

    it('records the charge but withholds the paid stamp when the extension fails', async () => {
      mockHandleUserUpdates.mockResolvedValue({ success: false });

      await expect(
        service.handleWebhook(makeTransactionEvent('transaction.completed')),
      ).rejects.toThrow(/txn_1/);

      const persisted = mockSave.mock.calls[0][0];
      expect(persisted.status).not.toBe('paid');
      expect(persisted.paidAt).toBeNull();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('activates a saved Paddle payment method keyed by subscription id', async () => {
      await service.handleWebhook(makeTransactionEvent('transaction.completed'));

      expect(mockSavedUpdate).toHaveBeenCalledWith(
        { userId: NEW_ACCOUNT_ID, provider: 'paddle', isActive: true },
        { isActive: false },
      );
      expect(mockSavedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: NEW_ACCOUNT_ID,
          provider: 'paddle',
          paymentMethodId: 'sub_1',
          paymentMethodType: 'paddle',
          isActive: true,
        }),
      );
    });

    it('does not duplicate a saved method that already exists (idempotency)', async () => {
      mockSavedFindOneBy.mockResolvedValue({ id: 'm1', paymentMethodId: 'sub_1', isActive: true });

      await service.handleWebhook(makeTransactionEvent('transaction.completed'));

      expect(mockSavedSave).not.toHaveBeenCalled();
    });

    describe('affiliate reporting', () => {
      it('reports the settled transaction in EUR', async () => {
        await service.handleWebhook(makeTransactionEvent('transaction.completed'));

        expect(mockReportConversion).toHaveBeenCalledWith({
          userId: NEW_ACCOUNT_ID,
          provider: 'paddle',
          chargeId: 'txn_1',
          amount: 2,
          currency: 'EUR',
          periodMonths: 1,
          purpose: 'subscription',
        });
      });

      it('does not report a currency Tolt has no FX path for', async () => {
        await service.handleWebhook(
          makeTransactionEvent('transaction.completed', { currencyCode: 'USD' }),
        );

        expect(mockReportConversion).not.toHaveBeenCalled();
      });

      it('does not report when fulfilment failed', async () => {
        mockHandleUserUpdates.mockResolvedValue({ success: false });

        await expect(
          service.handleWebhook(makeTransactionEvent('transaction.completed')),
        ).rejects.toThrow();

        expect(mockReportConversion).not.toHaveBeenCalled();
      });
    });
  });

  describe('transaction.payment_failed', () => {
    it('persists the failure and emits payment.canceled on a renewal failure', async () => {
      await service.handleWebhook(
        makeTransactionEvent('transaction.payment_failed', { origin: 'subscription_recurring' }),
      );

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'txn_1', status: 'failed' }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.canceled'],
        expect.objectContaining({
          userId: NEW_ACCOUNT_ID,
          provider: 'paddle',
          reason: 'general_decline',
        }),
      );
    });

    it('does not notify on an initial-checkout failure', async () => {
      await service.handleWebhook(
        makeTransactionEvent('transaction.payment_failed', { origin: 'web' }),
      );

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('never creates an account for a payer who has none, on a failed charge', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await service.handleWebhook(makeTransactionEvent('transaction.payment_failed'));

      expect(mockResolveOrCreateByEmail).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('subscription.canceled', () => {
    it('marks the matching payment rows canceled', async () => {
      await service.handleWebhook(makeSubscriptionCanceledEvent());

      expect(mockUpdate).toHaveBeenCalledWith({ subscriptionId: 'sub_1' }, { status: 'canceled' });
    });

    it('deletes the matching saved Paddle method', async () => {
      await service.handleWebhook(makeSubscriptionCanceledEvent());

      expect(mockSavedDelete).toHaveBeenCalledWith({
        provider: 'paddle',
        paymentMethodId: 'sub_1',
      });
    });

    it('still cancels the payment rows when deleting the saved method fails', async () => {
      mockSavedDelete.mockRejectedValueOnce(new Error('db down'));

      await expect(service.handleWebhook(makeSubscriptionCanceledEvent())).resolves.toBeUndefined();

      expect(mockUpdate).toHaveBeenCalledWith({ subscriptionId: 'sub_1' }, { status: 'canceled' });
    });
  });

  describe('adjustment.created', () => {
    it('reports a full refund for the settled transaction', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'txn_1', userId: NEW_ACCOUNT_ID, amount: 2 });

      await service.handleWebhook(makeAdjustmentEvent());

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'txn_1', isPartial: false });
      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_refunded',
        userId: NEW_ACCOUNT_ID,
        provider: 'paddle',
        isPartial: false,
        amount: '2',
        currency: 'EUR',
      });
    });

    it('flags a partial refund so the whole commission is not voided', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'txn_1', userId: NEW_ACCOUNT_ID, amount: 2 });

      await service.handleWebhook(makeAdjustmentEvent({ totals: { total: '50' } }));

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'txn_1', isPartial: true });
    });

    it('ignores an adjustment with no local record to attribute it to', async () => {
      await service.handleWebhook(makeAdjustmentEvent());

      expect(mockReportRefund).not.toHaveBeenCalled();
    });

    it('does not report analytics when the record carries no userId', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'txn_1', userId: null, amount: 2 });

      await service.handleWebhook(makeAdjustmentEvent());

      expect(analyticsClient.track).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: 'payment_refunded' }),
      );
      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'txn_1', isPartial: false });
    });

    it('ignores a credit or chargeback adjustment — only refunds are handled', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'txn_1', userId: NEW_ACCOUNT_ID, amount: 2 });

      await service.handleWebhook(makeAdjustmentEvent({ action: 'chargeback' }));

      expect(mockReportRefund).not.toHaveBeenCalled();
    });

    it('ignores an adjustment that is not yet approved', async () => {
      mockFindOneBy.mockResolvedValue({ id: 'txn_1', userId: NEW_ACCOUNT_ID, amount: 2 });

      await service.handleWebhook(makeAdjustmentEvent({ status: 'pending_approval' }));

      expect(mockReportRefund).not.toHaveBeenCalled();
    });
  });
});
