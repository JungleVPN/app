/**
 * Security tests for referral code generation and decoding.
 *
 * The referral code is an HMAC-SHA256-signed token that binds the inviterId to
 * a server secret. This prevents a caller from forging an inviterId by encoding
 * an arbitrary id without knowing the secret — the same principle used in
 * apps/payments where userId is derived from HMAC-validated Telegram initData
 * rather than from client-supplied route params.
 *
 * Panel v3 keys users by a numeric id, so codes now carry an integer; codes
 * minted before the migration encoded a uuid and must fail closed.
 */

import { describe, expect, it } from 'vitest';
import { decodeReferralCode, decodeStartPayload, generateReferralCode } from './url';

const SECRET = 'test-secret-value';
const OTHER_SECRET = 'different-secret';
const VALID_USER_ID = 4821;
const OTHER_USER_ID = 1337;
const LEGACY_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

describe('generateReferralCode / decodeReferralCode', () => {
  it('roundtrips: a code generated with the correct secret decodes back to the original user id', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    expect(decodeReferralCode(code, SECRET)).toBe(VALID_USER_ID);
  });

  it('rejects a code verified with a different secret', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    expect(decodeReferralCode(code, OTHER_SECRET)).toBeNull();
  });

  it('rejects a legacy unsigned code (bare base64url with no dot)', () => {
    const legacy = Buffer.from(String(VALID_USER_ID)).toString('base64url');
    expect(decodeReferralCode(legacy, SECRET)).toBeNull();
  });

  it('rejects a code with a tampered user id but valid structure', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    const [, sig] = code.split('.');
    const tamperedEncoded = Buffer.from(String(OTHER_USER_ID)).toString('base64url');
    const tampered = `${tamperedEncoded}.${sig}`;
    expect(decodeReferralCode(tampered, SECRET)).toBeNull();
  });

  it('rejects a code whose signature has been truncated', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    const truncated = code.slice(0, -4);
    expect(decodeReferralCode(truncated, SECRET)).toBeNull();
  });

  it('rejects a code where a non-numeric string was encoded', () => {
    // Attacker forges a code but puts an arbitrary string instead of a user id.
    // The signature is valid (attacker controls both sides), but the integer
    // format check rejects it.
    const forged = generateReferralCode('not-an-id' as unknown as number, SECRET);
    expect(decodeReferralCode(forged, SECRET)).toBeNull();
  });

  it('rejects a legacy v2 code that encoded a uuid, even when correctly signed', () => {
    // Codes minted before the panel v3 migration carry a uuid. They must fail
    // closed rather than resolve to some unrelated user.
    const legacyCode = generateReferralCode(LEGACY_UUID as unknown as number, SECRET);
    expect(decodeReferralCode(legacyCode, SECRET)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(decodeReferralCode('', SECRET)).toBeNull();
  });

  it('returns null for a blank secret (misconfigured env)', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    expect(decodeReferralCode(code, '')).toBeNull();
  });

  it('two different user ids produce different codes under the same secret', () => {
    const code1 = generateReferralCode(VALID_USER_ID, SECRET);
    const code2 = generateReferralCode(OTHER_USER_ID, SECRET);
    expect(code1).not.toBe(code2);
  });
});

describe('decodeStartPayload', () => {
  it('decodes a valid ref_ payload to a referral with the correct user id', () => {
    const code = generateReferralCode(VALID_USER_ID, SECRET);
    const result = decodeStartPayload(`ref_${code}`, SECRET);
    expect(result).toEqual({ type: 'referral', value: VALID_USER_ID });
  });

  it('returns referral with null value when the ref_ code has no signature', () => {
    const unsignedCode = Buffer.from(String(VALID_USER_ID)).toString('base64url');
    const result = decodeStartPayload(`ref_${unsignedCode}`, SECRET);
    expect(result).toEqual({ type: 'referral', value: null });
  });

  it('returns referral with null value when the ref_ code was signed with the wrong secret', () => {
    const code = generateReferralCode(VALID_USER_ID, OTHER_SECRET);
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
