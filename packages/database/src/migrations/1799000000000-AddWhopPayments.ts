import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhopPayments1799000000000 implements MigrationInterface {
  name = 'AddWhopPayments1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "whop_payments" ("id" character varying NOT NULL, "userId" integer, "customer" character varying, "membershipId" character varying, "amount" double precision, "currency" character varying, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "paidAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_whop_payments_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "whop_payments"`);
  }
}
