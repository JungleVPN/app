import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToltTransaction1789000000000 implements MigrationInterface {
  name = 'AddToltTransaction1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tolt_transaction" (
        "chargeId"          varchar NOT NULL,
        "toltTransactionId" varchar NOT NULL,
        "userId"            varchar NOT NULL,
        "provider"          varchar NOT NULL,
        "amountCents"       integer NOT NULL,
        "refundedAt"        timestamptz,
        "createdAt"         timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tolt_transaction" PRIMARY KEY ("chargeId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tolt_transaction_userId"
      ON "tolt_transaction" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tolt_transaction_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tolt_transaction"`);
  }
}
