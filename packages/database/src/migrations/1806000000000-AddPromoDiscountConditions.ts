import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoDiscountConditions1806000000000 implements MigrationInterface {
  name = 'AddPromoDiscountConditions1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promos" ADD "duration" character varying NOT NULL DEFAULT 'forever'`,
    );
    await queryRunner.query(`ALTER TABLE "promos" ADD "durationMonths" integer`);
    await queryRunner.query(`ALTER TABLE "promos" ADD "planPeriods" integer array`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "planPeriods"`);
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "durationMonths"`);
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "duration"`);
  }
}
