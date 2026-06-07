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
  SavedPaymentMethod: class {},
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
        } as unknown as Repository<YookassaPayment>,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
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
        } as unknown as Repository<YookassaPayment>,
        makeSavedMethodRepo(null),
        { handleUserUpdates: mockHandleUserUpdates } as unknown as PaymentStatusService,
        { emit: vi.fn() } as unknown as EventEmitter2,
        {} as any,
      );

      const payload = makeSucceededPayload('pay_replay');
      await freshService.handleWebhook(payload, '127.0.0.1');
      await freshService.handleWebhook(payload, '127.0.0.1');

      // Correct behavior: DB update issued only once (for the first delivery)
      expect(mockYkUpdate).toHaveBeenCalledTimes(1);
    });
  });
  // describe('[FINDING #9] createSession must reject selectedPeriod values outside the allowed set', () => {
  //   let controller: YookassaController;
  //   let mockProviderCreate: ReturnType<typeof vi.fn>;
  //
  //   beforeEach(() => {
  //     vi.clearAllMocks();
  //     process.env.ALLOWED_AMOUNTS = '200,600,1200';
  //     process.env.ALLOWED_PERIODS = '1,3,6';
  //
  //     mockProviderCreate = vi.fn().mockResolvedValue({
  //       id: 'pay_new',
  //       status: 'pending',
  //       description: 'Test',
  //       confirmation: { type: 'redirect', confirmation_url: 'https://yookassa.ru/pay/pay_new' },
  //     });
  //
  //     controller = new YookassaController(
  //       {
  //         find: vi.fn(),
  //         findOneBy: vi.fn(),
  //         create: vi.fn((d: unknown) => d),
  //         save: vi.fn(async (v: unknown) => v),
  //       } as unknown as Repository<YookassaPayment>,
  //       makeSavedMethodRepo(),
  //       makeYookassaService(),
  //       { create: mockProviderCreate } as unknown as YooKassaProvider,
  //       makeRealValidatePaymentRequest(),
  //     );
  //   });
  //
  //   afterEach(() => {
  //     delete process.env.ALLOWED_AMOUNTS;
  //     delete process.env.ALLOWED_PERIODS;
  //   });
  //
  //   it('rejects selectedPeriod = 120 (not an allowed tier)', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 120,
  //       amount: { value: '100.00', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //     expect(mockProviderCreate).not.toHaveBeenCalled();
  //   });
  //
  //   it('rejects selectedPeriod = 0', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 0,
  //       amount: { value: '100.00', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //   });
  //
  //   it('rejects negative selectedPeriod', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: -6,
  //       amount: { value: '100.00', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //   });
  //
  //   it.each([
  //     [1, '200'],
  //     [3, '600'],
  //     [6, '1200'],
  //   ])('CONTROL: accepts period %d with a matching allowed amount', async (period, amount) => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: period,
  //       amount: { value: amount, currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).resolves.not.toThrow();
  //   });
  // });
  // describe('[FINDING #13] createSession must reject amounts not in ALLOWED_AMOUNTS', () => {
  //   let controller: YookassaController;
  //   let mockProviderCreate: ReturnType<typeof vi.fn>;
  //
  //   beforeEach(() => {
  //     vi.clearAllMocks();
  //     process.env.ALLOWED_AMOUNTS = '200,600,1200';
  //     process.env.ALLOWED_PERIODS = '1,3,6';
  //
  //     mockProviderCreate = vi.fn().mockResolvedValue({
  //       id: 'pay_new',
  //       status: 'pending',
  //       description: 'Test',
  //       confirmation: { type: 'redirect', confirmation_url: 'https://yookassa.ru/pay/pay_new' },
  //     });
  //
  //     controller = new YookassaController(
  //       {
  //         find: vi.fn(),
  //         findOneBy: vi.fn(),
  //         create: vi.fn((d: unknown) => d),
  //         save: vi.fn(async (v: unknown) => v),
  //       } as unknown as Repository<YookassaPayment>,
  //       makeSavedMethodRepo(),
  //       makeYookassaService(),
  //       { create: mockProviderCreate } as unknown as YooKassaProvider,
  //       makeRealValidatePaymentRequest(),
  //     );
  //   });
  //
  //   afterEach(() => {
  //     delete process.env.ALLOWED_AMOUNTS;
  //     delete process.env.ALLOWED_PERIODS;
  //   });
  //
  //   it('rejects an arbitrary amount (99 RUB) not in the allowed set', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 1,
  //       amount: { value: '99.00', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //     expect(mockProviderCreate).not.toHaveBeenCalled();
  //   });
  //
  //   it('rejects amount = 0', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 1,
  //       amount: { value: '0', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //     expect(mockProviderCreate).not.toHaveBeenCalled();
  //   });
  //
  //   it('rejects a negative amount', async () => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 1,
  //       amount: { value: '-200', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //     expect(mockProviderCreate).not.toHaveBeenCalled();
  //   });
  //
  //   it('rejects all amounts when ALLOWED_AMOUNTS is not configured', async () => {
  //     delete process.env.ALLOWED_AMOUNTS;
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: 1,
  //       amount: { value: '200.00', currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     // When ALLOWED_AMOUNTS is absent, no amount should pass (fail-safe)
  //     await expect(controller.createSession(dto)).rejects.toThrow(BadRequestException);
  //     expect(mockProviderCreate).not.toHaveBeenCalled();
  //   });
  //
  //   it.each([
  //     ['200.00', 1],
  //   ])('CONTROL: accepts valid amount %s RUB for period %d month(s)', async (amountValue, period) => {
  //     const dto: CreateYookassaSessionDto = {
  //       userId: 'user-uuid-1',
  //       selectedPeriod: period,
  //       amount: { value: amountValue, currency: 'RUB' },
  //       description: 'VPN subscription',
  //     };
  //
  //     await expect(controller.createSession(dto)).resolves.not.toThrow();
  //     expect(mockProviderCreate).toHaveBeenCalled();
  //   });
  // });

  describe('[FINDING #12] mapEURAmountToMonthsNumber must throw on unrecognised amounts', () => {
    beforeEach(() => {
      process.env.STRIPE_AMOUNT = '5';
      process.env.ALLOWED_PERIODS = '1';
    });

    it('throws for an amount not matching the configured price', () => {
      // Correct behavior: unknown amount must surface as an error, not silently return 1
      expect(() => mapEURAmountToMonthsNumber('99900')).toThrow();
    });

    it('throws for amount = 0', () => {
      expect(() => mapEURAmountToMonthsNumber('0')).toThrow();
    });

    it('throws when the price is not configured (empty)', () => {
      process.env.STRIPE_AMOUNT = '';

      expect(() => mapEURAmountToMonthsNumber('500')).toThrow();
    });

    it('returns ALLOWED_PERIODS months for the configured price', () => {
      // 500 EUR cents = 5 EUR → matches STRIPE_AMOUNT = '5'
      expect(mapEURAmountToMonthsNumber('500')).toBe(1);

      process.env.ALLOWED_PERIODS = '3';
      expect(mapEURAmountToMonthsNumber('500')).toBe(3);
    });
  });
});
