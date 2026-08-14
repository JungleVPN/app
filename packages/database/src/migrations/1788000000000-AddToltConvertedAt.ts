import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToltConvertedAt1788000000000 implements MigrationInterface {
  name = 'AddToltConvertedAt1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tolt_referral"
      ADD COLUMN IF NOT EXISTS "convertedAt" timestamptz
    `);

    // Carried from capture so the Tolt customer, created later at payment time,
    // is still identified by a real email rather than a bare uuid.
    await queryRunner.query(`
      ALTER TABLE "tolt_referral"
      ADD COLUMN IF NOT EXISTS "email" varchar
    `);

    // Rows written before this column existed created their Tolt customer at
    // capture, so their attribution is already fixed on Tolt's side and must
    // not be overwritten by a later referral.
    await queryRunner.query(`
      UPDATE "tolt_referral"
      SET "convertedAt" = "createdAt"
      WHERE "toltCustomerId" IS NOT NULL AND "convertedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tolt_referral" DROP COLUMN IF EXISTS "email"`);
    await queryRunner.query(`ALTER TABLE "tolt_referral" DROP COLUMN IF EXISTS "convertedAt"`);
  }
}
