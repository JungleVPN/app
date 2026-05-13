import 'reflect-metadata';
import { YookassaController } from '@payments/providers/yookassa/yookassa.controller';
import type { YookassaService } from '@payments/providers/yookassa/yookassa.service';
import { type CreateYookassaSessionDto } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@workspace/database', () => ({
  YookassaPayment: class {},
  SavedPaymentMethod: class {},
}));

describe('YookassaController', () => {
  let controller: YookassaController;
  let yookassaService: YookassaService;

  beforeEach(() => {
    vi.clearAllMocks();

    yookassaService = {
      handleWebhook: vi.fn(),
      getActiveSavedMethods: vi.fn(),
      deletePaymentMethod: vi.fn(),
      listPayments: vi.fn(),
      getPaymentById: vi.fn(),
      createPaymentSession: vi.fn(),
    } as unknown as YookassaService;

    controller = new YookassaController(yookassaService);
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
    it('delegates to the service', async () => {
      const methods = [{ id: '1' }, { id: '2' }];
      (yookassaService.getActiveSavedMethods as any).mockResolvedValue(methods);

      const result = await controller.getActiveSavedMethods('user-1');

      expect(yookassaService.getActiveSavedMethods).toHaveBeenCalledWith('user-1');
      expect(result).toBe(methods);
    });
  });

  describe('deleteSavedMethod', () => {
    it('delegates to the service and returns { ok: true }', async () => {
      (yookassaService.deletePaymentMethod as any).mockResolvedValue(undefined);

      const result = await controller.deleteSavedMethod('user-1', 'method-1');

      expect(yookassaService.deletePaymentMethod).toHaveBeenCalledWith('method-1', 'user-1');
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
        userId: 'user-1',
        selectedPeriod: 1,
        amount: { value: '100.00', currency: 'RUB' },
        description: 'test',
        save_payment_method: true,
      };
      const session = { id: 'sess-1', url: 'https://yk/sess-1' };
      (yookassaService.createPaymentSession as any).mockResolvedValue(session);

      const result = await controller.createPaymentSession(dto);

      expect(yookassaService.createPaymentSession).toHaveBeenCalledWith(dto);
      expect(result).toBe(session);
    });
  });
});
