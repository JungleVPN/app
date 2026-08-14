import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentPurpose1778500000000 implements MigrationInterface {
  name = 'AddPaymentPurpose1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "yookassa_payments"
        ADD COLUMN IF NOT EXISTS "purpose" character varying NOT NULL DEFAULT 'subscription'`,
    );
    await queryRunner.query(
      `ALTER TABLE "telegram_stars_payments"
        ADD COLUMN IF NOT EXISTS "purpose" character varying NOT NULL DEFAULT 'subscription'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN IF EXISTS "purpose"`);
    await queryRunner.query(
      `ALTER TABLE "telegram_stars_payments" DROP COLUMN IF EXISTS "purpose"`,
    );
  }
}
