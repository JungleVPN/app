import type { Referral } from '@workspace/database';

export function generateReferralCode(userId: number): string {
  return Buffer.from(userId.toString()).toString('base64url');
}

export function decodeReferralCode(code: string): number | null {
  try {
    const decoded = Buffer.from(code, 'base64url').toString('utf-8');
    const userId = Number(decoded);
    return Number.isNaN(userId) ? null : userId;
  } catch {
    return null;
  }
}

export type ExistingReferralConflict = 'user_is_invited' | 'referral_completed' | 'already_exists';

/** Classifies why a new referral can't be created when invitedId already has a record. */
export function findExistingReferralConflict(
  referral: Referral | null,
  inviterId: string,
): ExistingReferralConflict | null {
  if (!referral) return null;
  if (inviterId !== referral.inviterId) return 'user_is_invited';
  if (referral.status === 'COMPLETED') return 'referral_completed';
  return 'already_exists';
}
