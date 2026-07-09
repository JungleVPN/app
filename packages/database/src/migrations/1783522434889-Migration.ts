import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783522434889 implements MigrationInterface {
    name = 'Migration1783522434889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_promo_redemptions_code_user"`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT IF EXISTS "UQ_promo_redemptions_provider_payment"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ALTER COLUMN "purpose" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_1f323da96215b4e73d112da7fd" ON "promo_redemptions" ("promoCode", "userId") `);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT IF EXISTS "UQ_dc52845bf29f8a7187ddcad3e16"`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" ADD CONSTRAINT "UQ_dc52845bf29f8a7187ddcad3e16" UNIQUE ("provider", "paymentId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT IF EXISTS "UQ_dc52845bf29f8a7187ddcad3e16"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_1f323da96215b4e73d112da7fd"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ALTER COLUMN "purpose" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT IF EXISTS "UQ_promo_redemptions_provider_payment"`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" ADD CONSTRAINT "UQ_promo_redemptions_provider_payment" UNIQUE ("provider", "paymentId")`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_promo_redemptions_code_user"`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_redemptions_code_user" ON "promo_redemptions" ("promoCode", "userId") `);
    }

}
