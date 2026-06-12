import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAttribution1781000000000 implements MigrationInterface {
  name = 'AddUserAttribution1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_attribution" (
        "userId" varchar NOT NULL,
        "platform"      varchar NOT NULL,
        "source"        varchar,
        "medium"        varchar,
        "campaign"      varchar,
        "adset"         varchar,
        "ad"            varchar,
        "clickId"       varchar,
        "adCode"        varchar,
        "raw"           jsonb,
        "createdAt"     timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_attribution" PRIMARY KEY ("userId")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_attribution"`);
  }
}
