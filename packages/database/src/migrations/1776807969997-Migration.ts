import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1776807969997 implements MigrationInterface {
  name = 'Migration1776807969997';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ADD "selectedPeriod" integer`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ADD "telegramId" bigint`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "telegramId"`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "selectedPeriod"`);
    await queryRunner.query(`ALTER TABLE "yookassa_payments" ADD "metadata" jsonb`);
  }
}
