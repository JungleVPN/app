import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedMethodSubscriptionDetails1801000000000 implements MigrationInterface {
  name = 'AddSavedMethodSubscriptionDetails1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_payment_methods" ADD "productName" character varying, ADD "amount" double precision, ADD "currency" character varying, ADD "billingPeriod" integer, ADD "renewsAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_payment_methods" DROP COLUMN "renewsAt", DROP COLUMN "billingPeriod", DROP COLUMN "currency", DROP COLUMN "amount", DROP COLUMN "productName"`,
    );
  }
}
