import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Retires the `*_orphaned_v2` quarantine tables left by RemnawaveV3NumericUserId.
 *
 * That migration moved rows whose legacy uuid was absent from the snapshot into
 * a per-table quarantine rather than deleting them — on production, 34 rows
 * belonging to users since deleted from the panel. They are still real payment,
 * referral and attribution records, so this does not simply drop them to tidy
 * the schema: every remaining row is folded into a single `orphaned_v2_archive`
 * as jsonb, tagged with the table it came from, and only then are the tables
 * removed. Nine stray tables become one, and nothing is destroyed.
 *
 * If every quarantine table turned out to be empty, the archive is dropped too,
 * so a database that never had unmappable rows is left with no trace of this.
 *
 * Tables are discovered rather than hardcoded: RemnawaveV3NumericUserId only
 * leaves behind the quarantine tables that actually received rows, so which
 * ones exist differs per environment.
 */

const ARCHIVE = 'orphaned_v2_archive';

export class CleanupOrphanedV2Tables1792000000000 implements MigrationInterface {
  name = 'CleanupOrphanedV2Tables1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orphaned: Array<{ table_name: string }> = await queryRunner.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE '%\\_orphaned\\_v2'
        ORDER BY table_name`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "${ARCHIVE}" (
         "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         "sourceTable" varchar NOT NULL,
         "row"         jsonb   NOT NULL,
         "archivedAt"  timestamptz NOT NULL DEFAULT now()
       )`,
    );

    for (const { table_name: table } of orphaned ?? []) {
      // to_jsonb(t) keeps the whole row verbatim, so no column list has to be
      // maintained here as the quarantined tables' own schemas drift.
      await queryRunner.query(
        `INSERT INTO "${ARCHIVE}" ("sourceTable", "row")
         SELECT '${table}', to_jsonb(t) FROM "${table}" t`,
      );
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
    }

    const [{ count }] = await queryRunner.query(`SELECT COUNT(*)::int AS count FROM "${ARCHIVE}"`);

    if (count === 0) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${ARCHIVE}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deliberately a no-op. The quarantined rows still exist, in
    // `orphaned_v2_archive`, so nothing has been lost — but rebuilding nine
    // tables from jsonb would be reconstruction by guesswork, and a revert that
    // silently produced approximations of payment tables would be worse than
    // one that does nothing. Restore from the archive by hand if you need to.
    void queryRunner;
  }
}
