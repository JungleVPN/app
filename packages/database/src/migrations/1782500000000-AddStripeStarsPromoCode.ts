import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `promoCode` to stripe_payments and telegram_stars_payments.
 *
 * These columns were originally folded into AddPromos1782000000000, but that
 * migration had already been applied on existing databases, so the late-added
 * ALTERs never ran there. This follow-up migration covers those databases.
 * `IF NOT EXISTS` makes it a no-op on fresh databases (where AddPromos already
 * created the columns).
 */
export class AddStripeStarsPromoCode1782500000000 implements MigrationInterface {
  name = 'AddStripeStarsPromoCode1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stripe_payments"
        ADD COLUMN IF NOT EXISTS "promoCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "telegram_stars_payments"
        ADD COLUMN IF NOT EXISTS "promoCode" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telegram_stars_payments" DROP COLUMN IF EXISTS "promoCode"`,
    );
    await queryRunner.query(`ALTER TABLE "stripe_payments" DROP COLUMN IF EXISTS "promoCode"`);
  }
}
