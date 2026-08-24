/**
 * RemnawaveV3NumericUserId — the DDL it emits.
 *
 * Converting a column means dropping it, and DROP COLUMN silently takes every
 * index and constraint that rides on it. Both up() and down() therefore have to
 * put those objects back, under the names the live schema actually uses.
 *
 * Two things go wrong when that is hand-maintained in two places, and both did:
 *
 *  - down() dropped three indexes and recreated none of them, so a rollback
 *    left analytics_events, promo_redemptions and tolt_transaction with no
 *    index on userId at all;
 *  - up() recreated them under the original friendly names, while the live
 *    schema uses TypeORM's generated hashes (earlier auto-generated migrations
 *    replaced the friendly names). Those earlier migrations still DROP the
 *    hashes without IF EXISTS, so rolling back that far would abort halfway.
 *
 * These tests drive the migration against a recording QueryRunner — no database
 * — and assert on the SQL it produces.
 *
 * They live in __tests__/ rather than beside the migration because datasource.ts
 * globs `dist/migrations/*.js` and executes everything it finds as a migration.
 * A compiled spec sitting in that directory gets require()d at startup and takes
 * the migration container down with it.
 */

import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { RemnawaveV3NumericUserId1791000000000 } from '../1791000000000-RemnawaveV3NumericUserId';

/** Names the live schema uses, per the latest migration that created each. */
const LIVE_NAMES = {
  'analytics_events (userId, occurredAt)': 'IDX_384834c1689d1015fdf634da28',
  'promo_redemptions (promoCode, userId)': 'IDX_1f323da96215b4e73d112da7fd',
  'tolt_transaction (userId)': 'IDX_3a6842e9e8827e486779c85ce7',
  'referrals.invitedId unique': 'UQ_6de61a8c3f58b6f3597775b992f',
  'user_attribution pk': 'PK_user_attribution',
  'tolt_referral pk': 'PK_tolt_referral',
} as const;

/** Names that were replaced in the live schema and must not come back. */
const STALE_NAMES = [
  'IDX_analytics_events_userId_occurredAt',
  'IDX_promo_redemptions_promoCode_userId',
  'IDX_tolt_transaction_userId',
  'UQ_referrals_invitedId',
];

function record(overrides: { mapExists?: boolean; mappedRows?: number } = {}) {
  const { mapExists = true, mappedRows = 42 } = overrides;
  const queries: string[] = [];

  const runner = {
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes('to_regclass')) {
        return [{ to_regclass: mapExists ? 'remnawave_user_id_map' : null }];
      }
      if (sql.includes('COUNT(*)')) return [{ count: mappedRows }];
      return [];
    },
  } as unknown as QueryRunner;

  return { runner, queries };
}

const migration = () => new RemnawaveV3NumericUserId1791000000000();

/** Quoted object names captured by every pattern, sorted for comparison. */
function namesMatching(queries: string[], patterns: RegExp[]): string[] {
  return queries
    .flatMap((query) => patterns.flatMap((pattern) => [...query.matchAll(pattern)]))
    .map((match) => match[1])
    .sort();
}

/** Object names appearing in CREATE INDEX / ADD CONSTRAINT statements. */
function created(queries: string[]): string[] {
  return namesMatching(queries, [
    /CREATE INDEX(?: IF NOT EXISTS)? "([^"]+)"/g,
    /ADD CONSTRAINT "([^"]+)"/g,
  ]);
}

/** Object names appearing in DROP INDEX / DROP CONSTRAINT statements. */
function dropped(queries: string[]): string[] {
  return namesMatching(queries, [
    /DROP INDEX(?: IF EXISTS)? "([^"]+)"/g,
    /DROP CONSTRAINT(?: IF EXISTS)? "([^"]+)"/g,
  ]);
}

describe('up()', () => {
  it('refuses to run when the uuid→id map is missing', async () => {
    const { runner } = record({ mapExists: false });

    await expect(migration().up(runner)).rejects.toThrow(/snapshot/i);
  });

  it('refuses to run when the map was captured but is empty', async () => {
    const { runner } = record({ mappedRows: 0 });

    await expect(migration().up(runner)).rejects.toThrow(/empty/i);
  });

  it('restores every index and constraint under the name the live schema uses', async () => {
    const { runner, queries } = record();

    await migration().up(runner);

    for (const [what, name] of Object.entries(LIVE_NAMES)) {
      expect(created(queries), `missing: ${what}`).toContain(name);
    }
  });

  it('does not resurrect names that later migrations already replaced', async () => {
    const { runner, queries } = record();

    await migration().up(runner);

    for (const stale of STALE_NAMES) {
      expect(created(queries).join('\n'), `stale name reintroduced: ${stale}`).not.toContain(stale);
    }
  });
});

describe('down()', () => {
  it('recreates every object it drops', async () => {
    const { runner, queries } = record();

    await migration().down(runner);

    expect(created(queries)).toEqual(dropped(queries));
  });

  it('leaves the schema carrying the same objects up() produced', async () => {
    const up = record();
    const down = record();

    await migration().up(up.runner);
    await migration().down(down.runner);

    expect(created(down.queries)).toEqual(created(up.queries));
  });

  it('uses the live names too, so a deeper rollback still finds them', async () => {
    const { runner, queries } = record();

    await migration().down(runner);

    for (const name of Object.values(LIVE_NAMES)) {
      expect(created(queries)).toContain(name);
    }
  });
});
