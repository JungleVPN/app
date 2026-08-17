import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lets a charge be claimed before it is reported.
 *
 * The mapping row is now written ahead of `POST /v1/transactions` rather than
 * after it, so that a commission can never exist in Tolt without a local record
 * of the charge it belongs to — a refund is matched by charge id, and a missing
 * row reads as "never an affiliate sale". Between the claim and the response
 * there is no transaction id to store, so the column has to accept null.
 */
export class ToltTransactionClaim1790000000000 implements MigrationInterface {
  name = 'ToltTransactionClaim1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tolt_transaction"
      ALTER COLUMN "toltTransactionId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Unconfirmed claims have no id to restore and would fail the constraint;
    // they are dropped, which only loses the record that reconciliation is owed.
    await queryRunner.query(`
      DELETE FROM "tolt_transaction" WHERE "toltTransactionId" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "tolt_transaction"
      ALTER COLUMN "toltTransactionId" SET NOT NULL
    `);
  }
}
