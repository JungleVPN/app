import type { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { ConvertSelectedPeriodMonthsToDays1795000000000 } from '../1795000000000-ConvertSelectedPeriodMonthsToDays';

const migration = () => new ConvertSelectedPeriodMonthsToDays1795000000000();

describe('ConvertSelectedPeriodMonthsToDays1795000000000', () => {
  it('converts legacy month periods in every table that persists selectedPeriod', async () => {
    const queries: string[] = [];
    const runner = {
      query: async (sql: string) => queries.push(sql),
    } as unknown as QueryRunner;

    await migration().up(runner);

    expect(queries).toHaveLength(2);
    for (const table of ['yookassa_payments', 'telegram_stars_payments']) {
      const query = queries.find((sql) => sql.includes(`UPDATE "${table}"`));
      expect(query).toBeDefined();
      expect(query).toContain('WHEN 1 THEN 30');
      expect(query).toContain('WHEN 3 THEN 90');
      expect(query).toContain('WHEN 6 THEN 180');
      expect(query).toContain('WHEN 12 THEN 365');
      expect(query).toContain('WHERE "selectedPeriod" IN (1, 3, 6, 12)');
    }
  });

  it('does not attempt a lossy rollback after new day values may exist', async () => {
    const query = vi.fn();

    await migration().down({ query } as unknown as QueryRunner);

    expect(query).not.toHaveBeenCalled();
  });
});
