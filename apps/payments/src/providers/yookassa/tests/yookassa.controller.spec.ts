import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import type { RemnaUserResolverService } from '@payments/auth/remna-user-resolver.service';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import type { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import {
  ACTIVE_SUBSCRIPTION_CODE,
  type CreatePublicYookassaSessionDto,
  type CreateYookassaSessionDto,
} from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workspace/database', () => ({
  YookassaPayment: class {},
  PaddlePayment: class {},
  TelegramStarsPayment: class {},
  StripePayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
  ToltReferral: class {},
  ToltTransaction: class {},
  FxRate: class {},
}));

describe('YookassaController', () => {
  let controller: YookassaController;
  let yookassaService: YookassaService;
  let remnaUserResolver: RemnaUserResolverService;

  beforeEach(() => {
    vi.clearAllMocks();

    yookassaService = {
      handleWebhook: vi.fn(),
      getActiveSavedMethods: vi.fn(),
      deletePaymentMethod: vi.fn(),
      listPayments: vi.fn(),
      getPaymentById: vi.fn(),
      getPublicPaymentStatus: vi.fn(),
      createPaymentSession: vi.fn(),
    } as unknown as YookassaService;

    remnaUserResolver = {
      findByEmail: vi.fn().mockResolvedValue(null),
      resolveOrCreateByEmail: vi.fn().mockResolvedValue(77),
    } as unknown as RemnaUserResolverService;

    controller = new YookassaController(yookassaService, remnaUserResolver);
  });

  describe('webhook', () => {
    it('delegates to the service and returns { ok: true }', async () => {
      const payload: any = { type: 'notification', event: 'payment.succeeded' };
      const result = await controller.webhook(payload, '127.0.0.1');

      expect(yookassaService.handleWebhook).toHaveBeenCalledWith(payload, '127.0.0.1');
      expect(result).toEqual({ ok: true });
    });
  });

  describe('getActiveSavedMethods', () => {
    it('delegates to the service using the injected userId from credential', async () => {
      const methods = [{ id: '1' }, { id: '2' }];
      (yookassaService.getActiveSavedMethods as any).mockResolvedValue(methods);

      const result = await controller.getActiveSavedMethods(2000);

      expect(yookassaService.getActiveSavedMethods).toHaveBeenCalledWith(2000);
      expect(result).toBe(methods);
    });
  });

  describe('deleteSavedMethod', () => {
    it('delegates to the service using method id and injected userId from credential', async () => {
      (yookassaService.deletePaymentMethod as any).mockResolvedValue(undefined);

      const result = await controller.deleteSavedMethod('method-1', 2000);

      expect(yookassaService.deletePaymentMethod).toHaveBeenCalledWith('method-1', 2000);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('listPayments', () => {
    it('delegates to the service', async () => {
      const payments = [{ id: 'p1' }];
      (yookassaService.listPayments as any).mockResolvedValue(payments);

      const result = await controller.listPayments();

      expect(yookassaService.listPayments).toHaveBeenCalled();
      expect(result).toBe(payments);
    });
  });

  describe('getPaymentById', () => {
    it('delegates to the service', async () => {
      const payment = { id: 'p1' };
      (yookassaService.getPaymentById as any).mockResolvedValue(payment);

      const result = await controller.getPaymentById('p1');

      expect(yookassaService.getPaymentById).toHaveBeenCalledWith('p1');
      expect(result).toBe(payment);
    });
  });

  describe('createPaymentSession', () => {
    it('delegates to the service', async () => {
      const dto: CreateYookassaSessionDto = {
        userId: 1000,
        amount: { value: '100.00', currency: 'RUB' },
        description: 'test',
        save_payment_method: true,
        selectedPeriod: 1,
      };
      const session = { id: 'sess-1', url: 'https://yk/sess-1' };
      (yookassaService.createPaymentSession as any).mockResolvedValue(session);

      const result = await controller.createPaymentSession(dto);

      expect(yookassaService.createPaymentSession).toHaveBeenCalledWith(dto);
      expect(result).toBe(session);
    });
  });

  describe('getPublicPaymentStatus', () => {
    // The anonymous payer comes back from YooKassa with no credential, so the
    // payment id is the whole claim — and the answer carries only the status.
    it('delegates to the service using the payment id alone', async () => {
      const status = { id: 'pay-1', status: 'succeeded' };
      (yookassaService.getPublicPaymentStatus as any).mockResolvedValue(status);

      const result = await controller.getPublicPaymentStatus('pay-1');

      expect(yookassaService.getPublicPaymentStatus).toHaveBeenCalledWith('pay-1');
      expect(result).toBe(status);
    });
  });

  /**
   * The anonymous RU checkout. It is the only YooKassa route with no credential
   * of any kind, so what it refuses matters as much as what it creates.
   */
  describe('createPublicPaymentSession', () => {
    const publicDto = (overrides: Partial<CreatePublicYookassaSessionDto> = {}) => ({
      email: 'Payer@Test.com',
      selectedPeriod: 3,
      returnUrl: 'https://ru.jungle.test/payment/return',
      ...overrides,
    });

    it('prices the plan for the account behind the payer email and returns the session', async () => {
      const session = { id: 'sess-1', url: 'https://yk/sess-1' };
      (yookassaService.createPaymentSession as any).mockResolvedValue(session);

      const result = await controller.createPublicPaymentSession(publicDto(), 'https://ru.test');

      expect(remnaUserResolver.resolveOrCreateByEmail).toHaveBeenCalledWith('payer@test.com', {
        inviterId: undefined,
        origin: 'https://ru.test',
      });
      expect(yookassaService.createPaymentSession).toHaveBeenCalledWith({
        userId: 77,
        selectedPeriod: 3,
        save_payment_method: true,
        confirmation: { type: 'redirect', return_url: 'https://ru.jungle.test/payment/return' },
      });
      expect(result).toBe(session);
    });

    it('carries the referring user through to account creation', async () => {
      await controller.createPublicPaymentSession(publicDto({ inviterId: 42 }), 'https://ru.test');

      expect(remnaUserResolver.resolveOrCreateByEmail).toHaveBeenCalledWith(
        'payer@test.com',
        expect.objectContaining({ inviterId: 42 }),
      );
    });

    it.each([
      '',
      '   ',
      'not-an-email',
      'missing@domain',
    ])('rejects %s without touching the panel or YooKassa', async (email) => {
      await expect(
        controller.createPublicPaymentSession(publicDto({ email }), 'https://ru.test'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(remnaUserResolver.resolveOrCreateByEmail).not.toHaveBeenCalled();
      expect(yookassaService.createPaymentSession).not.toHaveBeenCalled();
    });

    // An unauthenticated caller has proved nothing but knowledge of the address,
    // so they are told to log in rather than handed a second subscription.
    it('refuses an email whose account already has an active saved method', async () => {
      (remnaUserResolver.findByEmail as any).mockResolvedValue(500);
      (yookassaService.getActiveSavedMethods as any).mockResolvedValue([{ id: 'pm-1' }]);

      await expect(
        controller.createPublicPaymentSession(publicDto(), 'https://ru.test'),
      ).rejects.toMatchObject({
        response: { code: ACTIVE_SUBSCRIPTION_CODE },
      });

      expect(yookassaService.getActiveSavedMethods).toHaveBeenCalledWith(500);
      expect(yookassaService.createPaymentSession).not.toHaveBeenCalled();
    });

    it('lets a known email with no active saved method pay again', async () => {
      (remnaUserResolver.findByEmail as any).mockResolvedValue(500);
      (yookassaService.getActiveSavedMethods as any).mockResolvedValue([]);

      await controller.createPublicPaymentSession(publicDto(), 'https://ru.test');

      expect(yookassaService.createPaymentSession).toHaveBeenCalled();
    });

    it('does not look for saved methods when the email has no account at all', async () => {
      (remnaUserResolver.findByEmail as any).mockResolvedValue(null);

      await controller.createPublicPaymentSession(publicDto(), 'https://ru.test');

      expect(yookassaService.getActiveSavedMethods).not.toHaveBeenCalled();
    });
  });
});
