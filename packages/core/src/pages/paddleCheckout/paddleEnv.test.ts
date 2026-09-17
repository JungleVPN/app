import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPaddleClientToken, getPaddleEnvironment } from './paddleEnv';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getPaddleClientToken', () => {
  it('returns the configured client token', () => {
    vi.stubEnv('PUBLIC_PADDLE_CLIENT_TOKEN', 'test_abc123');

    expect(getPaddleClientToken()).toBe('test_abc123');
  });

  it('throws rather than silently opening a checkout with no token', () => {
    vi.stubEnv('PUBLIC_PADDLE_CLIENT_TOKEN', '');

    expect(() => getPaddleClientToken()).toThrow(/PUBLIC_PADDLE_CLIENT_TOKEN/);
  });
});

describe('getPaddleEnvironment', () => {
  it('returns "sandbox" when configured', () => {
    vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'sandbox');

    expect(getPaddleEnvironment()).toBe('sandbox');
  });

  it('returns "production" when configured', () => {
    vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'production');

    expect(getPaddleEnvironment()).toBe('production');
  });

  it('throws rather than default to a real Paddle account when unset', () => {
    vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', '');

    expect(() => getPaddleEnvironment()).toThrow(/PUBLIC_PADDLE_ENVIRONMENT/);
  });

  it('throws on a value that is neither sandbox nor production', () => {
    vi.stubEnv('PUBLIC_PADDLE_ENVIRONMENT', 'staging');

    expect(() => getPaddleEnvironment()).toThrow(/PUBLIC_PADDLE_ENVIRONMENT/);
  });
});
