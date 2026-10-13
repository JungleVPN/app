/** Custom data we attach at checkout, read back off every transaction/subscription event Paddle sends for it. */
export interface PaddleCustomData {
  email: string;
  inviterId?: string;
  toltReferralId?: string;
  signupOrigin?: string;
}

export interface PaddleTransactionPayload {
  id: string;
  userId: number | null;
  customer: string | null;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  paidAt: Date | null;
}

/**
 * Public Paddle checkout-init request — POST /payments/paddle/public-create-checkout.
 *
 * Unlike Stripe, Paddle Checkout is opened client-side (`Paddle.Checkout.open()`)
 * against a catalog price id — there is no server-created hosted session to
 * redirect to. This endpoint only validates the request (email, period,
 * duplicate-subscription check) and hands back what the frontend needs to open
 * the overlay itself.
 */
export interface CreatePublicPaddleCheckoutDto {
  /** Payer's email, prefilled into the Paddle checkout. */
  email: string;
  /** The `planId` from `/plans`. */
  planId: string;
  /** Tolt affiliate referral id (`window.tolt_referral`), when present. */
  toltReferralId?: string | null;
  /** Referring user id captured from a `?ref=` link, when present. */
  inviterId?: number;
}

/**
 * What the frontend needs to open `Paddle.Checkout.open()`: the catalog price
 * to bill, and custom data to attach to the resulting transaction so a later
 * webhook can identify the payer once the checkout settles.
 */
export interface PaddleCheckoutPayload {
  priceId: string;
  customData: Record<string, string>;
}
