import { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsEvents1785000000000 implements MigrationInterface {
  name = 'AnalyticsEvents1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "analytics_events" (
        "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
        "event"       TEXT         NOT NULL,
        "userId"      TEXT,
        "telegramId"  BIGINT,
        "sessionId"   TEXT,
        "platform"    TEXT,
        "channel"     TEXT,
        "adCode"      TEXT,
        "email"       TEXT,
        "source"      TEXT,
        "properties"  JSONB,
        "occurredAt"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_events" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_userId_occurredAt"
       ON "analytics_events" ("userId", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_event_occurredAt"
       ON "analytics_events" ("event", "occurredAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_adCode"
       ON "analytics_events" ("adCode")
       WHERE "adCode" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_telegramId"
       ON "analytics_events" ("telegramId")
       WHERE "telegramId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_telegramId"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_adCode"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_event_occurredAt"`);
    await queryRunner.query(`DROP INDEX "IDX_analytics_events_userId_occurredAt"`);
    await queryRunner.query(`DROP TABLE "analytics_events"`);
  }
}
