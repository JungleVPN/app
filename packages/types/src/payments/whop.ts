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
  /**
   * Whether the plan renews. A wallet token for a renewing plan must be
   * minted with `setupFutureUsage: 'off_session'`, or Whop refuses it.
   */
  renews: boolean;
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
  /** The promo code the payer applied, as they typed it. */
  promoCode?: string;
}

/** The 400 code for a promo code that does not discount the plan being bought. */
export const PROMO_CODE_INVALID_CODE = 'promo_code_invalid';

/**
 * Public promo-code check — POST /payments/whop/public-promo-code: whether
 * `promoCode` discounts our `planId`, before the payer pays.
 */
export interface CheckWhopPromoCodeDto {
  planId: string;
  promoCode: string;
}

/** A promo code that discounts the plan being bought. */
export interface WhopPromoCodeDto {
  /** The code as Whop stores it — what the wallet checkout is given. */
  code: string;
  promoType: 'percentage' | 'flat_amount';
  /** Percent off for `percentage`, currency units off for `flat_amount`. */
  amountOff: number;
  currency: string;
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
 * Whether our webhook has fulfilled a Whop payment — extended the payer's
 * subscription and recorded it as paid. The checkout waits on this before
 * showing success, since Whop reports a charge paid before its webhook lands.
 */
export interface WhopPaymentStatusDto {
  paymentId: string;
  fulfilled: boolean;
  /** Whether a fulfilled payment is the payer's first subscription — only a first is reported to Google Ads. */
  firstPayment: boolean;
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

/**
 * The outcome of POST /payments/whop/resume: the pending cancellation is
 * reversed and the membership renews again at the end of its period.
 */
export interface WhopResumeDto {
  cancelAtPeriodEnd: boolean;
}
