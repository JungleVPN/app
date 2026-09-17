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
});
