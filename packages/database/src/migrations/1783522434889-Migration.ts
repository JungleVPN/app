import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783522434889 implements MigrationInterface {
    name = 'Migration1783522434889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_promo_redemptions_code_user"`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT "UQ_promo_redemptions_provider_payment"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "createdat"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "inviterid"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP CONSTRAINT "UQ_referrals_invitedid"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "invitedid"`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "inviterId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "invitedId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD CONSTRAINT "UQ_6de61a8c3f58b6f3597775b992f" UNIQUE ("invitedId")`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "referrals" ALTER COLUMN "status" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ALTER COLUMN "purpose" SET NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_1f323da96215b4e73d112da7fd" ON "promo_redemptions" ("promoCode", "userId") `);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" ADD CONSTRAINT "UQ_dc52845bf29f8a7187ddcad3e16" UNIQUE ("provider", "paymentId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "promo_redemptions" DROP CONSTRAINT "UQ_dc52845bf29f8a7187ddcad3e16"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f323da96215b4e73d112da7fd"`);
        await queryRunner.query(`ALTER TABLE "stripe_payments" ALTER COLUMN "purpose" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" ALTER COLUMN "status" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP CONSTRAINT "PK_ea9980e34f738b6252817326c08"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "id" integer`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP CONSTRAINT "UQ_6de61a8c3f58b6f3597775b992f"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "invitedId"`);
        await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "inviterId"`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "invitedid" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD CONSTRAINT "UQ_referrals_invitedid" UNIQUE ("invitedid")`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "inviterid" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "referrals" ADD "createdat" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "promo_redemptions" ADD CONSTRAINT "UQ_promo_redemptions_provider_payment" UNIQUE ("provider", "paymentId")`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_redemptions_code_user" ON "promo_redemptions" ("promoCode", "userId") `);
    }

}
