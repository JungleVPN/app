import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhopRefunds1800000000000 implements MigrationInterface {
  name = 'AddWhopRefunds1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "whop_refunds" ("id" character varying NOT NULL, "paymentId" character varying NOT NULL, "amount" double precision NOT NULL, "currency" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_whop_refunds_id" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "whop_refunds"`);
  }
}
