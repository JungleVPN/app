import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadProvider() {
  vi.resetModules();
  return (await import('./paymentProvider')).GLOBAL_PAYMENT_PROVIDER;
}

describe('GLOBAL_PAYMENT_PROVIDER', () => {
  it('reads the configured provider', async () => {
    vi.stubEnv('PUBLIC_GLOBAL_PAYMENT_PROVIDER', 'stripe');

    await expect(loadProvider()).resolves.toBe('stripe');
  });

  it('falls back to paddle when unset', async () => {
    vi.stubEnv('PUBLIC_GLOBAL_PAYMENT_PROVIDER', '');

    await expect(loadProvider()).resolves.toBe('paddle');
  });

  it('reads whop as the provider', async () => {
    vi.stubEnv('PUBLIC_GLOBAL_PAYMENT_PROVIDER', 'whop');

    await expect(loadProvider()).resolves.toBe('whop');
  });

  it('ignores case, as the payments service does', async () => {
    vi.stubEnv('PUBLIC_GLOBAL_PAYMENT_PROVIDER', 'Whop');

    await expect(loadProvider()).resolves.toBe('whop');
  });

  // An unknown value must not reach the payment page as a method no button
  // handles — it falls back like an unset one, so both checkout flows agree.
  it('falls back to paddle for a provider it does not know', async () => {
    vi.stubEnv('PUBLIC_GLOBAL_PAYMENT_PROVIDER', 'padle');

    await expect(loadProvider()).resolves.toBe('paddle');
  });
});

describe('pricesIncludeTax', () => {
  it('holds on the global storefront while Whop, whose plans are tax-inclusive, takes the payment', async () => {
    const { pricesIncludeTax } = await import('./paymentProvider');

    expect(pricesIncludeTax({ scope: 'global', provider: 'whop' })).toBe(true);
  });

  it.each([
    'paddle',
    'stripe',
  ] as const)('makes no claim while %s, whose tax setup is its own, takes the payment', async (provider) => {
    const { pricesIncludeTax } = await import('./paymentProvider');

    expect(pricesIncludeTax({ scope: 'global', provider })).toBe(false);
  });

  it('makes no claim on the RU storefront, which YooKassa serves whatever the global provider', async () => {
    const { pricesIncludeTax } = await import('./paymentProvider');

    expect(pricesIncludeTax({ scope: 'ru', provider: 'whop' })).toBe(false);
  });
});
