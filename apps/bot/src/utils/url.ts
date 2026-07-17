import { StartPayload } from '@shared/user.types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Encodes a remnawave userId (uuid) into an opaque code for the /start ref_xxx deep link. */
export function generateReferralCode(userId: string): string {
  return Buffer.from(userId).toString('base64url');
}

/** Decodes a /start ref_xxx code back into a remnawave userId (uuid), or null if malformed. */
export function decodeReferralCode(code: string): string | null {
  try {
    const decoded = Buffer.from(code, 'base64url').toString('utf-8');
    return UUID_PATTERN.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function decodeAdCode(code: string) {
  return code.replace('adCode_', '');
}

export const decodeStartPayload = (payload: string): StartPayload => {
  if (payload.startsWith('ref_')) {
    return {
      type: 'referral',
      value: decodeReferralCode(payload.slice('ref_'.length)),
    };
  }

  if (payload.startsWith('adCode_')) {
    return {
      type: 'ad',
      value: decodeAdCode(payload),
    };
  }

  return null;
};
