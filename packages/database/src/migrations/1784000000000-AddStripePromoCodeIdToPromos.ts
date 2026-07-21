import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStripePromoCodeIdToPromos1784000000000 implements MigrationInterface {
  name = 'AddStripePromoCodeIdToPromos1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promos" ADD COLUMN IF NOT EXISTS "stripePromoCodeId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN IF EXISTS "stripePromoCodeId"`);
  }
}
