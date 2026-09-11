/**
 * CleanupOrphanedV2Tables — retiring the `*_orphaned_v2` quarantine tables.
 *
 * RemnawaveV3NumericUserId moved rows it could not map into per-table
 * `*_orphaned_v2` tables rather than deleting them. On production that was 34
 * rows belonging to users since deleted from the panel. Once they have been
 * reconciled the tables are clutter, but they are still real payment records —
 * so this migration folds them into one archive before dropping them, rather
 * than destroying them to tidy the schema.
 *
 * Table discovery is dynamic: the previous migration only leaves behind the
 * quarantine tables that actually received rows, so a hardcoded list would go
 * stale differently in every environment.
 */

import type { QueryRunner } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { CleanupOrphanedV2Tables1792000000000 } from '../1792000000000-CleanupOrphanedV2Tables';

const ARCHIVE = 'orphaned_v2_archive';

/**
 * Records SQL and answers the two questions the migration asks: which orphan
 * tables exist, and whether anything ended up archived.
 */
function record({
  orphanTables = ['yookassa_payments_orphaned_v2'],
  archivedRows = 1,
}: {
  orphanTables?: string[];
  archivedRows?: number;
} = {}) {
  const queries: string[] = [];

  const runner = {
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes('information_schema.tables')) {
        return orphanTables.map((table_name) => ({ table_name }));
      }
      if (sql.includes('COUNT(*)')) return [{ count: archivedRows }];
      return [];
    },
  } as unknown as QueryRunner;

  return { runner, queries };
}

const migration = () => new CleanupOrphanedV2Tables1792000000000();
const sqlFor = (queries: string[], needle: string) => queries.filter((q) => q.includes(needle));

describe('up()', () => {
  it('creates the archive before copying anything into it', async () => {
    const { runner, queries } = record();

    await migration().up(runner);

    const created = queries.findIndex((q) => q.includes(`CREATE TABLE IF NOT EXISTS "${ARCHIVE}"`));
    const inserted = queries.findIndex((q) => q.includes(`INSERT INTO "${ARCHIVE}"`));
    expect(created).toBeGreaterThanOrEqual(0);
    expect(created).toBeLessThan(inserted);
  });

  it('archives every row of each orphan table as jsonb, tagged with its source', async () => {
    const { runner, queries } = record({
      orphanTables: ['yookassa_payments_orphaned_v2', 'referrals_orphaned_v2'],
    });

    await migration().up(runner);

    const inserts = sqlFor(queries, `INSERT INTO "${ARCHIVE}"`);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toContain('to_jsonb');
    expect(inserts[0]).toContain('yookassa_payments_orphaned_v2');
    expect(inserts[1]).toContain('referrals_orphaned_v2');
  });

  it('drops each orphan table only after archiving it', async () => {
    const { runner, queries } = record({ orphanTables: ['referrals_orphaned_v2'] });

    await migration().up(runner);

    const archived = queries.findIndex(
      (q) => q.includes(`INSERT INTO "${ARCHIVE}"`) && q.includes('referrals_orphaned_v2'),
    );
    const dropped = queries.findIndex(
      (q) => q.includes('DROP TABLE') && q.includes('referrals_orphaned_v2'),
    );
    expect(archived).toBeGreaterThanOrEqual(0);
    expect(dropped).toBeGreaterThan(archived);
  });

  it('drops every orphan table it found', async () => {
    const tables = ['a_orphaned_v2', 'b_orphaned_v2', 'c_orphaned_v2'];
    const { runner, queries } = record({ orphanTables: tables });

    await migration().up(runner);

    for (const t of tables) {
      expect(sqlFor(queries, `DROP TABLE`).join('\n')).toContain(t);
    }
  });

  it('leaves the archive in place when it holds rows', async () => {
    const { runner, queries } = record({ archivedRows: 34 });

    await migration().up(runner);

    expect(sqlFor(queries, `DROP TABLE`).join('\n')).not.toContain(`"${ARCHIVE}"`);
  });

  it('drops the archive too when nothing needed archiving', async () => {
    // A database whose quarantine tables were all empty should end up with no
    // trace of this at all, rather than an empty table nobody will ever read.
    const { runner, queries } = record({ archivedRows: 0 });

    await migration().up(runner);

    expect(sqlFor(queries, 'DROP TABLE').join('\n')).toContain(`"${ARCHIVE}"`);
  });

  it('is a no-op on a database that never quarantined anything', async () => {
    const { runner, queries } = record({ orphanTables: [], archivedRows: 0 });

    await migration().up(runner);

    expect(sqlFor(queries, `INSERT INTO "${ARCHIVE}"`)).toHaveLength(0);
  });

  it('never touches a live table', async () => {
    const { runner, queries } = record({ orphanTables: ['yookassa_payments_orphaned_v2'] });

    await migration().up(runner);

    const drops = sqlFor(queries, 'DROP TABLE').join('\n');
    expect(drops).not.toMatch(/DROP TABLE[^;]*"yookassa_payments"/);
    expect(drops).not.toMatch(/DROP TABLE[^;]*"referrals"/);
  });
});

describe('down()', () => {
  it('does not pretend it can rebuild the dropped tables', async () => {
    // The rows live on in the archive; recreating nine tables from jsonb would
    // be guesswork. Reverting is deliberately a no-op, not a fake restore.
    const { runner, queries } = record();

    await migration().down(runner);

    expect(queries.filter((q) => /CREATE TABLE|INSERT INTO/.test(q))).toHaveLength(0);
  });

  it('does not throw, so a revert chain can pass through it', async () => {
    const { runner } = record();

    await expect(migration().down(runner)).resolves.toBeUndefined();
  });
});
