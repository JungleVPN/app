import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776247953539 implements MigrationInterface {
  name = 'Migration1776247953539';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_saved_payment_methods_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_saved_payment_methods_paymentMethodId"`);
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "broadcasts" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT "UQ_2c1ee5e67f6364c1f1193174be8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'FIRST_REWARD'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_2c1ee5e67f6364c1f1193174be8" UNIQUE ("inviterId")`,
    );
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN "createdAt"`);
    await queryRunner.query(
      `ALTER TABLE "broadcasts" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_saved_payment_methods_paymentMethodId" ON "saved_payment_methods" ("paymentMethodId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_saved_payment_methods_userId" ON "saved_payment_methods" ("userId") `,
    );
  }
}
