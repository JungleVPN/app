import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsEvents1785000000000 implements MigrationInterface {
  name = 'AnalyticsEvents1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "analytics_events" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "event"       TEXT         NOT NULL,
        "user_id"     TEXT,
        "telegram_id" BIGINT,
        "session_id"  TEXT,
        "platform"    TEXT,
        "channel"     TEXT,
        "ad_code"     TEXT,
        "source"      TEXT,
        "properties"  JSONB,
        "occurred_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_user_id_occurred_at"
       ON "analytics_events" ("user_id", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_event_occurred_at"
       ON "analytics_events" ("event", "occurred_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_ad_code"
       ON "analytics_events" ("ad_code")
       WHERE "ad_code" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_telegram_id"
       ON "analytics_events" ("telegram_id")
       WHERE "telegram_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_telegram_id"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_ad_code"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_event_occurred_at"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_user_id_occurred_at"`);
    await queryRunner.query(`DROP TABLE "analytics_events"`);
  }
}
