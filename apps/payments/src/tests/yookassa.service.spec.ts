import 'reflect-metadata';
import * as process from 'node:process';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { PaymentWebhookNotification, WebhookEventEnum } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import type { PaymentStatusService } from '../payment-status/payment-status.service';

vi.mock('@workspace/database', () => {
  return {
    YookassaPayment: class {},
    TelegramStarsPayment: class {},
    StripePayment: class {},
    SavedPaymentMethod: class {},
    Promo: class {},
    PromoRedemption: class {},
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

    service = new YookassaService(
      yooKassaProvider,
      yookassaPaymentRepo,
      savedMethodRepo,
      paymentStatusService,
      eventEmitter,
      {} as any,
      {} as any,
      analyticsClient,
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

  // ─────────────────────────────────────────────────────────
  // findValidPendingSession (exercised via createPaymentSession)
  // ─────────────────────────────────────────────────────────
  describe('findValidPendingSession', () => {
    let mockYkFindOne: any;
    let mockYkCreate: any;
    let mockYkSave: any;
    let mockProviderCreate: any;

    const FRESH_CREATED_AT = new Date(Date.now() - 30 * 60 * 1_000); // 30 min ago
    const EXPIRED_CREATED_AT = new Date(Date.now() - 61 * 60 * 1_000); // 61 min ago

    const PENDING_FRESH: Partial<YookassaPayment> = {
      id: 'pay_existing',
      url: 'https://yookassa.ru/pay/existing',
      status: 'pending',
      createdAt: FRESH_CREATED_AT,
    };

    const NEW_PROVIDER_PAYMENT = {
      id: 'pay_new',
      status: 'pending',
      description: null,
      confirmation: { type: 'redirect', confirmation_url: 'https://yookassa.ru/pay/new' },
    };

    beforeEach(() => {
      mockYkFindOne = vi.fn();
      mockYkCreate = vi.fn((data: any) => data);
      mockYkSave = vi.fn(async (v: any) => v);
      mockProviderCreate = vi.fn().mockResolvedValue(NEW_PROVIDER_PAYMENT);

      // Extend the repo mock that service already holds a reference to.
      (yookassaPaymentRepo as any).findOne = mockYkFindOne;
      (yookassaPaymentRepo as any).create = mockYkCreate;
      (yookassaPaymentRepo as any).save = mockYkSave;
      (yooKassaProvider as any).create = mockProviderCreate;

      (service as any).paymentsUtils = {
        getAllowedAmounts: () => ['299.00'],
        getAllowedPeriods: () => [1],
      };
    });

    it('returns existing session and skips API call when pending URL is within 1 hour', async () => {
      mockYkFindOne.mockResolvedValue(PENDING_FRESH);

      const result = await service.createPaymentSession({ userId: 'user-1' } as any);

      expect(mockProviderCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'pay_existing', url: 'https://yookassa.ru/pay/existing' });
    });

    it('creates a new payment when pending session is older than 1 hour', async () => {
      mockYkFindOne.mockResolvedValue({ ...PENDING_FRESH, createdAt: EXPIRED_CREATED_AT });

      const result = await service.createPaymentSession({ userId: 'user-1' } as any);

      expect(mockProviderCreate).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: 'pay_new', url: 'https://yookassa.ru/pay/new' });
    });

    it('creates a new payment when pending session has no URL', async () => {
      mockYkFindOne.mockResolvedValue({ ...PENDING_FRESH, url: null });

      const result = await service.createPaymentSession({ userId: 'user-1' } as any);

      expect(mockProviderCreate).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: 'pay_new', url: 'https://yookassa.ru/pay/new' });
    });

    it('creates a new payment when no pending session exists', async () => {
      mockYkFindOne.mockResolvedValue(null);

      const result = await service.createPaymentSession({ userId: 'user-1' } as any);

      expect(mockProviderCreate).toHaveBeenCalledOnce();
      expect(result).toEqual({ id: 'pay_new', url: 'https://yookassa.ru/pay/new' });
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
});
