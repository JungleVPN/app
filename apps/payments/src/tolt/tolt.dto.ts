/**
 * Body of `POST /tolt/referral`.
 *
 * Read from the `tolt_referral` / `tolt_data` cookies the browser stores when a
 * visitor lands on an affiliate link. `userId` is deliberately absent: it comes
 * from the validated credential, since a client-supplied one would let anyone
 * attribute another user's payments to their own partner code.
 */
export interface CaptureReferralDto {
  /** The partner's referral code. */
  referralCode: string;
  partnerId: string;
  clickId?: string | null;
}

/**
 * Body of `POST /tolt/click` — sent once when a visitor lands on an `?aff=`
 * link, before they have an account.
 */
export interface RecordClickDto {
  /** The `?aff=` value from the landing URL. */
  affCode: string;
  /** Where the click landed, for the partner's reporting. */
  page?: string | null;
  referrer?: string | null;
}
