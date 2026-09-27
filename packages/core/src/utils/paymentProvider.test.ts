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
