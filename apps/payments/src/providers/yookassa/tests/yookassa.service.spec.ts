import 'reflect-metadata';
import * as process from 'node:process';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { PaymentStatusService } from '@payments/payment-status/payment-status.service';
import { PromoInvalidError, type PromoService } from '@payments/promo/promo.service';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { ToltService } from '@payments/tolt/tolt.service';
import type { PaymentsUtils } from '@payments/utils/utils';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { PaymentWebhookNotification, WebhookEventEnum } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  let mockYkFind: any;
  let mockYkCreate: any;
  let mockYkSave: any;

  let mockSmFind: any;
  let mockSmDelete: any;

  let mockProviderCreate: any;
  let mockPromoResolve: any;
  let promoService: PromoService;
  let paymentsUtils: PaymentsUtils;

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

  /** Rebuild the service — the IP allowlist is snapshotted in the constructor. */
  const makeService = () =>
    new YookassaService(
      yooKassaProvider,
      yookassaPaymentRepo,
      savedMethodRepo,
      paymentStatusService,
      eventEmitter,
      paymentsUtils,
      promoService,
      analyticsClient,
      toltService,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    // Validation runs in every environment now — allow the localhost IP used in tests.
    process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['127.0.0.1/32']);

    mockYkUpdate = vi.fn();
    mockYkFindOneBy = vi.fn().mockResolvedValue({
      userId: 1000,
      selectedPeriod: 1,
      telegramId: 42,
    });
    mockYkCount = vi.fn().mockResolvedValue(0);
    mockYkFind = vi.fn().mockResolvedValue([]);
    mockYkCreate = vi.fn((data: any) => data);
    mockYkSave = vi.fn(async (v: any) => v);
    yookassaPaymentRepo = {
      update: mockYkUpdate,
      findOneBy: mockYkFindOneBy,
      count: mockYkCount,
      find: mockYkFind,
      create: mockYkCreate,
      save: mockYkSave,
    } as unknown as Repository<YookassaPayment>;

    mockSmFindOneBy = vi.fn();
    mockSmCreate = vi.fn((data: any) => data);
    mockSmSave = vi.fn(async (v: any) => v);
    mockSmUpdate = vi.fn();
    mockSmFind = vi.fn().mockResolvedValue([]);
    mockSmDelete = vi.fn().mockResolvedValue({ affected: 1 });
    savedMethodRepo = {
      findOneBy: mockSmFindOneBy,
      create: mockSmCreate,
      save: mockSmSave,
      update: mockSmUpdate,
      find: mockSmFind,
      delete: mockSmDelete,
    } as unknown as Repository<SavedPaymentMethod>;

    // Default: API confirms the payment status matches the webhook claim.
    mockGetPayment = vi.fn().mockResolvedValue({ status: 'succeeded' });
    mockProviderCreate = vi.fn().mockResolvedValue({
      id: 'pay_new',
      status: 'pending',
      description: 'Jungle VPN',
      confirmation: { type: 'redirect', confirmation_url: 'https://yookassa.test/confirm' },
    });
    yooKassaProvider = {
      getPayment: mockGetPayment,
      create: mockProviderCreate,
    } as unknown as YooKassaProvider;

    mockPromoResolve = vi.fn().mockResolvedValue({ code: 'WELCOME' });
    promoService = { resolve: mockPromoResolve } as unknown as PromoService;

    paymentsUtils = {
      getExtraDevicePriceRUB: vi.fn(() => '150'),
    } as unknown as PaymentsUtils;

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

    service = makeService();
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
          userId: 1000,
          promo: expect.objectContaining({ provider: 'yookassa' }),
        }),
      );
      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.objectContaining({ userId: 1000, provider: 'yookassa', selectedPeriod: 1 }),
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
          userId: 1000,
          selectedPeriod: 3,
          telegramId: 42,
          amount: '1500.00',
          purpose: 'subscription',
          paidAt: null,
        });

        await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

        expect(mockReportConversion).toHaveBeenCalledWith({
          userId: 1000,
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
          userId: 1000,
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
          userId: 1000,
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
          userId: 1000,
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
          userId: 1000,
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
          userId: 1000,
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
          userId: 1000,
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
        { userId: 1000, isActive: true },
        { isActive: false },
      );

      expect(mockSmCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1000,
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
          userId: 1000,
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
      service = makeService();
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
        userId: 1000,
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

    // YooKassa has been seen to return a payment without amount fields; a
    // missing total must read as "nothing refunded" and never be reported as a
    // partial refund, which would leave part of the commission standing.
    it('treats a payment with no amount fields as a full reversal', async () => {
      mockGetPayment.mockResolvedValue({ status: 'succeeded' });

      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'pay_1', isPartial: false });
    });

    it('treats a payment with no refunded_amount as a full reversal', async () => {
      mockGetPayment.mockResolvedValue({
        status: 'succeeded',
        amount: { value: '200.00', currency: 'RUB' },
      });

      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');

      expect(mockReportRefund).toHaveBeenCalledWith({ chargeId: 'pay_1', isPartial: false });
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

  // ─────────────────────────────────────────────────────────
  // Query methods
  // ─────────────────────────────────────────────────────────
  describe('getActiveSavedMethods', () => {
    it('returns only the user’s active methods, newest first', async () => {
      const methods = [{ id: 'sm-2' }, { id: 'sm-1' }];
      mockSmFind.mockResolvedValue(methods);

      await expect(service.getActiveSavedMethods(1000)).resolves.toBe(methods);
      expect(mockSmFind).toHaveBeenCalledWith({
        where: { userId: 1000, isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns an empty list for a user who has saved nothing', async () => {
      mockSmFind.mockResolvedValue([]);

      await expect(service.getActiveSavedMethods(999999)).resolves.toEqual([]);
    });
  });

  describe('listPayments', () => {
    it('returns every payment, newest first', async () => {
      const payments = [{ id: 'pay_2' }, { id: 'pay_1' }];
      mockYkFind.mockResolvedValue(payments);

      await expect(service.listPayments()).resolves.toBe(payments);
      expect(mockYkFind).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('getPaymentById', () => {
    it('returns the payment when it exists', async () => {
      const payment = { id: 'pay_1' };
      mockYkFindOneBy.mockResolvedValue(payment);

      await expect(service.getPaymentById('pay_1')).resolves.toBe(payment);
      expect(mockYkFindOneBy).toHaveBeenCalledWith({ id: 'pay_1' });
    });

    it('raises 404 rather than returning null for an unknown id', async () => {
      mockYkFindOneBy.mockResolvedValue(null);

      await expect(service.getPaymentById('pay_missing')).rejects.toThrow(NotFoundException);
      await expect(service.getPaymentById('pay_missing')).rejects.toThrow(
        'Yookassa payment pay_missing not found',
      );
    });
  });

  // ─────────────────────────────────────────────────────────
  // createPaymentSession
  // ─────────────────────────────────────────────────────────
  describe('createPaymentSession', () => {
    const baseDto = (overrides: Partial<any> = {}): any => ({
      userId: 1000,
      telegramId: 42,
      selectedPeriod: 1,
      ...overrides,
    });

    beforeEach(() => {
      process.env.PRICE_RUB_MONTH_1 = '599';
      process.env.PRICE_RUB_MONTH_3 = '1500';
      process.env.PAYMENT_DESCRIPTION = 'Jungle VPN';
      process.env.RETURN_URL_BOT = 'https://t.me/jungle_bot';
    });

    afterEach(() => {
      delete process.env.PRICE_RUB_MONTH_1;
      delete process.env.PRICE_RUB_MONTH_3;
      delete process.env.PAYMENT_DESCRIPTION;
      delete process.env.RETURN_URL_BOT;
    });

    it('returns the id and confirmation url the user is sent to', async () => {
      await expect(service.createPaymentSession(baseDto())).resolves.toEqual({
        id: 'pay_new',
        url: 'https://yookassa.test/confirm',
      });
    });

    it('charges the configured price for the selected period', async () => {
      await service.createPaymentSession(baseDto({ selectedPeriod: 3 }));

      expect(mockProviderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: { value: '1500', currency: 'RUB' } }),
      );
    });

    // `capture: true` means the funds settle immediately rather than being held
    // for a two-stage capture we never perform.
    it('asks YooKassa to capture immediately and confirm by redirect', async () => {
      await service.createPaymentSession(baseDto());

      expect(mockProviderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          capture: true,
          description: 'Jungle VPN',
          confirmation: { type: 'redirect', return_url: 'https://t.me/jungle_bot' },
        }),
      );
    });

    it('honours a caller-supplied redirect return url over the bot default', async () => {
      await service.createPaymentSession(
        baseDto({ confirmation: { type: 'redirect', return_url: 'https://web.test/thanks' } }),
      );

      expect(mockProviderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmation: { type: 'redirect', return_url: 'https://web.test/thanks' },
        }),
      );
    });

    // Only a redirect confirmation carries a return url; any other type falls
    // back to the bot so the user is never stranded after paying.
    it('falls back to the bot url when the confirmation is not a redirect', async () => {
      await service.createPaymentSession(baseDto({ confirmation: { type: 'embedded' } }));

      expect(mockProviderCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmation: { type: 'redirect', return_url: 'https://t.me/jungle_bot' },
        }),
      );
    });

    it('forwards the caller’s save_payment_method choice to YooKassa', async () => {
      await service.createPaymentSession(baseDto({ save_payment_method: true }));

      expect(mockProviderCreate).toHaveBeenCalledWith(
        expect.objectContaining({ save_payment_method: true }),
      );
    });

    it('persists the session as pending with no paidAt stamp', async () => {
      await service.createPaymentSession(baseDto());

      expect(mockYkCreate).toHaveBeenCalledWith({
        id: 'pay_new',
        url: 'https://yookassa.test/confirm',
        status: 'pending',
        amount: '599',
        currency: 'RUB',
        userId: 1000,
        telegramId: 42,
        selectedPeriod: 1,
        description: 'Jungle VPN',
        purpose: 'subscription',
        promoCode: null,
        paidAt: null,
      });
      expect(mockYkSave).toHaveBeenCalledTimes(1);
    });

    it('stores a null telegramId for a web checkout with no Telegram identity', async () => {
      await service.createPaymentSession(baseDto({ telegramId: undefined }));

      expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ telegramId: null }));
    });

    it('stores a null description when YooKassa echoes none back', async () => {
      mockProviderCreate.mockResolvedValue({
        id: 'pay_new',
        status: 'pending',
        confirmation: { type: 'redirect', confirmation_url: 'https://yookassa.test/confirm' },
      });

      await service.createPaymentSession(baseDto());

      expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });

    it('records the start of checkout for analytics', async () => {
      await service.createPaymentSession(baseDto());

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'checkout_started',
        userId: 1000,
        provider: 'yookassa',
        amount: '599',
        currency: 'RUB',
      });
    });

    // ── extra_device ───────────────────────────────────────
    // A one-off device slot has its own price and buys no subscription months.
    describe('extra device purchases', () => {
      it('uses the extra-device price and a zero period', async () => {
        await service.createPaymentSession(
          baseDto({ purpose: 'extra_device', selectedPeriod: 12 }),
        );

        expect(paymentsUtils.getExtraDevicePriceRUB).toHaveBeenCalled();
        expect(mockProviderCreate).toHaveBeenCalledWith(
          expect.objectContaining({ amount: { value: '150', currency: 'RUB' } }),
        );
        expect(mockYkCreate).toHaveBeenCalledWith(
          expect.objectContaining({ purpose: 'extra_device', selectedPeriod: 0 }),
        );
      });

      // Promos discount subscriptions, not device slots — a code passed here is
      // dropped rather than silently applied.
      it('ignores a promo code, which does not apply to device slots', async () => {
        await service.createPaymentSession(
          baseDto({ purpose: 'extra_device', promoCode: 'WELCOME' }),
        );

        expect(mockPromoResolve).not.toHaveBeenCalled();
        expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ promoCode: null }));
      });
    });

    // ── promo validation ───────────────────────────────────
    // Validated at checkout so the user learns immediately that a code is bad,
    // rather than after being charged.
    describe('promo codes', () => {
      it('validates the code against the user and period before charging', async () => {
        await service.createPaymentSession(
          baseDto({ promoCode: 'welcome', userStatus: 'ACTIVE', selectedPeriod: 3 }),
        );

        expect(mockPromoResolve).toHaveBeenCalledWith('welcome', {
          userId: 1000,
          userStatus: 'ACTIVE',
          selectedPeriod: 3,
        });
      });

      it('stores the code normalized, so redemption is not case sensitive', async () => {
        await service.createPaymentSession(baseDto({ promoCode: '  welcome  ' }));

        expect(mockYkCreate).toHaveBeenCalledWith(
          expect.objectContaining({ promoCode: 'WELCOME' }),
        );
      });

      it('stores no code when none was supplied', async () => {
        await service.createPaymentSession(baseDto());

        expect(mockPromoResolve).not.toHaveBeenCalled();
        expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ promoCode: null }));
      });

      it('ignores an empty code rather than validating it', async () => {
        await service.createPaymentSession(baseDto({ promoCode: '' }));

        expect(mockPromoResolve).not.toHaveBeenCalled();
        expect(mockYkCreate).toHaveBeenCalledWith(expect.objectContaining({ promoCode: null }));
      });

      it('rejects an invalid code with a 400 carrying the reason', async () => {
        mockPromoResolve.mockRejectedValue(new PromoInvalidError('Promo expired', 'expired'));

        const err = await service
          .createPaymentSession(baseDto({ promoCode: 'OLD' }))
          .catch((e) => e);

        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe('Promo expired');
        expect(mockProviderCreate).not.toHaveBeenCalled();
      });

      // A database outage is not the user's fault — it must not be reported as
      // a bad promo code.
      it('lets an unexpected promo failure surface as itself, not a 400', async () => {
        mockPromoResolve.mockRejectedValue(new Error('promo db down'));

        await expect(
          service.createPaymentSession(baseDto({ promoCode: 'WELCOME' })),
        ).rejects.toThrow('promo db down');
        expect(mockProviderCreate).not.toHaveBeenCalled();
      });
    });

    // ── external failures ──────────────────────────────────
    describe('YooKassa failures', () => {
      it('propagates a create failure without persisting a half-made session', async () => {
        mockProviderCreate.mockRejectedValue(new Error('YooKassa unavailable'));

        await expect(service.createPaymentSession(baseDto())).rejects.toThrow(
          'YooKassa unavailable',
        );
        expect(mockYkSave).not.toHaveBeenCalled();
      });

      // Without a URL there is nowhere to send the user, so the session is
      // useless and must not be stored as if it were payable.
      it('fails when the response carries no confirmation url', async () => {
        mockProviderCreate.mockResolvedValue({
          id: 'pay_new',
          status: 'pending',
          confirmation: { type: 'redirect' },
        });

        await expect(service.createPaymentSession(baseDto())).rejects.toThrow(
          'YooKassa did not return a confirmation URL for payment pay_new',
        );
        expect(mockYkSave).not.toHaveBeenCalled();
      });

      it('fails when the response confirmation is not a redirect', async () => {
        mockProviderCreate.mockResolvedValue({
          id: 'pay_new',
          status: 'pending',
          confirmation: { type: 'embedded', confirmation_token: 'tok' },
        });

        await expect(service.createPaymentSession(baseDto())).rejects.toThrow(
          'YooKassa did not return a confirmation URL',
        );
      });

      it('fails when the response carries no confirmation object at all', async () => {
        mockProviderCreate.mockResolvedValue({ id: 'pay_new', status: 'pending' });

        await expect(service.createPaymentSession(baseDto())).rejects.toThrow(
          'YooKassa did not return a confirmation URL',
        );
      });
    });
  });

  // ─────────────────────────────────────────────────────────
  // handlePaymentSucceeded — record lookup
  // ─────────────────────────────────────────────────────────
  describe('webhook arriving before the record is committed', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Drive a webhook through the 1.5 s retry pause. */
    const runWithRetryPause = async (payload = makeSucceededPayload()) => {
      const pending = service.handleWebhook(payload, '127.0.0.1');
      await vi.advanceTimersByTimeAsync(1_500);
      return pending;
    };

    // An autopayment can settle synchronously, so YooKassa's webhook may beat
    // our own INSERT. One retry after 1.5 s covers the write propagation gap.
    it('finds the record on a second lookup and fulfils the payment', async () => {
      mockYkFindOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 1000, selectedPeriod: 1, paidAt: null });

      await runWithRetryPause();

      expect(mockYkFindOneBy).toHaveBeenCalledTimes(2);
      expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
    });

    // An orphaned payment means the customer was charged with nothing to
    // fulfil — it is logged for manual recovery rather than silently retried
    // forever, and must never extend a subscription we cannot attribute.
    it('gives up after the retry when no record ever appears', async () => {
      mockYkFindOneBy.mockResolvedValue(null);

      await runWithRetryPause();

      expect(mockYkFindOneBy).toHaveBeenCalledTimes(2);
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
      expect(mockYkUpdate).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('does not fulfil a record with no userId to attribute it to', async () => {
      mockYkFindOneBy.mockResolvedValue({ userId: null, selectedPeriod: 1, paidAt: null });

      await runWithRetryPause();

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    // Without a period there is nothing to extend by; 0 is a valid period
    // (extra device) and must not be confused with a missing one.
    it('does not fulfil a record with no selectedPeriod', async () => {
      mockYkFindOneBy.mockResolvedValue({ userId: 1000, selectedPeriod: null, paidAt: null });

      await runWithRetryPause();

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('fulfils an extra-device record whose period is legitimately zero', async () => {
      mockYkFindOneBy.mockResolvedValue({
        userId: 1000,
        selectedPeriod: 0,
        purpose: 'extra_device',
        amount: '150',
        paidAt: null,
      });

      await runWithRetryPause();

      expect(mockHandleUserUpdates).toHaveBeenCalledWith(
        expect.objectContaining({ selectedPeriod: 0, purpose: 'extra_device' }),
      );
    });
  });

  describe('handlePaymentSucceeded side effects', () => {
    it('stamps paidAt from YooKassa’s capture time when it reports one', async () => {
      const payload = makeSucceededPayload({ captured_at: '2026-03-04T10:00:00Z' });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith(
        'pay_1',
        expect.objectContaining({ paidAt: new Date('2026-03-04T10:00:00Z') }),
      );
    });

    // Clearing the URL retires a confirmation link that would otherwise stay
    // clickable after the payment has already settled.
    it('clears the confirmation url once the payment settles', async () => {
      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith('pay_1', expect.objectContaining({ url: null }));
    });

    it('records the settlement for analytics as a non-autopayment', async () => {
      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment_succeeded',
          userId: 1000,
          provider: 'yookassa',
          isAutoPayment: false,
        }),
      );
    });

    // Saving is best effort: a failure here must not stop the subscription
    // being extended or the affiliate being paid.
    it('still completes the payment when storing the method fails', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      mockSmSave.mockRejectedValue(new Error('unique violation'));

      await expect(
        service.handleWebhook(makeSucceededPayload(), '127.0.0.1'),
      ).resolves.toBeUndefined();

      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.succeeded'],
        expect.anything(),
      );
      expect(mockReportConversion).toHaveBeenCalled();
    });

    it('stores a non-card method without card details', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      const payload = makeSucceededPayload({
        payment_method: { type: 'sbp', id: 'pm_sbp', saved: true, title: 'SBP' },
      });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockSmCreate).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethodType: 'sbp', card: null }),
      );
    });

    it('stores a null title when YooKassa returns none', async () => {
      mockSmFindOneBy.mockResolvedValue(null);
      const payload = makeSucceededPayload({
        payment_method: { type: 'yoo_money', id: 'pm_ym', saved: true },
      });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockSmCreate).toHaveBeenCalledWith(expect.objectContaining({ title: null }));
    });

    it('records the saved method for analytics', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await service.handleWebhook(makeSucceededPayload(), '127.0.0.1');

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_method_saved',
        userId: 1000,
        provider: 'yookassa',
        paymentId: 'pm_1',
        methodType: 'bank_card',
      });
    });

    it('skips storing a method when the payload carries none', async () => {
      const payload = makeSucceededPayload({ payment_method: undefined });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockSmCreate).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // handlePaymentCanceled
  // ─────────────────────────────────────────────────────────
  describe('payment.canceled', () => {
    const makeCanceledPayload = (overrides: Partial<any> = {}): any => ({
      type: 'notification',
      event: 'payment.canceled',
      object: {
        id: 'pay_1',
        status: 'canceled',
        cancellation_details: { reason: 'insufficient_funds', party: 'payment_network' },
        ...overrides,
      },
    });

    beforeEach(() => {
      mockGetPayment.mockResolvedValue({ status: 'canceled' });
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 1000,
        selectedPeriod: 1,
        status: 'pending',
        paidAt: null,
      });
      // Default: the user pays manually and has already paid before.
      mockSmFindOneBy.mockResolvedValue(null);
      mockYkCount.mockResolvedValue(2);
    });

    it('notifies a returning customer whose renewal was declined', async () => {
      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockEmit).toHaveBeenCalledWith(WebhookEventEnum['payment.canceled'], {
        userId: 1000,
        provider: 'yookassa',
        selectedPeriod: 1,
        reason: 'insufficient_funds',
      });
      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'payment_failed',
        userId: 1000,
        provider: 'yookassa',
        paymentId: 'pay_1',
        reason: 'insufficient_funds',
      });
    });

    it('reports the period as 0 when the record carries none', async () => {
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 1000,
        selectedPeriod: null,
        status: 'pending',
        paidAt: null,
      });

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.canceled'],
        expect.objectContaining({ selectedPeriod: 0 }),
      );
    });

    it('reports an unknown reason when cancellation_details names none', async () => {
      await service.handleWebhook(
        makeCanceledPayload({ cancellation_details: { party: 'yoo_kassa' } }),
        '127.0.0.1',
      );

      expect(analyticsClient.track).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'payment_failed', reason: 'unknown' }),
      );
    });

    it('marks the payment canceled and retires its confirmation url', async () => {
      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith('pay_1', { status: 'canceled', url: null });
    });

    // A cancel arriving after a successful capture is stale. Acting on it would
    // tell a paying customer their payment failed.
    it('ignores a late cancel for a payment that already succeeded', async () => {
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 1000,
        selectedPeriod: 1,
        status: 'succeeded',
        paidAt: new Date(),
      });

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockYkUpdate).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('ignores a late cancel that names no reason', async () => {
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 1000,
        selectedPeriod: 1,
        status: 'succeeded',
        paidAt: new Date(),
      });

      await service.handleWebhook(
        makeCanceledPayload({ cancellation_details: undefined }),
        '127.0.0.1',
      );

      expect(mockYkUpdate).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    // Succeeded-but-unstamped is an autopayment row awaiting fulfilment, not a
    // settled payment — a genuine cancel for it must still be recorded.
    it('acts on a cancel for a succeeded row that was never stamped', async () => {
      mockYkFindOneBy.mockResolvedValue({
        id: 'pay_1',
        userId: 1000,
        selectedPeriod: 1,
        status: 'succeeded',
        paidAt: null,
      });

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith('pay_1', { status: 'canceled', url: null });
    });

    it('records the cancellation even for a payment we have no record of', async () => {
      mockYkFindOneBy.mockResolvedValue(null);

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockYkUpdate).toHaveBeenCalledWith('pay_1', { status: 'canceled', url: null });
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('sends no notification when YooKassa gives no cancellation reason', async () => {
      await service.handleWebhook(
        makeCanceledPayload({ cancellation_details: undefined }),
        '127.0.0.1',
      );

      expect(mockYkUpdate).toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    // ── duplicate-notification guards ──────────────────────

    // AutopaymentService has already emitted its own failure event for this
    // charge; emitting again would notify the customer twice.
    it('stays silent for a charge made against a stored method', async () => {
      const payload = makeCanceledPayload({
        payment_method: { type: 'bank_card', id: 'pm_1', saved: true },
      });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockYkUpdate).toHaveBeenCalled();
    });

    it('still notifies when the payload’s method was not a stored one', async () => {
      const payload = makeCanceledPayload({
        payment_method: { type: 'bank_card', id: 'pm_1', saved: false },
      });

      await service.handleWebhook(payload, '127.0.0.1');

      expect(mockEmit).toHaveBeenCalledWith(
        WebhookEventEnum['payment.canceled'],
        expect.anything(),
      );
    });

    // AutopaymentService will retry against the saved method and emit its own
    // failure event only once every retry is exhausted.
    it('stays silent while the user still has an active saved method to retry', async () => {
      mockSmFindOneBy.mockResolvedValue({ id: 'sm-1', userId: 1000, isActive: true });

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockSmFindOneBy).toHaveBeenCalledWith({ userId: 1000, isActive: true });
      expect(mockEmit).not.toHaveBeenCalled();
    });

    // Someone who has never paid has no subscription to lose, so a failed first
    // attempt is not worth a notification.
    it('stays silent when the user has never successfully paid', async () => {
      mockYkCount.mockResolvedValue(0);

      await service.handleWebhook(makeCanceledPayload(), '127.0.0.1');

      expect(mockYkCount).toHaveBeenCalledWith({
        where: { userId: 1000, status: 'succeeded' },
      });
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // deletePaymentMethod
  // ─────────────────────────────────────────────────────────
  describe('deletePaymentMethod', () => {
    it('deletes a method belonging to the user', async () => {
      mockSmFindOneBy.mockResolvedValue({ id: 'sm-1', userId: 1000 });

      await expect(service.deletePaymentMethod('sm-1', 1000)).resolves.toBeUndefined();

      expect(mockSmDelete).toHaveBeenCalledWith({ id: 'sm-1', userId: 1000 });
    });

    // Scoping the lookup by userId is what stops one user deleting another's
    // card by guessing its id.
    it('raises 404 for a method that is not the user’s, and deletes nothing', async () => {
      mockSmFindOneBy.mockResolvedValue(null);

      await expect(service.deletePaymentMethod('sm-1', 1001)).rejects.toThrow(NotFoundException);
      expect(mockSmFindOneBy).toHaveBeenCalledWith({ id: 'sm-1', userId: 1001 });
      expect(mockSmDelete).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────
  // validateWebhookPayload
  // ─────────────────────────────────────────────────────────
  describe('validateWebhookPayload', () => {
    it('rejects a webhook from an unauthorized IP before touching the database', async () => {
      await expect(service.handleWebhook(makeSucceededPayload(), '8.8.8.8')).rejects.toThrow(
        'Webhook request from unauthorized IP: 8.8.8.8',
      );
      expect(mockYkFindOneBy).not.toHaveBeenCalled();
    });

    it('accepts a request whose forwarded-for chain contains an allowed IP', async () => {
      await expect(
        service.handleWebhook(makeSucceededPayload(), '8.8.8.8, 127.0.0.1'),
      ).resolves.toBeUndefined();
    });

    it('rejects a structurally invalid payload', async () => {
      await expect(
        service.handleWebhook({ type: 'notification', event: 'bogus' } as any, '127.0.0.1'),
      ).rejects.toThrow('Invalid webhook payload structure');
    });

    // The webhook body is attacker-controllable; only YooKassa's own API is
    // trusted to say whether a payment really succeeded.
    it('rejects a payload whose status the API does not confirm', async () => {
      mockGetPayment.mockResolvedValue({ status: 'pending' });

      await expect(service.handleWebhook(makeSucceededPayload(), '127.0.0.1')).rejects.toThrow(
        'Payment status mismatch for pay_1: webhook=succeeded, API=pending',
      );
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('propagates an API failure rather than trusting the webhook body', async () => {
      mockGetPayment.mockRejectedValue(new Error('YooKassa unreachable'));

      await expect(service.handleWebhook(makeSucceededPayload(), '127.0.0.1')).rejects.toThrow(
        'YooKassa unreachable',
      );
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    // A refund's object.id is the refund, not a payment, so there is nothing to
    // look up under it — the underlying payment is verified in the handler.
    it('does not cross-check the status of a refund notification', async () => {
      mockYkFindOneBy.mockResolvedValue(null);

      await service.handleWebhook(makeRefundPayload(), '127.0.0.1');

      expect(mockGetPayment).not.toHaveBeenCalled();
    });

    it('ignores a well-formed event it has no handler for', async () => {
      mockGetPayment.mockResolvedValue({ status: 'waiting_for_capture' });

      await service.handleWebhook(
        {
          type: 'notification',
          event: 'payment.waiting_for_capture',
          object: { id: 'pay_1', status: 'waiting_for_capture' },
        } as any,
        '127.0.0.1',
      );

      expect(mockYkUpdate).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('accepts refund.succeeded as a known event', () => {
      expect(service.isValidNotificationEvent('refund.succeeded')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────
  // IP allowlist normalization
  // ─────────────────────────────────────────────────────────
  describe('IP allowlist normalization', () => {
    /** Rebuild the service against a specific allowlist. */
    const withAllowlist = (ips: string[]) => {
      process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(ips);
      return makeService();
    };

    // YooKassa publishes its allowlist as a mix of bare addresses and CIDR
    // ranges; bare ones are widened to a single-host mask.
    it('treats a bare IPv4 address as a single host', async () => {
      const svc = withAllowlist(['77.75.153.0']);

      expect(await svc.isIPRangeValid('77.75.153.0')).toBe(true);
      expect(await svc.isIPRangeValid('77.75.153.1')).toBe(false);
    });

    it('treats a bare IPv6 address as a single host', async () => {
      const svc = withAllowlist(['2a02:5180::1']);

      expect(await svc.isIPRangeValid('2a02:5180::1')).toBe(true);
      expect(await svc.isIPRangeValid('2a02:5180::2')).toBe(false);
    });

    it('passes an already-masked range through unchanged', async () => {
      const svc = withAllowlist(['185.71.76.0/27']);

      expect(await svc.isIPRangeValid('185.71.76.5')).toBe(true);
    });

    it('accepts a request when any address in the forwarded chain matches', async () => {
      const svc = withAllowlist(['185.71.76.0/27']);

      expect(await svc.isIPRangeValid('203.0.113.9, 185.71.76.5')).toBe(true);
    });

    // Fail closed: an unconfigured allowlist must reject everything rather than
    // let any host post payment webhooks.
    it('rejects every address when no allowlist is configured', async () => {
      delete process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS;
      const svc = makeService();

      expect(await svc.isIPRangeValid('185.71.76.5')).toBe(false);
    });
  });
});
