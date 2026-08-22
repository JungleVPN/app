import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787402175473 implements MigrationInterface {
    name = 'Migration1787402175473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_tolt_transaction_userId"`);
        await queryRunner.query(`ALTER TABLE "yookassa_payments" DROP COLUMN "paymentMethodId"`);
        await queryRunner.query(`ALTER TABLE "tolt_referral" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_3a6842e9e8827e486779c85ce7" ON "tolt_transaction" ("userId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_3a6842e9e8827e486779c85ce7"`);
        await queryRunner.query(`ALTER TABLE "tolt_referral" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "yookassa_payments" ADD "paymentMethodId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_tolt_transaction_userId" ON "tolt_transaction" ("userId") `);
    }

}
