import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remnawave panel v3 removed the user `uuid` field; users are keyed by a numeric
 * `id`. Every table below stored the v2 uuid as a foreign key, so each userId
 * column is converted from varchar to integer and backfilled by joining against
 * `remnawave_user_id_map`.
 *
 * That map is populated by `pnpm --filter @workspace/database snapshot:remna-ids`,
 * which MUST be run against the v2 panel before it is upgraded — v3 exposes no
 * way to resolve a legacy uuid, so the pairing cannot be recovered afterwards.
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

export class RemnawaveV3NumericUserId1791000000000 implements MigrationInterface {
  name = 'RemnawaveV3NumericUserId1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const mapExists = await queryRunner.query(`SELECT to_regclass('public.remnawave_user_id_map')`);

    if (!mapExists?.[0]?.to_regclass) {
      throw new Error(
        'remnawave_user_id_map is missing. Run the snapshot against the v2 panel BEFORE ' +
          'upgrading it: pnpm --filter @workspace/database snapshot:remna-ids. ' +
          'Panel v3 cannot resolve legacy uuids, so this mapping is unrecoverable once upgraded.',
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
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_referrals_invitedId" UNIQUE ("invitedId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_attribution" ADD CONSTRAINT "PK_user_attribution" PRIMARY KEY ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tolt_referral" ADD CONSTRAINT "PK_tolt_referral" PRIMARY KEY ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_userId_occurredAt"
         ON "analytics_events" ("userId", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_promo_redemptions_promoCode_userId"
         ON "promo_redemptions" ("promoCode", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tolt_transaction_userId" ON "tolt_transaction" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverses the column types using the same map. Rows quarantined in `up`
    // are NOT restored — re-insert them from the *_orphaned_v2 tables by hand
    // if you need them back.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tolt_transaction_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_redemptions_promoCode_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_analytics_events_userId_occurredAt"`);
    await queryRunner.query(
      `ALTER TABLE "tolt_referral" DROP CONSTRAINT IF EXISTS "PK_tolt_referral"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_attribution" DROP CONSTRAINT IF EXISTS "PK_user_attribution"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_referrals_invitedId"`,
    );

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

    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_referrals_invitedId" UNIQUE ("invitedId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_attribution" ADD CONSTRAINT "PK_user_attribution" PRIMARY KEY ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tolt_referral" ADD CONSTRAINT "PK_tolt_referral" PRIMARY KEY ("userId")`,
    );
  }
}
