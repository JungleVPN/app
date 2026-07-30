/**
 * Security tests for referral code generation and decoding.
 *
 * The referral code is an HMAC-SHA256-signed token that binds the inviterId
 * UUID to a server secret. This prevents a caller from forging an inviterId by
 * encoding an arbitrary UUID without knowing the secret — the same principle
 * used in apps/payments where userId is derived from HMAC-validated Telegram
 * initData rather than from client-supplied route params.
 */

import { describe, expect, it } from 'vitest';
import { decodeReferralCode, decodeStartPayload, generateReferralCode } from './url';

const SECRET = 'test-secret-value';
const OTHER_SECRET = 'different-secret';
const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const OTHER_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

describe('generateReferralCode / decodeReferralCode', () => {
  it('roundtrips: a code generated with the correct secret decodes back to the original UUID', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    expect(decodeReferralCode(code, SECRET)).toBe(VALID_UUID);
  });

  it('rejects a code verified with a different secret', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    expect(decodeReferralCode(code, OTHER_SECRET)).toBeNull();
  });

  it('rejects a legacy unsigned code (bare base64url with no dot)', () => {
    const legacy = Buffer.from(VALID_UUID).toString('base64url');
    expect(decodeReferralCode(legacy, SECRET)).toBeNull();
  });

  it('rejects a code with a tampered UUID but valid structure', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    const [, sig] = code.split('.');
    const tamperedEncoded = Buffer.from(OTHER_UUID).toString('base64url');
    const tampered = `${tamperedEncoded}.${sig}`;
    expect(decodeReferralCode(tampered, SECRET)).toBeNull();
  });

  it('rejects a code whose signature has been truncated', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    const truncated = code.slice(0, -4);
    expect(decodeReferralCode(truncated, SECRET)).toBeNull();
  });

  it('rejects a code where a non-UUID string was encoded', () => {
    // Attacker forges a code but puts an arbitrary string instead of a UUID.
    // The signature is valid (attacker controls both sides), but UUID format check rejects it.
    const forged = generateReferralCode('not-a-uuid', SECRET);
    expect(decodeReferralCode(forged, SECRET)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeReferralCode('', SECRET)).toBeNull();
  });

  it('returns null for a blank secret (misconfigured env)', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    expect(decodeReferralCode(code, '')).toBeNull();
  });

  it('two different UUIDs produce different codes under the same secret', () => {
    const code1 = generateReferralCode(VALID_UUID, SECRET);
    const code2 = generateReferralCode(OTHER_UUID, SECRET);
    expect(code1).not.toBe(code2);
  });
});

describe('decodeStartPayload', () => {
  it('decodes a valid ref_ payload to a referral with the correct UUID', () => {
    const code = generateReferralCode(VALID_UUID, SECRET);
    const result = decodeStartPayload(`ref_${code}`, SECRET);
    expect(result).toEqual({ type: 'referral', value: VALID_UUID });
  });

  it('returns referral with null value when the ref_ code has no signature', () => {
    const unsignedCode = Buffer.from(VALID_UUID).toString('base64url');
    const result = decodeStartPayload(`ref_${unsignedCode}`, SECRET);
    expect(result).toEqual({ type: 'referral', value: null });
  });

  it('returns referral with null value when the ref_ code was signed with the wrong secret', () => {
    const code = generateReferralCode(VALID_UUID, OTHER_SECRET);
    const result = decodeStartPayload(`ref_${code}`, SECRET);
    expect(result).toEqual({ type: 'referral', value: null });
  });

  it('still handles ad codes without touching the secret', () => {
    const result = decodeStartPayload('adCode_PROMO42', SECRET);
    expect(result).toEqual({ type: 'ad', value: 'PROMO42' });
  });

  it('returns null for an unrecognised payload prefix', () => {
    expect(decodeStartPayload('unknown_payload', SECRET)).toBeNull();
  });
});
