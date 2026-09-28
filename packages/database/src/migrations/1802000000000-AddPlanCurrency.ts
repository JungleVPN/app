import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets one provider sell the same period in several currencies, so `/plans`
 * can offer each visitor the price for their country.
 *
 * Existing rows are backfilled with the one currency their provider used to be
 * fixed to. The one-on-sale index gains `currency`, so each provider still has
 * at most one plan on sale per period in each currency.
 *
 * `down` rebuilds the per-period index, which fails while a provider has the
 * same period on sale in two currencies, by design: rolling back must not
 * silently pick which price survives.
 */
export class AddPlanCurrency1802000000000 implements MigrationInterface {
  name = 'AddPlanCurrency1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription_plans" ADD COLUMN "currency" text`);
    await queryRunner.query(`
      UPDATE "subscription_plans"
         SET "currency" = CASE "provider" WHEN 'yookassa' THEN 'RUB' ELSE 'EUR' END
    `);
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ALTER COLUMN "currency" SET NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "subscription_plans"
        ADD CONSTRAINT "subscription_plans_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
    `);
    await queryRunner.query(`DROP INDEX "subscription_plans_one_on_sale_per_period"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "subscription_plans_one_on_sale_per_period"
        ON "subscription_plans" ("provider", "currency", "billing_period")
        WHERE "available_for_purchase"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "subscription_plans_one_on_sale_per_period"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "subscription_plans_one_on_sale_per_period"
        ON "subscription_plans" ("provider", "billing_period")
        WHERE "available_for_purchase"
    `);
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP CONSTRAINT "subscription_plans_currency_check"`,
    );
    await queryRunner.query(`ALTER TABLE "subscription_plans" DROP COLUMN "currency"`);
  }
}
