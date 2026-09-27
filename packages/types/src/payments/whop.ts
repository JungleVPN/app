/**
 * Public Whop checkout-init request — POST /payments/whop/public-create-checkout.
 *
 * Validates the request (email, plan, duplicate subscription) before the
 * browser mounts the card form; nothing is created on Whop until the payer
 * submits their card (see `PayPublicWhopCheckoutDto`).
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
 * What the frontend needs to mount Whop's card fields: the account we sell
 * from (`biz_...`) and the Whop plan (`plan_...`) being bought.
 */
export interface WhopCheckoutPayload {
  accountId: string;
  planId: string;
}

/**
 * Public Whop payment request — POST /payments/whop/public-pay. The same
 * checkout request, re-validated, plus the card the browser tokenised.
 */
export interface PayPublicWhopCheckoutDto extends CreatePublicWhopCheckoutDto {
  /** Single-use confirmation token (`ctok_...`) from `payments.createConfirmationToken()`. */
  confirmationToken: string;
  /** Where the buyer lands after an off-site step such as a 3DS bank page. */
  returnUrl: string;
}

/**
 * The payment Whop created. `paid` is final; anything else is finished in the
 * browser by handing `clientSecret` to Whop's `handleNextAction`.
 */
export interface WhopPaymentDto {
  paymentId: string;
  status: string;
  /** Unlocks only this payment, so it is safe to hand to the browser. */
  clientSecret: string | null;
}

/**
 * The outcome of POST /payments/whop/cancel. Whop has no customer portal to
 * send the user to, so cancellation is ours: the membership stops renewing
 * and stays usable until `accessUntil`.
 */
export interface WhopCancelDto {
  cancelAtPeriodEnd: boolean;
  /** ISO timestamp the paid period ends; null when Whop reports none. */
  accessUntil: string | null;
}
