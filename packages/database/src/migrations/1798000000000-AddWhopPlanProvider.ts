import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets `subscription_plans` hold Whop plans alongside Stripe and Paddle ones.
 *
 * Postgres cannot drop a value from an enum, so `down` rebuilds the type
 * without it — which fails while any Whop plan row still exists, by design:
 * rolling back must not silently discard catalog rows.
 */
export class AddWhopPlanProvider1798000000000 implements MigrationInterface {
  name = 'AddWhopPlanProvider1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "plan_provider" ADD VALUE IF NOT EXISTS 'whop'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "plan_provider" RENAME TO "plan_provider_old"`);
    await queryRunner.query(`CREATE TYPE "plan_provider" AS ENUM ('yookassa', 'stripe', 'paddle')`);
    await queryRunner.query(
      `ALTER TABLE "subscription_plans" ALTER COLUMN "provider" TYPE "plan_provider" USING "provider"::text::"plan_provider"`,
    );
    await queryRunner.query(`DROP TYPE "plan_provider_old"`);
  }
}
