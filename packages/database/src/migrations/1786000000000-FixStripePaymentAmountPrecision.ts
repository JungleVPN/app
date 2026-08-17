import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `stripe_payments.amount` holds the amount in major currency units (26.4 EUR),
 * so an integer column rejects every fractional checkout amount.
 */
export class FixStripePaymentAmountPrecision1786000000000 implements MigrationInterface {
  name = 'FixStripePaymentAmountPrecision1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stripe_payments" ALTER COLUMN "amount" TYPE double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stripe_payments" ALTER COLUMN "amount" TYPE integer USING "amount"::integer`,
    );
  }
}
