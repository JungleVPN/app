import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import type { PaymentStatusService } from '../payment-status/payment-status.service';
import { PromoInvalidError, type PromoService } from '../promo/promo.service';
import { TelegramStarsService } from '../providers/telegram-stars/telegram-stars.service';

vi.mock('@workspace/database', () => ({
  TelegramStarsPayment: class {},
  Promo: class {},
  PromoRedemption: class {},
}));

function makeService(promoResolve?: () => Promise<unknown>) {
  const created: any[] = [];
  const repo = {
    create: vi.fn((row: any) => row),
    save: vi.fn(async (row: any) => {
      created.push(row);
      return { ...row, id: 'rec-1' };
    }),
    findOneBy: vi.fn(),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  } as unknown as Repository<any>;

  const handleUserUpdates = vi.fn().mockResolvedValue({ success: true });
  const paymentStatusService = { handleUserUpdates } as unknown as PaymentStatusService;

  const paymentsUtils = {
    getAllowedPeriods: () => [1],
    getAllowedStarsAmounts: () => [500],
    getExtraDeviceStarsAmount: () => 250,
  } as any;

  const resolve = vi.fn(promoResolve ?? (async () => ({ type: 'bonus_months', months: 2 })));
  const promoService = { resolve } as unknown as PromoService;

  const service = new TelegramStarsService(repo, paymentStatusService, paymentsUtils, promoService);
  // Bypass onModuleInit (no real bot/token in tests).
  (service as any).bot = {
    api: { createInvoiceLink: vi.fn().mockResolvedValue('https://t.me/inv') },
  };

  return { service, repo, handleUserUpdates, resolve };
}

const baseInvoiceDto = {
  userId: 'u1',
  telegramId: 42,
  selectedPeriod: 1,
  starsAmount: 500,
  title: 'Sub',
  description: 'desc',
} as const;

describe('TelegramStarsService.createInvoice (promo)', () => {
  it('validates and stores the normalized promo code', async () => {
    const { service, repo, resolve } = makeService();

    await service.createInvoice({ ...baseInvoiceDto, promoCode: ' free2 ', userStatus: 'EXPIRED' });

    expect(resolve).toHaveBeenCalledWith(' free2 ', expect.objectContaining({ userId: 'u1' }));
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ promoCode: 'FREE2' }));
  });

  it('stores null when no promo code is given', async () => {
    const { service, repo, resolve } = makeService();
    await service.createInvoice({ ...baseInvoiceDto });
    expect(resolve).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ promoCode: null }));
  });

  it('rejects an invalid promo with 400', async () => {
    const { service } = makeService(async () => {
      throw new PromoInvalidError('nope', 'invalid');
    });
    await expect(
      service.createInvoice({ ...baseInvoiceDto, promoCode: 'BAD' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not validate a promo for extra_device purchases', async () => {
    const { service, repo, resolve } = makeService();
    await service.createInvoice({ ...baseInvoiceDto, purpose: 'extra_device', promoCode: 'FREE2' });
    expect(resolve).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ promoCode: null }));
  });
});

describe('TelegramStarsService.handlePaymentSucceeded (promo)', () => {
  it('passes the stored promo to handleUserUpdates', async () => {
    const { service, repo, handleUserUpdates } = makeService();
    (repo.findOneBy as any).mockResolvedValue({
      id: 'rec-1',
      userId: 'u1',
      selectedPeriod: 1,
      status: 'pending',
      purpose: 'subscription',
      promoCode: 'FREE2',
    });

    await service.handlePaymentSucceeded({
      paymentRecordId: 'rec-1',
      telegramPaymentChargeId: 'charge-1',
    });

    expect(handleUserUpdates).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        selectedPeriod: 1,
        promo: { code: 'FREE2', provider: 'stars', paymentId: 'rec-1' },
      }),
    );
  });
});
