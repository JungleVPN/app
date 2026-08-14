import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1777023823613 implements MigrationInterface {
  name = 'Migration1777023823613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ALTER COLUMN "userId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "amount"`);
    await queryRunner.query(
      `ALTER TABLE "yookassa_payments" ADD "amount" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "yookassa_payments" ALTER COLUMN "selectedPeriod" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "yookassa_payments" ALTER COLUMN "selectedPeriod" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "amount"`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ADD "amount" integer`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ALTER COLUMN "userId" DROP NOT NULL`);
  }
}
