import 'reflect-metadata';
import { YooKassaConnector } from '@payments/providers/yookassa/helpers/yookassa.connector';
import { YooKassaProvider } from '@payments/providers/yookassa/yookassa.provider';
import type { Payments } from '@workspace/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('YooKassaProvider', () => {
  let connector: { request: ReturnType<typeof vi.fn> };
  let provider: YooKassaProvider;

  beforeEach(() => {
    connector = { request: vi.fn() };
    provider = new YooKassaProvider(connector as unknown as YooKassaConnector);
  });

  describe('create', () => {
    it('delegates to connector.request with POST / and returns the payment', async () => {
      const payment = { id: 'pay_1', status: 'pending' } as unknown as Payments.IPayment;
      connector.request.mockResolvedValue(payment);

      const request: Payments.CreatePaymentRequest = {
        amount: { value: '100.00', currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: 'https://return.test' },
      };

      const result = await provider.create(request);

      expect(connector.request).toHaveBeenCalledWith('POST', '/', request, undefined);
      expect(result).toBe(payment);
    });

    it('forwards a caller-supplied idempotence key', async () => {
      connector.request.mockResolvedValue({ id: 'pay_2' } as Payments.IPayment);

      await provider.create(
        { amount: { value: '1', currency: 'RUB' } } as Payments.CreatePaymentRequest,
        'my-key',
      );

      expect(connector.request).toHaveBeenCalledWith('POST', '/', expect.any(Object), 'my-key');
    });

    it('rethrows when the connector throws', async () => {
      connector.request.mockRejectedValue(new Error('network'));

      await expect(
        provider.create({
          amount: { value: '1', currency: 'RUB' },
        } as Payments.CreatePaymentRequest),
      ).rejects.toThrow('network');
    });
  });

  describe('getPayment', () => {
    it('delegates to connector.request with GET /:id', async () => {
      const payment = { id: 'pay_1', status: 'succeeded' } as unknown as Payments.IPayment;
      connector.request.mockResolvedValue(payment);

      const result = await provider.getPayment('pay_1');

      expect(connector.request).toHaveBeenCalledWith('GET', '/pay_1');
      expect(result).toBe(payment);
    });
  });
});
