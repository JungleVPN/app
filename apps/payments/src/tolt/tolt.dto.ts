/**
 * Body of `POST /tolt/referral`.
 *
 * Every field originates in the browser, read off the globals `tlt.js` sets
 * once it has resolved an affiliate link. `userId` is deliberately absent —
 * it comes from the validated credential, never from the client.
 */
export interface CaptureReferralDto {
  /** `window.tolt_referral` — the partner's referral code. */
  referralCode: string;
  /** `window.tolt_data.partner_id`. */
  partnerId: string;
  /** `window.tolt_data.click_id`, when the click was attributable. */
  clickId?: string | null;
}
