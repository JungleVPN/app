import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { PaymentWebhookNotification, WebhookEventEnum } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentStatusService } from '../payment-status/payment-status.service';
import type { ToltService } from '../tolt/tolt.service';

vi.mock('@workspace/database', () => {
  return {
    YookassaPayment: class {},
    TelegramStarsPayment: class {},
    StripePayment: class {},
    SavedPaymentMethod: class {},
    Promo: class {},
    PromoRedemption: class {},
    ToltReferral: class {},
    ToltTransaction: class {},
    FxRate: class {},
  };
});

// Cast via `unknown` because the fixture uses plain string literals
// instead of PaymentMethodsEnum / BankCardTypeEnum — matches real webhook JSON.
const makeSucceededPayload = (overrides: Partial<any> = {}): PaymentWebhookNotification =>
  ({
    type: 'notification' as const,
    event: 'payment.succeeded' as const,
    object: {
      id: 'pay_1',
      status: 'succeeded' as const,
      paid: true,
      amount: { value: '100', currency: 'RUB' },
      payment_method: {
        type: 'bank_card',
        id: 'pm_1',
        saved: true,
        title: 'Visa 1234',
        card: {
          last4: '1234',
          first6: '400000',
          expiry_month: '12',
          expiry_year: '2030',
          card_type: 'Visa',
          issuer_country: 'RU',
        },
      },
      created_at: '2026-01-01T00:00:00Z',
      refundable: true,
      test: false,
      ...overrides,
    },
  }) as unknown as PaymentWebhookNotification;

const makeRefundPayload = (overrides: Partial<any> = {}): any => ({
  type: 'notification',
  event: 'refund.succeeded',
  object: {
    id: 'ref_1',
    payment_id: 'pay_1',
    status: 'succeeded',
    amount: { value: '200.00', currency: 'RUB' },
    created_at: '2026-01-02T00:00:00Z',
    ...overrides,
  },
});

describe('YookassaService', () => {
  let service: YookassaService;

  let yookassaPaymentRepo: Repository<YookassaPayment>;
  let savedMethodRepo: Repository<SavedPaymentMethod>;
  let yooKassaProvider: YooKassaProvider;
  let paymentStatusService: PaymentStatusService;
  let eventEmitter: EventEmitter2;

  let mockYkUpdate: any;
  let mockYkFindOneBy: any;
  let mockYkCount: any;

  let mockSmFindOneBy: any;
  let mockSmCreate: any;
  let mockSmSave: any;
  let mockSmUpdate: any;

  let mockHandleUserUpdates: any;
  let mockGetPayment: any;
  let mockEmit: any;
  let analyticsClient: AnalyticsClientService;
  let mockReportConversion: any;
  let mockReportRefund: any;
  let toltService: ToltService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    // Validation runs in every environment now — allow the localhost IP used in tests.
    process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['127.0.0.1/32']);

    mockYkUpdate = vi.fn();
    mockYkFindOneBy = vi.fn().mockResolvedValue({
      userId: 'user-1',
      selectedPeriod: 1,
      telegramId: 42,
    });
    mockYkCount = vi.fn().mockResolvedValue(0);
    yookassaPaymentRepo = {
      update: mockYkUpdate,
      findOneBy: mockYkFindOneBy,
      count: mockYkCount,
    } as unknown as Repository<YookassaPayment>;

    mockSmFindOneBy = vi.fn();
    mockSmCreate = vi.fn((data: any) => data);
    mockSmSave = vi.fn(async (v: any) => v);
    mockSmUpdate = vi.fn();
    savedMethodRepo = {
      findOneBy: mockSmFindOneBy,
      create: mockSmCreate,
      save: mockSmSave,
      update: mockSmUpdate,
    } as unknown as Repository<SavedPaymentMethod>;

    // Default: API confirms the payment status matches the webhook claim.
    mockGetPayment = vi.fn().mockResolvedValue({ status: 'succeeded' });
    yooKassaProvider = {
      getPayment: mockGetPayment,
    } as unknown as YooKassaProvider;

    mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
    paymentStatusService = {
      handleUserUpdates: mockHandleUserUpdates,
    } as unknown as PaymentStatusService;

    mockEmit = vi.fn();
    eventEmitter = {
      emit: mockEmit,
    } as unknown as EventEmitter2;

    analyticsClient = {
      track: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalyticsClientService;

    mockReportConversion = vi.fn().mockResolvedValue(undefined);
    mockReportRefund = vi.fn().mockResolvedValue(undefined);
    toltService = {
      reportConversion: mockReportConversion,
      reportRefund: mockReportRefund,
    } as unknown as ToltService;

    service = new YookassaService(
      yooKassaProvider,
      yookassaPaymentRepo,
      savedMethodRepo,
      paymentStatusService,
      eventEmitter,
      {} as any,
      {} as any,
      analyticsClient,
      toltService,
    );
  });

  afterEach(() => {
    delete process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS;
  });

  // ─────────────────────────────────────────────────────────
  // handleWebhook
  // ─────────────────────────────────────────────────────────
  describe('handleWebhook', () => {
    it('processes payment.succeeded and updates DB + notifies bot', async () => {
      mockSmFindOneBy.mockResolvedValue(null); // no existing record

      const payload = makeSucceededPayload();
      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith(
        'pay_1',
        expect.objectContaining({
          status: 'succeeded',
          url: null,
          paidAt: expect.any(Date),
        }),
      );
      expect(mockHandleUserUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedPeriod: 1,
          userId: 'user-1',
          promo: expect.objectContaining({ provider: 'yookassa' }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: 'user-1', provider: 'yookassa', selectedPeriod: 1 }),
      );
    });

    it('routes payment.canceled to handlePaymentCanceled, not handleUserUpdates', async () => {
      // API must confirm the canceled status so the status-check passes.
      mockGetPayment.mockResolvedValue({ status: 'canceled' });

      const payload: any = {
        type: 'notification',
        event: 'payment.canceled',
        object: { id: 'pay_x', status: 'canceled' },
      };

      await service.handleWebhook(payload, '127.0.0.1');

      // status update is persisted but subscription logic is NOT triggered
      expect(mockYkUpdate).toHaveBeenCalledWith('pay_x', { status: 'canceled', url: null });
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      // no cancellation_details in payload → no event emitted
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('does NOT emit SUCCEEDED when paymentStatusService returns { success: false }', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      mockHandleUserUpdates.mockResolvedValue({ success: false });

      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.anything(),
      );
    });

    it('does NOT stamp paidAt when handleUserUpdates throws — preserves YooKassa retry path', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      mockHandleUserUpdates.mockRejectedValue(new Error('remnawave timeout'));

      await expect(service.handleWebhook(makeSucceededPayload(), '127.0.0.1')).rejects.toThrow(
        'remnawave timeout',
      );

      // DB must NOT be updated — paidAt remaining null lets YooKassa's retry re-enter
      // instead of being locked out by the idempotency check forever.
      expect(mockYkUpdate).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    describe('isFirstPayment detection', () => {
      it('emits payment.succeeded with isFirstPayment true when no prior succeeded payments exist', async () => {
        mockYkCount.mockResolvedValue(0);

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockEmit).toHaveBeenCalledWith(
          WebhookEventEnum['payment.succeeded'],
          expect.objectContaining({ isFirstPayment: true }),
        );
      });

      it('emits payment.succeeded with isFirstPayment false when prior succeeded payments exist', async () => {
        mockYkCount.mockResolvedValue(2);

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockEmit).toHaveBeenCalledWith(
          WebhookEventEnum['payment.succeeded'],
          expect.objectContaining({ isFirstPayment: false }),
        );
      });

      it('includes isFirstPayment in the emitted payment.succeeded event', async () => {
        mockYkCount.mockResolvedValue(0);

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockEmit).toHaveBeenCalledWith(
          WebhookEventEnum['payment.succeeded'],
          expect.objectContaining({ isFirstPayment: true }),
        );
      });
    });

    // Tolt has no native YooKassa integration, so RUB conversions reach the
    // affiliate program only by being reported from here.
    describe('affiliate reporting', () => {
      it('reports the settled charge to Tolt', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 3,
          telegramId: 42,
          amount: '1500.00',
          purpose: 'subscription',
          paidAt: null,
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockReportConversion).toHaveBeenCalledWith({
          userId: 'user-1',
          provider: 'yookassa',
          chargeId: 'pay_1',
          amount: 1500,
          currency: 'RUB',
          periodMonths: 3,
          purpose: 'subscription',
        });
      });

      it('does not report when fulfilment failed — no subscription, no commission', async () => {
        mockHandleUserUpdates.mockResolvedValue({ success: false });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockReportConversion).not.toHaveBeenCalled();
      });

      it('does not report a replayed webhook, which would pay the partner twice', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          amount: '599.00',
          paidAt: new Date(),
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockReportConversion).not.toHaveBeenCalled();
      });

      it('forwards the record purpose so the reporter can apply its own rules', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          amount: '599.00',
          purpose: 'subscription',
          paidAt: null,
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockReportConversion).toHaveBeenCalledWith(
          expect.objectContaining({ purpose: 'subscription' }),
        );
      });
    });

    // `paidAt` — not `status` — is the idempotency stamp. An autopayment row is
    // written with status='succeeded' straight from YooKassa's synchronous
    // response, but the subscription is only extended here, by the webhook.
    // Guarding on status alone silently swallowed every renewal.
    describe('idempotency stamp', () => {
      it('extends the subscription for an autopayment already marked succeeded but unstamped', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          status: 'succeeded',
          paidAt: null,
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
      });

      it('ignores a replay of a payment that was already stamped', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          status: 'succeeded',
          paidAt: new Date(),
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockHandleUserUpdates).not.toHaveBeenCalled();
        expect(mockYkUpdate).not.toHaveBeenCalled();
      });

      // The stamp alone decides. Were status and paidAt ever to drift apart,
      // skipping is the safe direction — a missed extension is recoverable on
      // YooKassa's next retry, a double extension is not.
      it('ignores a stamped record even when its status never reached succeeded', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          status: 'pending',
          paidAt: new Date(),
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      });

      it('processes a pending record on first delivery', async () => {
        mockYkFindOneBy.mockResolvedValue({
          userId: 'user-1',
          selectedPeriod: 1,
          telegramId: 42,
          status: 'pending',
          paidAt: null,
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // activatePaymentMethod (exercised via handleWebhook)
  // ─────────────────────────────────────────────────────────
  describe('save payment method flow', () => {
    it('saves a new payment method, deactivates previous ones, and emits METHOD_SAVED', async () => {
      mockSmFindOneBy.mockResolvedValue(null); // no existing record

      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      // Previous active methods deactivated
      expect(mockSmUpdate).toHaveBeenCalledWith(
        { userId: 'user-1', isActive: true },
        { isActive: false },
      );

      expect(mockSmCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          provider: 'yookassa',
          paymentMethodId: 'pm_1',
          paymentMethodType: 'bank_card',
          title: 'Visa 1234',
          isActive: true,
          card: expect.objectContaining({
            last4: '1234',
            expiryMonth: '12',
            expiryYear: '2030',
            cardType: 'Visa',
          }),
        }),
      );
      expect(mockSmSave).toHaveBeenCalled();
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({
          userId: 'user-1',
          provider: 'yookassa',
          selectedPeriod: 1,
        }),
      );
    });

    it('skips saving when a record with same paymentMethodId already exists', async () => {
      mockSmFindOneBy.mockResolvedValue({ id: 'existing', paymentMethodId: 'pm_1' });

      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      expect(mockSmUpdate).not.toHaveBeenCalled();
      expect(mockSmCreate).not.toHaveBeenCalled();
      expect(mockSmSave).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalledWith(
        WebhookEventEnum['payment.method_saved'],
        expect.anything(),
      );
    });

    it('skips saving when payment_method.saved is false', async () => {
      const payload = makeSucceededPayload();
      (payload.object.payment_method as { saved: boolean }).saved = false;

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockSmFindOneBy).not.toHaveBeenCalled();
      expect(mockSmCreate).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // Validators
  // ─────────────────────────────────────────────────────────
  describe('isValidNotificationEvent', () => {
    it('accepts known events', () => {
      expect(service.isValidNotificationEvent('payment.succeeded')).toBe(true);
      expect(service.isValidNotificationEvent('payment.canceled')).toBe(true);
      expect(service.isValidNotificationEvent('payment.waiting_for_capture')).toBe(true);
    });

    it('rejects unknown events', () => {
      expect(service.isValidNotificationEvent('payment.unknown')).toBe(false);
      expect(service.isValidNotificationEvent('')).toBe(false);
    });
  });

  describe('isValidWebhookPayload', () => {
    it('accepts a well-formed payload', () => {
      expect(service.isValidWebhookPayload(makeSucceededPayload() as any)).toBe(true);
    });

    it('rejects payload without object', () => {
      expect(
        service.isValidWebhookPayload({ type: 'notification', event: 'payment.succeeded' } as any),
      ).toBe(false);
    });

    it('rejects wrong type', () => {
      expect(
        service.isValidWebhookPayload({
          ...makeSucceededPayload(),
          type: 'other',
        } as any),
      ).toBe(false);
    });

    it('rejects unknown events', () => {
      expect(
        service.isValidWebhookPayload({
          ...makeSucceededPayload(),
          event: 'bogus',
        } as any),
      ).toBe(false);
    });
  });

  describe('isIPRangeValid', () => {
    beforeEach(() => {
      process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify([
        '185.71.76.0/27',
        '185.71.77.0/27',
      ]);
      service = new YookassaService(
        yooKassaProvider,
        yookassaPaymentRepo,
        savedMethodRepo,
        paymentStatusService,
        eventEmitter,
        {} as any,
        {} as any,
        analyticsClient,
        toltService,
      );
    });

    afterEach(() => {
      delete process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS;
    });

    it('returns true for an IP inside the allowed CIDR', async () => {
      expect(await service.isIPRangeValid('185.71.76.1')).toBe(true);
    });

    it('returns false for an IP outside the allowed CIDR', async () => {
      expect(await service.isIPRangeValid('8.8.8.8')).toBe(false);
    });
  });

  // Tolt has no YooKassa integration, so a refunded rouble charge only reverses
  // its commission if we tell it to.
  describe('refund.succeeded', () => {
    beforeEach(() => {
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 'user-1',
        selectedPeriod: 1,
        amount: '200.00',
        paidAt: new Date(),
      });
      // The payment API is the authority on how much has been returned.
      mockGetPayment.mockResolvedValue({
        status: 'succeeded',
        amount: { value: '200.00', currency: 'RUB' },
        refunded_amount: { value: '200.00', currency: 'RUB' },
      });
    });

    it('reverses the commission for the refunded charge', async () => {
      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'pay_1', isPartial: false });
    });

    it('flags a partial refund, which must not void the whole commission', async () => {
      mockGetPayment.mockResolvedValue({
        status: 'succeeded',
        amount: { value: '200.00', currency: 'RUB' },
        refunded_amount: { value: '50.00', currency: 'RUB' },
      });

      await service.handleWebhook(makeRefundPayload({ amount: { value: '50.00' } }), '127.0.0.1');

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'pay_1', isPartial: true });
    });

    it('resolves the payment by payment_id, not the refund id', async () => {
      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');
      expect(mockYkFindOneBy).toHaveBeenCalledWith({ id: 'pay_1' });
    });

    it('ignores a refund for a payment we have no record of', async () => {
      mockYkFindOneBy.mockResolvedValue(null);

      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');

      expect(mockReportRefund).not.toHaveBeenCalled();
    });

    it('does not extend or alter the subscription', async () => {
      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('still rejects a refund webhook from an unauthorized IP', async () => {
      await expect(service.handleWebhook(makeRefundPayload(), '8.8.8.8')).rejects.toThrow();
      expect(mockReportRefund).not.toHaveBeenCalled();
    });
  });
});
