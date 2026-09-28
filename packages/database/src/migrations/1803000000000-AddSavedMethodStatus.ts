import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSavedMethodStatus1803000000000 implements MigrationInterface {
  name = 'AddSavedMethodStatus1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saved_payment_methods" ADD "status" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "saved_payment_methods" DROP COLUMN "status"`);
  }
}
