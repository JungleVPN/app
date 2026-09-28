import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { AddPlanCurrency1802000000000 } from '../1802000000000-AddPlanCurrency';

const run = async (step: 'up' | 'down') => {
  const queries: string[] = [];
  const runner = { query: async (sql: string) => queries.push(sql) } as unknown as QueryRunner;

  await new AddPlanCurrency1802000000000()[step](runner);

  return queries.map((sql) => sql.replace(/\s+/g, ' ').trim());
};

const indexOf = (queries: string[], fragment: string) =>
  queries.findIndex((sql) => sql.includes(fragment));

describe('AddPlanCurrency1802000000000', () => {
  it("backfills each existing plan with its provider's currency before requiring one", async () => {
    const queries = await run('up');
    const backfill = indexOf(queries, 'UPDATE "subscription_plans"');

    expect(queries[backfill]).toContain(`WHEN 'yookassa' THEN 'RUB'`);
    expect(queries[backfill]).toContain(`ELSE 'EUR'`);
    expect(backfill).toBeGreaterThan(indexOf(queries, 'ADD COLUMN "currency" text'));
    expect(backfill).toBeLessThan(indexOf(queries, 'ALTER COLUMN "currency" SET NOT NULL'));
  });

  it('only accepts uppercase three-letter currency codes', async () => {
    const queries = await run('up');

    expect(queries).toContainEqual(expect.stringContaining(`CHECK ("currency" ~ '^[A-Z]{3}$')`));
  });

  it('keeps one plan on sale per provider, currency and period', async () => {
    const queries = await run('up');
    const drop = indexOf(queries, 'DROP INDEX "subscription_plans_one_on_sale_per_period"');
    const create = indexOf(
      queries,
      'CREATE UNIQUE INDEX "subscription_plans_one_on_sale_per_period"',
    );

    expect(drop).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(drop);
    expect(queries[create]).toContain(
      '("provider", "currency", "billing_period") WHERE "available_for_purchase"',
    );
  });

  it('restores the per-period index before dropping the column on rollback', async () => {
    const queries = await run('down');
    const create = indexOf(
      queries,
      'CREATE UNIQUE INDEX "subscription_plans_one_on_sale_per_period"',
    );

    expect(queries[create]).toContain(
      '("provider", "billing_period") WHERE "available_for_purchase"',
    );
    expect(create).toBeLessThan(indexOf(queries, 'DROP COLUMN "currency"'));
  });
});
