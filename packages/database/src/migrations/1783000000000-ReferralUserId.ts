import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReferralUserId1783000000000 implements MigrationInterface {
  name = 'ReferralUserId1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Legacy rows store Telegram IDs (bigint) in inviterid/invitedid. The new
    // system identifies users by their remnawave userId (uuid), so there is no
    // safe way to convert these rows — drop them.
    await queryRunner.query(`DELETE FROM "referrals"`);

    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_6de61a8c3f58b6f3597775b992f"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "inviterid"`);
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "invitedid"`);
    await queryRunner.query(`ALTER TABLE "referrals" ADD "inviterid" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "referrals" ADD "invitedid" character varying NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_referrals_invitedid" UNIQUE ("invitedid")`,
    );

    // TRIAL replaces FIRST_REWARD as the initial status: it marks a referral
    // record that exists (the invited user signed up) but hasn't paid yet.
    // (Rows were already dropped above, so there's nothing to backfill.)
    await queryRunner.query(`ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'TRIAL'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "referrals"`);

    await queryRunner.query(
      `ALTER TABLE "referrals" DROP CONSTRAINT IF EXISTS "UQ_referrals_invitedid"`,
    );
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "inviterid"`);
    await queryRunner.query(`ALTER TABLE "referrals" DROP COLUMN "invitedid"`);
    await queryRunner.query(`ALTER TABLE "referrals" ADD "inviterid" bigint NOT NULL`);
    await queryRunner.query(`ALTER TABLE "referrals" ADD "invitedid" bigint NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "referrals" ADD CONSTRAINT "UQ_6de61a8c3f58b6f3597775b992f" UNIQUE ("invitedid")`,
    );
    await queryRunner.query(
      `ALTER TABLE "referrals" ALTER COLUMN "status" SET DEFAULT 'FIRST_REWARD'`,
    );
  }
}
