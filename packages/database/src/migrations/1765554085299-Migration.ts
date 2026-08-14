import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1765554085299 implements MigrationInterface {
  name = 'Migration1765554085299';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "broadcasts" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "adminId" integer, "messageText" text, CONSTRAINT "PK_b0586900034d0726bbdcb1b21b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "broadcast_messages" ("id" SERIAL NOT NULL, "telegramId" bigint NOT NULL, "messageId" integer NOT NULL, "broadcastId" integer, CONSTRAINT "PK_f62e2c8a3a5b201cf0dd6f80e29" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "broadcast_messages" ADD CONSTRAINT "FK_286dd368c9f20e6bd8426ded12b" FOREIGN KEY ("broadcastId") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "broadcast_messages" DROP CONSTRAINT "FK_286dd368c9f20e6bd8426ded12b"`,
    );
    await queryRunner.query(`DROP TABLE "broadcast_messages"`);
    await queryRunner.query(`DROP TABLE "broadcasts"`);
  }
}
