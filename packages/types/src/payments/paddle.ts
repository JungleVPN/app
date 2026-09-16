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
  /** Subscription plan in months (1, 3, 6, 12). */
  selectedPeriod: number;
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

/**
 * Response from GET /payments/paddle/subscription.
 * Reports whether the authenticated user has an active (or trialing) Paddle
 * subscription and, if so, a freshly-minted Customer Portal URL for
 * self-service management — mirrors Stripe's `StripeSubscriptionStatusDto`.
 */
export interface PaddleSubscriptionStatusDto {
  active: boolean;
  portalUrl: string | null;
}
