import { describe, expect, it } from 'vitest';
import { decodeReferralCode, generateReferralCode } from './referral.utils';

describe('referral.utils', () => {
  it('round-trips a remnawave userId (uuid) through generate/decode', () => {
    const userId = 'b3b1e7b0-1234-4a5b-8c9d-0123456789ab';

    const code = generateReferralCode(userId);
    expect(decodeReferralCode(code)).toBe(userId);
  });

  it('returns null for a malformed code', () => {
    expect(decodeReferralCode('%%%not-base64%%%')).toBeNull();
  });
});
