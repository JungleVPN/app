import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaddlePayments1793000000000 implements MigrationInterface {
  name = 'AddPaddlePayments1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "paddle_payments" ("id" character varying NOT NULL, "userId" integer, "customer" character varying, "subscriptionId" character varying, "amount" double precision, "currency" character varying, "status" character varying NOT NULL DEFAULT 'pending', "purpose" character varying NOT NULL DEFAULT 'subscription', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "paidAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_paddle_payments_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "paddle_payments"`);
  }
}
