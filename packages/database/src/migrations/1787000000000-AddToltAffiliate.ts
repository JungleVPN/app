import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToltAffiliate1787000000000 implements MigrationInterface {
  name = 'AddToltAffiliate1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tolt_referral" (
        "userId"         varchar NOT NULL,
        "referralCode"   varchar NOT NULL,
        "partnerId"      varchar NOT NULL,
        "clickId"        varchar,
        "toltCustomerId" varchar,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tolt_referral" PRIMARY KEY ("userId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fx_rate" (
        "pair"      varchar NOT NULL,
        "rate"      numeric(18,8) NOT NULL,
        "source"    varchar NOT NULL,
        "fetchedAt" timestamptz NOT NULL,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fx_rate" PRIMARY KEY ("pair")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "fx_rate"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tolt_referral"`);
  }
}
