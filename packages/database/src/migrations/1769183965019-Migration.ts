import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1769183965019 implements MigrationInterface {
  name = 'Migration1769183965019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "broadcasts" DROP COLUMN "adminId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "broadcasts" ADD "adminId" integer`);
  }
}
