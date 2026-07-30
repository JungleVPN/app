import { createHmac, timingSafeEqual } from 'node:crypto';
import { StartPayload } from '@shared/user.types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Encodes a remnawave userId (uuid) into an HMAC-signed opaque code for the
 * /start ref_xxx deep link.  Format: <base64url(uuid)>.<hmac-sha256>.
 * REFERRAL_CODE_SECRET must be set; without it every generated code will be
 * rejected by decodeReferralCode on the same or any other process.
 */
export function generateReferralCode(userId: string, secret: string): string {
  const encoded = Buffer.from(userId).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

/**
 * Decodes a /start ref_xxx code back into a remnawave userId (uuid).
 * Returns null when the code is malformed, the UUID format is wrong, or the
 * HMAC signature does not match — preventing a caller from forging an inviterId
 * by encoding an arbitrary UUID without knowing the secret.
 */
export function decodeReferralCode(code: string, secret: string): string | null {
  try {
    const dotIdx = code.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const encoded = code.slice(0, dotIdx);
    const sig = code.slice(dotIdx + 1);

    const expectedSig = sign(encoded, secret);
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

    const decoded = Buffer.from(encoded, 'base64url').toString('utf-8');
    return UUID_PATTERN.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function decodeAdCode(code: string) {
  return code.replace('adCode_', '');
}

export const decodeStartPayload = (payload: string, secret: string): StartPayload => {
  if (payload.startsWith('ref_')) {
    return {
      type: 'referral',
      value: decodeReferralCode(payload.slice('ref_'.length), secret),
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
