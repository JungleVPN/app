import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1780745616122 implements MigrationInterface {
    name = 'Migration1780745616122'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_telegram_stars_payments_userId"`);
        await queryRunner.query(`ALTER TABLE "telegram_stars_payments" ADD "telegramId" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "telegram_stars_payments" DROP COLUMN "telegramId"`);
        await queryRunner.query(`CREATE INDEX "IDX_telegram_stars_payments_userId" ON "telegram_stars_payments" ("userId") `);
    }

}
