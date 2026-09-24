import { afterEach, describe, expect, it } from 'vitest';
import { getPriceIdForPeriod } from './amount';

const ENV_KEYS = [
  'GLOBAL_PAYMENT_PROVIDER',
  'PADDLE_PRICE_ID_DAYS_30',
  'STRIPE_PRICE_ID_DAYS_30',
] as const;

describe('getPriceIdForPeriod', () => {
  const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('uses the Paddle catalog price when Paddle is active', () => {
    process.env.GLOBAL_PAYMENT_PROVIDER = 'paddle';
    process.env.PADDLE_PRICE_ID_DAYS_30 = 'pri_30';
    process.env.STRIPE_PRICE_ID_DAYS_30 = 'price_30';

    expect(getPriceIdForPeriod(30)).toBe('pri_30');
  });

  it('uses the Stripe catalog price when Stripe is active', () => {
    process.env.GLOBAL_PAYMENT_PROVIDER = 'stripe';
    process.env.PADDLE_PRICE_ID_DAYS_30 = 'pri_30';
    process.env.STRIPE_PRICE_ID_DAYS_30 = 'price_30';

    expect(getPriceIdForPeriod(30)).toBe('price_30');
  });

  it('uses the public deployment setting when the server setting is absent', () => {
    delete process.env.GLOBAL_PAYMENT_PROVIDER;
    process.env.STRIPE_PRICE_ID_DAYS_30 = 'price_30';

    expect(getPriceIdForPeriod(30)).toBe('price_30');
  });
});
