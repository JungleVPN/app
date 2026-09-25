import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves subscription pricing from env vars into a `subscription_plans` table.
 *
 * One row is one purchasable price at one provider for one billing period.
 * `available_for_purchase` separates what is sold from what is still honoured:
 * a retired row stays so renewals and webhooks for existing subscribers still
 * resolve it, and the partial unique index keeps at most one row per provider
 * and period on sale — so a paid period maps to exactly one plan, and with it
 * whether that payment was the one-time trial.
 *
 * Rows are added by hand per environment; this creates the table only.
 */
export class AddPlanTable1796000000000 implements MigrationInterface {
  name = 'AddPlanTable1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "plan_type" AS ENUM ('one_time', 'recurring')`);
    await queryRunner.query(`CREATE TYPE "plan_provider" AS ENUM ('yookassa', 'stripe', 'paddle')`);
    await queryRunner.query(`
      CREATE TABLE "subscription_plans" (
        "id"                     uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
        "type"                   "plan_type"     NOT NULL,
        "billing_period"         integer         NOT NULL CHECK ("billing_period" > 0),
        "base_price"             numeric(10, 2)  NOT NULL CHECK ("base_price" > 0),
        "provider"               "plan_provider" NOT NULL,
        "provider_price_id"      text,
        "available_for_purchase" boolean         NOT NULL DEFAULT true,
        "custom_data"            jsonb           NOT NULL DEFAULT '{}'
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "subscription_plans_one_on_sale_per_period"
        ON "subscription_plans" ("provider", "billing_period")
        WHERE "available_for_purchase"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "subscription_plans"`);
    await queryRunner.query(`DROP TYPE "plan_provider"`);
    await queryRunner.query(`DROP TYPE "plan_type"`);
  }
}
