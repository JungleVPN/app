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
    expect(resolveReturnUrl('https://jungle.community', '/payment/success')).toBe(
      'https://jungle.community/payment/success',
    );
  });

  it('matches an allowlisted origin regardless of a trailing slash on either side', () => {
    process.env.CORS_ORIGIN = 'https://jungle-vpn.com/';
    expect(resolveReturnUrl('https://jungle-vpn.com/', '/payment/success')).toBe(
      'https://jungle-vpn.com/payment/success',
    );
  });

  it('falls back to RETURN_URL_WEB when the origin is not an app domain', () => {
    process.env.RETURN_URL_WEB = 'https://fallback.example.com/payment/success';
    expect(resolveReturnUrl('https://evil.example.com', '/payment/success')).toBe(
      'https://fallback.example.com/payment/success',
    );
  });

  it('falls back to RETURN_URL_WEB when the origin is missing', () => {
    process.env.RETURN_URL_WEB = 'https://fallback.example.com/payment/success';
    expect(resolveReturnUrl(undefined, '/payment/success')).toBe(
      'https://fallback.example.com/payment/success',
    );
  });

  it('falls back to the hardcoded default when neither the origin nor RETURN_URL_WEB is usable', () => {
    expect(resolveReturnUrl(undefined, '/payment/success')).toBe(
      'https://jungle-vpn.com/payment/success',
    );
  });
});
