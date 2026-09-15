import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { PaymentsUtils } from '@payments/utils/utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CommonService } from './common.service';

const ENV_KEYS = [
  'ALLOWED_PERIOD',
  'ALLOWED_AMOUNT_STARS',
  'PRICE_EUR_MONTH_1',
  'PRICE_RUB_MONTH_1',
  'PRICE_EUR_MONTH_3',
  'PRICE_RUB_MONTH_3',
  'PADDLE_PRICE_ID_MONTH_1',
  'PADDLE_PRICE_ID_MONTH_3',
] as const;

describe('CommonService.getPlans — Paddle price id', () => {
  let originalEnv: Record<string, string | undefined>;
  let service: CommonService;

  beforeEach(() => {
    originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

    process.env.ALLOWED_PERIOD = '1,3';
    process.env.ALLOWED_AMOUNT_STARS = '100,250';
    process.env.PRICE_EUR_MONTH_1 = '6';
    process.env.PRICE_RUB_MONTH_1 = '500';
    process.env.PRICE_EUR_MONTH_3 = '15';
    process.env.PRICE_RUB_MONTH_3 = '1200';

    service = new CommonService(new PaymentsUtils(new ConfigService()));
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('carries the configured Paddle price id alongside the period it bills', () => {
    process.env.PADDLE_PRICE_ID_MONTH_1 = 'pri_month_1';
    process.env.PADDLE_PRICE_ID_MONTH_3 = 'pri_month_3';

    const plans = service.getPlans();

    expect(plans.find((p) => p.months === 1)?.paddlePriceId).toBe('pri_month_1');
    expect(plans.find((p) => p.months === 3)?.paddlePriceId).toBe('pri_month_3');
  });

  it('reports null rather than omitting the field when Paddle has no price for a period', () => {
    delete process.env.PADDLE_PRICE_ID_MONTH_1;
    process.env.PADDLE_PRICE_ID_MONTH_3 = 'pri_month_3';

    const plans = service.getPlans();

    expect(plans.find((p) => p.months === 1)?.paddlePriceId).toBeNull();
    expect(plans.find((p) => p.months === 3)?.paddlePriceId).toBe('pri_month_3');
  });
});
