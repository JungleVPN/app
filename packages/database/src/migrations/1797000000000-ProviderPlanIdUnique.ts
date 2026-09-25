import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A catalog price id belongs to exactly one plan, so a webhook or checkout
 * that carries it resolves one row. The one-on-sale-per-period index and the
 * CHECK constraints from AddPlanTable stay as they are.
 */
export class ProviderPlanIdUnique1797000000000 implements MigrationInterface {
  name = 'ProviderPlanIdUnique1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ADD CONSTRAINT "UQ_9ec77542f4b828ea594fae900d5" UNIQUE ("provider_price_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" DROP CONSTRAINT "UQ_9ec77542f4b828ea594fae900d5"`,
    );
  }
}
