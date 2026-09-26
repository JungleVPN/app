/**
 * Public Whop checkout-init request — POST /payments/whop/public-create-checkout.
 *
 * Same shape as Paddle's: the browser mounts Whop's embedded checkout itself,
 * so this endpoint only validates the request (email, plan, duplicate
 * subscription) and creates the checkout configuration it mounts.
 */
export interface CreatePublicWhopCheckoutDto {
  /** Payer's email, carried as metadata so the webhook can identify them. */
  email: string;
  /** The `planId` from `/plans`. */
  planId: string;
  /** Tolt affiliate referral id (`window.tolt_referral`), when present. */
  toltReferralId?: string | null;
  /** Referring user id captured from a `?ref=` link, when present. */
  inviterId?: number;
}

/**
 * What the frontend needs to mount Whop's embedded checkout: the checkout
 * configuration (`ch_...`), which already carries the plan to bill and the
 * metadata every resulting payment and membership is stamped with.
 */
export interface WhopCheckoutPayload {
  checkoutConfigurationId: string;
}
