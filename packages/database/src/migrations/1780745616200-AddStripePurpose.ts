import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripePurpose1780745616200 implements MigrationInterface {
  name = 'AddStripePurpose1780745616200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stripe_payments" ADD COLUMN IF NOT EXISTS "purpose" varchar DEFAULT 'subscription'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stripe_payments" DROP COLUMN IF EXISTS "purpose"`);
  }
}
