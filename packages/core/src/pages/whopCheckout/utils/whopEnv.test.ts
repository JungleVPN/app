import { afterEach, describe, expect, it, vi } from 'vitest';
import { getWhopAccountId, getWhopEnvironment, toWhopLocale } from './whopEnv';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getWhopEnvironment', () => {
  it.each(['sandbox', 'production'] as const)('returns "%s" when configured', (value) => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', value);

    expect(getWhopEnvironment()).toBe(value);
  });

  it('throws rather than default to a real Whop account when unset', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', '');

    expect(() => getWhopEnvironment()).toThrow(/PUBLIC_WHOP_ENVIRONMENT/);
  });

  it('throws on a value that is neither sandbox nor production', () => {
    vi.stubEnv('PUBLIC_WHOP_ENVIRONMENT', 'staging');

    expect(() => getWhopEnvironment()).toThrow(/PUBLIC_WHOP_ENVIRONMENT/);
  });
});

describe('toWhopLocale', () => {
  it.each([
    'en',
    'es',
    'pt',
    'tr',
  ])('passes through %s, which Whop checkout supports', (language) => {
    expect(toWhopLocale(language)).toBe(language);
  });

  it('reduces a regional tag to its base language', () => {
    expect(toWhopLocale('pt-BR')).toBe('pt');
  });

  it.each([
    'ru',
    'ar',
    'hi',
    'id',
    'ur',
  ])('falls back to English for %s, which Whop does not ship', (language) => {
    expect(toWhopLocale(language)).toBe('en');
  });
});

describe('getWhopAccountId', () => {
  it('returns the Whop account the page is configured to sell from', () => {
    vi.stubEnv('PUBLIC_WHOP_ACCOUNT_ID', 'biz_123');

    expect(getWhopAccountId()).toBe('biz_123');
  });

  it.each([
    ['unset', ''],
    ['not a Whop account id', 'plan_123'],
  ])('returns null when the account is %s, so the page waits for the backend to name it', (_, value) => {
    vi.stubEnv('PUBLIC_WHOP_ACCOUNT_ID', value);

    expect(getWhopAccountId()).toBeNull();
  });
});
