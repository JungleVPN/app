import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1789995594785 implements MigrationInterface {
    name = 'Migration1789995594785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tolt_referral" DROP COLUMN "source"`);
        await queryRunner.query(`ALTER TABLE "tolt_referral" DROP COLUMN "commissionEndedAt"`);
        await queryRunner.query(`ALTER TABLE "yookassa_payments" ALTER COLUMN "userId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "yookassa_payments" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tolt_referral" ADD "commissionEndedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tolt_referral" ADD "source" character varying NOT NULL DEFAULT 'affiliate'`);
    }

}
