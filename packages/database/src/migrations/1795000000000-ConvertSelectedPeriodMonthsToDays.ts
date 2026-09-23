import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The payment APIs used to persist subscription length as months.  The API now
 * uses days, so existing payment rows must be converted before they can be
 * used for renewals or fulfilment.  `0` deliberately remains untouched: it
 * denotes a one-off extra-device purchase rather than a subscription period.
 */
export class ConvertSelectedPeriodMonthsToDays1795000000000 implements MigrationInterface {
  name = 'ConvertSelectedPeriodMonthsToDays1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['yookassa_payments', 'telegram_stars_payments']) {
      await queryRunner.query(`
        UPDATE "${table}"
        SET "selectedPeriod" = CASE "selectedPeriod"
          WHEN 1 THEN 30
          WHEN 3 THEN 90
          WHEN 6 THEN 180
          WHEN 12 THEN 365
        END
        WHERE "selectedPeriod" IN (1, 3, 6, 12)
      `);
    }
  }

  /**
   * This is intentionally irreversible. Once the new application version has
   * written day values, converting 30/90/180/365 back would also rewrite those
   * new rows as if they were legacy month values.
   */
  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
