import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramStarsPaymentsTable1778419022704 implements MigrationInterface {
  name = 'AddTelegramStarsPaymentsTable1778419022704';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "telegram_stars_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" character varying NOT NULL,
        "starsAmount" integer NOT NULL,
        "selectedPeriod" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "telegramPaymentChargeId" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "paidAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_telegram_stars_payments" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_stars_payments_userId" ON "telegram_stars_payments" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_telegram_stars_payments_userId"`);
    await queryRunner.query(`DROP TABLE "telegram_stars_payments"`);
  }
}
