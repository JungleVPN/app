/**
 * AdminService.search — SQL shape of the free-text payment search.
 *
 * `search()` matches a query against several columns with OR, and separately
 * requires the row not be a pre-checkout `pending` placeholder. In SQL, AND
 * binds tighter than OR, and TypeORM concatenates conditions without
 * parentheses unless you hand it a Brackets — so a trailing `.orWhere()` after
 * `.andWhere('status != pending')` escapes the status filter entirely.
 *
 * That is not theoretical: `GET /payments/my-transactions` calls search() with
 * the caller's own numeric user id, so the OR branches are exactly the ones a
 * real user hits, and pending placeholders would surface in their transaction
 * history.
 *
 * These tests build the real query against real entity metadata (no database —
 * `buildMetadatas()` gives TypeORM everything it needs to emit SQL offline) and
 * assert on the emitted WHERE clause.
 */

import 'reflect-metadata';
import { StripePayment, TelegramStarsPayment, YookassaPayment } from '@workspace/database';
import type { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { DataSource } from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';
import { AdminService } from './admin.service';

const ENTITIES = [YookassaPayment, TelegramStarsPayment, StripePayment];

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({ type: 'postgres', entities: ENTITIES });
  // initialize() would open a TCP connection; buildMetadatas() is the part that
  // makes the builder able to emit SQL, and it needs no server. It is protected
  // on DataSource, hence the narrow cast rather than a blanket any.
  await (dataSource as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
});

/**
 * Runs a search and returns the WHERE clause each provider's query produced,
 * keyed by entity. Nothing touches a database: getMany is stubbed out and the
 * builder is interrogated for its SQL afterwards.
 */
async function whereClausesFor(query: string): Promise<Record<string, string>> {
  const clauses: Record<string, string> = {};

  const repoFor = <T extends ObjectLiteral>(entity: new () => T): Repository<T> =>
    ({
      createQueryBuilder: (alias: string) => {
        const qb = dataSource.createQueryBuilder(entity, alias) as SelectQueryBuilder<T>;
        qb.getMany = async () => {
          clauses[entity.name] = qb.getSql().split(' WHERE ')[1]?.split(' ORDER BY ')[0].trim();
          return [];
        };
        return qb;
      },
    }) as unknown as Repository<T>;

  const service = new AdminService(
    repoFor(YookassaPayment),
    repoFor(TelegramStarsPayment),
    repoFor(StripePayment),
  );

  await service.search(query);
  return clauses;
}

/**
 * Everything before the ` AND "p"."status" != $n` tail, with CAST(...) calls
 * flattened to a bare placeholder. The tests below assert on where the OR
 * group's brackets close, so a cast's own closing paren would read as one.
 */
const orGroupOf = (where: string) =>
  where.replace(/\s*AND\s*"p"\."status" != \$\d+\s*$/, '').replace(/CAST\([^()]*\)/g, '$CAST');

describe('AdminService.search — the pending filter must survive every OR branch', () => {
  const providers = [
    ['YookassaPayment', YookassaPayment.name],
    ['TelegramStarsPayment', TelegramStarsPayment.name],
    ['StripePayment', StripePayment.name],
  ] as const;

  it.each(providers)('%s keeps the status check outside the OR group', async (_label, key) => {
    const where = (await whereClausesFor('4821'))[key];

    // The status predicate is the final conjunct, applied to the whole group…
    expect(where).toMatch(/\)\s*AND\s*"p"\."status" != \$\d+$/);
    // …and no OR alternative may sit outside those brackets.
    expect(orGroupOf(where)).not.toMatch(/\)\s*OR\s/);
  });

  it.each(providers)('%s still filters on status for a text query', async (_label, key) => {
    const where = (await whereClausesFor('pay_abc'))[key];

    expect(where).toMatch(/"p"\."status" != \$\d+$/);
    expect(orGroupOf(where)).not.toMatch(/\)\s*OR\s/);
  });

  it('matches a numeric query against paymentId, userId and telegramId', async () => {
    const where = (await whereClausesFor('4821')).YookassaPayment;

    expect(where).toBe(
      '("p"."id" = $1 OR "p"."userId" = CAST($2 AS bigint) OR ' +
        '"p"."telegramId" = CAST($2 AS bigint)) AND "p"."status" != $3',
    );
  });

  it('omits the numeric branches entirely for a non-numeric query', async () => {
    const where = (await whereClausesFor('pay_abc')).YookassaPayment;

    expect(where).toBe('("p"."id" = $1) AND "p"."status" != $2');
    expect(where).not.toContain('userId');
    expect(where).not.toContain('telegramId');
  });

  it('never compares the int userId column against a non-numeric query', async () => {
    // userId became an int column in panel v3; a text comparison is a Postgres
    // type error, not a miss.
    for (const where of Object.values(await whereClausesFor('pay_abc'))) {
      expect(where).not.toContain('"p"."userId"');
    }
  });

  it('treats a blank query as non-numeric rather than as zero', async () => {
    // Number('') is 0, which would silently search for user 0 on every blank query.
    const where = (await whereClausesFor('   ')).YookassaPayment;

    expect(where).not.toContain('userId');
  });
});

describe('AdminService.search — numeric branches must not be pinned to int32', () => {
  /**
   * `userId` (int) and `telegramId` (bigint) share one parameter. Postgres
   * resolves an untyped parameter once, from its first use, so an uncast `$n`
   * becomes `integer` at the userId branch — and every modern Telegram id is
   * above 2^31, so the whole search then dies with "value out of range for
   * type integer" before a single row is read.
   */
  it('casts the numeric parameter to bigint on every numeric column', async () => {
    for (const where of Object.values(await whereClausesFor('7123456789'))) {
      const numericBranches =
        where.match(/"p"\."(?:userId|telegramId)" = \S+(?: AS bigint\))?/g) ?? [];

      expect(numericBranches.length).toBeGreaterThan(0);
      for (const branch of numericBranches) {
        expect(branch).toMatch(/= CAST\(\$\d+ AS bigint\)$/);
      }
    }
  });
});
