import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedMethodIconUrl1804000000000 implements MigrationInterface {
  name = 'AddSavedMethodIconUrl1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saved_payment_methods" ADD "iconUrl" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saved_payment_methods" DROP COLUMN "iconUrl"`);
  }
}
