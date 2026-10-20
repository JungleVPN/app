import 'reflect-metadata';
import type { RemnaUserResolverService } from '@payments/auth/remna-user-resolver.service';
import { ExpiredSavedMethodsService } from '@payments/providers/yookassa/autopayment/expired-saved-methods.service';
import type { SavedPaymentMethod } from '@workspace/database';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { describe, expect, it } from 'vitest';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const PAST = new Date('2026-10-15T10:00:00.000Z');
const FUTURE = new Date('2026-11-15T10:00:00.000Z');

const savedMethod = (overrides: Partial<SavedPaymentMethod> = {}): SavedPaymentMethod => ({
  id: 'sm-1',
  userId: 2871,
  provider: 'yookassa',
  paymentMethodId: 'pm-1',
  paymentMethodType: 'bank_card',
  title: null,
  card: null,
  iconUrl: null,
  isActive: true,
  productName: null,
  amount: null,
  currency: null,
  billingPeriod: null,
  renewsAt: null,
  status: null,
  createdAt: PAST,
  updatedAt: PAST,
  ...overrides,
});

const matches = (row: SavedPaymentMethod, where: FindOptionsWhere<SavedPaymentMethod>) =>
  Object.entries(where).every(([key, value]) => row[key as keyof SavedPaymentMethod] === value);

/** An in-memory table holding the rows, so a test reads back what was written. */
const savedMethodTable = (initial: SavedPaymentMethod[]) => {
  const rows = initial.map((row) => ({ ...row }));
  const repo = {
    find: async ({ where }: { where: FindOptionsWhere<SavedPaymentMethod> }) =>
      rows.filter((row) => matches(row, where)).map((row) => ({ ...row })),
    update: async (
      where: FindOptionsWhere<SavedPaymentMethod>,
      patch: Partial<SavedPaymentMethod>,
    ) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) Object.assign(row, patch);
      return { affected: hit.length };
    },
  };
  return { rows, repo: repo as unknown as Repository<SavedPaymentMethod> };
};

const panelWith = (expiries: Record<number, Date | null | Error>) =>
  ({
    getExpiry: async (userId: number) => {
      const expiry = expiries[userId];
      if (expiry instanceof Error) throw expiry;
      return expiry ?? null;
    },
  }) as unknown as RemnaUserResolverService;

const setup = (rows: SavedPaymentMethod[], expiries: Record<number, Date | null | Error>) => {
  const table = savedMethodTable(rows);
  const service = new ExpiredSavedMethodsService(table.repo, panelWith(expiries));
  return { rows: table.rows, service };
};

const stateOf = (rows: SavedPaymentMethod[], id: string) => {
  const row = rows.find((candidate) => candidate.id === id);
  return { isActive: row?.isActive, status: row?.status };
};

describe('ExpiredSavedMethodsService.terminateExpired', () => {
  it('terminates the saved YooKassa method of a user whose access has ended', async () => {
    const { rows, service } = setup([savedMethod()], { 2871: PAST });

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(stateOf(rows, 'sm-1')).toEqual({ isActive: false, status: 'terminated' });
    expect(report).toEqual({
      checkedUsers: 1,
      terminated: [{ userId: 2871, savedMethodId: 'sm-1' }],
      unresolvedUsers: [],
    });
  });

  it('keeps the method of a user who still has access', async () => {
    const { rows, service } = setup([savedMethod()], { 2871: FUTURE });

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(stateOf(rows, 'sm-1')).toEqual({ isActive: true, status: null });
    expect(report.terminated).toEqual([]);
  });

  it('treats access ending exactly now as ended', async () => {
    const { rows, service } = setup([savedMethod()], { 2871: NOW });

    await service.terminateExpired({ dryRun: false, now: NOW });

    expect(stateOf(rows, 'sm-1')).toEqual({ isActive: false, status: 'terminated' });
  });

  it('only reports what it would terminate on a dry run', async () => {
    const { rows, service } = setup([savedMethod()], { 2871: PAST });

    const report = await service.terminateExpired({ dryRun: true, now: NOW });

    expect(stateOf(rows, 'sm-1')).toEqual({ isActive: true, status: null });
    expect(report.terminated).toEqual([{ userId: 2871, savedMethodId: 'sm-1' }]);
  });

  it('leaves methods of other providers to their own webhooks', async () => {
    const { rows, service } = setup([savedMethod({ id: 'whop-1', provider: 'whop' })], {
      2871: PAST,
    });

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(stateOf(rows, 'whop-1')).toEqual({ isActive: true, status: null });
    expect(report.checkedUsers).toBe(0);
  });

  it('ignores methods that are already inactive', async () => {
    const { service } = setup([savedMethod({ isActive: false })], { 2871: PAST });

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(report).toEqual({ checkedUsers: 0, terminated: [], unresolvedUsers: [] });
  });

  it('asks the panel once per user and terminates all of their methods', async () => {
    const lookups: number[] = [];
    const table = savedMethodTable([savedMethod({ id: 'sm-1' }), savedMethod({ id: 'sm-2' })]);
    const panel = {
      getExpiry: async (userId: number) => {
        lookups.push(userId);
        return PAST;
      },
    } as unknown as RemnaUserResolverService;
    const service = new ExpiredSavedMethodsService(table.repo, panel);

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(lookups).toEqual([2871]);
    expect(report.checkedUsers).toBe(1);
    expect(report.terminated).toEqual([
      { userId: 2871, savedMethodId: 'sm-1' },
      { userId: 2871, savedMethodId: 'sm-2' },
    ]);
  });

  it('keeps and reports a user the panel cannot answer for, and carries on with the rest', async () => {
    const { rows, service } = setup(
      [
        savedMethod({ id: 'down', userId: 1 }),
        savedMethod({ id: 'gone', userId: 2 }),
        savedMethod({ id: 'expired', userId: 3 }),
      ],
      { 1: new Error('panel down'), 2: null, 3: PAST },
    );

    const report = await service.terminateExpired({ dryRun: false, now: NOW });

    expect(stateOf(rows, 'down')).toEqual({ isActive: true, status: null });
    expect(stateOf(rows, 'gone')).toEqual({ isActive: true, status: null });
    expect(stateOf(rows, 'expired')).toEqual({ isActive: false, status: 'terminated' });
    expect(report).toEqual({
      checkedUsers: 3,
      terminated: [{ userId: 3, savedMethodId: 'expired' }],
      unresolvedUsers: [1, 2],
    });
  });
});
