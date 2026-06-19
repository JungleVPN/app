import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromos1782000000000 implements MigrationInterface {
  name = 'AddPromos1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "promos" (
        "code" character varying NOT NULL,
        "effect" jsonb NOT NULL,
        "startsAt" TIMESTAMP WITH TIME ZONE,
        "endsAt" TIMESTAMP WITH TIME ZONE,
        "maxRedemptions" integer,
        "perUserLimit" integer NOT NULL DEFAULT 1,
        "eligibility" character varying NOT NULL DEFAULT 'all',
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promos_code" PRIMARY KEY ("code")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "promo_redemptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "promoCode" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "paymentId" character varying NOT NULL,
        "redeemedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promo_redemptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promo_redemptions_provider_payment" UNIQUE ("provider", "paymentId")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_promo_redemptions_code_user"
        ON "promo_redemptions" ("promoCode", "userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "yookassa_payments"
        ADD COLUMN IF NOT EXISTS "promoCode" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN IF EXISTS "promoCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_redemptions_code_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_redemptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promos"`);
  }
}
