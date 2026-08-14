import 'reflect-metadata';
import * as process from 'node:process';

import { BadRequestException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentStatusService } from '@payments/payment-status/payment-status.service';
import { mapEURAmountToMonthsNumber } from '@payments/providers/stripe/stripe.utils';
import type { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import type { SavedPaymentMethod, YookassaPayment } from '@workspace/database';
import { Payments, type PaymentWebhookNotification } from '@workspace/types';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Entity class stubs ────────────────────────────────────────────────────────
vi.mock('@workspace/database', () => ({
  YookassaPayment: class {},
  TelegramStarsPayment: class {},
  StripePayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
  ToltReferral: class {},
  ToltTransaction: class {},
  FxRate: class {},
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeSucceededPayload = (
  paymentId = 'pay_test',
  overrides: Record<string, unknown> = {},
): PaymentWebhookNotification =>
  ({
    type: 'notification' as const,
    event: 'payment.succeeded' as const,
    object: {
      id: paymentId,
      status: 'succeeded' as const,
      paid: true,
      amount: { value: '100', currency: 'RUB' },
      payment_method: { type: 'bank_card', id: 'pm_1', saved: false },
      created_at: '2026-01-01T00:00:00Z',
      refundable: true,
      test: false,
      ...overrides,
    },
  }) as unknown as PaymentWebhookNotification;

const makeDbPayment = (overrides: Record<string, unknown> = {}) => ({
  id: 'pay_test',
  userId: 'user-uuid-1',
  selectedPeriod: 1,
  telegramId: 42,
  status: 'pending' as Payments.PaymentStatus,
  paidAt: null,
  ...overrides,
});

function makePaymentRepo(
  record: Record<string, unknown> | null = null,
): Repository<YookassaPayment> {
  return {
    find: vi.fn().mockResolvedValue([]),
    findOneBy: vi.fn().mockResolvedValue(record),
    create: vi.fn((data: unknown) => data),
    save: vi.fn(async (v: unknown) => v),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<YookassaPayment>;
}

function makeSavedMethodRepo(
  record: Record<string, unknown> | null = null,
): Repository<SavedPaymentMethod> {
  return {
    find: vi.fn().mockResolvedValue([]),
    findOneBy: vi.fn().mockResolvedValue(record),
    create: vi.fn((data: unknown) => data),
    save: vi.fn(async (v: unknown) => v),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<SavedPaymentMethod>;
}

describe('Security Audit', () => {
  describe('[FINDING #1] validateWebhookPayload must abort processing on any validation failure', () => {
    let service: YookassaService;
    let mockHandleUserUpdates: ReturnType<typeof vi.fn>;
    let mockGetPayment: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.NODE_ENV = 'production';
      process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['185.71.76.0/27']);

      mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
      mockGetPayment = vi.fn().mockResolvedValue({ status: 'succeeded' });

      service = new YookassaService(
        { getPayment: mockGetPayment } as unknown as YooKassaProvider,
        {
          findOneBy: vi.fn().mockResolvedValue(makeDbPayment()),
          update: vi.fn(),
        } as unknown as Repository<YookassaPayment>,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
        {} as any,
        { track: vi.fn() } as any,
        { reportConversion: vi.fn() } as any,
      );
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('rejects a request from an IP not in the YooKassa allowlist', async () => {
      // Correct behavior: bad source IP must abort processing
      await expect(service.handleWebhook(makeSucceededPayload(), '8.8.8.8')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('rejects a webhook payload whose type field is wrong', async () => {
      const malformedPayload = {
        type: 'subscription_notification', // wrong — should be 'notification'
        event: 'payment.succeeded',
        object: { id: 'pay_test', status: 'succeeded' },
      } as unknown as PaymentWebhookNotification;

      await expect(service.handleWebhook(malformedPayload, '185.71.76.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('rejects a webhook where the API-reported status does not match the claimed status', async () => {
      // API says 'pending' but webhook claims 'succeeded' — classic fake webhook
      mockGetPayment.mockResolvedValue({ status: 'pending' });

      await expect(service.handleWebhook(makeSucceededPayload(), '185.71.76.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });
  });
  describe('[FINDING #7] Webhook validation must not be bypassed by NODE_ENV', () => {
    function buildService(nodeEnv: string): {
      service: YookassaService;
      mockIsIPRangeValid: ReturnType<typeof vi.fn>;
      mockHandleUserUpdates: ReturnType<typeof vi.fn>;
    } {
      process.env.NODE_ENV = nodeEnv;
      process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['185.71.76.0/27']);

      const mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });
      const mockIsIPRangeValid = vi.fn().mockResolvedValue(false); // reject every IP

      const paymentRepo = makePaymentRepo(makeDbPayment());
      const svc = new YookassaService(
        { getPayment: vi.fn() } as unknown as YooKassaProvider,
        paymentRepo,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
        {} as any,
        { track: vi.fn() } as any,
        { reportConversion: vi.fn() } as any,
      );
      (svc as any).isIPRangeValid = mockIsIPRangeValid;

      return { service: svc, mockIsIPRangeValid, mockHandleUserUpdates };
    }

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('validates IP in "test" environment', async () => {
      const { service, mockIsIPRangeValid, mockHandleUserUpdates } = buildService('test');

      // Correct behavior: IP check must run regardless of NODE_ENV
      await expect(service.handleWebhook(makeSucceededPayload(), '8.8.8.8')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockIsIPRangeValid).toHaveBeenCalled();
      expect(mockHandleUserUpdates).not.toHaveBeenCalled();
    });

    it('validates IP in "development" environment', async () => {
      const { service, mockIsIPRangeValid } = buildService('development');

      await expect(service.handleWebhook(makeSucceededPayload(), '192.168.0.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockIsIPRangeValid).toHaveBeenCalled();
    });

    it('validates IP when NODE_ENV is undefined', async () => {
      delete process.env.NODE_ENV;
      const { service, mockIsIPRangeValid } = buildService('');

      await expect(service.handleWebhook(makeSucceededPayload(), '0.0.0.0')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockIsIPRangeValid).toHaveBeenCalled();
      process.env.NODE_ENV = 'test';
    });
  });
  describe('[FINDING #8] handleUserUpdates must be a no-op when payment is already succeeded', () => {
    let service: YookassaService;
    let mockHandleUserUpdates: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env.NODE_ENV = 'test';
      // Validation now runs in all environments; 127.0.0.1 must be in the allowlist
      // for idempotency tests that use localhost as the source IP.
      process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS = JSON.stringify(['127.0.0.1/32']);

      mockHandleUserUpdates = vi.fn().mockResolvedValue({ success: true });

      // First call: record is 'pending' → legitimate processing
      // Second call: record is already 'succeeded' with paidAt set → must be skipped
      const mockFindOneBy = vi
        .fn()
        .mockResolvedValueOnce(makeDbPayment({ status: 'pending' }))
        .mockResolvedValueOnce(makeDbPayment({ status: 'succeeded', paidAt: new Date() }));

      service = new YookassaService(
        // getPayment must confirm the payment is genuinely succeeded so validation passes
        {
          getPayment: vi.fn().mockResolvedValue({ status: 'succeeded' }),
        } as unknown as YooKassaProvider,
        {
          findOneBy: mockFindOneBy,
          update: vi.fn().mockResolvedValue({ affected: 1 }),
          count: vi.fn().mockResolvedValue(0),
        } as unknown as Repository<YookassaPayment>,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
        {} as any,
        { track: vi.fn() } as any,
        { reportConversion: vi.fn() } as any,
      );
    });

    afterEach(() => {
      delete process.env.YOOKASSA_PAYMENT_VALID_IP_ADDRESS;
    });

    it('processes the subscription only once even when the webhook is delivered twice', async () => {
      const payload = makeSucceededPayload('pay_replay');

      await service.handleWebhook(payload, '127.0.0.1'); // first delivery
      await service.handleWebhook(payload, '127.0.0.1'); // replay

      // Correct behavior: subscription extended exactly once
      expect(mockHandleUserUpdates).toHaveBeenCalledTimes(1);
    });

    it('returns without touching the DB on a replay of an already-succeeded payment', async () => {
      const mockYkUpdate = vi.fn().mockResolvedValue({ affected: 1 });
      const mockFindOneBy = vi
        .fn()
        .mockResolvedValueOnce(makeDbPayment({ status: 'pending' }))
        .mockResolvedValueOnce(makeDbPayment({ status: 'succeeded', paidAt: new Date() }));

      const freshService = new YookassaService(
        {
          getPayment: vi.fn().mockResolvedValue({ status: 'succeeded' }),
        } as unknown as YooKassaProvider,
        {
          findOneBy: mockFindOneBy,
          update: mockYkUpdate,
          count: vi.fn().mockResolvedValue(0),
        } as unknown as Repository<YookassaPayment>,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
        {} as any,
        { track: vi.fn() } as any,
        { reportConversion: vi.fn() } as any,
      );

      const payload = makeSucceededPayload('pay_replay');
      await freshService.handleWebhook(payload, '127.0.0.1');
      await freshService.handleWebhook(payload, '127.0.0.1');

      // Correct behavior: DB update issued only once (for the first delivery)
      expect(mockYkUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('[FINDING #12] mapEURAmountToMonthsNumber must throw on unrecognised amounts', () => {
    beforeEach(() => {
      process.env.ALLOWED_PERIOD = '1';
      process.env.PRICE_EUR_MONTH_1 = '5';
    });

    afterEach(() => {
      delete process.env.ALLOWED_PERIOD;
      delete process.env.PRICE_EUR_MONTH_1;
      delete process.env.PRICE_EUR_MONTH_3;
    });

    it('throws for an amount not matching the configured price', () => {
      expect(() => mapEURAmountToMonthsNumber('99900')).toThrow();
    });

    it('throws for amount = 0', () => {
      expect(() => mapEURAmountToMonthsNumber('0')).toThrow();
    });

    it('throws when no periods are configured', () => {
      delete process.env.ALLOWED_PERIOD;
      expect(() => mapEURAmountToMonthsNumber('500')).toThrow();
    });

    it('returns correct months for the configured price', () => {
      // 500 EUR cents = 5 EUR → matches PRICE_EUR_MONTH_1 = '5' → 1 month
      expect(mapEURAmountToMonthsNumber('500')).toBe(1);

      // Add a 3-month plan and verify it maps correctly
      process.env.ALLOWED_PERIOD = '1,3';
      process.env.PRICE_EUR_MONTH_3 = '12';
      expect(mapEURAmountToMonthsNumber('1200')).toBe(3);
    });
  });
});
