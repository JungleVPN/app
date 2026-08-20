import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveReturnUrl } from '../utils/return-origin';

describe('resolveReturnUrl', () => {
  beforeEach(() => {
    process.env.CORS_ORIGIN = 'https://jungle-vpn.com,https://jungle.community';
  });

  afterEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.RETURN_URL_WEB;
  });

  it('returns the requesting domain plus path when the origin is one of the app domains', () => {
    expect(resolveReturnUrl('https://jungle.community', '/profile/subscription')).toBe(
      'https://jungle.community/profile/subscription',
    );
  });

  it('matches an allowlisted origin regardless of a trailing slash on either side', () => {
    process.env.CORS_ORIGIN = 'https://jungle-vpn.com/';
    expect(resolveReturnUrl('https://jungle-vpn.com/', '/profile/subscription')).toBe(
      'https://jungle-vpn.com/profile/subscription',
    );
  });

  it('falls back to RETURN_URL_WEB when the origin is not an app domain', () => {
    process.env.RETURN_URL_WEB = 'https://fallback.example.com/profile/subscription';
    expect(resolveReturnUrl('https://evil.example.com', '/profile/subscription')).toBe(
      'https://fallback.example.com/profile/subscription',
    );
  });

  it('falls back to RETURN_URL_WEB when the origin is missing', () => {
    process.env.RETURN_URL_WEB = 'https://fallback.example.com/profile/subscription';
    expect(resolveReturnUrl(undefined, '/profile/subscription')).toBe(
      'https://fallback.example.com/profile/subscription',
    );
  });

  it('falls back to the hardcoded default when neither the origin nor RETURN_URL_WEB is usable', () => {
    expect(resolveReturnUrl(undefined, '/profile/subscription')).toBe(
      'https://jungle-vpn.com/profile/subscription',
    );
  });
});
