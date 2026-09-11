import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remnawave panel v3 removed the user `uuid` field; users are keyed by a numeric
 * `id`. Every table below stored the v2 uuid as a foreign key, so each userId
 * column is converted from varchar to integer and backfilled by joining against
 * `remnawave_user_id_map`.
 *
 * That map was populated by a one-shot snapshot script, run against the v2 panel
 * before it was upgraded. The script has since been removed: v3 exposes no way
 * to resolve a legacy uuid, so it could never be run again. Recover it from git
 * history (`git log -- packages/database/src/scripts/`) only if you find a
 * database that still runs panel v2.
 *
 * Rows whose uuid is absent from the map cannot be attributed to any user. They
 * are moved aside into `*_orphaned_v2` tables rather than deleted, so the data
 * survives for manual reconciliation.
 */

/** [table, column, nullable] — every column that held a Remnawave v2 user uuid. */
const USER_ID_COLUMNS: Array<[table: string, column: string, nullable: boolean]> = [
  ['referrals', 'inviterId', false],
  ['referrals', 'invitedId', false],
  ['yookassa_payments', 'userId', false],
  ['stripe_payments', 'userId', true],
  ['telegram_stars_payments', 'userId', false],
  ['promo_redemptions', 'userId', false],
  ['saved_payment_methods', 'userId', false],
  ['analytics_events', 'userId', true],
  ['user_attribution', 'userId', false],
  ['tolt_referral', 'userId', false],
  ['tolt_transaction', 'userId', false],
];

/** Distinct tables, in the order their orphan rows should be quarantined. */
const TABLES = [...new Set(USER_ID_COLUMNS.map(([table]) => table))];

/**
 * Indexes and constraints that ride on the columns being converted.
 *
 * DROP COLUMN silently takes them with it, so up() and down() both have to put
 * them back. They live in one list because keeping two hand-written copies in
 * step is precisely what fails: an earlier revision of this migration dropped
 * three indexes in down() and recreated none of them, leaving every rolled-back
 * database with no index on userId.
 *
 * The names are the ones the live schema carries. Several started life under
 * friendlier names and were replaced by TypeORM's generated hashes when a later
 * `migration:generate` ran (analytics_events in Migration1786035082291,
 * promo_redemptions in Migration1783522434889, tolt_transaction in
 * Migration1787402175473). Those migrations still DROP the hashes without
 * IF EXISTS, so recreating these under any other name would abort a rollback
 * that reaches them. The hashes derive from table and column names — unchanged
 * by a varchar→int conversion — so they are also what `migration:generate`
 * expects to find, and using them keeps it from churning.
 */
const DEPENDENT_OBJECTS: ReadonlyArray<{ name: string; create: string; drop: string }> = [
  {
    name: 'UQ_6de61a8c3f58b6f3597775b992f',
    create: `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_6de61a8c3f58b6f3597775b992f" UNIQUE ("invitedId")`,
    drop: `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_6de61a8c3f58b6f3597775b992f"`,
  },
  {
    name: 'PK_user_attribution',
    create: `ALTER TABLE "user_attribution" ADD CONSTRAINT "PK_user_attribution" PRIMARY KEY ("userId")`,
    drop: `ALTER TABLE "user_attribution" DROP CONSTRAINT IF EXISTS "PK_user_attribution"`,
  },
  {
    name: 'PK_tolt_referral',
    create: `ALTER TABLE "tolt_referral" ADD CONSTRAINT "PK_tolt_referral" PRIMARY KEY ("userId")`,
    drop: `ALTER TABLE "tolt_referral" DROP CONSTRAINT IF EXISTS "PK_tolt_referral"`,
  },
  {
    name: 'IDX_384834c1689d1015fdf634da28',
    create: `CREATE INDEX "IDX_384834c1689d1015fdf634da28" ON "analytics_events" ("userId", "occurredAt")`,
    drop: `DROP INDEX IF EXISTS "IDX_384834c1689d1015fdf634da28"`,
  },
  {
    name: 'IDX_1f323da96215b4e73d112da7fd',
    create: `CREATE INDEX "IDX_1f323da96215b4e73d112da7fd" ON "promo_redemptions" ("promoCode", "userId")`,
    drop: `DROP INDEX IF EXISTS "IDX_1f323da96215b4e73d112da7fd"`,
  },
  {
    name: 'IDX_3a6842e9e8827e486779c85ce7',
    create: `CREATE INDEX "IDX_3a6842e9e8827e486779c85ce7" ON "tolt_transaction" ("userId")`,
    drop: `DROP INDEX IF EXISTS "IDX_3a6842e9e8827e486779c85ce7"`,
  },
];

/** Drops every dependent object, innermost last, before the columns move. */
async function dropDependentObjects(queryRunner: QueryRunner): Promise<void> {
  for (const object of [...DEPENDENT_OBJECTS].reverse()) {
    await queryRunner.query(object.drop);
  }
}

/** Restores every dependent object once the columns are in their new type. */
async function createDependentObjects(queryRunner: QueryRunner): Promise<void> {
  for (const object of DEPENDENT_OBJECTS) {
    await queryRunner.query(object.create);
  }
}

export class RemnawaveV3NumericUserId1791000000000 implements MigrationInterface {
  name = 'RemnawaveV3NumericUserId1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mapExists = await queryRunner.query(`SELECT to_regclass('public.remnawave_user_id_map')`);

    if (!mapExists?.[0]?.to_regclass) {
      throw new Error(
        'remnawave_user_id_map is missing. This database predates the panel v3 conversion ' +
          'and the uuid -> id mapping was never captured for it. Panel v3 cannot resolve legacy ' +
          'uuids, so the mapping cannot be rebuilt and these columns cannot be converted ' +
          'automatically. See git history for the snapshot script that produced the map.',
      );
    }

    const [{ count }] = await queryRunner.query(
      `SELECT COUNT(*)::int AS count FROM "remnawave_user_id_map" WHERE "userId" IS NOT NULL`,
    );

    if (count === 0) {
      throw new Error(
        'remnawave_user_id_map is empty. The snapshot must be captured from the v2 panel ' +
          'before this migration can backfill numeric user ids.',
      );
    }

    // 1. Quarantine rows that cannot be mapped, so the conversion below is total.
    for (const table of TABLES) {
      const columns = USER_ID_COLUMNS.filter(([t]) => t === table);

      const unmappable = columns
        .map(
          ([, column, nullable]) =>
            `(${nullable ? `"${column}" IS NOT NULL AND ` : ''}NOT EXISTS (
               SELECT 1 FROM "remnawave_user_id_map" m
               WHERE m."legacyUuid"::text = "${table}"."${column}" AND m."userId" IS NOT NULL
             ))`,
        )
        .join(' OR ');

      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS "${table}_orphaned_v2" (LIKE "${table}" INCLUDING ALL)`,
      );
      await queryRunner.query(
        `WITH moved AS (
           DELETE FROM "${table}" WHERE ${unmappable} RETURNING *
         )
         INSERT INTO "${table}_orphaned_v2" SELECT * FROM moved`,
      );
      // Drop the quarantine table when nothing needed quarantining.
      await queryRunner.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM "${table}_orphaned_v2" LIMIT 1) THEN
             EXECUTE 'DROP TABLE "${table}_orphaned_v2"';
           END IF;
         END $$`,
      );
    }

    // 2. Convert each column in place, resolving the uuid through the map.
    //    DROP COLUMN would cascade to these anyway; dropping them by name first
    //    keeps up() and down() doing the same thing in the same order.
    await dropDependentObjects(queryRunner);
    for (const [table, column, nullable] of USER_ID_COLUMNS) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "${column}_int" integer`);
      await queryRunner.query(
        `UPDATE "${table}" t
            SET "${column}_int" = m."userId"
           FROM "remnawave_user_id_map" m
          WHERE m."legacyUuid"::text = t."${column}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${column}_int" TO "${column}"`,
      );
      if (!nullable) {
        await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
      }
    }

    // 3. Restore the constraints and indexes that rode on the dropped columns.
    await createDependentObjects(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverses the column types using the same map. Rows quarantined in `up`
    // are NOT restored — re-insert them from the *_orphaned_v2 tables by hand
    // if you need them back.
    await dropDependentObjects(queryRunner);

    for (const [table, column, nullable] of USER_ID_COLUMNS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "${column}_uuid" character varying`,
      );
      await queryRunner.query(
        `UPDATE "${table}" t
            SET "${column}_uuid" = m."legacyUuid"::text
           FROM "remnawave_user_id_map" m
          WHERE m."userId" = t."${column}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "${column}_uuid" TO "${column}"`,
      );
      if (!nullable) {
        await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET NOT NULL`);
      }
    }

    await createDependentObjects(queryRunner);
  }
}
