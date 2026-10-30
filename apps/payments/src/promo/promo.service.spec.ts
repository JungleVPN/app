import type { AdminService } from '@payments/admin/admin.service';
import type { AnalyticsClientService } from '@payments/analytics/analytics-client.service';
import { Promo, type PromoRedemption } from '@workspace/database';
import type { AdminPaymentDto, PromoEffect } from '@workspace/types';
import { type DataSource, FindOperator, type Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { PromoInvalidError, PromoService } from './promo.service';

const BONUS: PromoEffect = { type: 'bonus_months', days: 2 };

function makePromo(overrides: Partial<Promo> = {}): Promo {
  return {
    code: 'FREE2',
    effect: BONUS,
    startsAt: null,
    endsAt: null,
    maxRedemptions: null,
    perUserLimit: 1,
    eligibility: 'all',
    duration: 'forever',
    durationMonths: null,
    planPeriods: null,
    scope: 'ru',
    featured: false,
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

  const analyticsClient = {
    track: vi.fn().mockResolvedValue(undefined),
  } as unknown as AnalyticsClientService;

  const service = new PromoService(
    promoRepo as any,
    redemptionRepo as any,
    dataSource as any,
    adminService as any,
    analyticsClient,
  );
  return { service, insert, txRedemptions, adminService };
}

function makePayment(overrides: Partial<AdminPaymentDto> = {}): AdminPaymentDto {
  return {
    paymentId: 'p1',
    provider: 'yookassa',
    userId: 1000,
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
      await expect(service.resolve('free2', { userId: 1000 })).resolves.toEqual(BONUS);
    });

    it('normalizes the code (trim + uppercase)', async () => {
      const { service } = setup({ promo: makePromo() });
      await service.resolve('  free2 ', { userId: 1000 });
      // findOneBy called with normalized code
      expect((service as any).promoRepo.findOneBy).toHaveBeenCalledWith({ code: 'FREE2' });
    });

    it('rejects unknown or inactive promos', async () => {
      await expect(
        setup({ promo: null }).service.resolve('x', { userId: 1000 }),
      ).rejects.toBeInstanceOf(PromoInvalidError);
      await expect(
        setup({ promo: makePromo({ active: false }) }).service.resolve('FREE2', { userId: 1000 }),
      ).rejects.toBeInstanceOf(PromoInvalidError);
    });

    it('rejects outside the date window', async () => {
      const future = makePromo({ startsAt: new Date(Date.now() + 86_400_000) });
      await expect(
        setup({ promo: future }).service.resolve('FREE2', { userId: 1000 }),
      ).rejects.toThrow(/not active yet/);

      const past = makePromo({ endsAt: new Date(Date.now() - 86_400_000) });
      await expect(
        setup({ promo: past }).service.resolve('FREE2', { userId: 1000 }),
      ).rejects.toThrow(/expired/);
    });

    it('enforces expired_only eligibility', async () => {
      const promo = makePromo({ eligibility: 'expired_only' });
      await expect(
        setup({ promo }).service.resolve('FREE2', { userId: 1000, userStatus: 'ACTIVE' }),
      ).rejects.toThrow(/expired subscriptions/);
      await expect(
        setup({ promo }).service.resolve('FREE2', { userId: 1000, userStatus: 'EXPIRED' }),
      ).resolves.toEqual(BONUS);
    });

    it('enforces new-user eligibility against payment history, not current subscription state', async () => {
      const promo = makePromo({ eligibility: 'new' });

      // Has a settled payment on record -> rejected, even with no active subscription.
      const rejected = setup({ promo, payments: [makePayment()] }).service.resolve('FREE2', {
        userId: 1000,
      });
      await expect(rejected).rejects.toThrow(/only for new users/);
      await expect(rejected).rejects.toMatchObject({ code: 'not_new_user' });

      // Never paid -> eligible.
      await expect(
        setup({ promo, payments: [] }).service.resolve('FREE2', { userId: 1000 }),
      ).resolves.toEqual(BONUS);
    });

    it('ignores unsettled payments (no paidAt) when checking new-user eligibility', async () => {
      const promo = makePromo({ eligibility: 'new' });
      const pending = makePayment({ paidAt: null });

      await expect(
        setup({ promo, payments: [pending] }).service.resolve('FREE2', { userId: 1000 }),
      ).resolves.toEqual(BONUS);
    });

    it('ignores extra-device purchases when checking new-user eligibility', async () => {
      const promo = makePromo({ eligibility: 'new' });
      const extraDevice = makePayment({ purpose: 'extra_device' });

      // A trial user who bought an extra device slot has never paid for a
      // subscription, so they're still eligible for a new-user promo.
      await expect(
        setup({ promo, payments: [extraDevice] }).service.resolve('FREE2', { userId: 1000 }),
      ).resolves.toEqual(BONUS);
    });

    it('rejects a promo limited to other plan lengths once the period is known', async () => {
      const promo = makePromo({ planPeriods: [90, 365] });

      const rejected = setup({ promo }).service.resolve('FREE2', {
        userId: 1000,
        selectedPeriod: 30,
      });
      await expect(rejected).rejects.toThrow(/does not apply to this plan/);
      await expect(rejected).rejects.toMatchObject({ code: 'not_for_plan' });

      await expect(
        setup({ promo }).service.resolve('FREE2', { userId: 1000, selectedPeriod: 365 }),
      ).resolves.toEqual(BONUS);
    });

    it('leaves the plan check to checkout while the period is unknown', async () => {
      const promo = makePromo({ planPeriods: [365] });
      await expect(setup({ promo }).service.resolve('FREE2', { userId: 1000 })).resolves.toEqual(
        BONUS,
      );
    });

    it('refuses discount promos, which only the provider holding the code can charge', async () => {
      const percentage = makePromo({ effect: { type: 'percentage', percent: 10 } });
      const fixed = makePromo({ effect: { type: 'fixed_amount', amount: 2, currency: 'EUR' } });

      const rejected = setup({ promo: percentage }).service.resolve('FREE2', { userId: 1000 });
      await expect(rejected).rejects.toThrow(/cannot be used here/);
      await expect(rejected).rejects.toMatchObject({ code: 'unsupported_effect' });
      await expect(
        setup({ promo: fixed }).service.resolve('FREE2', { userId: 1000 }),
      ).rejects.toMatchObject({ code: 'unsupported_effect' });
    });

    it('enforces the per-user limit', async () => {
      const { service } = setup({ promo: makePromo({ perUserLimit: 1 }), userRedemptions: 1 });
      await expect(service.resolve('FREE2', { userId: 1000 })).rejects.toThrow(/already used/);
    });

    it('enforces the global cap', async () => {
      const { service } = setup({
        promo: makePromo({ maxRedemptions: 100 }),
        totalRedemptions: 100,
      });
      await expect(service.resolve('FREE2', { userId: 1000 })).rejects.toThrow(/reached its limit/);
    });
  });

  describe('PromoService.validate', () => {
    it('wraps resolve into a non-throwing response', async () => {
      const ok = setup({ promo: makePromo() }).service;
      await expect(ok.validate({ code: 'FREE2', userId: 1000 })).resolves.toEqual({
        valid: true,
        effect: BONUS,
      });

      const bad = setup({ promo: null }).service;
      const res = await bad.validate({ code: 'NOPE', userId: 1000 });
      expect(res.valid).toBe(false);
      expect(res.reason).toBeTruthy();
    });

    it('does not record a rejection for a valid code', async () => {
      const { service } = setup({ promo: makePromo() });
      const analyticsClient = (service as any).analyticsClient;

      await service.validate({ code: 'FREE2', userId: 1000 });

      expect(analyticsClient.track).not.toHaveBeenCalled();
    });

    it('records the rejection for analytics, with the stable error code', async () => {
      const { service } = setup({ promo: null });
      const analyticsClient = (service as any).analyticsClient;

      await service.validate({ code: 'nope', userId: 1000 });

      expect(analyticsClient.track).toHaveBeenCalledWith({
        event: 'promo_code_rejected',
        userId: 1000,
        code: 'NOPE',
        reason: 'invalid',
      });
    });
  });

  describe('PromoService.applyToMonths', () => {
    const ctx = { userId: 1000, provider: 'yookassa' as const, paymentId: 'p1' };

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
          userId: 1000,
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

    it('grants no bonus for a plan length the promo does not cover', async () => {
      const { service, insert } = setup({ promo: makePromo({ planPeriods: [365] }) });
      await expect(service.applyToMonths('FREE2', 30, ctx)).resolves.toBe(30);
      expect(insert).not.toHaveBeenCalled();
    });

    it('grants the bonus for a plan length the promo covers', async () => {
      const { service } = setup({ promo: makePromo({ planPeriods: [30, 365] }) });
      await expect(service.applyToMonths('FREE2', 30, ctx)).resolves.toBe(32);
    });

    it('grants no bonus for a discount promo', async () => {
      const { service, insert } = setup({
        promo: makePromo({ effect: { type: 'percentage', percent: 10 } }),
      });
      await expect(service.applyToMonths('FREE2', 30, ctx)).resolves.toBe(30);
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

/** Whether `actual` satisfies a `where` value — a plain value or an `In(...)` operator. */
function matchesWhere(actual: unknown, expected: unknown): boolean {
  if (expected instanceof FindOperator && expected.type === 'in') {
    return (expected.value as unknown[]).includes(actual);
  }
  return actual === expected;
}

/** A service over a promos table holding `promos`, with `redeemed` redemptions per code. */
function setupListing(opts: { promos: Promo[]; redeemed?: Record<string, number> }) {
  const promoRepo = {
    find: vi.fn(({ where }: { where: Partial<Promo> }) =>
      Promise.resolve(
        opts.promos
          .filter((promo) =>
            Object.entries(where).every(([key, value]) =>
              matchesWhere(promo[key as keyof Promo], value),
            ),
          )
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
    ),
  };
  const redemptionRepo = {
    countBy: vi.fn(({ promoCode }: { promoCode: string }) =>
      Promise.resolve(opts.redeemed?.[promoCode] ?? 0),
    ),
  };
  return new PromoService(
    promoRepo as unknown as Repository<Promo>,
    redemptionRepo as unknown as Repository<PromoRedemption>,
    {} as DataSource,
    {} as AdminService,
    {} as AnalyticsClientService,
  );
}

const DAY = 86_400_000;

function makeGlobal(overrides: Partial<Promo> = {}): Promo {
  return makePromo({ scope: 'global', ...overrides });
}

const codesOf = (promos: { code: string }[]) => promos.map((promo) => promo.code);

describe('PromoService.listAvailable', () => {
  it('lists the promos of the requested storefront with their conditions', async () => {
    const endsAt = new Date(Date.now() + DAY);
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'RU10', scope: 'ru' }),
        makeGlobal({
          code: 'GLOBAL10',
          effect: { type: 'percentage', percent: 10 },
          eligibility: 'new',
          duration: 'multiple_months',
          durationMonths: 3,
          perUserLimit: 2,
          planPeriods: [90, 365],
          endsAt,
        }),
      ],
    });

    await expect(service.listAvailable({ scope: 'global' })).resolves.toEqual([
      {
        code: 'GLOBAL10',
        effect: { type: 'percentage', percent: 10 },
        eligibility: 'new',
        duration: 'multiple_months',
        durationMonths: 3,
        endsAt: endsAt.toISOString(),
        perUserLimit: 2,
        planPeriods: [90, 365],
      },
    ]);
    expect(codesOf(await service.listAvailable({ scope: 'ru' }))).toEqual(['RU10']);
  });

  it('lists a promo for every storefront on both RU and global', async () => {
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'EVERYONE', scope: 'all' }),
        makeGlobal({ code: 'RU10', scope: 'ru' }),
        makeGlobal({ code: 'GLOBAL10' }),
      ],
    });

    expect(codesOf(await service.listAvailable({ scope: 'global' })).sort()).toEqual([
      'EVERYONE',
      'GLOBAL10',
    ]);
    expect(codesOf(await service.listAvailable({ scope: 'ru' })).sort()).toEqual([
      'EVERYONE',
      'RU10',
    ]);
  });

  it('reports no end date for a promo without one', async () => {
    const service = setupListing({ promos: [makeGlobal({ endsAt: null })] });
    await expect(service.listAvailable({ scope: 'global' })).resolves.toMatchObject([
      { endsAt: null },
    ]);
  });

  it('lists featured and non-featured promos when featured is not asked for', async () => {
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'PLAIN', createdAt: new Date(2026, 9, 1) }),
        makeGlobal({ code: 'STAR', featured: true, createdAt: new Date(2026, 9, 2) }),
      ],
    });
    expect(codesOf(await service.listAvailable({ scope: 'global' }))).toEqual(['STAR', 'PLAIN']);
  });

  it('narrows the list by the featured flag when asked', async () => {
    const service = setupListing({
      promos: [makeGlobal({ code: 'PLAIN' }), makeGlobal({ code: 'STAR', featured: true })],
    });
    expect(codesOf(await service.listAvailable({ scope: 'global', featured: true }))).toEqual([
      'STAR',
    ]);
    expect(codesOf(await service.listAvailable({ scope: 'global', featured: false }))).toEqual([
      'PLAIN',
    ]);
  });

  it('lists nothing when the storefront has no promos', async () => {
    const service = setupListing({ promos: [makeGlobal({ code: 'RU10', scope: 'ru' })] });
    await expect(service.listAvailable({ scope: 'global' })).resolves.toEqual([]);
  });

  it('never lists a switched-off promo', async () => {
    const service = setupListing({ promos: [makeGlobal({ active: false })] });
    await expect(service.listAvailable({ scope: 'global' })).resolves.toEqual([]);
  });

  it('only lists a promo inside its date window', async () => {
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'NOT_STARTED', startsAt: new Date(Date.now() + DAY) }),
        makeGlobal({ code: 'ENDED', endsAt: new Date(Date.now() - DAY) }),
        makeGlobal({
          code: 'RUNNING',
          startsAt: new Date(Date.now() - DAY),
          endsAt: new Date(Date.now() + DAY),
        }),
      ],
    });
    expect(codesOf(await service.listAvailable({ scope: 'global' }))).toEqual(['RUNNING']);
  });

  it('never lists an expired-subscriptions-only promo to an anonymous payer', async () => {
    const service = setupListing({ promos: [makeGlobal({ eligibility: 'expired_only' })] });
    await expect(service.listAvailable({ scope: 'global' })).resolves.toEqual([]);
  });

  it('leaves out a promo that has used up its redemptions', async () => {
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'FULL', maxRedemptions: 100 }),
        makeGlobal({ code: 'ROOMY', maxRedemptions: 100 }),
        makeGlobal({ code: 'UNCAPPED', maxRedemptions: null }),
      ],
      redeemed: { FULL: 100, ROOMY: 99, UNCAPPED: 5000 },
    });
    expect(codesOf(await service.listAvailable({ scope: 'global' }))).toEqual([
      'ROOMY',
      'UNCAPPED',
    ]);
  });

  it('lists the newest promo first', async () => {
    const service = setupListing({
      promos: [
        makeGlobal({ code: 'OLDER', createdAt: new Date(2026, 9, 1) }),
        makeGlobal({ code: 'NEWER', createdAt: new Date(2026, 9, 2) }),
      ],
    });
    expect(codesOf(await service.listAvailable({ scope: 'global' }))).toEqual(['NEWER', 'OLDER']);
  });
});
