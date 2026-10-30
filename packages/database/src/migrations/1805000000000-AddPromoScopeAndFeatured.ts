import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoScopeAndFeatured1805000000000 implements MigrationInterface {
  name = 'AddPromoScopeAndFeatured1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promos" ADD "scope" character varying NOT NULL DEFAULT 'ru'`,
    );
    await queryRunner.query(`ALTER TABLE "promos" ADD "featured" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "featured"`);
    await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "scope"`);
  }
}
