import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StripeProvider } from '../providers/stripe/stripe.provider';
import type { StripeWebhookService } from '../providers/stripe/stripe-webhook.service';
import { PromoInvalidError, type PromoService } from '../promo/promo.service';

vi.mock('@workspace/database', () => ({
  StripePayment: class {},
  YookassaPayment: class {},
  TelegramStarsPayment: class {},
  SavedPaymentMethod: class {},
  Promo: class {},
  PromoRedemption: class {},
}));

function makeProvider(promoResolve?: () => Promise<unknown>) {
  const repository = {
    findOne: vi.fn().mockResolvedValue(null), // no existing customer → new-customer path
  } as unknown as Repository<any>;

  const resolve = vi.fn(promoResolve ?? (async () => ({ type: 'bonus_months', months: 2 })));
  const promoService = { resolve } as unknown as PromoService;

  const provider = new StripeProvider({} as StripeWebhookService, repository, promoService);

  const sessionsCreate = vi.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe/cs_1' });
  (provider as any).stripe = {
    checkout: { sessions: { create: sessionsCreate } },
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_1' }) },
  };

  return { provider, sessionsCreate, resolve };
}

const dto = {
  userId: 'u1',
  payment: { amount: 2, currency: 'EUR' as const },
  metadata: { email: 'a@b.c' },
};

describe('StripeProvider promo wiring', () => {
  beforeEach(() => {
    process.env.STRIPE_API_KEY = 'sk_test_dummy';
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID = 'price_sub';
  });
  afterEach(() => {
    delete process.env.STRIPE_API_KEY;
    delete process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  });

  it('stamps the normalized promo onto subscription_data.metadata', async () => {
    const { provider, sessionsCreate } = makeProvider();

    await provider.createPayment({ ...dto, promoCode: ' free2 ', userStatus: 'EXPIRED' });

    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: { metadata: { promoCode: 'FREE2' } },
      }),
    );
  });

  it('omits subscription_data when no promo is given', async () => {
    const { provider, sessionsCreate } = makeProvider();
    await provider.createPayment({ ...dto });
    expect(sessionsCreate.mock.calls[0][0]).not.toHaveProperty('subscription_data');
  });

  it('rejects an invalid promo with 400 before creating a session', async () => {
    const { provider, sessionsCreate } = makeProvider(async () => {
      throw new PromoInvalidError('nope', 'invalid');
    });
    await expect(
      provider.createPayment({ ...dto, promoCode: 'BAD' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it('does not validate a promo for extra_device purchases', async () => {
    const { provider, resolve } = makeProvider();
    process.env.STRIPE_EXTRA_DEVICE_PRICE_ID = 'price_dev';
    await provider.createPayment({ ...dto, purchaseType: 'extra_device', promoCode: 'FREE2' });
    expect(resolve).not.toHaveBeenCalled();
    delete process.env.STRIPE_EXTRA_DEVICE_PRICE_ID;
  });
});
