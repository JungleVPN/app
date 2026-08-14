import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1786035082291 implements MigrationInterface {
  name = 'Migration1786035082291';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_analytics_events_telegramId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_analytics_events_userId_occurredAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_analytics_events_event_occurredAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_analytics_events_adCode"`);
    await queryRunner.query(
      `ALTER TABLE "yookassa_payments" ADD "paymentMethodId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_907282d4dbd1bf94ac6e98ee55" ON "analytics_events" ("telegramId") WHERE "telegramId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9556b3567cdf50734a5ed69727" ON "analytics_events" ("adCode") WHERE "adCode" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcc15b59258a4d5846dfca941b" ON "analytics_events" ("event", "occurredAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_384834c1689d1015fdf634da28" ON "analytics_events" ("userId", "occurredAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_384834c1689d1015fdf634da28"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dcc15b59258a4d5846dfca941b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9556b3567cdf50734a5ed69727"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_907282d4dbd1bf94ac6e98ee55"`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "paymentMethodId"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_adCode" ON "analytics_events" ("adCode") WHERE ("adCode" IS NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_event_occurredAt" ON "analytics_events" ("event", "occurredAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_userId_occurredAt" ON "analytics_events" ("userId", "occurredAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_analytics_events_telegramId" ON "analytics_events" ("telegramId") WHERE ("telegramId" IS NOT NULL)`,
    );
  }
}
