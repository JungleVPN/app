/**
 * Affiliate attribution handed from the browser to the payments service.
 *
 * Read from the `tolt_referral` / `tolt_data` cookies written when a visitor
 * lands on an `?aff=` link.
 * There is deliberately no `userId`: the backend takes it from the validated
 * credential, since a client-supplied one would let anyone attribute another
 * user's payments to their own partner code.
 */
export interface CaptureToltReferralDto {
  /** `window.tolt_referral` — the partner's referral code. */
  referralCode: string;
  /** `window.tolt_data.partner_id`. */
  partnerId: string;
  /** `window.tolt_data.click_id`, when the click was attributable. */
  clickId?: string | null;
}

/**
 * Body of `POST /tolt/click` — sent once when a visitor lands on an `?aff=`
 * link, before they have an account. Public by necessity.
 */
export interface RecordToltClickDto {
  affCode: string;
  page?: string | null;
  referrer?: string | null;
}

export interface RecordToltClickResponse {
  partnerId: string;
  clickId: string;
}
