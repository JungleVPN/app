export const REFERRALS_EVENTS = {
  REWARDED: 'user.rewarded',
} as const;

export interface ReferralRewardedEvent {
  userId: number;
  telegramId: number | null;
  /** Which side of the referral this reward was granted to. */
  role: 'inviter' | 'invited';
}
