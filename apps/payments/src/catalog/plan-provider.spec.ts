import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { providerCurrency, resolveProvider } from './plan-provider';

const ENV_KEYS = ['GLOBAL_PAYMENT_PROVIDER', 'PUBLIC_DOMAIN_RU'] as const;

describe('resolveProvider', () => {
  const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    process.env.PUBLIC_DOMAIN_RU = 'thejungle.pro';
    process.env.GLOBAL_PAYMENT_PROVIDER = 'paddle';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('sends the RU storefront to YooKassa whatever the global provider is', () => {
    expect(resolveProvider('https://thejungle.pro')).toBe('yookassa');
  });

  it('treats a caller with no origin (TMA, bot) as RU', () => {
    expect(resolveProvider(null)).toBe('yookassa');
  });

  it('sends every other storefront to the configured global provider', () => {
    expect(resolveProvider('https://jungle-vpn.com')).toBe('paddle');

    process.env.GLOBAL_PAYMENT_PROVIDER = 'STRIPE';
    expect(resolveProvider('https://jungle-vpn.com')).toBe('stripe');

    process.env.GLOBAL_PAYMENT_PROVIDER = 'whop';
    expect(resolveProvider('https://jungle-vpn.com')).toBe('whop');
  });

  it('refuses a global provider that cannot take global payments', () => {
    process.env.GLOBAL_PAYMENT_PROVIDER = 'yookassa';
    expect(() => resolveProvider('https://jungle-vpn.com')).toThrow(/GLOBAL_PAYMENT_PROVIDER/);

    delete process.env.GLOBAL_PAYMENT_PROVIDER;
    expect(() => resolveProvider('https://jungle-vpn.com')).toThrow(/GLOBAL_PAYMENT_PROVIDER/);
  });
});

describe('providerCurrency', () => {
  it('charges YooKassa in roubles and the global providers in euros', () => {
    expect(providerCurrency('yookassa')).toBe('RUB');
    expect(providerCurrency('stripe')).toBe('EUR');
    expect(providerCurrency('paddle')).toBe('EUR');
    expect(providerCurrency('whop')).toBe('EUR');
  });
});
