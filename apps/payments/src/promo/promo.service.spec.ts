import { Promo } from '@workspace/database';
import type { AdminPaymentDto, PromoEffect } from '@workspace/types';
import { describe, expect, it, vi } from 'vitest';
import { PromoInvalidError, PromoService } from './promo.service';

const BONUS: PromoEffect = { type: 'bonus_months', months: 2 };

function makePromo(overrides: Partial<Promo> = {}): Promo {
  return {
    code: 'FREE2',
    effect: BONUS,
    startsAt: null,
    endsAt: null,
    maxRedemptions: null,
    perUserLimit: 1,
    eligibility: 'all',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Builds a service whose repos/transaction are backed by simple mocks. */
function setup(opts: {
  promo: Promo | null;
  userRedemptions?: number;
  totalRedemptions?: number;
  existingRedemption?: boolean;
  /** Settled payments returned by AdminService.search, keyed by userId (defaults to none). */
  payments?: AdminPaymentDto[];
}) {
  const promoRepo = { findOneBy: vi.fn().mockResolvedValue(opts.promo) };

  const counts = {
    byUser: opts.userRedemptions ?? 0,
    total: opts.totalRedemptions ?? 0,
  };
  // resolve()'s redemptionRepo: distinguish per-user vs global by arg shape.
  const redemptionRepo = {
    countBy: vi.fn((where: any) =>
      Promise.resolve('userId' in where ? counts.byUser : counts.total),
    ),
  };

  const insert = vi.fn().mockResolvedValue(undefined);
  const txRedemptions = {
    findOneBy: vi.fn().mockResolvedValue(opts.existingRedemption ? { id: 'x' } : null),
    countBy: vi.fn((where: any) =>
      Promise.resolve('userId' in where ? counts.byUser : counts.total),
    ),
    insert,
  };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === Promo ? { findOneBy: vi.fn().mockResolvedValue(opts.promo) } : txRedemptions,
  };
  const dataSource = { transaction: (cb: any) => cb(manager) };

  const adminService = { search: vi.fn().mockResolvedValue(opts.payments ?? []) };

  const service = new PromoService(
    promoRepo as any,
    redemptionRepo as any,
    dataSource as any,
    adminService as any,
  );
  return { service, insert, txRedemptions, adminService };
}

function makePayment(overrides: Partial<AdminPaymentDto> = {}): AdminPaymentDto {
  return {
    paymentId: 'p1',
    provider: 'yookassa',
    userId: 'u1',
    telegramId: null,
    status: 'succeeded',
    purpose: 'subscription',
    selectedPeriod: 1,
    createdAt: new Date(),
    paidAt: new Date(),
    ...overrides,
  };
}

describe('PromoService', () => {
  describe('PromoService.resolve', () => {
    it('returns the effect for a valid promo', async () => {
      const { service } = setup({ promo: makePromo() });
      await expect(service.resolve('free2', { userId: 'u1' })).resolves.toEqual(BONUS);
    });

    it('normalizes the code (trim + uppercase)', async () => {
      const { service } = setup({ promo: makePromo() });
      await service.resolve('  free2 ', { userId: 'u1' });
      // findOneBy called with normalized code
      expect((service as any).promoRepo.findOneBy).toHaveBeenCalledWith({ code: 'FREE2' });
    });

    it('rejects unknown or inactive promos', async () => {
      await expect(
        setup({ promo: null }).service.resolve('x', { userId: 'u1' }),
      ).rejects.toBeInstanceOf(PromoInvalidError);
      await expect(
        setup({ promo: makePromo({ active: false }) }).service.resolve('FREE2', { userId: 'u1' }),
      ).rejects.toBeInstanceOf(PromoInvalidError);
    });

    it('rejects outside the date window', async () => {
      const future = makePromo({ startsAt: new Date(Date.now() + 86_400_000) });
      await expect(
        setup({ promo: future }).service.resolve('FREE2', { userId: 'u1' }),
      ).rejects.toThrow(/not active yet/);

      const past = makePromo({ endsAt: new Date(Date.now() - 86_400_000) });
      await expect(
        setup({ promo: past }).service.resolve('FREE2', { userId: 'u1' }),
      ).rejects.toThrow(/expired/);
    });

    it('enforces expired_only eligibility', async () => {
      const promo = makePromo({ eligibility: 'expired_only' });
      await expect(
        setup({ promo }).service.resolve('FREE2', { userId: 'u1', userStatus: 'ACTIVE' }),
      ).rejects.toThrow(/expired subscriptions/);
      await expect(
        setup({ promo }).service.resolve('FREE2', { userId: 'u1', userStatus: 'EXPIRED' }),
      ).resolves.toEqual(BONUS);
    });

    it('enforces new-user eligibility against payment history, not current subscription state', async () => {
      const promo = makePromo({ eligibility: 'new' });

      // Has a settled payment on record -> rejected, even with no active subscription.
      const rejected = setup({ promo, payments: [makePayment()] }).service.resolve('FREE2', {
        userId: 'u1',
      });
      await expect(rejected).rejects.toThrow(/only for new users/);
      await expect(rejected).rejects.toMatchObject({ code: 'not_new_user' });

      // Never paid -> eligible.
      await expect(
        setup({ promo, payments: [] }).service.resolve('FREE2', { userId: 'u1' }),
      ).resolves.toEqual(BONUS);
    });

    it('ignores unsettled payments (no paidAt) when checking new-user eligibility', async () => {
      const promo = makePromo({ eligibility: 'new' });
      const pending = makePayment({ paidAt: null });

      await expect(
        setup({ promo, payments: [pending] }).service.resolve('FREE2', { userId: 'u1' }),
      ).resolves.toEqual(BONUS);
    });

    it('ignores extra-device purchases when checking new-user eligibility', async () => {
      const promo = makePromo({ eligibility: 'new' });
      const extraDevice = makePayment({ purpose: 'extra_device' });

      // A trial user who bought an extra device slot has never paid for a
      // subscription, so they're still eligible for a new-user promo.
      await expect(
        setup({ promo, payments: [extraDevice] }).service.resolve('FREE2', { userId: 'u1' }),
      ).resolves.toEqual(BONUS);
    });

    it('enforces the per-user limit', async () => {
      const { service } = setup({ promo: makePromo({ perUserLimit: 1 }), userRedemptions: 1 });
      await expect(service.resolve('FREE2', { userId: 'u1' })).rejects.toThrow(/already used/);
    });

    it('enforces the global cap', async () => {
      const { service } = setup({
        promo: makePromo({ maxRedemptions: 100 }),
        totalRedemptions: 100,
      });
      await expect(service.resolve('FREE2', { userId: 'u1' })).rejects.toThrow(/reached its limit/);
    });
  });

  describe('PromoService.validate', () => {
    it('wraps resolve into a non-throwing response', async () => {
      const ok = setup({ promo: makePromo() }).service;
      await expect(ok.validate({ code: 'FREE2', userId: 'u1' })).resolves.toEqual({
        valid: true,
        effect: BONUS,
      });

      const bad = setup({ promo: null }).service;
      const res = await bad.validate({ code: 'NOPE', userId: 'u1' });
      expect(res.valid).toBe(false);
      expect(res.reason).toBeTruthy();
    });
  });

  describe('PromoService.applyToMonths', () => {
    const ctx = { userId: 'u1', provider: 'yookassa' as const, paymentId: 'p1' };

    it('returns months unchanged when there is no code', async () => {
      const { service, insert } = setup({ promo: makePromo() });
      await expect(service.applyToMonths(null, 1, ctx)).resolves.toBe(1);
      expect(insert).not.toHaveBeenCalled();
    });

    it('adds the bonus and records a redemption for a valid promo', async () => {
      const { service, insert } = setup({ promo: makePromo() });
      await expect(service.applyToMonths('FREE2', 1, ctx)).resolves.toBe(3);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: 'FREE2',
          userId: 'u1',
          provider: 'yookassa',
          paymentId: 'p1',
        }),
      );
    });

    it('is idempotent — no double grant when already redeemed for this payment', async () => {
      const { service, insert } = setup({ promo: makePromo(), existingRedemption: true });
      await expect(service.applyToMonths('FREE2', 1, ctx)).resolves.toBe(1);
      expect(insert).not.toHaveBeenCalled();
    });

    it('grants no bonus once the per-user limit is reached', async () => {
      const { service, insert } = setup({
        promo: makePromo({ perUserLimit: 1 }),
        userRedemptions: 1,
      });
      await expect(service.applyToMonths('FREE2', 1, ctx)).resolves.toBe(1);
      expect(insert).not.toHaveBeenCalled();
    });
  });
});
