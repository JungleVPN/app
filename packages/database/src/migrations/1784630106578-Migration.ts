import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784630106578 implements MigrationInterface {
    name = 'Migration1784630106578'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promos" DROP COLUMN "stripePromoCodeId"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ADD "amount" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stripe_payments" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ADD "amount" double precision`);
        await queryRunner.query(`ALTER TABLE "promos" ADD "stripePromoCodeId" character varying`);
    }

}
